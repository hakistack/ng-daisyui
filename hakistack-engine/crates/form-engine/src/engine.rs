//! `FormEngine` — schema + state + per-keystroke condition kernel.
//!
//! Phase 2 surface area:
//!
//! - `set_value(idx, v)` / `set_values(pairs)` — write the value(s) and
//!   re-derive visibility / required / disabled for every dependent field.
//!   Returns the list of *observable* transitions as packed events.
//! - `is_visible / is_required / is_disabled` — O(1) reads against the
//!   internal bitsets.
//! - `recompute_all` — full pass used for the initial state and for
//!   external-signal ticks (no value diff). Mirrors the TS
//!   `affectedKeys(null)` branch.
//!
//! Validator pipeline (`validate_all`) is Phase 3 — not yet implemented.

use std::collections::BTreeSet;

use crate::condition::{FieldIdx, PredicateResolver, evaluate_all};
use crate::event::Event;
use crate::schema::FormSchema;
use crate::state::FormState;
use crate::value::Value;

/// Top-level handle. Owns the schema by value so the engine can be
/// moved across the WASM boundary as a single `Box`. The schema is
/// immutable after construction.
pub struct FormEngine {
    pub schema: FormSchema,
    pub state: FormState,
}

impl FormEngine {
    /// Build a new engine. The initial value map is all-`Null`; the
    /// constructor runs one full pass so visibility / required /
    /// disabled reflect baseline + initial conditions immediately.
    pub fn new(schema: FormSchema, resolver: &dyn PredicateResolver) -> Self {
        let mut state = FormState::new(schema.field_count());
        // Seed required/disabled with the per-field baselines.
        for (i, f) in schema.fields.iter().enumerate() {
            let i = i as FieldIdx;
            if f.required_baseline {
                state.required_effective.set(i);
            }
            if f.disabled_baseline {
                state.disabled_effective.set(i);
            }
        }
        let mut me = Self { schema, state };
        // Initial pass: re-derive every conditional field.
        let _ = me.recompute_all(resolver);
        me
    }

    // ── Read-only views ────────────────────────────────────────────────

    pub fn is_visible(&self, idx: FieldIdx) -> bool {
        if idx >= self.schema.field_count() {
            return false;
        }
        self.state.visible.get(idx)
    }

    pub fn is_required(&self, idx: FieldIdx) -> bool {
        if idx >= self.schema.field_count() {
            return false;
        }
        self.state.required_effective.get(idx)
    }

    pub fn is_disabled(&self, idx: FieldIdx) -> bool {
        if idx >= self.schema.field_count() {
            return false;
        }
        self.state.disabled_effective.get(idx)
    }

    pub fn value(&self, idx: FieldIdx) -> &Value {
        self.state.values.get(idx)
    }

    // ── Mutating API ───────────────────────────────────────────────────

    /// Write one value. No-ops (same value) return an empty list. Walks
    /// the dep index and re-derives status only for fields whose rules
    /// reference the changed field, plus every owner with a function
    /// predicate (those may read state we don't track).
    pub fn set_value(
        &mut self,
        idx: FieldIdx,
        value: Value,
        resolver: &dyn PredicateResolver,
    ) -> Vec<Event> {
        if !self.state.values.set(idx, value) {
            return Vec::new();
        }
        let mut events = Vec::new();
        self.recompute_affected_by(idx, resolver, &mut events);
        events
    }

    /// Batch write. Single dep-graph walk afterward; affected owners
    /// are unioned across every changed source field. Used for
    /// `patchValue` / initial-load.
    pub fn set_values(
        &mut self,
        pairs: impl IntoIterator<Item = (FieldIdx, Value)>,
        resolver: &dyn PredicateResolver,
    ) -> Vec<Event> {
        let mut changed = BTreeSet::new();
        for (idx, value) in pairs {
            if self.state.values.set(idx, value) {
                changed.insert(idx);
            }
        }
        if changed.is_empty() {
            return Vec::new();
        }
        let mut owners = BTreeSet::new();
        for src in &changed {
            if let Some(rules) = self.schema.deps.get(src) {
                for r in rules {
                    owners.insert(r.owner);
                }
            }
        }
        // Always include function-predicate owners (signal correctness).
        for o in &self.schema.function_owners {
            owners.insert(*o);
        }
        let mut events = Vec::new();
        for owner in owners {
            self.recompute_one(owner, resolver, &mut events);
        }
        events
    }

