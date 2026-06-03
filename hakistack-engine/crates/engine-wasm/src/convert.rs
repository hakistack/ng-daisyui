//! Conversions between [`crate::wire`] types and the kernel types in
//! `table_engine`. Split out so `lib.rs` can stay focused on the WASM API
//! shape and `wire.rs` can stay focused on the JSON shape.

use crate::wire::*;
use form_engine::{
    Condition as KernelCondition, ConditionOp as KernelConditionOp, FieldDef as KernelFieldDef,
    FormSchema as KernelFormSchema, Value as KernelValue,
};
use search_engine::{fuzzy::FuzzyOpts as KernelFuzzyOpts, pdf::SearchOpts as KernelPdfOpts};
use table_engine::{
    aggregate::{AggFn as KernelAggFn, AggResult as KernelAggResult},
    filter::{
        BoolOp as KernelBoolOp, ColumnFilter as KernelColumnFilter, DateOp as KernelDateOp,
        NumberOp as KernelNumberOp, TextOp as KernelTextOp,
    },
    group::{Group as KernelGroup, GroupKey as KernelGroupKey},
    search::{SearchMode as KernelSearchMode, SearchSpec as KernelSearchSpec},
    sort::{
        Direction as KernelDirection, NullsPosition as KernelNullsPosition,
        SortSpec as KernelSortSpec,
    },
};
use tree_engine::filter::{FilterMode as KernelTreeFilterMode, FilterSpec as KernelTreeFilterSpec};

// ─── Filters ────────────────────────────────────────────────────────────────

impl From<WireFilter> for KernelColumnFilter {
    fn from(w: WireFilter) -> Self {
        match w {
            WireFilter::Text { column, op } => KernelColumnFilter::Text {
                column,
                op: op.into(),
            },
            WireFilter::Number { column, op } => KernelColumnFilter::Number {
                column,
                op: op.into(),
            },
            WireFilter::Bool { column, op } => KernelColumnFilter::Bool {
                column,
                op: op.into(),
            },
            WireFilter::Date { column, op } => KernelColumnFilter::Date {
                column,
                op: op.into(),
            },
        }
    }
}

impl From<WireTextOp> for KernelTextOp {
    fn from(w: WireTextOp) -> Self {
        match w {
            WireTextOp::Contains { needle } => KernelTextOp::Contains(needle),
            WireTextOp::StartsWith { needle } => KernelTextOp::StartsWith(needle),
            WireTextOp::EndsWith { needle } => KernelTextOp::EndsWith(needle),
            WireTextOp::Equals { needle } => KernelTextOp::Equals(needle),
            WireTextOp::NotEquals { needle } => KernelTextOp::NotEquals(needle),
            WireTextOp::NotContains { needle } => KernelTextOp::NotContains(needle),
            WireTextOp::IsEmpty => KernelTextOp::IsEmpty,
            WireTextOp::IsNotEmpty => KernelTextOp::IsNotEmpty,
        }
    }
}

impl From<WireNumberOp> for KernelNumberOp {
    fn from(w: WireNumberOp) -> Self {
        match w {
            WireNumberOp::Eq { value } => KernelNumberOp::Eq(value),
            WireNumberOp::NotEq { value } => KernelNumberOp::NotEq(value),
            WireNumberOp::Gt { value } => KernelNumberOp::Gt(value),
            WireNumberOp::Lt { value } => KernelNumberOp::Lt(value),
            WireNumberOp::Gte { value } => KernelNumberOp::Gte(value),
            WireNumberOp::Lte { value } => KernelNumberOp::Lte(value),
            WireNumberOp::Between { lo, hi } => KernelNumberOp::Between(lo, hi),
            WireNumberOp::In { values } => KernelNumberOp::In(values),
            WireNumberOp::NotIn { values } => KernelNumberOp::NotIn(values),
            WireNumberOp::IsEmpty => KernelNumberOp::IsEmpty,
            WireNumberOp::IsNotEmpty => KernelNumberOp::IsNotEmpty,
        }
    }
}

