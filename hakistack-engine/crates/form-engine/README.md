# form-engine — implementation plan

> Goal: move the compute-heavy parts of `hk-dynamic-form` (conditional logic
> evaluation, validator pipeline, field-dependency graph, deep-diff for
> value changes) into a Rust/WASM kernel — so the library scales smoothly
> to 100–500-field forms with dense cross-field rules. Angular's reactive-
> forms surface (`FormGroup` / `FormControl` / `valueChanges` / CVA /
> directives) stays in TS because it's wired into Angular's DI + change
> detection and cannot be replaced.
>
> Companion to `table/RUST_ENGINE.md`, `pdf-viewer/RUST_ENGINE.md`. Same
> dual-layer pattern: state engine in Rust, framework adapter in TS.

---

## 1. Why now

The earlier deferral was right for ≤50-field forms. The library is now used
in apps with forms that:

- exceed 100 fields (enterprise onboarding, KYC, insurance applications);
- carry 50+ `showWhen` / `hideWhen` / `requiredWhen` / `disabledWhen` rules,
  each with operator dispatch and value coercion;
- run validators on every keystroke (Angular's `ReactiveFormsModule`
  re-runs the *whole* validator set per control change);
- have to deep-diff form values on each emission to short-circuit no-op
  `valueChanges` updates.

At 100+ fields, the JS profile starts showing:

| Stage | Where | Cost per keystroke |
|-------|-------|-------------------:|
| `evaluateConditions` for every visible field | `dynamic-form.utils.ts:151` | 3–8 ms |
| Validator re-run on all controls | Angular RFM | 4–10 ms |
| Deep-equality check before emit | RFM internals | 1–3 ms |
| Sync templates (visibility, required, disabled) | `dynamic-form.component.ts:1139-1146` | 2–4 ms |

That's 10–25 ms per keystroke — a visible stall on every character. The
Rust kernel turns it into incremental work (only conditions / validators
that depend on the changed field re-run) and brings the per-keystroke
cost under 1 ms.

---

## 2. Scope

### In scope (Rust)

| Stage | Current TS location | Why it moves |
|-------|---------------------|--------------|
| `evaluateCondition` operator dispatch | `dynamic-form.utils.ts:115-146` | Hot loop, pure compute, no JS escape hatch |
| `evaluateConditions` AND-aggregate | `:151-160` | Folds naturally into the kernel |
| Field-dependency graph | none today (recomputes all conditions every change) | Largest single win — turns O(N×R) into O(touched-rules) |
| Validator pipeline (built-ins) | RFM internals + custom validators | Predictable, no DOM |
| Validation status aggregation | RFM internals | Pure tree walk |
| Deep equality / structural diff | RFM `isEqual` | Pure compute, called per emit |
| Visibility cascade (group hides → children effectively hidden) | TS template branches | Pure data |

### Out of scope (stays TS)

- `FormGroup` / `FormControl` / `FormArray` class identities — Angular's
  `formControl` / `formControlName` directives bind to these.
- `ControlValueAccessor` — DOM event → value, value → DOM. Browser API.
- `valueChanges` / `statusChanges` Observables — RxJS; we re-emit on top
  of the engine's event stream, but the Observable can't *be* Rust.
- Angular DI, change detection, signal effects — JS only.
- **User-supplied predicate functions** (`condition.operator === 'function'`)
  — the engine schedules them, the bridge calls into JS, JS returns
  `bool`. Two crossings per call but unavoidable.
- Async validators — orchestration is RxJS-heavy; not worth the bridge.
- Wizard step state, auto-save persistence, layout selection.

