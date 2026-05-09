# form-engine — DEFERRED

This crate is an **empty placeholder**. It exists so the workspace stays symmetric and the CI build smoke-tests every member, but no real code lives here yet.

## Why deferred

`hk-dynamic-form` was evaluated for a Rust port and found to be **low ROI today**:

- The core compute is `evaluateConditions()` — operator dispatch over a small array of conditions, run on every keystroke.
- On a 50-field form with ~30 conditional rules, that's ~150 evaluations per keystroke. Sub-millisecond in modern V8.
- Angular's `ReactiveFormsModule` (`FormGroup`, `FormControl`, `valueChanges`) cannot be replaced without rewriting the form binding layer; Rust can only host the condition engine, not the form runtime.

See `projects/hakistack/ng-daisyui/src/lib/components/RUST_ENGINE_OVERVIEW.md` (the "Components evaluated and not ported" section) for the full reasoning.

## When to revisit

Implement this crate **only when all three are true**:

1. Forms in production regularly exceed 100 fields with 50+ cross-field rules.
2. Profiling shows `evaluateConditions` > 50 ms per keystroke (it's microseconds today).
3. User-supplied predicates are demonstrably the slow part — and porting them would still help.

## What it would do (when revived)

- Operator dispatch (`equals`, `not-equals`, `contains`, `gt`, `lt`, `in`, `not-in`)
- Field dependency graph: which fields' visibility/required-ness depend on which other fields' values
- Topological re-evaluation: only re-check rules whose inputs changed
- Bridge for user-supplied JS predicates (engine schedules them; JS runs them)

The Angular-side wiring (`FormGroup`/`FormControl`, validators, signal effects) stays in TS no matter what.