impl From<WireBoolOp> for KernelBoolOp {
    fn from(w: WireBoolOp) -> Self {
        match w {
            WireBoolOp::Eq { value } => KernelBoolOp::Eq(value),
            WireBoolOp::IsEmpty => KernelBoolOp::IsEmpty,
            WireBoolOp::IsNotEmpty => KernelBoolOp::IsNotEmpty,
        }
    }
}

impl From<WireDateOp> for KernelDateOp {
    fn from(w: WireDateOp) -> Self {
        match w {
            WireDateOp::Eq { value } => KernelDateOp::Eq(value as i64),
            WireDateOp::Gt { value } => KernelDateOp::Gt(value as i64),
            WireDateOp::Lt { value } => KernelDateOp::Lt(value as i64),
            WireDateOp::Gte { value } => KernelDateOp::Gte(value as i64),
            WireDateOp::Lte { value } => KernelDateOp::Lte(value as i64),
            WireDateOp::Between { lo, hi } => KernelDateOp::Between(lo as i64, hi as i64),
            WireDateOp::IsEmpty => KernelDateOp::IsEmpty,
            WireDateOp::IsNotEmpty => KernelDateOp::IsNotEmpty,
        }
    }
}

// ─── Sort ───────────────────────────────────────────────────────────────────

impl From<WireSortSpec> for KernelSortSpec {
    fn from(w: WireSortSpec) -> Self {
        KernelSortSpec {
            column: w.column,
            direction: match w.direction {
                WireDirection::Asc => KernelDirection::Asc,
                WireDirection::Desc => KernelDirection::Desc,
            },
            nulls: match w.nulls {
                WireNullsPosition::First => KernelNullsPosition::First,
                WireNullsPosition::Last => KernelNullsPosition::Last,
            },
        }
    }
}

// ─── Search ─────────────────────────────────────────────────────────────────

impl From<WireSearchSpec> for KernelSearchSpec {
    fn from(w: WireSearchSpec) -> Self {
        KernelSearchSpec {
            term: w.term,
            mode: w.mode.into(),
            columns: w.columns,
            case_sensitive: w.case_sensitive,
        }
    }
}

impl From<WireSearchMode> for KernelSearchMode {
    fn from(w: WireSearchMode) -> Self {
        match w {
            WireSearchMode::Contains => KernelSearchMode::Contains,
            WireSearchMode::StartsWith => KernelSearchMode::StartsWith,
            WireSearchMode::Exact => KernelSearchMode::Exact,
        }
    }
}

// ─── Aggregate ──────────────────────────────────────────────────────────────

impl From<WireAggFn> for KernelAggFn {
    fn from(w: WireAggFn) -> Self {
        match w {
            WireAggFn::Sum => KernelAggFn::Sum,
            WireAggFn::Avg => KernelAggFn::Avg,
            WireAggFn::Min => KernelAggFn::Min,
            WireAggFn::Max => KernelAggFn::Max,
            WireAggFn::Count => KernelAggFn::Count,
            WireAggFn::Median => KernelAggFn::Median,
            WireAggFn::TrueCount => KernelAggFn::TrueCount,
            WireAggFn::FalseCount => KernelAggFn::FalseCount,
            WireAggFn::DistinctCount => KernelAggFn::DistinctCount,
        }
    }
}

impl From<KernelAggResult> for WireAggResult {
    fn from(k: KernelAggResult) -> Self {
        match k {
            KernelAggResult::None => WireAggResult::None,
            KernelAggResult::Number(v) => WireAggResult::Number { value: v },
            KernelAggResult::Date(v) => WireAggResult::Date { value: v as f64 },
            KernelAggResult::Count(v) => WireAggResult::Count { value: v },
        }
    }
}

// ─── Fuzzy search ──────────────────────────────────────────────────────────

impl From<WireFuzzyOpts> for KernelFuzzyOpts {
    fn from(w: WireFuzzyOpts) -> Self {
        KernelFuzzyOpts {
            case_sensitive: w.case_sensitive,
            // 0 sentinel → unlimited
            max_results: if w.max_results == 0 {
                None
            } else {
                Some(w.max_results)
            },
        }
    }
}

