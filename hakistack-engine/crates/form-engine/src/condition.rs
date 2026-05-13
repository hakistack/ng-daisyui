//! Single-condition operator dispatch.
//!
//! Mirrors the seven TS operators in `dynamic-form.types.ts`
//! (`ConditionalLogic.operator`). The eighth — `'function'` — becomes
//! `ConditionOp::Function` with the predicate id stored in
//! `Condition::value` as `Value::JsCallback(id)`; resolution happens via
//! a `PredicateResolver` the engine borrows during evaluation.

use crate::value::Value;

pub type FieldIdx = u32;

/// Stable predicate id assigned by the JS adapter at schema ingest.
pub type PredicateId = u32;

/// Operator a condition uses to compare `formValues[field_idx]` against
/// `Condition::value`. Variants are kept identical in name and intent to
/// the TS `ConditionalLogic.operator` union so the wire schema can just
/// carry the string.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConditionOp {
    Equals,
    NotEquals,
    Contains,
    GreaterThan,
    LessThan,
    In,
    NotIn,
    Function,
}

/// One row in a field's `show_when` / `hide_when` / `required_when` /
/// `disabled_when` arrays. `field_idx` is the *source* field whose value
/// drives the comparison.
#[derive(Debug, Clone)]
pub struct Condition {
    pub field_idx: FieldIdx,
    pub op: ConditionOp,
    pub value: Value,
}

/// Resolver for user-supplied predicates. The pure-Rust tests in this
/// crate use a stub; the WASM adapter implements this with a
/// `js_sys::Function` lookup table.
pub trait PredicateResolver {
    /// Resolve `id` against the current value map. The map is keyed by
    /// `FieldIdx` so the resolver can look up form values by index — the
    /// JS side translates index back to string key before calling user
    /// code. Returning `false` is the "predicate threw / unknown id"
    /// safety net; mirrors the TS `try/catch` in
    /// `ConditionEngine.evaluateCondition`.
    fn resolve(&self, id: PredicateId, values: &crate::state::ValueMap) -> bool;
}

/// Trivial resolver — used as a `&dyn` placeholder when a form has no
/// function-operator conditions. Always returns `false`.
pub struct NoopResolver;
impl PredicateResolver for NoopResolver {
    fn resolve(&self, _id: PredicateId, _values: &crate::state::ValueMap) -> bool {
        false
    }
}

/// Evaluate a single condition. Mirrors
/// `ConditionEngine.evaluateCondition` in `condition-engine.ts` —
/// operator-for-operator, including the JS type-mismatch guards.
pub fn evaluate(
    cond: &Condition,
    values: &crate::state::ValueMap,
    resolver: &dyn PredicateResolver,
) -> bool {
    let lhs = values.get(cond.field_idx);
    let rhs = &cond.value;

    match cond.op {
        ConditionOp::Function => match rhs {
            Value::JsCallback(id) => resolver.resolve(*id, values),
            _ => false,
        },
        ConditionOp::Equals => lhs == rhs,
        ConditionOp::NotEquals => lhs != rhs,
        ConditionOp::Contains => match (lhs, rhs) {
            (Value::String(a), Value::String(b)) => a.contains(b.as_ref()),
            _ => false,
        },
        ConditionOp::GreaterThan => match (lhs.as_number(), rhs.as_number()) {
            (Some(a), Some(b)) => a > b,
            _ => false,
        },
        ConditionOp::LessThan => match (lhs.as_number(), rhs.as_number()) {
            (Some(a), Some(b)) => a < b,
            _ => false,
        },
        ConditionOp::In => match rhs.as_array() {
            Some(arr) => arr.iter().any(|v| v == lhs),
            None => false,
        },
        ConditionOp::NotIn => match rhs.as_array() {
            Some(arr) => !arr.iter().any(|v| v == lhs),
            None => false,
        },
    }
}

