# Declarative Builders + Schema Extensibility — Plan

Status: proposal
Owner: TBD
Related:
- `projects/hakistack/ng-daisyui/src/lib/components/dynamic-form/dynamic-form.schema.ts` (new declarative forms API)
- `projects/hakistack/ng-daisyui/src/lib/components/dynamic-form/dynamic-form.helpers.ts` (`createForm`)
- `projects/hakistack/ng-daisyui/src/lib/components/table/table.helpers.ts` (`createTable`)
- `projects/hakistack/ng-daisyui/src/lib/components/tree/tree.helpers.ts` (`createTree`, `buildTree`)

---

## 0. Context

We shipped a **declarative, schema-first** `createForm`:

```ts
const form = createForm({
  layout: { type: 'vertical', gap: 'md' },
  fields: {
    name: { type: 'text', label: 'Full Name', validation: { required: true, minLength: 2 } },
    age:  { type: 'number', validation: { min: 18 } },
  },
  validate: (data) => (data.age < 18 ? { age: 'Must be 18+' } : null),
  onSubmit: (data) => { data.name /* string */; data.age /* number */; },
});
```

The win is **type inference**: `fields` is a *map* (key = field name) and the value shape
(`InferFormValues<TFields>`) flows into `validate` / `onSubmit` / `onChange` with no hand-written
generic. It was added as an additive `createForm` overload — the array and callback-DSL forms still work.

This plan covers two follow-ups the team flagged:

- **Part A / B** — bring the same *map + inference* ergonomics to `createTable` and `createTree`.
- **Part C / D** *(the deep dives)* — make the form schema **extensible**: register **custom field types**
  and **custom validators** without forking the library.

Each part is independently shippable. Nothing here is a breaking change; every new shape is an
additive overload or an opt-in registry.

---

## 1. Current state (grounded in the code)

| Builder | Signature | Item collection | Per-item type safety today |
|---|---|---|---|
| `createForm` | declarative overload `createForm<TFields>(cfg)` | `fields` **map** | ✅ value shape inferred (`InferFormValues`) |
| `createTable` | `createTable<T extends object>(cfg: FieldConfig<T>)` | `columns: ColumnDefinition<T>[]` **array** (or `visible`/`headers`/… maps) | ⚠️ keys are `StringKey<T>` but `format(value: unknown, row: T)` — **cell value is `unknown`** |
| `createTree` | `createTree<T>(input: CreateTreeInput<T>)` | `nodes: TreeNode<T>[]` **array** | ⚠️ `data?: T` is typed, but nodes are hand-shaped; no inference from a source row |

Relevant facts:

- **Forms** render via `@switch (field.type)` in `dynamic-form.component.html` with a generic `@default`
  case. `FieldDefinition` is a **closed discriminated union** in `dynamic-form.schema.ts`. Field-level
  custom validators already exist on the resolved config: `FormFieldConfig.customValidators?: ValidatorFn[]`,
  wired in `FormUtils.buildValidators`. Cross-field `validate` is wired signal-based in the component
  (`crossFieldErrors`).
- **Tables** already constrain `field`/`visible`/`headers`/`formatters` to `StringKey<T>`. `ColumnDefinition<T>`
  carries `format`, `editType`, `editOptions`, `editValidator`. The only inference gap is that cell-level
  callbacks see `unknown`, and columns are an array (so `field` is repeated and ordering is positional).
- **Trees** already have `buildTree<T>(items, BuildTreeOptions<T>)` that folds a flat array into nested
  `TreeNode<T>[]` via `idFn`/`parentIdFn`/`labelFn`/`iconFn`. `createTree` does **not** expose this — callers
  must pre-build `nodes`.

---

## 2. Part A — `createTable`: declarative `columns` map + cell-value inference

### Goal

```ts
const table = createTable<User>({
  data: users(),
  columns: {
    name:  { header: 'Name' },
    email: { header: 'Email', fallback: '—' },
    price: { header: 'Price', format: (value /* number */, row) => `$${value.toFixed(2)}` },
    role:  { header: 'Role', editType: 'select', editOptions: [...] },
  },
  sortable: true,
});
```

Two upgrades over the array form:

1. **Map keyed by `keyof T`** — the key *is* `field`, so it is never repeated and is `keyof`-checked.
   Column order = map insertion order (V8 preserves it for string keys).
2. **Per-column value inference** — `format`/`editValidator` receive `value: T[K]` instead of `unknown`.

### Type sketch