// ─── PDF search ────────────────────────────────────────────────────────────

impl From<WirePdfSearchOpts> for KernelPdfOpts {
    fn from(w: WirePdfSearchOpts) -> Self {
        KernelPdfOpts {
            case_sensitive: w.case_sensitive,
            whole_word: w.whole_word,
            max_hits: w.max_hits,
        }
    }
}

// ─── Tree (filter / flatten / cascade) ─────────────────────────────────────

impl From<WireTreeFilterSpec> for KernelTreeFilterSpec {
    fn from(w: WireTreeFilterSpec) -> Self {
        KernelTreeFilterSpec {
            term: w.term,
            mode: w.mode.into(),
            case_sensitive: w.case_sensitive,
        }
    }
}

impl From<WireTreeFilterMode> for KernelTreeFilterMode {
    fn from(w: WireTreeFilterMode) -> Self {
        match w {
            WireTreeFilterMode::Lenient => KernelTreeFilterMode::Lenient,
            WireTreeFilterMode::Strict => KernelTreeFilterMode::Strict,
        }
    }
}

// ─── Group ──────────────────────────────────────────────────────────────────

impl From<KernelGroup> for WireGroup {
    fn from(g: KernelGroup) -> Self {
        // Note: KernelGroup doesn't carry depth itself; we fill depth in
        // when walking. Use a helper to recurse with a starting depth.
        from_kernel_group(g, 0)
    }
}

fn from_kernel_group(g: KernelGroup, depth: u32) -> WireGroup {
    WireGroup {
        key: g.key.into(),
        indices: g.indices,
        depth,
        children: g
            .children
            .into_iter()
            .map(|c| from_kernel_group(c, depth + 1))
            .collect(),
    }
}

impl From<KernelGroupKey> for WireGroupKey {
    fn from(k: KernelGroupKey) -> Self {
        match k {
            KernelGroupKey::Null => WireGroupKey::Null,
            KernelGroupKey::Text(s) => WireGroupKey::Text {
                value: (*s).to_string(),
            },
            KernelGroupKey::Number(n) => WireGroupKey::Number { value: n },
            KernelGroupKey::Bool(b) => WireGroupKey::Bool { value: b },
            KernelGroupKey::Date(d) => WireGroupKey::Date { value: d as f64 },
        }
    }
}

// ─── Form engine ────────────────────────────────────────────────────────────

impl From<WireFormValue> for KernelValue {
    fn from(w: WireFormValue) -> Self {
        match w {
            WireFormValue::Null => KernelValue::Null,
            WireFormValue::Bool { value } => KernelValue::Bool(value),
            WireFormValue::Number { value } => KernelValue::Number(value),
            WireFormValue::String { value } => KernelValue::String(value.into_boxed_str()),
            WireFormValue::Array { items } => {
                KernelValue::Array(items.into_iter().map(Into::into).collect())
            }
            WireFormValue::Callback { id } => KernelValue::JsCallback(id),
        }
    }
}

impl From<WireFormOp> for KernelConditionOp {
    fn from(w: WireFormOp) -> Self {
        match w {
            WireFormOp::Equals => KernelConditionOp::Equals,
            WireFormOp::NotEquals => KernelConditionOp::NotEquals,
            WireFormOp::Contains => KernelConditionOp::Contains,
            WireFormOp::GreaterThan => KernelConditionOp::GreaterThan,
            WireFormOp::LessThan => KernelConditionOp::LessThan,
            WireFormOp::In => KernelConditionOp::In,
            WireFormOp::NotIn => KernelConditionOp::NotIn,
            WireFormOp::Function => KernelConditionOp::Function,
        }
    }
}

impl From<WireFormCondition> for KernelCondition {
    fn from(w: WireFormCondition) -> Self {
        KernelCondition {
            field_idx: w.field,
            op: w.op.into(),
            value: w.value.into(),
        }
    }
}

