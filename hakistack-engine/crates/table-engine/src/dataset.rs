//! Typed-column dataset arena.
//!
//! Rows are ingested once (when the JS-side `data` input changes by reference)
//! and from then on every kernel reads the dense column buffers + validity
//! bitsets. Strings are lowercased once at ingest so per-keystroke filters
//! never re-fold them.
//!
//! ## Null handling
//!
//! Each column carries a [`Bitset`] where `1` = present and `0` = null. The
//! corresponding slot in the value array is undefined when the bit is 0; the
//! filter kernel always checks validity before reading, so callers don't need
//! to seed sentinel values themselves.
//!
//! For convenience, the builder treats `Some(f64::NAN)` as null (the value
//! slot is overwritten with `0.0` and validity stays 0). Empty strings
//! (`Some("")`) stay valid — they're a real value in JS, distinct from `null`.

use engine_core::{bitset::Bitset, fold::fold_lower, FxHashMap, Idx};

/// Stable column identifier. The engine never sees field names; the JS layer
/// maps `string` keys to `u32` ids before calling in.
pub type ColumnId = u32;

#[derive(Debug)]
pub struct Dataset {
    n_rows:  u32,
    columns: FxHashMap<ColumnId, Column>,
}

impl Dataset {
    pub fn builder(n_rows: u32) -> DatasetBuilder {
        DatasetBuilder {
            n_rows,
            columns: FxHashMap::default(),
        }
    }

    pub fn n_rows(&self) -> u32 {
        self.n_rows
    }

    pub fn column(&self, id: ColumnId) -> Option<&Column> {
        self.columns.get(&id)
    }

    pub fn column_count(&self) -> usize {
        self.columns.len()
    }

    /// Iterate every column in the dataset. Order is unspecified — this is
    /// for kernels that OR across columns (e.g. search) and don't care.
    pub fn iter_columns(&self) -> impl Iterator<Item = (ColumnId, &Column)> + '_ {
        self.columns.iter().map(|(&id, col)| (id, col))
    }
}

#[derive(Debug)]
pub enum Column {
    Text(TextColumn),
    Number(NumberColumn),
    Bool(BoolColumn),
    Date(DateColumn),
}

/// Pre-folded text column.
///
/// `values` keeps the original text for sort, render, and case-sensitive ops
/// (when added later). `lower` is what the case-insensitive filter scans.
#[derive(Debug)]
pub struct TextColumn {
    pub values:   Vec<Box<str>>,
    pub lower:    Vec<Box<str>>,
    pub validity: Bitset,
}

#[derive(Debug)]
pub struct NumberColumn {
    pub values:   Vec<f64>,
    pub validity: Bitset,
}

#[derive(Debug)]
pub struct BoolColumn {
    pub values:   Vec<bool>,
    pub validity: Bitset,
}

/// Dates as i64 epoch milliseconds. The JS layer pre-parses ISO strings via
/// `Date.parse` before calling in, so the engine never sees strings.
#[derive(Debug)]
pub struct DateColumn {
    pub values:   Vec<i64>,
    pub validity: Bitset,
}

/// Builder. All `add_*` methods panic on length mismatch — JS callers must
/// pad/truncate to `n_rows` first. Keeps the kernel branch-free at runtime.
#[derive(Debug)]
pub struct DatasetBuilder {
    n_rows:  u32,
    columns: FxHashMap<ColumnId, Column>,
}

impl DatasetBuilder {
    pub fn add_text(mut self, id: ColumnId, values: Vec<Option<String>>) -> Self {
        self.assert_len(values.len(), "text");
        let mut raw      = Vec::with_capacity(values.len());
        let mut lower    = Vec::with_capacity(values.len());
        let mut validity = Bitset::with_capacity(self.n_rows);
        for (i, v) in values.into_iter().enumerate() {
            match v {
                Some(s) => {
                    let l = fold_lower(&s);
                    raw.push(s.into_boxed_str());
                    lower.push(l.into_boxed_str());
                    validity.set(i as Idx);
                }
                None => {
                    raw.push(Box::from(""));
                    lower.push(Box::from(""));
                }
            }
        }
        self.columns
            .insert(id, Column::Text(TextColumn { values: raw, lower, validity }));
        self
    }

    pub fn add_number(mut self, id: ColumnId, values: Vec<Option<f64>>) -> Self {
        self.assert_len(values.len(), "number");
        let mut raw      = Vec::with_capacity(values.len());
        let mut validity = Bitset::with_capacity(self.n_rows);
        for (i, v) in values.into_iter().enumerate() {
            match v {
                Some(n) if !n.is_nan() => {
                    raw.push(n);
                    validity.set(i as Idx);
                }
                _ => raw.push(0.0),
            }
        }
        self.columns
            .insert(id, Column::Number(NumberColumn { values: raw, validity }));
        self
    }

    pub fn add_bool(mut self, id: ColumnId, values: Vec<Option<bool>>) -> Self {
        self.assert_len(values.len(), "bool");
        let mut raw      = Vec::with_capacity(values.len());
        let mut validity = Bitset::with_capacity(self.n_rows);
        for (i, v) in values.into_iter().enumerate() {
            match v {
                Some(b) => {
                    raw.push(b);
                    validity.set(i as Idx);
                }
                None => raw.push(false),
            }
        }
        self.columns
            .insert(id, Column::Bool(BoolColumn { values: raw, validity }));
        self
    }

    pub fn add_date(mut self, id: ColumnId, values: Vec<Option<i64>>) -> Self {
        self.assert_len(values.len(), "date");
        let mut raw      = Vec::with_capacity(values.len());
        let mut validity = Bitset::with_capacity(self.n_rows);
        for (i, v) in values.into_iter().enumerate() {
            match v {
                Some(t) => {
                    raw.push(t);
                    validity.set(i as Idx);
                }
                None => raw.push(0),
            }
        }
        self.columns
            .insert(id, Column::Date(DateColumn { values: raw, validity }));
        self
    }