```ts
// table.schema.ts (new)
export interface TypedColumnDef<T, K extends keyof T> extends Omit<ColumnDefinition<T>, 'field' | 'format' | 'editValidator'> {
  format?: (value: T[K], row: T) => string | Observable<string>;
  editValidator?: (value: T[K], row: T) => boolean | string;
}

export type ColumnsMap<T extends object> = {
  // optional so callers pick a subset; order follows declaration order
  [K in keyof T]?: TypedColumnDef<T, K>;
};

// A declarative config = FieldConfig<T> but with `columns` as a map and without `visible`
export interface DeclarativeTableConfig<T extends object>
  extends Omit<FieldConfig<T>, 'columns' | 'visible'> {
  columns: ColumnsMap<T>;
}
```

### `createTable` overload + conversion

Add an overload that fires when `columns` is a non-array object (same discriminator trick used for
`createForm`: an array is not assignable to a `Record<keyof T, …>` map and vice-versa):

```ts
export function createTable<T extends object>(config: FieldConfig<T>): FieldConfiguration<T>;            // existing
export function createTable<T extends object>(config: DeclarativeTableConfig<T>): FieldConfiguration<T>; // new
export function createTable<T extends object>(config: FieldConfig<T> | DeclarativeTableConfig<T>): FieldConfiguration<T> {
  const normalized = isColumnsMap(config.columns)
    ? { ...config, columns: columnsMapToArray(config.columns), visible: Object.keys(config.columns) as StringKey<T>[] }
    : config;
  // …existing body unchanged (createFieldConfig → buildColumnSchema → controller)…
}

function columnsMapToArray<T extends object>(map: ColumnsMap<T>): ColumnDefinition<T>[] {
  return (Object.keys(map) as (keyof T)[]).map((field) => ({
    field: field as StringKey<T>,
    header: humanize(String(field)),                 // default header from key, same spirit as form autoLabel
    ...(map[field] as object),
  })) as ColumnDefinition<T>[];
}
```

### Notes / risks

- **Whitelist normalizer.** `createFieldConfig` in `table.helpers.ts` copies config field-by-field
  (see the project memory note "whitelist normalizers silently drop new fields"). The conversion produces a
  standard `FieldConfig<T>`, so it rides the existing path — **but any new column prop must still be added to
  `createFieldConfig`**. Conversion happens *before* `createFieldConfig`, so no new drop risk.
- **`visible` is auto-derived** from the map keys; callers no longer pass it. `hidden` stays available.
- Inference only sharpens callbacks; the runtime is unchanged. Low risk.
- **Effort:** S–M. New `table.schema.ts` (~80 lines), one overload + two helpers, no component change.

---

## 3. Part B — `createTree`: typed declarative nodes / `fromData`

`TreeNode<T>` already types `data?: T`, so the inference gap is smaller than tables. The ergonomic gap is
that callers must hand-build nested `nodes`. We already own the flattener (`buildTree`), it's just not wired
into `createTree`.

### Goal — fold `buildTree` into `createTree` (typed flat → tree)

```ts
const tree = createTree({
  data: rows(),                          // flat T[]
  id: (r) => r.id,                       // was buildTree's idFn
  parent: (r) => r.parentId,             // parentIdFn
  label: (r) => r.name,                  // labelFn  (r: T — typed)
  icon: (r) => r.kind === 'folder' ? 'folder' : 'file',
  selectionMode: 'checkbox',
});
```

### Type sketch

```ts
export interface DeclarativeTreeInput<T> extends Omit<CreateTreeInput<T>, 'nodes'> {
  data: T[];
  id: (item: T) => string;
  parent: (item: T) => string | null | undefined;
  label: (item: T) => string;
  icon?: (item: T) => string | undefined;
}

export function createTree<T = unknown>(input: CreateTreeInput<T>): TreeSetup<T>;        // existing (nodes)
export function createTree<T>(input: DeclarativeTreeInput<T>): TreeSetup<T>;             // new (data + accessors)
export function createTree<T = unknown>(input: CreateTreeInput<T> | DeclarativeTreeInput<T>): TreeSetup<T> {
  const nodes = 'data' in input
    ? buildTree(input.data, { idFn: input.id, parentIdFn: input.parent, labelFn: input.label, iconFn: input.icon })
    : input.nodes;
  // …existing body using `nodes`…
}
```

Discriminator: presence of `data` vs `nodes` (mutually exclusive in practice). All other `TreeConfig`
options pass through. The accessors give **typed `item: T`** at the call site, and `node.data` stays `T`
downstream (templates, drag/drop events, selection handlers).

