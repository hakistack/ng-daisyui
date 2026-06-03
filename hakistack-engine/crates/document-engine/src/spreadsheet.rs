//! Spreadsheet parser. Backed by [`calamine`] — handles `.xlsx`, `.xls`,
//! `.xlsb`, `.xlsm`, `.xla`, `.xlam`, and `.ods` in a single crate.
//!
//! Output model is deliberately minimal: a list of sheets, each with a
//! rectangular grid of typed cell values. The JS consumer (
//! `spreadsheet.renderer.ts`) decides how to render — typically by piping
//! into `hk-table`.

use std::io::Cursor;

use calamine::{Data, Reader, Sheets};
use serde::Serialize;

/// Parsed workbook with every sheet materialized eagerly.
///
/// Eager-parsing is fine for browser use because spreadsheets that are
/// large enough to make this expensive are also large enough that the
/// user is going to wait for *some* parse step anyway. We prefer one
/// upfront cost to confusing per-sheet lazy loading UX. If a workbook
/// turns out to be huge (>50 MB unpacked), the renderer can show a
/// progress indicator while this runs in a Web Worker.
#[derive(Debug, Serialize)]
pub struct Workbook {
    pub sheets: Vec<Sheet>,
}

#[derive(Debug, Serialize)]
pub struct Sheet {
    pub name: String,
    /// Row-major cells. `rows[0]` is the topmost row in the source sheet
    /// (often headers, but we don't promote — that's a renderer concern).
    pub rows: Vec<Vec<Cell>>,
    /// Width of the widest row. Some rows may be shorter; the renderer is
    /// expected to pad to `width` for tabular display.
    pub width: u32,
    pub height: u32,
}

/// Tagged cell value. Mirrors calamine's `Data` enum but with a stable
/// wire shape (serde tags + JS-friendly types) and without the chrono
/// dependency.
#[derive(Debug, Serialize)]
#[serde(tag = "kind", content = "value", rename_all = "lowercase")]
pub enum Cell {
    /// `null`/blank cell. Distinct from `Text("")` because consumers
    /// sometimes care about presence (e.g. trailing empties pad the grid
    /// without contributing data).
    Empty,
    Text(String),
    Number(f64),
    Bool(bool),
    /// Milliseconds since the Unix epoch. Spreadsheet date values are
    /// fractional days since 1900 (Excel) or 1904 (Mac/ODS); calamine
    /// hands us either a parsable string or a numeric `excel_serial`,
    /// which we convert via [`excel_serial_to_unix_ms`].
    Date(f64),
    /// Cell holds a formula that calamine refused to evaluate — usually a
    /// volatile or unsupported function. Renderers may want to show the
    /// formula text instead of an empty cell.
    Formula(String),
    /// Cell carries an error code (e.g. `#REF!`, `#DIV/0!`). Surfaced as
    /// the calamine error string so renderers can choose to display or
    /// hide it.
    Error(String),
}

/// Errors returned by [`parse_bytes`]. Kept as a flat enum (vs `anyhow`)
/// so the wasm-bindgen layer can map cleanly to a JS error message.
#[derive(Debug)]
pub enum ParseError {
    /// calamine couldn't open the workbook — usually unrecognized format
    /// or corrupted file. The string is calamine's own error message.
    Open(String),
    /// A specific sheet failed to read. Other sheets may have parsed fine,
    /// but `parse_bytes` returns the first failure.
    Sheet { name: String, source: String },
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ParseError::Open(s) => write!(f, "could not open workbook: {s}"),
            ParseError::Sheet { name, source } => {
                write!(f, "could not read sheet `{name}`: {source}")
            }
        }
    }
}

impl std::error::Error for ParseError {}