The boundary is identical to the table engine: TS owns *framework
integration*, Rust owns *state + compute*.

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ DynamicFormComponent (Angular, signals + RFM)                │
│ ─ owns: FormGroup tree, directives, CVA, valueChanges        │
│ ─ delegates: condition eval, validation, diff → engine       │
└────────────────────────────┬─────────────────────────────────┘
                             │ signal effect
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ FormStateService (TS, providedIn: 'root')                    │
│ ─ holds one FormEngineHandle per form instance               │
│ ─ subscribes to FormGroup.valueChanges → engine.setValue()   │
│ ─ relays EngineEvents → component effects                    │
│ ─ JS fallback when WASM unavailable (SSR, no-WASM)           │
└────────────────────────────┬─────────────────────────────────┘
                             │  wasm-bindgen
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ @hakistack/engine — form-engine module (single .wasm)        │
│ ─ FormEngine: schema + value map + dep graph + dirty queue   │
│ ─ ConditionEngine: operator dispatch, value coercion         │
│ ─ ValidatorEngine: required/min/max/pattern/email/…          │
│ ─ shares engine-core primitives with table/tree/fuzzy/pdf    │
└──────────────────────────────────────────────────────────────┘
```

**Key principle: ingest schema once.** The schema (field list, validators,
conditions) is uploaded to the engine at form creation. Per-keystroke
calls only push *values* across the boundary, never re-upload conditions.

---

## 4. Data model

```rust
// hakistack-engine/crates/form-engine/src/schema.rs
//
// The schema is uploaded once when the form is created and never mutates
// thereafter (DynamicForm rebuilds on schema change today, so this is
// safe). Per-keystroke calls only ship value updates.

pub struct FormSchema {
    fields: Vec<FieldDef>,
    /// Inverse index: field_idx → conditions referencing it. Built once
    /// when the schema is ingested. Per-value-change we walk only the
    /// conditions whose source field changed — O(touched) instead of O(R).
    deps: HashMap<FieldIdx, Vec<RuleRef>>,
}

pub struct FieldDef {
    name: Box<str>,
    kind: FieldKind,          // Text, Number, Bool, Select, MultiSelect, Date, …
    required: bool,           // baseline (before `requiredWhen` overrides)
    disabled: bool,           // baseline (before `disabledWhen` overrides)
    validators: Vec<ValidatorDef>,
    show_when: Vec<Condition>,
    hide_when: Vec<Condition>,
    required_when: Vec<Condition>,
    disabled_when: Vec<Condition>,
}

pub struct Condition {
    field_idx: FieldIdx,
    op: ConditionOp,         // Equals, NotEquals, Contains, Gt, Lt, In, NotIn, Function
    value: Value,            // engine Value enum — never crosses back to JS unless Function
}

pub enum Value {
    Null,
    Bool(bool),
    Number(f64),
    String(Box<str>),
    Array(Vec<Value>),
    /// Sentinel for user-supplied predicate; resolves to bool via JS bridge.
    JsCallback(u32),
}
```

`FormState` (the runtime side) holds the current value map and a dirty
queue of fields awaiting condition and validator re-evaluation:

```rust
pub struct FormState {
    values: HashMap<FieldIdx, Value>,
    visible: BitSet<FieldIdx>,
    required_effective: BitSet<FieldIdx>,
    disabled_effective: BitSet<FieldIdx>,
    errors: HashMap<FieldIdx, Vec<ValidationError>>,
    dirty: VecDeque<FieldIdx>,
}
```

Bitsets, not hashmaps, for the three boolean axes — every per-keystroke
condition check turns into a 64-bit word AND.

---

## 5. Public WASM API

```rust
#[wasm_bindgen]
pub struct FormEngine(/* opaque FormState + Arc<FormSchema> */);

#[wasm_bindgen]
impl FormEngine {
    /// Build the engine from a serialized schema. Schema validation
    /// happens here so the consumer sees field-name typos immediately.
    pub fn new(schema: JsValue /* FormSchema */) -> Result<FormEngine, JsError>;

    /// Push a single field value. Returns the list of side-effect events
    /// (fields whose visibility / required / disabled / errors changed).
    /// Empty list = no observable consequences ⇒ component skips CD work.
    pub fn set_value(&mut self, field: &str, value: JsValue) -> Uint32Array;

    /// Batch value update. Used by `patchValue` / initial load. Single
    /// dirty-queue flush at the end.
    pub fn set_values(&mut self, patch: JsValue) -> Uint32Array;

    pub fn is_visible(&self, field: &str) -> bool;
    pub fn is_required(&self, field: &str) -> bool;
    pub fn is_disabled(&self, field: &str) -> bool;

    /// Run validators for every visible field. Used by `submit()`.
    /// Returns a packed `Uint32Array` of (field_idx, error_code, …).
    pub fn validate_all(&mut self) -> Uint32Array;

