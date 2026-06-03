//! Immutable form schema + the inverse field → conditions index.
//!
//! Built once at schema-ingest time; the engine borrows `&FormSchema`
//! for the lifetime of a form. The dep index is the structural win
//! described in `README.md §6.1`: per-keystroke we walk only conditions
//! whose source field changed, not every condition in the form.

use engine_core::FxHashMap;

use crate::condition::{Condition, FieldIdx};

/// Which condition array a `RuleRef` points into. Used so the engine
/// knows which downstream bitset (visible / required / disabled) to
/// re-derive when the rule's parent field is touched.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RuleKind {
    ShowWhen,
    HideWhen,
    RequiredWhen,
    DisabledWhen,
}

/// Pointer back to a single condition: which field owns it, which array
/// it lives in, and its position within that array. Stored in the
/// inverse index so a `set_value` call walks straight to the affected
/// downstream fields without scanning the schema.
///
/// Today the engine re-evaluates the *entire* array on touch (the array
/// is short — typically 1–3 conditions); `index` is retained for the
/// future incremental case (e.g. caching per-condition truth bits).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RuleRef {
    pub owner: FieldIdx,
    pub kind: RuleKind,
    pub index: u16,
}

/// Definition of one field. `name` is the user-facing key; the engine
/// itself only ever uses the index. Validators land in Phase 3 — the
/// struct keeps a slot so the wire format can carry them ahead of time.
#[derive(Debug)]
pub struct FieldDef {
    pub name: Box<str>,
    pub required_baseline: bool,
    pub disabled_baseline: bool,
    pub show_when: Vec<Condition>,
    pub hide_when: Vec<Condition>,
    pub required_when: Vec<Condition>,
    pub disabled_when: Vec<Condition>,
}

impl FieldDef {
    pub fn has_any_condition(&self) -> bool {
        !self.show_when.is_empty()
            || !self.hide_when.is_empty()
            || !self.required_when.is_empty()
            || !self.disabled_when.is_empty()
    }
}

/// Immutable schema. Fields are stored in a `Vec` so `FieldIdx` ↔ slot
/// is constant. The dep index inverts the field → conditions relation;
/// it's keyed by the *source* field and yields `RuleRef`s into the
/// owning field's condition arrays.
#[derive(Debug)]
pub struct FormSchema {
    pub fields: Vec<FieldDef>,
    /// source `FieldIdx` → `RuleRef`s that read it.
    pub deps: FxHashMap<FieldIdx, Vec<RuleRef>>,
    /// Names → idx, populated once at ingest for `set_value(name, …)`.
    name_to_idx: FxHashMap<Box<str>, FieldIdx>,
    /// Owner indices that include a `Function`-op condition. Always
    /// re-evaluated when *any* dirty key would otherwise miss them
    /// (mirrors the TS `alwaysReeval` set — JS predicates may read
    /// state the engine can't track).
    pub function_owners: Vec<FieldIdx>,
}

impl FormSchema {
    /// Build a schema from a flat list of fields. Builds the dep index
    /// in one pass; total cost O(total_conditions).
    pub fn new(fields: Vec<FieldDef>) -> Self {
        let mut deps: FxHashMap<FieldIdx, Vec<RuleRef>> = FxHashMap::default();
        let mut function_owners: Vec<FieldIdx> = Vec::new();
        let mut name_to_idx: FxHashMap<Box<str>, FieldIdx> = FxHashMap::default();

        for (owner_usize, field) in fields.iter().enumerate() {
            let owner = owner_usize as FieldIdx;
            name_to_idx.insert(field.name.clone(), owner);

            let mut has_function = false;
            index_array(
                &field.show_when,
                owner,
                RuleKind::ShowWhen,
                &mut deps,
                &mut has_function,
            );
            index_array(
                &field.hide_when,
                owner,
                RuleKind::HideWhen,
                &mut deps,
                &mut has_function,
            );
            index_array(
                &field.required_when,
                owner,
                RuleKind::RequiredWhen,
                &mut deps,
                &mut has_function,
            );
            index_array(
                &field.disabled_when,
                owner,
                RuleKind::DisabledWhen,
                &mut deps,
                &mut has_function,
            );

            if has_function {
                function_owners.push(owner);
            }
        }

        Self {
            fields,
            deps,
            name_to_idx,
            function_owners,
        }
    }

    pub fn field_count(&self) -> FieldIdx {
        self.fields.len() as FieldIdx
    }

    pub fn field(&self, idx: FieldIdx) -> Option<&FieldDef> {
        self.fields.get(idx as usize)
    }

    pub fn idx_of(&self, name: &str) -> Option<FieldIdx> {
        self.name_to_idx.get(name).copied()
    }
}

fn index_array(
    arr: &[Condition],
    owner: FieldIdx,
    kind: RuleKind,
    deps: &mut FxHashMap<FieldIdx, Vec<RuleRef>>,
    has_function_out: &mut bool,
) {
    for (i, cond) in arr.iter().enumerate() {
        if matches!(cond.op, crate::condition::ConditionOp::Function) {
            *has_function_out = true;
        }
        deps.entry(cond.field_idx).or_default().push(RuleRef {
            owner,
            kind,
            index: i as u16,
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::condition::{Condition, ConditionOp};
    use crate::value::Value;

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
    fn dep_index_inverts_field_to_rules() {
        let mut country = fd("country");
        country.show_when = vec![c(1, ConditionOp::Equals, Value::String(Box::from("US")))]; // reads region (idx 1)

        let mut region = fd("region");
        region.required_when = vec![c(0, ConditionOp::NotEquals, Value::Null)]; // reads country (idx 0)

        let schema = FormSchema::new(vec![country, region]);

        // country (idx 0) drives region (idx 1)
        let from_country = &schema.deps[&0];
        assert_eq!(from_country.len(), 1);
        assert_eq!(
            from_country[0],
            RuleRef {
                owner: 1,
                kind: RuleKind::RequiredWhen,
                index: 0
            }
        );

        // region (idx 1) drives country (idx 0)
        let from_region = &schema.deps[&1];
        assert_eq!(from_region.len(), 1);
        assert_eq!(
            from_region[0],
            RuleRef {
                owner: 0,
                kind: RuleKind::ShowWhen,
                index: 0
            }
        );
    }

    #[test]
    fn idx_of_resolves_field_names() {
        let schema = FormSchema::new(vec![fd("a"), fd("b"), fd("c")]);
        assert_eq!(schema.idx_of("a"), Some(0));
        assert_eq!(schema.idx_of("c"), Some(2));
        assert_eq!(schema.idx_of("nope"), None);
    }

    #[test]
    fn function_owners_collected() {
        let mut a = fd("a");
        a.show_when = vec![c(1, ConditionOp::Function, Value::JsCallback(0))];

        let mut b = fd("b");
        b.show_when = vec![c(0, ConditionOp::Equals, Value::Bool(true))];

        let schema = FormSchema::new(vec![a, b]);
        assert_eq!(schema.function_owners, vec![0]);
    }

    #[test]
    fn fields_without_conditions_dont_appear_in_deps() {
        let schema = FormSchema::new(vec![fd("a"), fd("b")]);
        assert!(schema.deps.is_empty());
    }
}