### Optional follow-up — a tiny `node()` builder for literal trees

For hand-authored trees, a `node(label, { data, children, icon })` helper mirrors the forms `field.*` sugar
and keeps `data: T` inferred. Lower priority than `fromData`.

- **Effort:** S. One overload + delegate to existing `buildTree`; optional `node()` is ~20 lines.

---

## 4. Part C *(deep dive)* — Custom field types in the form schema

This is the harder, higher-value piece. Today `FieldDefinition` is a **closed union** and the renderer is a
**closed `@switch`**. A consumer who wants, say, a `rating` star input or a `currency` masked field cannot
extend either without forking. We want first-class custom types that are:

1. **Type-safe in the schema** — `{ type: 'rating', max: 5 }` autocompletes and is checked.
2. **Inferred** — `InferFieldValue` knows a `rating` field yields `number`.
3. **Rendered** by consumer-provided UI, slotted into the existing form layout/validation/conditional engine.

### 4.1 The two axes

A field type is **two things**: a *type-level contract* (options + value type) and a *runtime renderer*.
We need an extension point for each.

```
Custom field type = (a) compile-time definition  +  (b) runtime renderer  +  (c) value-type mapping
```

### 4.2 (a) Type-level: an open registry via declaration merging

Replace the hard-coded union with a **registry interface** the consumer can augment. The built-in types
populate it; `FieldDefinition` becomes the union of the registry's values.

```ts
// dynamic-form.schema.ts
export interface FieldTypeRegistry {
  text: TextFieldDef;
  email: EmailFieldDef;
  password: PasswordFieldDef;
  number: NumberFieldDef;
  checkbox: CheckboxFieldDef;
  textarea: TextareaFieldDef;
  select: SelectFieldDef<unknown>;
  date: DateFieldDef;
}

// The union is now derived — adding a registry member adds it everywhere.
export type FieldDefinition = FieldTypeRegistry[keyof FieldTypeRegistry];
```

Consumer augments it from their own code (module augmentation):

```ts
// app: rating-field.ts
import '@hakistack/ng-daisyui';

interface RatingFieldDef {
  type: 'rating';
  label?: string;
  max?: number;
  defaultValue?: number;
  validation?: { required?: boolean; min?: number; max?: number };
  // …shared layout props via a re-exported DeclarativeFieldBase…
}

declare module '@hakistack/ng-daisyui' {
  interface FieldTypeRegistry {
    rating: RatingFieldDef;
  }
}
```

After augmentation, `createForm({ fields: { score: { type: 'rating', max: 5 } } })` type-checks, and `'rating'`
shows in `type` autocomplete. We must **export `FieldTypeRegistry`, `DeclarativeFieldBase`, and the value-map
hook** (next) from `public-api.ts` for this to work.

### 4.3 (c) Value-type mapping for inference

`InferFieldValue` is a `type ? : ` chain keyed on `type`. To keep it open, drive it from a second registry
that maps `type → value type`, with a fallback for unregistered types:

```ts
export interface FieldValueRegistry {
  text: string; email: string; password: string; textarea: string;
  number: number; checkbox: boolean; date: Date | null;
  // select handled specially (option inference) — see existing InferOptionValue
}

export type InferFieldValue<F> =
  F extends { type: 'select'; options: infer O } ? InferOptionValue<O>
  : F extends { type: infer K } ? (K extends keyof FieldValueRegistry ? FieldValueRegistry[K] : unknown)
  : unknown;
```

Consumer adds the value type alongside the def:

```ts
declare module '@hakistack/ng-daisyui' {
  interface FieldTypeRegistry { rating: RatingFieldDef }
  interface FieldValueRegistry { rating: number }   // score: number in onSubmit/validate
}
```

This keeps full inference for custom types with no `any`.

### 4.4 (b) Runtime: a field-type registry + projected templates

Two complementary rendering paths; ship **B1 first**, add **B2** if richer control is needed.

**B1 — template projection by type (no new DI).** Let consumers project named templates into
`<hk-dynamic-form>` for any unknown/custom type. The component already has a `@default` case in the switch;
extend it to look for a matching projected template before falling back to the bare `<input>`.

```html
<!-- consumer -->
<hk-dynamic-form [config]="form.config()">
  <ng-template hkFieldType="rating" let-field let-control="control">
    <app-star-rating [formControl]="control" [max]="field.max" />
  </ng-template>
</hk-dynamic-form>
```