    /// Resolve a user-supplied JS predicate callback. The engine emits
    /// JsCallback sentinels; the TS layer registers an evaluator that
    /// the engine calls during `set_value` via an `extern "C"` callback.
    pub fn register_predicate(&mut self, id: u32, evaluator: js_sys::Function);

    pub fn dispose(self);
}
```

```ts
// Event packing — every emit is a flat Uint32Array so we never cross
// the JS↔WASM boundary with structured objects.
//   [event_kind, field_idx, payload?]
//   0 = FieldShown(field_idx)
//   1 = FieldHidden(field_idx)
//   2 = RequiredChanged(field_idx, 0|1)
//   3 = DisabledChanged(field_idx, 0|1)
//   4 = ErrorsChanged(field_idx, error_bitmask)
```

The packed-array convention matches the table engine — same `engine-core`
helpers, no per-event allocation.

---

## 6. Algorithms

### 6.1 Per-keystroke condition + validator re-eval

```
set_value(field, value):
    if values[field] == value: return []     // no-op (engine-side diff)
    values[field] = value
    affected_rules = deps.get(field)         // O(1) lookup
    for rule in affected_rules:
        re_evaluate(rule)                    // pushes to dirty queue if state flipped
    flush_dirty()                            // runs validators only on dirty fields
    return events
```

Cost: O(touched-rules + dirty-fields), independent of total field count.
A 500-field form where only `email` changed evaluates ~3 conditions and
re-validates 1 field. Currently in TS we re-evaluate **every** condition
on **every** field (`dynamic-form.component.ts:1139-1146`) — the dominant
cost at scale.

### 6.2 Visibility cascade

When a group / parent field hides, all child fields become effectively
hidden. Bitset AND with the parent's mask propagates the change in one
machine word per 64 fields. The TS side reads `is_visible(field)` and
toggles the DOM accordingly.

### 6.3 Validator pipeline

Built-in validators are pure functions over `Value` → `Option<ErrorCode>`:

| Validator | Kinds it handles | Implementation note |
|-----------|------------------|---------------------|
| `required` | all | bitset intersection |
| `minLength` / `maxLength` | String, Array | byte/char length |
| `min` / `max` | Number | direct compare |
| `pattern` | String | `regex` crate, compiled once at schema ingest |
| `email` | String | inlined regex |
| `custom` | all | JsCallback bridge (same path as `function` operator) |

Compile regexes once, reuse across emits.

### 6.4 Deep equality / structural diff

For `valueChanges` short-circuit: engine holds the canonical value map
and returns a fast equality check without re-marshalling structured
objects to JS. `Value::eq` is a recursive byte compare on `Box<str>` /
`Vec<Value>` — 5–10× faster than `_.isEqual` on the JS side.

---

## 7. Angular integration

```ts
// projects/hakistack/ng-daisyui/src/lib/services/form/form-engine.service.ts
@Injectable({ providedIn: 'root' })
export class FormEngineService {
  async createForm(schema: FormSchema): Promise<FormEngineHandle> { … }
}

