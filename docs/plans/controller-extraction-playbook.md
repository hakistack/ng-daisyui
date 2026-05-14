# Controller Extraction Playbook

A reproducible recipe for splitting a multi-responsibility Angular component
into a thin host + focused controller classes. Distilled from the
TableComponent refactor (3721 → 2331 lines, nine controllers, 1312 specs
passing unmodified across eight commits).

The goal is not "smaller files" — it's **one concern per file with a clear
public contract**, so the host component becomes orchestration + Angular
plumbing and the actual logic lives somewhere unit-testable without
TestBed.

---

## When to extract

A controller is worth extracting when a single concern inside a component
has **all four** of:

1. **Owned state** — at least one signal that other concerns don't touch.
2. **Derived state** — computeds that read that state + some config.
3. **Mutations** — methods that update the state, sometimes with side
   effects (emit, reset something on the host).
4. **A clear seam from neighbors** — the rest of the component talks to it
   through a small surface (a handful of methods + a few signals).

If a concern is just a one-line computed off `fieldConfig()`, leave it.
The pattern's overhead isn't worth it for trivial slices.

---

## Anatomy of a controller

```ts
// controllers/<concern>.controller.ts
import { computed, Signal, signal } from '@angular/core';

export interface XxxControllerDeps<T> {
  // Read deps as Signals — controllers stay reactive without owning config.
  readonly someConfig: Signal<SomeConfig | undefined>;
  readonly upstreamSignal: Signal<readonly T[]>;
  // Emissions as optional callbacks — host owns the EventEmitter / output().
  readonly onChange?: (payload: SomeEvent) => void;
}

export class XxxController<T> {
  // State signals as field initializers — they don't reference `deps`.
  readonly state = signal<SomeState>({ /* initial */ });

  // Derived signals declared as fields, ASSIGNED in the constructor.
  // (TypeScript class-field init runs before parameter-property assignment,
  // so `this.deps` is undefined inside field initializers.)
  readonly derived: Signal<SomeShape>;

  constructor(private readonly deps: XxxControllerDeps<T>) {
    this.derived = computed(() => /* … deps.someConfig() … */);
  }

  // Public methods. Optional callbacks make the API testable in isolation.
  doSomething(input: Foo): void {
    this.state.update(prev => /* … */);
    this.deps.onChange?.({ /* … */ });
  }
}
```

### The deps interface is the contract

Every controller takes one parameter: a typed object of `Signal<X>` reads
and `(event) => void` writes. This makes them:

- **Framework-agnostic past Angular signals** — no `inject()`, no DI tree,
  no testbed.
- **Easy to mock** — `new XxxController({ someConfig: signal(undefined), … })`.
- **Type-safe at the seam** — wrong shape on either side fails at compile
  time.

The host doesn't pass its `output()` emitters directly; it passes
`(event) => this.outputName.emit(event)` so the controller doesn't depend
on the `OutputEmitterRef` shape.

### When the controller needs `effect()`

Take an `Injector` in deps and call `effect(fn, { injector })` inside the
constructor:

```ts
export interface XxxControllerDeps {
  readonly injector: Injector;
  // …
}

constructor(private readonly deps: XxxControllerDeps) {
  effect(() => { /* … */ }, { injector: this.deps.injector });
}
```

On the host:

```ts
private readonly injector = inject(Injector);
private readonly pagination = new PaginationController({ injector: this.injector, … });
```

This lets the controller register its own effects without forcing the host
to wire them in `setupEffects()` — but those effects still belong to the
component's lifecycle and clean up when it's destroyed.

When the effect manages a non-Angular resource (a `setTimeout`, a
subscription, a WASM handle), expose `dispose()` and call it from
`ngOnDestroy`.

---

## Wiring it into the host

### 1. Declaration order matters

Class fields initialize top to bottom. A controller field that reads
`this.someSignal` in its deps object **must be declared after** that
signal. When that's impossible (a circular shape), wrap the read in a
`computed()` so the dereference happens lazily:

```ts
// `totalItemsSignal` is declared further down the class.
private readonly pagination = new PaginationController({
  totalItems: computed(() => this.totalItemsSignal()),
  // …
});
```

The `computed(() => this.foo())` form captures `this` and dereferences
`this.foo` at call time, not at field-init time. By the time any consumer
actually reads it, `this.foo` is initialized.

