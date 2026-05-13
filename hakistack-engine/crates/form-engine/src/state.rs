//! Runtime state held by `FormEngine`.
//!
//! `ValueMap` is the engine's value map — indexed by `FieldIdx` so the
//! per-keystroke read path is one bounds check + one slot index, no
//! hashing. It's stored on the stack of the `FormEngine` and borrowed by
//! `condition::evaluate`.
//!
//! `FormState` adds the three boolean status bitsets and an effective-
//! values cache. Bitsets, not hashmaps, because each per-keystroke
//! visibility check is a `Bitset::get(idx)` — one machine-word load.

use engine_core::bitset::Bitset;

use crate::condition::FieldIdx;
use crate::value::Value;

/// Engine value map. Storage is a dense `Vec<Value>` indexed by
/// `FieldIdx`; unset slots default to `Value::Null` and remain valid
/// reads. Capacity is fixed at construction; the schema is immutable
/// after ingest so the slot count never grows.
#[derive(Debug, Clone)]
pub struct ValueMap {
    values: Vec<Value>,
}

impl ValueMap {
    pub fn with_field_count(n: FieldIdx) -> Self {
        Self {
            values: vec![Value::Null; n as usize],
        }
    }

    pub fn len(&self) -> usize {
        self.values.len()
    }

    pub fn is_empty(&self) -> bool {
        self.values.is_empty()
    }

    /// Read a value. Out-of-range indices return `&Value::Null` rather
    /// than panicking — keeps the hot evaluator branch-free, and an
    /// unknown field can never produce a panic from JS.
    pub fn get(&self, idx: FieldIdx) -> &Value {
        self.values.get(idx as usize).unwrap_or(&Value::Null)
    }

    /// Write a value. Out-of-range indices are silently ignored — the
    /// schema is the source of truth; a stray `set_value("oops", …)`
    /// call from JS shouldn't crash the kernel.
    ///
    /// Returns `true` when the new value differs from the prior one.
    /// Callers (the engine's `set_value`) use this to short-circuit when
    /// a write is a no-op and skip the dep-graph walk.
    pub fn set(&mut self, idx: FieldIdx, value: Value) -> bool {
        let slot = match self.values.get_mut(idx as usize) {
            Some(s) => s,
            None => return false,
        };
        if *slot == value {
            return false;
        }
        *slot = value;
        true
    }
}

/// Three boolean axes per field, packed as bitsets for word-sized AND
/// composition. `visible` defaults to "all on"; `required_effective`
/// starts as the baseline `required: bool` per field; `disabled_effective`
/// starts as the baseline `disabled: bool` per field.
#[derive(Debug)]
pub struct FormState {
    pub values: ValueMap,
    pub visible: Bitset,
    pub required_effective: Bitset,
    pub disabled_effective: Bitset,
}

impl FormState {
    pub fn new(field_count: FieldIdx) -> Self {
        let mut visible = Bitset::with_capacity(field_count);
        visible.fill();
        Self {
            values: ValueMap::with_field_count(field_count),
            visible,
            required_effective: Bitset::with_capacity(field_count),
            disabled_effective: Bitset::with_capacity(field_count),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn value_map_defaults_to_null_and_set_detects_change() {
        let mut vm = ValueMap::with_field_count(3);
        assert_eq!(vm.get(0), &Value::Null);
        assert!(vm.set(0, Value::Number(1.0)));
        assert_eq!(vm.get(0), &Value::Number(1.0));
        // No-op write
        assert!(!vm.set(0, Value::Number(1.0)));
        // Differs ⇒ changed
        assert!(vm.set(0, Value::Number(2.0)));
    }

    #[test]
    fn out_of_range_read_returns_null_write_is_ignored() {
        let mut vm = ValueMap::with_field_count(2);
        assert_eq!(vm.get(99), &Value::Null);
        assert!(!vm.set(99, Value::Number(1.0))); // ignored
        // Existing slots unchanged
        assert_eq!(vm.get(0), &Value::Null);
        assert_eq!(vm.get(1), &Value::Null);
    }

    #[test]
    fn form_state_initial_visibility_is_all_on() {
        let st = FormState::new(5);
        for i in 0..5 {
            assert!(st.visible.get(i));
            assert!(!st.required_effective.get(i));
            assert!(!st.disabled_effective.get(i));
        }
    }
}