/// AND-aggregate. Empty list ⇒ `true`. Mirrors
/// `ConditionEngine.evaluateConditions`.
pub fn evaluate_all(
    conditions: &[Condition],
    values: &crate::state::ValueMap,
    resolver: &dyn PredicateResolver,
) -> bool {
    for c in conditions {
        if !evaluate(c, values, resolver) {
            return false;
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::ValueMap;

    fn vm(pairs: &[(FieldIdx, Value)]) -> ValueMap {
        let mut v = ValueMap::with_field_count(pairs.iter().map(|(i, _)| *i + 1).max().unwrap_or(0));
        for (i, val) in pairs {
            v.set(*i, val.clone());
        }
        v
    }

    fn cond(idx: FieldIdx, op: ConditionOp, value: Value) -> Condition {
        Condition { field_idx: idx, op, value }
    }

    #[test]
    fn equals_and_not_equals() {
        let values = vm(&[(0, Value::String(Box::from("hi")))]);
        assert!(evaluate(&cond(0, ConditionOp::Equals, Value::String(Box::from("hi"))), &values, &NoopResolver));
        assert!(!evaluate(&cond(0, ConditionOp::Equals, Value::String(Box::from("bye"))), &values, &NoopResolver));
        assert!(evaluate(&cond(0, ConditionOp::NotEquals, Value::String(Box::from("bye"))), &values, &NoopResolver));
    }

    #[test]
    fn contains_requires_two_strings() {
        let s = vm(&[(0, Value::String(Box::from("hello world")))]);
        assert!(evaluate(&cond(0, ConditionOp::Contains, Value::String(Box::from("world"))), &s, &NoopResolver));
        // numeric/string mismatch is false, never panic
        let n = vm(&[(0, Value::Number(42.0))]);
        assert!(!evaluate(&cond(0, ConditionOp::Contains, Value::String(Box::from("4"))), &n, &NoopResolver));
    }

    #[test]
    fn greater_less_only_for_numbers() {
        let v = vm(&[(0, Value::Number(5.0))]);
        assert!(evaluate(&cond(0, ConditionOp::GreaterThan, Value::Number(3.0)), &v, &NoopResolver));
        assert!(evaluate(&cond(0, ConditionOp::LessThan, Value::Number(10.0)), &v, &NoopResolver));
        // string vs number → false
        let s = vm(&[(0, Value::String(Box::from("a")))]);
        assert!(!evaluate(&cond(0, ConditionOp::GreaterThan, Value::Number(0.0)), &s, &NoopResolver));
    }

    #[test]
    fn in_and_not_in_require_array_operand() {
        let v = vm(&[(0, Value::String(Box::from("admin")))]);
        let arr = Value::Array(vec![Value::String(Box::from("admin")), Value::String(Box::from("user"))]);
        assert!(evaluate(&cond(0, ConditionOp::In, arr.clone()), &v, &NoopResolver));
        assert!(!evaluate(&cond(0, ConditionOp::NotIn, arr), &v, &NoopResolver));
        // non-array operand → false (matches JS `Array.isArray` guard)
        assert!(!evaluate(&cond(0, ConditionOp::In, Value::String(Box::from("admin"))), &v, &NoopResolver));
    }

    #[test]
    fn function_dispatches_to_resolver_by_id() {
        struct R;
        impl PredicateResolver for R {
            fn resolve(&self, id: PredicateId, _values: &ValueMap) -> bool {
                id == 7
            }
        }
        let values = ValueMap::with_field_count(1);
        assert!(evaluate(&cond(0, ConditionOp::Function, Value::JsCallback(7)), &values, &R));
        assert!(!evaluate(&cond(0, ConditionOp::Function, Value::JsCallback(8)), &values, &R));
        // function op without JsCallback rhs → false
        assert!(!evaluate(&cond(0, ConditionOp::Function, Value::Number(1.0)), &values, &R));
    }

    #[test]
    fn evaluate_all_short_circuits_on_first_false() {
        let v = vm(&[(0, Value::Number(1.0)), (1, Value::String(Box::from("hi")))]);
        let conds = vec![
            cond(0, ConditionOp::Equals, Value::Number(99.0)), // false — short-circuit
            cond(1, ConditionOp::Function, Value::JsCallback(0)), // would resolve to false but never run
        ];
        assert!(!evaluate_all(&conds, &v, &NoopResolver));
    }

    #[test]
    fn empty_condition_list_is_true() {
        assert!(evaluate_all(&[], &ValueMap::with_field_count(0), &NoopResolver));
    }

    #[test]
    fn missing_field_value_reads_as_null() {
        // field_idx 5 was never set; values for it default to Null.
        let v = ValueMap::with_field_count(10);
        assert!(evaluate(&cond(5, ConditionOp::Equals, Value::Null), &v, &NoopResolver));
        assert!(!evaluate(&cond(5, ConditionOp::Equals, Value::Number(0.0)), &v, &NoopResolver));
    }
}
