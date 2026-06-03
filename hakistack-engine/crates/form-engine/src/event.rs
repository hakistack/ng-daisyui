//! Packed event protocol for the JS↔WASM boundary.
//!
//! Engine emits events as fixed-shape `(kind, field, payload)` triples;
//! the WASM adapter flattens a `Vec<Event>` into a `Uint32Array` so JS
//! reads with one bulk copy. The TS adapter switches on `kind` to fan
//! out to the component's `visibility / required / disabled` effects.

use crate::condition::FieldIdx;

/// Event kinds. The numeric tags are part of the wire contract and must
/// stay stable — the TS event dispatcher casts the first u32 of each
/// triple to this enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum EventKind {
    FieldShown = 0,
    FieldHidden = 1,
    RequiredChanged = 2,
    DisabledChanged = 3,
    // Reserved for Phase 3: ErrorsChanged = 4.
}

/// A single change emitted by `set_value` / `set_values`. The engine
/// only fires events for *observable* transitions: a value write that
/// re-derives the same visibility/required/disabled state contributes
/// nothing here. The component can therefore skip change-detection work
/// when the event list is empty.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Event {
    pub kind: EventKind,
    pub field: FieldIdx,
    /// Currently 0/1 for the bool-axis events. Phase 3 will use this
    /// for the error bitmask.
    pub payload: u32,
}

impl Event {
    pub fn shown(field: FieldIdx) -> Self {
        Self {
            kind: EventKind::FieldShown,
            field,
            payload: 0,
        }
    }
    pub fn hidden(field: FieldIdx) -> Self {
        Self {
            kind: EventKind::FieldHidden,
            field,
            payload: 0,
        }
    }
    pub fn required(field: FieldIdx, required: bool) -> Self {
        Self {
            kind: EventKind::RequiredChanged,
            field,
            payload: required as u32,
        }
    }
    pub fn disabled(field: FieldIdx, disabled: bool) -> Self {
        Self {
            kind: EventKind::DisabledChanged,
            field,
            payload: disabled as u32,
        }
    }

    /// Pack into a `(kind, field, payload)` triple — same layout the
    /// WASM adapter will write into the `Uint32Array`.
    pub fn pack(&self) -> [u32; 3] {
        [self.kind as u32, self.field, self.payload]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn packed_layout_is_kind_field_payload() {
        let e = Event::required(7, true);
        assert_eq!(e.pack(), [EventKind::RequiredChanged as u32, 7, 1]);
        let h = Event::hidden(3);
        assert_eq!(h.pack(), [EventKind::FieldHidden as u32, 3, 0]);
    }
}