// projects/hakistack/ng-daisyui/src/lib/components/dynamic-form/
//   dynamic-form.component.ts (changes only):
//
//   - On form init: build the schema, await engineService.createForm(),
//     wire RFM .valueChanges → engine.setValue() (batched via debounce).
//   - Replace evaluateConditions calls with engine.isVisible() etc.
//   - Add an effect that listens to engine event stream and runs the
//     visibility / required / disabled / errors side-effects.
```

The component's public API (FormController, `createForm()`, `field.*`,
`submit()`, `reset()`) stays unchanged. Only the *internals* delegate to
the engine.

### JS fallback

Keep the existing `dynamic-form.utils.ts` evaluators as the fallback. The
service auto-selects based on `engineService.ready()`:

- **WASM ready** ⇒ engine path.
- **WASM not loaded (SSR, opt-out, load error)** ⇒ `FormUtils.evaluateConditions` runs as today. Parity tested via the same spec suite.

---

## 8. Performance targets

200-field form with 50 cross-field rules, on a mid-tier laptop:

| Operation | JS today | Rust target | Speedup |
|-----------|---------:|------------:|--------:|
| Per-keystroke condition re-eval | 3–8 ms | < 0.5 ms | 10× |
| Per-keystroke validator re-run | 4–10 ms | < 0.5 ms | 15× |
| Initial `patchValue({…})` (200 fields) | 40–80 ms | 3–6 ms | 12× |
| `submit()` validate-all | 8–15 ms | 1–2 ms | 8× |
| Deep equality (200-field model) | 1–3 ms | < 0.2 ms | 10× |

Total per-keystroke budget: from ~10–25 ms today to under 1 ms — well
under the 16 ms frame budget even on slow machines.

The win comes from two structural changes, not from raw kernel speed:

1. **Incremental re-evaluation** via the dep graph (only re-run rules
   whose inputs changed). The current TS path re-runs everything.
2. **Single boundary crossing per keystroke** — value in, packed events
   out. The current path bounces between Angular's CD, RFM internals,
   and our utils class many times per emit.

---

## 9. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| WASM bundle size | Already shared with table/tree/fuzzy/pdf — incremental cost is ~30 KB (regex crate dominates if used). |
| User-supplied predicate functions | Bridge via `register_predicate(id, fn)`; engine calls back into JS only for those rules. Two boundary crossings, unavoidable. |
| Schema-shape drift between TS and Rust | Single source of truth — derive Rust types from TS via `serde_wasm_bindgen` deserialization at ingest; mismatched fields throw at `FormEngine::new`. |
| Angular CD integration | TS adapter owns the signal effect that listens to engine events; no Angular-internal API touched. |
| SSR | Service degrades to JS fallback when `loadEngineModule` rejects. |
| Memory for huge FormArrays | Cap at 5000 controls; warn the consumer when exceeded. The FormArray case is rare but real for table-forms. |

---

## 10. What this does *not* solve

- **Angular's own CD overhead** — bound by RFM's directive tree and
  signal granularity. The engine cuts our share, not Angular's.
- **DOM rendering** — visibility toggles still trigger Angular's
  template re-render. For huge forms, consider virtualizing the field
  list (separate concern, not engine work).
- **Custom JS predicates** — by definition they run in JS. The engine
  schedules them efficiently but can't make them faster.

---

## 11. Phased rollout

Each phase is a separately-shipped feature. The earlier phases yield the
bulk of the perf win without touching the validator side.

1. **Phase 0 — extract evaluator (TS-only refactor)**
   Pull `FormUtils.evaluateCondition` / `evaluateConditions` into a
   `ConditionEngine` class (still TS). Wire DynamicFormComponent through
   it. No behavior change; sets up the seam.

2. **Phase 1 — dependency graph in TS**
   Build the inverse index (`field → rules`) in `ConditionEngine`.
   Switch per-keystroke evaluation from O(N×R) to O(touched-rules).
   Already a 3–5× win on its own with no WASM. Ship this even if the
   Rust port stalls.

3. **Phase 2 — Rust kernel for condition eval**
   Implement `FormEngine` with literal operators (`equals`, `not-equals`,
   `contains`, `gt`, `lt`, `in`, `not-in`). Wire `provideFormEngine()`.
   JS-function predicates still go through the JS bridge. Parity tests
   against the JS fallback.

4. **Phase 3 — Validator pipeline in Rust**
   Move built-in validators (`required`, `min`, `max`, `minLength`,
   `maxLength`, `pattern`, `email`) into the engine. RFM's validator
   chain becomes a thin proxy that asks the engine.

5. **Phase 4 — Deep equality / value diff**
   Move RFM's `_areEqual` short-circuit into the engine. Largest win for
   forms that emit on every keystroke.

6. **Phase 5 — Async validator orchestration (optional, last)**
   Engine schedules and deduplicates async validators; TS executes them.
   Only ship this if profiling shows async-validator coordination is the
   bottleneck (rare).

Each phase ships independently with the JS fallback as the reference
implementation. The DynamicFormComponent public API never breaks.

---

## 12. Definition of done

The crate is "complete" when:

- `provideFormEngine({ mode: 'auto' })` is the documented default;
- DynamicFormComponent uses the engine path when WASM is available;
- JS fallback passes the same test suite (parity guard in CI);
- A 200-field form with 50 conditional rules sustains 60 fps typing on
  a mid-tier laptop;
- Bundle delta is under 50 KB gzip when paired with the existing engine.