    // ── Columnar (typed-array) constructors ─────────────────────────────
    //
    // These skip the per-row `Option<X>` wrapping that the JS↔WASM boundary
    // would otherwise pay for. JS sends `Float64Array` + `Uint8Array`
    // validity bytes; we receive them as bulk `Vec<X>` + a pre-built
    // `Bitset` (constructed via `Bitset::from_bytes`). For 100k-row datasets
    // this is the dominant ingest win — no boxed Options, no serde walk over
    // every cell.

    /// Add a number column from a pre-extracted `(values, validity)` pair.
    /// JS contract: NaN rows must already have their validity bit cleared;
    /// we keep a defensive scan here so a buggy caller can't poison
    /// comparison kernels with NaN values claiming to be valid.
    pub fn add_number_columnar(mut self, id: ColumnId, mut values: Vec<f64>, mut validity: Bitset) -> Self {
        self.assert_len(values.len(), "number");
        for (i, v) in values.iter_mut().enumerate() {
            if v.is_nan() {
                *v = 0.0;
                validity.unset(i as Idx);
            }
        }
        self.columns
            .insert(id, Column::Number(NumberColumn { values, validity }));
        self
    }

    /// Add a bool column from a `(0/1 bytes, validity)` pair. JS sends bool
    /// values as a `Uint8Array` to keep the wire format typed-array-friendly;
    /// we widen to `Vec<bool>` here to match the kernel's existing storage.
    pub fn add_bool_columnar(mut self, id: ColumnId, values_u8: Vec<u8>, validity: Bitset) -> Self {
        self.assert_len(values_u8.len(), "bool");
        let values: Vec<bool> = values_u8.into_iter().map(|b| b != 0).collect();
        self.columns
            .insert(id, Column::Bool(BoolColumn { values, validity }));
        self
    }

    /// Add a date column from `(i64 ms-epoch, validity)`. JS sends dates as a
    /// `Float64Array` (since JS Numbers are f64); we narrow to `i64` here.
    /// Values where the bit is clear are 0; the kernel never reads them.
    pub fn add_date_columnar(mut self, id: ColumnId, values: Vec<i64>, validity: Bitset) -> Self {
        self.assert_len(values.len(), "date");
        self.columns
            .insert(id, Column::Date(DateColumn { values, validity }));
        self
    }

    pub fn build(self) -> Dataset {
        Dataset {
            n_rows:  self.n_rows,
            columns: self.columns,
        }
    }

    fn assert_len(&self, got: usize, kind: &str) {
        assert_eq!(
            got as u32, self.n_rows,
            "{kind} column length {} does not match dataset n_rows {}",
            got, self.n_rows
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn opt_strs(v: &[&str]) -> Vec<Option<String>> {
        v.iter().map(|s| Some(s.to_string())).collect()
    }

    #[test]
    fn empty_dataset() {
        let ds = Dataset::builder(0).build();
        assert_eq!(ds.n_rows(), 0);
        assert_eq!(ds.column_count(), 0);
        assert!(ds.column(0).is_none());
    }

    #[test]
    fn build_with_all_column_kinds() {
        let ds = Dataset::builder(3)
            .add_text(0, opt_strs(&["Alice", "Bob", "Carol"]))
            .add_number(1, vec![Some(10.0), Some(20.0), None])
            .add_bool(2, vec![Some(true), Some(false), Some(true)])
            .add_date(3, vec![Some(1_700_000_000_000), None, Some(1_800_000_000_000)])
            .build();

        assert_eq!(ds.n_rows(), 3);
        assert_eq!(ds.column_count(), 4);
        assert!(matches!(ds.column(0), Some(Column::Text(_))));
        assert!(matches!(ds.column(1), Some(Column::Number(_))));
        assert!(matches!(ds.column(2), Some(Column::Bool(_))));
        assert!(matches!(ds.column(3), Some(Column::Date(_))));
    }

    #[test]
    fn text_column_lowercases_at_ingest() {
        let ds = Dataset::builder(2)
            .add_text(0, opt_strs(&["Hello", "WORLD"]))
            .build();
        let Some(Column::Text(col)) = ds.column(0) else { panic!() };
        assert_eq!(&*col.lower[0], "hello");
        assert_eq!(&*col.lower[1], "world");
        assert_eq!(&*col.values[0], "Hello"); // raw preserved
        assert!(col.validity.get(0));
        assert!(col.validity.get(1));
    }

    #[test]
    fn text_none_is_null_empty_string_is_valid() {
        let ds = Dataset::builder(2)
            .add_text(0, vec![None, Some("".into())])
            .build();
        let Some(Column::Text(col)) = ds.column(0) else { panic!() };
        assert!(!col.validity.get(0));     // None → null
        assert!(col.validity.get(1));      // Some("") → valid empty
        assert_eq!(&*col.values[1], "");
    }

    #[test]
    fn number_nan_is_treated_as_null() {
        let ds = Dataset::builder(3)
            .add_number(0, vec![Some(1.0), Some(f64::NAN), None])
            .build();
        let Some(Column::Number(col)) = ds.column(0) else { panic!() };
        assert!(col.validity.get(0));
        assert!(!col.validity.get(1));     // NaN → null
        assert!(!col.validity.get(2));     // None → null
    }

    #[test]
    #[should_panic(expected = "column length")]
    fn length_mismatch_panics() {
        Dataset::builder(3)
            .add_number(0, vec![Some(1.0), Some(2.0)]) // wrong length
            .build();
    }
}