/// Parse a spreadsheet from raw bytes. Format is auto-detected by calamine
/// from the bytes (it sniffs zip magic for OOXML, OLE CFB for legacy `.xls`,
/// etc.) — no need for the caller to pass a MIME hint.
pub fn parse_bytes(bytes: &[u8]) -> Result<Workbook, ParseError> {
    let cursor = Cursor::new(bytes.to_vec());
    let mut workbook = open_workbook_auto_from_cursor(cursor)?;
    let names = workbook.sheet_names();

    let mut sheets = Vec::with_capacity(names.len());
    for name in names {
        let range = workbook
            .worksheet_range(&name)
            .map_err(|e| ParseError::Sheet {
                name: name.clone(),
                source: format!("{e}"),
            })?;

        let (height, width) = (range.height() as u32, range.width() as u32);
        let mut rows: Vec<Vec<Cell>> = Vec::with_capacity(height as usize);
        for row in range.rows() {
            let mut cells = Vec::with_capacity(row.len());
            for data in row {
                cells.push(convert_cell(data));
            }
            rows.push(cells);
        }
        sheets.push(Sheet {
            name,
            rows,
            width,
            height,
        });
    }

    Ok(Workbook { sheets })
}

/// calamine 0.32 exposes a single `open_workbook_auto_from_rs` for byte
/// streams. We wrap it so callers don't have to import calamine types.
fn open_workbook_auto_from_cursor(
    cursor: Cursor<Vec<u8>>,
) -> Result<Sheets<Cursor<Vec<u8>>>, ParseError> {
    calamine::open_workbook_auto_from_rs(cursor).map_err(|e| ParseError::Open(format!("{e}")))
}

fn convert_cell(data: &Data) -> Cell {
    match data {
        Data::Empty => Cell::Empty,
        Data::String(s) => Cell::Text(s.clone()),
        Data::Float(f) => Cell::Number(*f),
        Data::Int(i) => Cell::Number(*i as f64),
        Data::Bool(b) => Cell::Bool(*b),
        Data::DateTime(dt) => Cell::Date(excel_serial_to_unix_ms(dt.as_f64())),
        Data::DateTimeIso(s) | Data::DurationIso(s) => Cell::Text(s.clone()),
        Data::Error(e) => Cell::Error(format!("{e:?}")),
    }
}

/// Convert an Excel "serial" date (fractional days since 1899-12-30) to
/// Unix milliseconds. Matches Excel's 1900 epoch convention, including
/// Excel's leap-year bug (1900 is treated as a leap year — we don't
/// special-case it here because the renderer's `new Date(ms)` will round
/// to the right calendar date for any post-1900-03-01 value, which covers
/// every real-world data point).
fn excel_serial_to_unix_ms(serial: f64) -> f64 {
    // Excel epoch (1899-12-30 UTC) in Unix ms.
    const EXCEL_EPOCH_MS: f64 = -2_209_161_600_000.0;
    const MS_PER_DAY: f64 = 86_400_000.0;
    EXCEL_EPOCH_MS + serial * MS_PER_DAY
}

#[cfg(test)]
mod tests {
    use super::*;
    use calamine::ExcelDateTime;

    // ─── parse_bytes error paths ──────────────────────────────────────

    #[test]
    fn empty_bytes_errors_cleanly() {
        let err = parse_bytes(&[]).unwrap_err();
        assert!(matches!(err, ParseError::Open(_)));
    }

    #[test]
    fn garbage_bytes_errors_cleanly() {
        let err = parse_bytes(b"this is not a spreadsheet").unwrap_err();
        assert!(matches!(err, ParseError::Open(_)));
    }

    #[test]
    fn parse_error_display_includes_origin() {
        let err = ParseError::Open("something broke".into());
        assert!(format!("{err}").contains("something broke"));

        let err = ParseError::Sheet {
            name: "Sheet1".into(),
            source: "bad ref".into(),
        };
        let msg = format!("{err}");
        assert!(msg.contains("Sheet1"), "{msg}");
        assert!(msg.contains("bad ref"), "{msg}");
    }

    // ─── excel_serial_to_unix_ms anchor points ─────────────────────────