```ts
// component: collect projected field templates
readonly fieldTemplates = contentChildren(FieldTypeTemplateDirective);   // [hkFieldType]
// in @default: if a template matches field.type, ngTemplateOutlet it with { field, control } context
```

`FieldTypeTemplateDirective` is a tiny structural directive exposing `hkFieldType: string` + a `TemplateRef`.
The form group already builds a control per `field.key` (`FormUtils.createFormGroup`), so the custom UI binds
to `formGroup.get(field.key)` — validation, conditional show/hide, and value flow keep working unchanged.

**B2 — global type registry (DI).** For app-wide custom types without re-projecting per form, add a provider
token mapping `type → component`:

```ts
provideFormFieldTypes({
  rating: RatingFieldComponent,   // implements ControlValueAccessor
});
```

The `@default` renderer resolves the component from the token and renders it with `ngComponentOutlet`,
passing `field` as inputs. B2 is more work (dynamic component + input binding contract) and can follow B1.

### 4.5 Runtime config bridge

Custom-type defs must still become a `FormFieldConfig` so the existing pipeline (control creation, validators,
conditional engine) runs. `declarativeFieldToConfig` in `dynamic-form.helpers.ts` currently has a closed
`switch (def.type)` with a `never` exhaustiveness guard. Change the guard into a **generic passthrough** for
unregistered types:

```ts
default: {
  // Custom type: copy known shared props + validation, keep `type` verbatim for the renderer.
  return createField(key, def.type as FieldType, autoLabel(key, def.label), {
    ...sharedFrom(def),
    ...flattenValidation(def.validation),   // required/min/max/minLength/maxLength/pattern if present
  });
}
```

(`FieldType` in `dynamic-form.types.ts` would widen to `string` for custom types, or we add a
`(string & {})` escape hatch to preserve literal autocomplete for built-ins.)

### 4.6 Risks / decisions

- **`FieldType` widening.** Allowing arbitrary strings weakens the resolved-config type slightly. Mitigation:
  `type FieldType = BuiltinFieldType | (string & {})` keeps built-in literals autocompleting while permitting
  custom strings.
- **Validation for custom types.** Reuse the flattened validator builder (`min`/`max`/`required`/`pattern`);
  anything bespoke goes through `customValidators` (Part D).
- **AXE/a11y.** Projected/registered custom components own their own a11y — document the contract (label
  association via `field.id`, error wiring via `getFieldErrors(field.key)`).
- **Effort:** M (B1 + type registries) → L (B2 DI registry).

---

## 5. Part D *(deep dive)* — Custom validators in the schema

### 5.1 What exists

- **Flattened built-ins** — `required`, `minLength`, `maxLength`, `min`, `max`, `email`, `pattern` →
  Angular validators in `FormUtils.buildValidators`.
- **Raw escape hatch** — `FormFieldConfig.customValidators?: ValidatorFn[]`; the declarative
  `DeclarativeFieldBase.customValidators` already forwards to it.
- **Cross-field** — `validate(data)` returns `{ field: message }` (signal-wired `crossFieldErrors`).

The gaps: (1) no **named/reusable** validators in the declarative `validation` bag, (2) no **async**
validators, (3) custom validator **error messages** don't flow through `FormUtils.getErrorMessage` (it only
knows built-in keys).

### 5.2 D1 — named validator entries in `validation`

Let `validation` accept structured rules in addition to the boolean/number shorthands:

```ts
interface ValidationRule<V = unknown> {
  validate: (value: V, allValues: Record<string, unknown>) => boolean;
  message: string | ((value: V) => string);
  /** error key for styling / getFieldErrors; defaults to a generated key */
  key?: string;
}

// password example
password: {
  type: 'password',
  validation: {
    required: true,
    minLength: 8,
    rules: [
      { key: 'uppercase', validate: (v: string) => /[A-Z]/.test(v), message: 'Needs an uppercase letter' },
      { key: 'digit',     validate: (v: string) => /\d/.test(v),    message: 'Needs a number' },
    ],
  },
}
```

Conversion (`declarativeFieldToConfig`) compiles each rule into a `ValidatorFn` and pushes onto
`customValidators`:

```ts
function ruleToValidator(rule: ValidationRule): ValidatorFn {
  return (control) => rule.validate(control.value, /* form values via injected getter */ {})
    ? null
    : { [rule.key ?? 'custom']: typeof rule.message === 'function' ? rule.message(control.value) : rule.message };
}
```