    /// Full recompute. Used by `new`, and by the TS adapter for
    /// external-signal ticks where it can't supply a dirty set.
    pub fn recompute_all(&mut self, resolver: &dyn PredicateResolver) -> Vec<Event> {
        let mut events = Vec::new();
        for owner_usize in 0..self.schema.fields.len() {
            let owner = owner_usize as FieldIdx;
            if !self.schema.fields[owner_usize].has_any_condition() {
                continue;
            }
            self.recompute_one(owner, resolver, &mut events);
        }
        events
    }

    // ── Internal helpers ────────────────────────────────────────────

    fn recompute_affected_by(
        &mut self,
        changed: FieldIdx,
        resolver: &dyn PredicateResolver,
        out: &mut Vec<Event>,
    ) {
        let mut owners: BTreeSet<FieldIdx> = BTreeSet::new();
        if let Some(rules) = self.schema.deps.get(&changed) {
            for r in rules {
                owners.insert(r.owner);
            }
        }
        for o in &self.schema.function_owners {
            owners.insert(*o);
        }
        for owner in owners {
            self.recompute_one(owner, resolver, out);
        }
    }

    /// Re-derive every status axis for `owner` from its conditions.
    /// Emits transition events only for axes that actually flipped.
    fn recompute_one(
        &mut self,
        owner: FieldIdx,
        resolver: &dyn PredicateResolver,
        out: &mut Vec<Event>,
    ) {
        let owner_usize = owner as usize;
        let Some(field) = self.schema.fields.get(owner_usize) else {
            return;
        };

        // ─ Visibility: hideWhen wins over showWhen; both default to "no opinion".
        let prior_visible = self.state.visible.get(owner);
        let next_visible = if !field.hide_when.is_empty()
            && evaluate_all(&field.hide_when, &self.state.values, resolver)
        {
            false
        } else if !field.show_when.is_empty() {
            evaluate_all(&field.show_when, &self.state.values, resolver)
        } else {
            true
        };
        if next_visible != prior_visible {
            if next_visible {
                self.state.visible.set(owner);
                out.push(Event::shown(owner));
            } else {
                self.state.visible.unset(owner);
                out.push(Event::hidden(owner));
            }
        }

        // ─ Required: baseline OR any requiredWhen.
        let prior_required = self.state.required_effective.get(owner);
        let next_required = field.required_baseline
            || (!field.required_when.is_empty()
                && evaluate_all(&field.required_when, &self.state.values, resolver));
        if next_required != prior_required {
            if next_required {
                self.state.required_effective.set(owner);
            } else {
                self.state.required_effective.unset(owner);
            }
            out.push(Event::required(owner, next_required));
        }

        // ─ Disabled: baseline OR any disabledWhen.
        let prior_disabled = self.state.disabled_effective.get(owner);
        let next_disabled = field.disabled_baseline
            || (!field.disabled_when.is_empty()
                && evaluate_all(&field.disabled_when, &self.state.values, resolver));
        if next_disabled != prior_disabled {
            if next_disabled {
                self.state.disabled_effective.set(owner);
            } else {
                self.state.disabled_effective.unset(owner);
            }
            out.push(Event::disabled(owner, next_disabled));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::condition::{Condition, ConditionOp, NoopResolver, PredicateId};
    use crate::event::EventKind;
    use crate::schema::FieldDef;

    fn fd(name: &str) -> FieldDef {
        FieldDef {
            name: Box::from(name),
            required_baseline: false,
            disabled_baseline: false,
            show_when: vec![],
            hide_when: vec![],
            required_when: vec![],
            disabled_when: vec![],
        }
    }

    fn c(field_idx: FieldIdx, op: ConditionOp, value: Value) -> Condition {
        Condition {
            field_idx,
            op,
            value,
        }
    }

    #[test]
    fn initial_pass_starts_visible_baseline_required_and_disabled() {
        let mut a = fd("a");
        a.required_baseline = true;
        let mut b = fd("b");
        b.disabled_baseline = true;
        let engine = FormEngine::new(FormSchema::new(vec![a, b]), &NoopResolver);
        assert!(engine.is_visible(0));
        assert!(engine.is_visible(1));
        assert!(engine.is_required(0));
        assert!(!engine.is_required(1));
        assert!(!engine.is_disabled(0));
        assert!(engine.is_disabled(1));
    }

    #[test]
    fn show_when_drives_visibility() {
        let a = fd("a");
        let mut b = fd("b");
        b.show_when = vec![c(0, ConditionOp::Equals, Value::Number(1.0))];

        let mut engine = FormEngine::new(FormSchema::new(vec![a, b]), &NoopResolver);
        // Initially a == Null ⇒ b hidden
        assert!(!engine.is_visible(1));
        let events = engine.set_value(0, Value::Number(1.0), &NoopResolver);
        assert!(engine.is_visible(1));
        assert!(
            events
                .iter()
                .any(|e| e.kind == EventKind::FieldShown && e.field == 1)
        );

        // Move back to non-matching value ⇒ hidden
        let events = engine.set_value(0, Value::Number(2.0), &NoopResolver);
        assert!(!engine.is_visible(1));
        assert!(
            events
                .iter()
                .any(|e| e.kind == EventKind::FieldHidden && e.field == 1)
        );
    }

    #[test]
    fn hide_when_overrides_show_when() {
        let a = fd("a");
        let b_clean = fd("b");
        let mut b = b_clean;
        b.show_when = vec![c(0, ConditionOp::Equals, Value::Number(1.0))];
        b.hide_when = vec![c(0, ConditionOp::Equals, Value::Number(1.0))];

        let mut engine = FormEngine::new(FormSchema::new(vec![a, b]), &NoopResolver);
        engine.set_value(0, Value::Number(1.0), &NoopResolver);
        assert!(!engine.is_visible(1), "hideWhen wins over showWhen");
    }

    #[test]
    fn required_when_flips_required_axis() {
        let a = fd("a");
        let mut b = fd("b");
        b.required_when = vec![c(0, ConditionOp::Equals, Value::Bool(true))];

        let mut engine = FormEngine::new(FormSchema::new(vec![a, b]), &NoopResolver);
        assert!(!engine.is_required(1));
        let events = engine.set_value(0, Value::Bool(true), &NoopResolver);
        assert!(engine.is_required(1));
        assert!(
            events
                .iter()
                .any(|e| e.kind == EventKind::RequiredChanged && e.field == 1 && e.payload == 1)
        );
        // Flip back
        let events = engine.set_value(0, Value::Bool(false), &NoopResolver);
        assert!(!engine.is_required(1));
        assert!(
            events
                .iter()
                .any(|e| e.kind == EventKind::RequiredChanged && e.field == 1 && e.payload == 0)
        );
    }

    #[test]
    fn disabled_when_flips_disabled_axis() {
        let a = fd("a");
        let mut b = fd("b");
        b.disabled_when = vec![c(0, ConditionOp::GreaterThan, Value::Number(10.0))];

        let mut engine = FormEngine::new(FormSchema::new(vec![a, b]), &NoopResolver);
        engine.set_value(0, Value::Number(20.0), &NoopResolver);
        assert!(engine.is_disabled(1));
        engine.set_value(0, Value::Number(5.0), &NoopResolver);
        assert!(!engine.is_disabled(1));
    }

    #[test]
    fn no_op_write_yields_empty_event_list() {
        let mut b = fd("b");
        b.show_when = vec![c(0, ConditionOp::Equals, Value::Number(1.0))];
        let mut engine = FormEngine::new(FormSchema::new(vec![fd("a"), b]), &NoopResolver);

        engine.set_value(0, Value::Number(1.0), &NoopResolver);
        let again = engine.set_value(0, Value::Number(1.0), &NoopResolver);
        assert!(again.is_empty(), "repeat write must not emit events");
    }

    #[test]
    fn dep_graph_only_recomputes_affected_owners() {
        // a — independent
        // b — show_when on a
        // c — show_when on a (also dependent on a)
        // d — show_when on a different field (e), not affected by changes to a
        let a = fd("a");
        let mut b = fd("b");
        b.show_when = vec![c(0, ConditionOp::Equals, Value::Number(1.0))];
        let mut cc = fd("c");
        cc.show_when = vec![c(0, ConditionOp::Equals, Value::Number(1.0))];
        let mut d = fd("d");
        d.show_when = vec![c(4, ConditionOp::Equals, Value::Number(1.0))]; // reads idx 4
        let e = fd("e");

        let mut engine = FormEngine::new(FormSchema::new(vec![a, b, cc, d, e]), &NoopResolver);
        // Initial pass should hide b/c/d (their conditions don't hold).
        assert!(!engine.is_visible(1));
        assert!(!engine.is_visible(2));
        assert!(!engine.is_visible(3));
        assert!(engine.is_visible(4));

        // Touch a (idx 0): only b and c should flip.
        let events = engine.set_value(0, Value::Number(1.0), &NoopResolver);
        let flipped: BTreeSet<FieldIdx> = events.iter().map(|e| e.field).collect();
        assert_eq!(
            flipped,
            [1, 2].into_iter().collect::<BTreeSet<_>>(),
            "only b and c should be touched"
        );
        assert!(engine.is_visible(1));
        assert!(engine.is_visible(2));
        assert!(!engine.is_visible(3), "d unaffected by changes to a");
    }

    #[test]
    fn set_values_batches_into_one_pass() {
        let a = fd("a");
        let mut b = fd("b");
        b.show_when = vec![c(0, ConditionOp::Equals, Value::Number(1.0))];
        let mut cc = fd("c");
        cc.required_when = vec![c(0, ConditionOp::Equals, Value::Number(1.0))];

        let mut engine = FormEngine::new(FormSchema::new(vec![a, b, cc]), &NoopResolver);
        let events = engine.set_values([(0, Value::Number(1.0))], &NoopResolver);
        assert!(engine.is_visible(1));
        assert!(engine.is_required(2));
        // One pass: two events (b shown, c required).
        assert_eq!(events.len(), 2);
    }

    #[test]
    fn function_owner_always_reevaluated_even_when_dep_doesnt_match() {
        // signal-bound has a function predicate. Even when an unrelated
        // field changes, it must be re-evaluated.
        struct R {
            allow: bool,
        }
        impl PredicateResolver for R {
            fn resolve(&self, _id: PredicateId, _values: &crate::state::ValueMap) -> bool {
                self.allow
            }
        }

        let mut signal_bound = fd("signal_bound");
        // The condition's field_idx is 0 (`a`), but it's a function op so
        // its truth is resolver-driven, not value-driven. The engine still
        // includes signal_bound on every recompute because of the
        // function-owner set.
        signal_bound.show_when = vec![c(0, ConditionOp::Function, Value::JsCallback(42))];

        let unrelated = fd("unrelated");
        let mut engine = FormEngine::new(
            FormSchema::new(vec![fd("a"), signal_bound, unrelated]),
            &R { allow: false },
        );
        // Initial pass with allow=false ⇒ signal_bound hidden.
        assert!(!engine.is_visible(1));

        // Touch an unrelated field with a permissive resolver. The
        // function-owner set must still re-evaluate signal_bound.
        let _ = engine.set_value(2, Value::String(Box::from("anything")), &R { allow: true });
        assert!(
            engine.is_visible(1),
            "function-owner should re-eval on any change"
        );
    }

    #[test]
    fn out_of_range_reads_return_safe_defaults() {
        let engine = FormEngine::new(FormSchema::new(vec![fd("a")]), &NoopResolver);
        assert!(!engine.is_visible(99));
        assert!(!engine.is_required(99));
        assert!(!engine.is_disabled(99));
    }
}