### 2. Re-export the controller's public surface under historical names

This is the single most important rule for risk-free refactors:

```ts
private readonly selection = new SelectionController<T>({ … });

// Public re-exports — template/spec API unchanged.
readonly selectedSignal = this.selection.selected;
readonly isAllSelected = this.selection.isAllSelected;

// Forwarder methods — same names + signatures as the inline originals.
toggleRow(row: T, checked: boolean): void {
  this.selection.toggleRow(row, checked);
}
```

Templates and specs see no diff. The change is fully internal.

### 3. Cross-controller dependencies stay on the host

If concern A reads from concern B (e.g. SelectionController's cascade
asks "what's this row's parent?" — that's tree state), don't let A
import B. Pass an accessor through deps:

```ts
new SelectionController<T>({
  getParent: (row) => this.tree.getParent(row),
  hasChildren: (row) => this.tree.hasChildren(row),
  // …
});
```

The host is the only place that knows the whole graph. Controllers stay
shallow.

### 4. Multi-concern orchestration effects stay on the host

The pagination refactor split the original three pagination effects in
half: the two pure state-sync effects moved into the controller, but the
"data ref changed → clamp pagination + prune selection + clear html
cache" effect stayed on the host. Rule of thumb: **if an effect's body
touches more than one controller, the host owns it.**

The host calls thin methods on each controller:
```ts
effect(() => {
  const data = this.data();
  untracked(() => {
    this.htmlCache.clear();
    this.pagination.clampToData(this.totalItemsSignal());
    this.selection.pruneToData(data);
  });
});
```

---

## Common type-inference pitfalls

The compiler tends to fail in three predictable spots when controllers
forward-reference host signals. All three are fixed the same way: add an
explicit `Signal<T>` annotation on the host side.

### Symptom 1: "implicitly has type 'any' because referenced directly or indirectly in its own initializer"

Hit when a controller's deps closure reads a signal declared later, and
TypeScript can't follow the cycle. Fix:

```ts
// Before
private readonly displayDataSignal = computed(() => materializeView(this.displayViewSignal()));

// After — explicit annotation breaks the inference cycle.
private readonly displayDataSignal: Signal<readonly T[]> = computed(() => materializeView(this.displayViewSignal()));
```

### Symptom 2: "Property 'X' is used before its initialization"

Hit when a controller is instantiated before a signal it depends on. Fix
with a `computed()` wrapper as in step 1 above:

```ts
// Before — `this.isResizingSignal` is undefined at field-init time.
new SortController({ isResizing: this.isResizingSignal });

// After — read deferred to call time.
new SortController({ isResizing: computed(() => this.isResizingSignal()) });
```

### Symptom 3: cross-shape inference loop

When `paginationOptions` reads `pagination.dynamicOverrides()` *and*
`pagination` reads `paginationOptions` in its deps, both lose inference.
Annotate **both** explicitly:

```ts
readonly paginationOptions: Signal<PaginationOptions | null> = computed<PaginationOptions | null>(() => { … });

private readonly pagination: PaginationController = new PaginationController({
  paginationOptions: this.paginationOptions,
  // …
});
```

---

## Extraction order

Pick targets in this order:

1. **Most self-contained first** — concerns whose tests already pass with
   minimal cross-talk. SelectionController is a good first cut.
2. **Smallest before biggest** — proves the pattern before you take on
   the 600-line effect block.
3. **Independent before dependent** — Sort before Filter (Sort has no
   data dep), Filter before Group (Group reads displayDataSignal which
   reads sortedView which reads filteredView).
4. **Cross-cutting concerns last** — if a concern (footer aggregates,
   global search) touches the data pipeline at multiple points, do it
   after the simpler stuff has stabilized the API surface.

A safe order for most components: state-only → derived state → mutations
with simple emissions → mutations with cascading effects → effects.

---

## Step-by-step recipe

For each extraction:

### Pre-flight

1. `git status` clean. Each phase becomes its own commit.
2. `npm run build` clean, `npx ng test --watch=false` green.
3. **Map every touchpoint** before writing code. Use `grep -an` to find
   every call site in the host, every reference in the template, every
   assertion in the spec.

### Extract

1. Create `controllers/<concern>.controller.ts`.
2. Define `XxxControllerDeps<T>` interface — every signal the concern
   reads, every event it emits, optional flags it needs.
3. Move state signals as class field initializers.
4. Move derived signals as constructor-assigned fields (avoid the field-
   initializer-undefined-`deps` trap).
5. Move mutation methods. Emit through the optional `on…` callbacks.
6. Move private helpers used only by this concern.

### Wire

7. Add the controller import to the host.
8. Remove the inline state declarations.
9. Instantiate the controller (mind the declaration order; use
   `computed()` wrappers for forward refs).
10. Re-export every public signal/method under its historical name —
    aliases for signals, forwarder methods for callable API.
11. Update the host's effects to call controller methods instead of
    inlining the logic.
12. Remove now-unused imports.

### Verify

13. `npm run build` — fix any type-inference cycles with explicit
    `Signal<T>` annotations.
14. `npx ng test --watch=false` — all tests must pass with **zero spec
    edits**. If a spec needs changing, you broke the public surface;
    revisit the forwarders before touching the test.
15. Commit. Move to the next concern.

The discipline is: if specs need editing, you did it wrong. The whole
point of the pattern is that the public API is preserved.

---

## What stays on the host

Even after a full refactor, the host component keeps:

- **Angular surface** — `@Component` metadata, `input()` / `output()`,
  `contentChild` / `contentChildren`, `DataSource`, `ngOnDestroy` /
  `ngAfterViewInit`.
- **The data pipeline** — `filteredView → searchedView → sortedView →
  treeFlatten → displayView → pageSlice`. Each stage reads from one
  controller, writes to the next. The pipeline composes too many
  concerns to belong in any single controller.
- **Cross-controller orchestration effects** — see the rule above.
- **Public methods that fan out to controllers** — thin forwarders, one
  line each. These exist for backward compatibility, not because the
  host has logic.
- **Trivial config aliases** — `enableXxxSignal = computed(() => this.fieldConfig()?.enableXxx ?? false)`
  is fine here.

---

## Reference: TableComponent controllers

For copy-paste templates, each controller in
`projects/hakistack/ng-daisyui/src/lib/components/table/controllers/`
demonstrates a specific facet of the pattern:

| File | What it shows |
|------|---------------|
| `selection.controller.ts` | First-cut shape. State + derived + mutations. Inter-controller callbacks (tree topology) via deps. |
| `sort.controller.ts` | Smallest possible controller. Pure logic + one helper (`compareValues`) exposed for the upstream pipeline to call. |
| `filter.controller.ts` | Mutations with closing-side-effects (`onCloseDropdowns`). Engine-routing memo as a private field. |
| `tree.controller.ts` | The complex one. Topology caches mutated by a single `flattened` computed; everything else reads. Animation timer cleanup. |
| `group.controller.ts` | Engine + JS fallback in one place. Recursive helpers. Display-stream flattening. |
| `pagination.controller.ts` | Controller with its own `effect()`s via injected `Injector`. `clampToData()` exposed for the host's orchestration effect to call. |
| `footer.controller.ts` | Mostly pure computeds + per-cell accessors. Engine aggregate routing. |
| `global-search.controller.ts` | Debounce effect with timer cleanup (`dispose()`). Fuse cache as a private field. Cursor-mode short-circuit. |
| `column-ui.controller.ts` | Multiple coupled concerns in one controller (visibility / reorder / resize / sticky) because they share a `columnDefs` source of truth. localStorage round-trip. |

When in doubt about how to handle a specific shape, find the closest
match in this list and read its constructor + the host wiring.

---

## What to apply next

Components that look like they'd benefit:

- **DynamicFormComponent** — wizard state, conditional logic, auto-save,
  validation orchestration. Likely targets: `FormController`,
  `WizardController`, `ConditionEngineController` (if not already
  extracted), `AutoSaveController`.
- Any component with both a config object and runtime overrides, where
  the inline `signal + computed + mutations + effect` block adds up to
  >300 lines.

Components that probably **don't** need it:

- Standalone, single-responsibility components (Badge, Card, Alert).
- UI primitives where the only logic is one signal + a few class bindings.

The pattern earns its keep when the host is doing too many distinct
things at once. If you can describe a component's behavior in one
sentence, leave it alone.