### 5.3 D2 — surface custom messages

`FormUtils.getErrorMessage` switches on known keys and falls through to `"<label> is invalid (<key>)"`.
Change the fallback to **prefer the error payload when it is a string** (our rules put the message there):

```ts
default: {
  const val = errors[firstErrorKey];
  return typeof val === 'string' ? val : `${label} is invalid (${firstErrorKey})`;
}
```

This makes both `ValidationRule.message` and any third-party validator that emits a string payload render
correctly, with **zero** new wiring in the component.

### 5.4 D3 — async validators (opt-in)

Add `asyncRules?: { validate: (value, all) => Promise<boolean> | Observable<boolean>; message; key }[]`,
compiled to `AsyncValidatorFn` and attached via a parallel `customAsyncValidators` field on `FormFieldConfig`
+ `FormControl(value, sync, async)`. Requires a small addition to `FormUtils.createFormGroup`. Gate behind its
own milestone since it touches control construction and pending/`isSubmitDisabled` state.

### 5.5 D4 — reusable validator registry (optional sugar)

A named-library so apps register once and reference by name:

```ts
provideFormValidators({
  strongPassword: { validate: (v) => …, message: 'Weak password' },
});
// usage
validation: { rules: ['strongPassword'] }   // string ref resolves from the registry
```

Lower priority — D1 already covers the need inline.

- **Effort:** D1+D2 = S–M (pure helper + one message tweak). D3 = M (control construction). D4 = S.

---

## 6. Sequencing

| Milestone | Scope | Effort | Depends on |
|---|---|---|---|
| **M1** | Table `columns` map + cell inference (Part A) | S–M | — |
| **M2** | Tree `data`+accessors overload (Part B) | S | — |
| **M3** | Form custom validators D1 + D2 (named rules + message passthrough) | S–M | — |
| **M4** | Form custom field types: type registries (C-a, C-c) + B1 template projection + config passthrough (C-e) | M | — |
| **M5** | Form custom field types: DI component registry (C-b / B2) | L | M4 |
| **M6** | Async validators D3 | M | M3 |
| **M7** | Validator registry D4 | S | M3 |

M1–M4 are the high-value, low-risk core. M5–M7 are opt-in depth.

---

## 7. Cross-cutting principles

- **Additive only.** Every entry point is a new overload (`createForm`/`createTable`/`createTree`) or an
  opt-in registry/provider. Existing array/builder APIs stay verbatim. No breaking changes.
- **Inference without `any`.** Consumer-facing types use generics + conditional/mapped types and module
  augmentation. `any` stays confined to internal conversion boundaries (as it already is in `createForm`).
- **One discriminator rule.** Map-vs-array is the discriminator in all three builders (an array is not
  assignable to a keyed `Record`, and vice-versa), so overload resolution is unambiguous.
- **Render/validate engine untouched.** Declarative configs convert *down* to the existing resolved configs
  (`FormFieldConfig` / `FieldConfig<T>` / `TreeNode<T>[]`) so the runtime is shared and battle-tested.

---

## 8. Testing strategy

- **Type-level** — extend `dynamic-form.helpers.spec.ts` with `expectTypeOf` assertions verified under
  `tsc -p tsconfig.spec.json` (vitest's `--typecheck` only picks up `*.test-d.ts`; we already rely on the spec
  tsconfig). Add negative tests (mutate an assertion, confirm `tsc` errors) for each new inference path:
  table cell `T[K]`, tree `item: T`, custom-type value via `FieldValueRegistry`.
- **Runtime** — conversion unit tests (map → array/nodes, rule → `ValidatorFn`, custom message passthrough),
  plus a component test that a projected `hkFieldType` template renders and its control validates.
- **Demos** — add a declarative `createTable`/`createTree` example and a custom-field-type example
  (e.g. star `rating`) to `shared-demos`; build both `demo` (v5) and `demo-v4`.

---

## 9. Open questions

1. **Table column order** — rely on JS object key order (fine for string keys) or accept an explicit
   `order?: number` per column? Recommend key order + optional `order` for overrides.
2. **`FieldType` widening** — `(string & {})` escape hatch vs a hard `string`. Recommend the escape hatch to
   keep built-in literal autocomplete.
3. **Custom type a11y contract** — document required hooks (`field.id` for label association, error list via
   `getFieldErrors`) or provide a `HkFieldShell` wrapper component that supplies them. Recommend the wrapper.