impl From<WireFormField> for KernelFieldDef {
    fn from(w: WireFormField) -> Self {
        KernelFieldDef {
            name: w.name.into_boxed_str(),
            required_baseline: w.required_baseline,
            disabled_baseline: w.disabled_baseline,
            show_when: w.show_when.into_iter().map(Into::into).collect(),
            hide_when: w.hide_when.into_iter().map(Into::into).collect(),
            required_when: w.required_when.into_iter().map(Into::into).collect(),
            disabled_when: w.disabled_when.into_iter().map(Into::into).collect(),
        }
    }
}

impl From<WireFormSchema> for KernelFormSchema {
    fn from(w: WireFormSchema) -> Self {
        KernelFormSchema::new(w.fields.into_iter().map(Into::into).collect())
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use table_engine::dataset::Dataset;
    use table_engine::filter::apply as apply_filters;

    #[test]
    fn wire_text_filter_round_trips_to_kernel() {
        // Simulate a JS-side filter object deserialized into our wire type.
        let json = r#"{"kind":"text","column":0,"op":{"kind":"contains","needle":"ali"}}"#;
        let wire: WireFilter = serde_json::from_str(json).unwrap();
        let kernel: KernelColumnFilter = wire.into();

        let ds = Dataset::builder(3)
            .add_text(
                0,
                vec![
                    Some("Alice".into()),
                    Some("Bob".into()),
                    Some("aliCe".into()),
                ],
            )
            .build();
        let mask = apply_filters(&ds, &[kernel]);
        let matched: Vec<u32> = mask.iter().collect();
        assert_eq!(matched, vec![0, 2]);
    }

    #[test]
    fn wire_number_between_round_trips() {
        let json = r#"{"kind":"number","column":0,"op":{"kind":"between","lo":10,"hi":30}}"#;
        let wire: WireFilter = serde_json::from_str(json).unwrap();
        let kernel: KernelColumnFilter = wire.into();
        match kernel {
            KernelColumnFilter::Number {
                op: KernelNumberOp::Between(lo, hi),
                ..
            } => {
                assert_eq!(lo, 10.0);
                assert_eq!(hi, 30.0);
            }
            _ => panic!("expected Number/Between"),
        }
    }

    #[test]
    fn wire_sort_spec_round_trips() {
        let json = r#"{"column":2,"direction":"desc","nulls":"first"}"#;
        let wire: WireSortSpec = serde_json::from_str(json).unwrap();
        let kernel: KernelSortSpec = wire.into();
        assert_eq!(kernel.column, 2);
        assert_eq!(kernel.direction, KernelDirection::Desc);
        assert_eq!(kernel.nulls, KernelNullsPosition::First);
    }

    #[test]
    fn wire_agg_fn_strings_match() {
        for (s, k) in [
            ("sum", KernelAggFn::Sum),
            ("avg", KernelAggFn::Avg),
            ("min", KernelAggFn::Min),
            ("max", KernelAggFn::Max),
            ("count", KernelAggFn::Count),
            ("median", KernelAggFn::Median),
            ("trueCount", KernelAggFn::TrueCount),
            ("falseCount", KernelAggFn::FalseCount),
            ("distinctCount", KernelAggFn::DistinctCount),
        ] {
            let json = format!(r#""{}""#, s);
            let wire: WireAggFn = serde_json::from_str(&json).unwrap();
            let kernel: KernelAggFn = wire.into();
            assert_eq!(kernel, k, "mismatch for `{}`", s);
        }
    }

    #[test]
    fn agg_result_to_wire() {
        assert_eq!(
            WireAggResult::from(KernelAggResult::None),
            WireAggResult::None
        );
        assert_eq!(
            WireAggResult::from(KernelAggResult::Number(42.5)),
            WireAggResult::Number { value: 42.5 }
        );
        assert_eq!(
            WireAggResult::from(KernelAggResult::Count(7)),
            WireAggResult::Count { value: 7 }
        );
        assert_eq!(
            WireAggResult::from(KernelAggResult::Date(1_700_000_000_000)),
            WireAggResult::Date {
                value: 1_700_000_000_000.0
            }
        );
    }

    #[test]
    fn wire_search_spec_round_trips() {
        let json = r#"{
            "term": "alice",
            "mode": "contains",
            "columns": [0, 1],
            "caseSensitive": false
        }"#;
        let wire: WireSearchSpec = serde_json::from_str(json).unwrap();
        let kernel: KernelSearchSpec = wire.into();
        assert_eq!(kernel.term, "alice");
        assert_eq!(kernel.mode, KernelSearchMode::Contains);
        assert_eq!(kernel.columns, vec![0, 1]);
        assert!(!kernel.case_sensitive);
    }

    #[test]
    fn wire_search_omits_optional_fields() {
        // `columns` defaults to empty, `caseSensitive` defaults to false.
        let json = r#"{"term": "foo", "mode": "startsWith"}"#;
        let wire: WireSearchSpec = serde_json::from_str(json).unwrap();
        let kernel: KernelSearchSpec = wire.into();
        assert!(kernel.columns.is_empty());
        assert!(!kernel.case_sensitive);
        assert_eq!(kernel.mode, KernelSearchMode::StartsWith);
    }

    #[test]
    fn wire_form_value_round_trips() {
        let json = r#"{"kind":"string","value":"hi"}"#;
        let wire: WireFormValue = serde_json::from_str(json).unwrap();
        let v: KernelValue = wire.into();
        assert_eq!(v, KernelValue::String(Box::from("hi")));

        let json = r#"{"kind":"array","items":[{"kind":"number","value":1},{"kind":"bool","value":true}]}"#;
        let wire: WireFormValue = serde_json::from_str(json).unwrap();
        let v: KernelValue = wire.into();
        assert_eq!(
            v,
            KernelValue::Array(vec![KernelValue::Number(1.0), KernelValue::Bool(true)])
        );

        let json = r#"{"kind":"callback","id":42}"#;
        let wire: WireFormValue = serde_json::from_str(json).unwrap();
        assert_eq!(KernelValue::from(wire), KernelValue::JsCallback(42));

        let json = r#"{"kind":"null"}"#;
        let wire: WireFormValue = serde_json::from_str(json).unwrap();
        assert_eq!(KernelValue::from(wire), KernelValue::Null);
    }

    #[test]
    fn wire_form_schema_builds_kernel_schema_with_dep_index() {
        // Two fields: B's showWhen depends on A.
        let json = r#"{
            "fields": [
                {
                    "name": "A",
                    "showWhen": [],
                    "hideWhen": [],
                    "requiredWhen": [],
                    "disabledWhen": []
                },
                {
                    "name": "B",
                    "showWhen": [
                        { "field": 0, "op": "equals", "value": { "kind": "bool", "value": true } }
                    ],
                    "hideWhen": [],
                    "requiredWhen": [],
                    "disabledWhen": []
                }
            ]
        }"#;
        let wire: WireFormSchema = serde_json::from_str(json).unwrap();
        let schema: KernelFormSchema = wire.into();

        assert_eq!(schema.field_count(), 2);
        assert_eq!(schema.idx_of("A"), Some(0));
        assert_eq!(schema.idx_of("B"), Some(1));
        // A → [RuleRef pointing to B.showWhen[0]]
        assert_eq!(schema.deps.get(&0).map(|v| v.len()), Some(1));
    }

    #[test]
    fn group_tree_to_wire_with_depth() {
        // Build a 2-level tree manually via the public API and convert.
        let ds = Dataset::builder(3)
            .add_text(
                0,
                vec![Some("US".into()), Some("UK".into()), Some("US".into())],
            )
            .add_text(
                1,
                vec![Some("CA".into()), Some("LDN".into()), Some("NY".into())],
            )
            .build();
        let groups = table_engine::group_by_multi(&ds, &[0, 1], table_engine::RowSet::All);
        let wire: Vec<WireGroup> = groups.into_iter().map(Into::into).collect();

        assert_eq!(wire.len(), 2);
        assert_eq!(wire[0].depth, 0);
        match &wire[0].key {
            WireGroupKey::Text { value } => assert_eq!(value, "US"),
            _ => panic!(),
        }
        assert_eq!(wire[0].children.len(), 2);
        assert_eq!(wire[0].children[0].depth, 1);
    }
}