    #[test]
    fn excel_serial_unix_epoch() {
        // Excel serial 25569.0 == 1970-01-01 00:00 UTC == Unix ms 0.
        let ms = excel_serial_to_unix_ms(25569.0);
        assert!((ms - 0.0).abs() < 1.0, "expected ~0 ms, got {ms}");
    }

    #[test]
    fn excel_serial_half_day_is_noon() {
        // Serial 25569.5 == 1970-01-01 12:00 UTC == 12 hours in ms.
        let ms = excel_serial_to_unix_ms(25569.5);
        let expected = 12.0 * 3_600_000.0;
        assert!(
            (ms - expected).abs() < 1.0,
            "expected ~{expected} ms, got {ms}"
        );
    }

    #[test]
    fn excel_serial_before_unix_epoch_is_negative() {
        // Serial 1.0 == 1899-12-31 (Excel epoch + 1 day).
        // Should land well before Unix epoch → negative.
        let ms = excel_serial_to_unix_ms(1.0);
        assert!(ms < 0.0, "expected negative ms (pre-Unix), got {ms}");
    }

    // ─── convert_cell mapping ──────────────────────────────────────────
    //
    // `convert_cell` is the canonical mapping from calamine's `Data`
    // enum to our wire-stable `Cell` enum. Bugs here would silently
    // corrupt cell values for every spreadsheet — direct tests guard
    // against drift if calamine adds/changes variants.

    #[test]
    fn convert_empty_cell() {
        assert!(matches!(convert_cell(&Data::Empty), Cell::Empty));
    }

    #[test]
    fn convert_string_cell() {
        match convert_cell(&Data::String("hello".into())) {
            Cell::Text(s) => assert_eq!(s, "hello"),
            other => panic!("expected Text, got {other:?}"),
        }
    }

    #[test]
    fn convert_float_cell() {
        // Picked 2.5 (not 3.14) to dodge clippy::approx_constant — using
        // an approximation of π in test data triggers a false positive
        // suggesting `f64::consts::PI` instead. 2.5 has no constant
        // collision and still exercises the float path.
        match convert_cell(&Data::Float(2.5)) {
            Cell::Number(n) => assert!((n - 2.5).abs() < 1e-9),
            other => panic!("expected Number, got {other:?}"),
        }
    }

    #[test]
    fn convert_int_cell_widens_to_f64() {
        // Excel doesn't really have ints; calamine sometimes emits Int
        // for small whole-number values. We widen to f64 so the JS side
        // sees a single Number type for all numeric cells.
        match convert_cell(&Data::Int(42)) {
            Cell::Number(n) => assert_eq!(n, 42.0),
            other => panic!("expected Number, got {other:?}"),
        }
    }

    #[test]
    fn convert_bool_cell() {
        assert!(matches!(convert_cell(&Data::Bool(true)), Cell::Bool(true)));
        assert!(matches!(
            convert_cell(&Data::Bool(false)),
            Cell::Bool(false)
        ));
    }

    #[test]
    fn convert_datetime_cell_is_unix_ms() {
        // Build a DateTime at Excel serial 25569.0 (the Unix epoch).
        let dt = ExcelDateTime::new(25569.0, calamine::ExcelDateTimeType::DateTime, false);
        match convert_cell(&Data::DateTime(dt)) {
            Cell::Date(ms) => assert!(ms.abs() < 1.0, "expected ~0 ms, got {ms}"),
            other => panic!("expected Date, got {other:?}"),
        }
    }

    #[test]
    fn convert_iso_datetime_string_passes_through_as_text() {
        // ODS often emits dates as ISO strings rather than serials. Our
        // mapping preserves them verbatim as Text — the JS side decides
        // whether to parse them.
        let iso = "2024-01-15T10:30:00Z";
        match convert_cell(&Data::DateTimeIso(iso.into())) {
            Cell::Text(s) => assert_eq!(s, iso),
            other => panic!("expected Text, got {other:?}"),
        }
    }
}
