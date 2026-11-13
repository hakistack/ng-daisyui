# Component guidelines

The contract every component in `@hakistack/ng-daisyui` follows. New components must meet it; existing deviations are
tracked in the [maintainer backlog](../maintenance/maintainer-guide.md#backlog) — fix them when touching the component,
not in sweeping rewrites.

## Before writing a component

Answer in the PR description:

1. Which problem does it solve that **HTML + daisyUI classes** do not? (state, forms, keyboard/focus, overlay, data)
2. Which WAI-ARIA APG pattern does it implement?
3. Which dependencies does it add, and are they lazy?
4. How is it tested (unit + a11y) and where is it documented?

If (1) has no answer, document the HTML instead of adding a component.

## Naming & API

| Concern | Convention |
|---|---|
| Selector | `hk-<name>` (components), `[hk<Name>]` (directives). The legacy `[appAutoFocus]` is the only exception |
| Files | `<name>.component.ts` + co-located `<name>.types.ts`, `<name>.helpers.ts`, `<name>.labels.ts`, `<name>.component.spec.ts` |
| Inputs / outputs | `input()`, `input.required()`, `output()`; `model()` for genuine two-way state that is not a form value |
| Form values | implement `ControlValueAccessor`; the form owns the value and the disabled state |
| Disabled | `disabled` input **plus** CVA `setDisabledState` stored in a **signal** and combined in a `computed()` (a plain field read inside a computed goes stale) |
| Size / colour | `size: 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` (default `md`), `color: daisyUI semantic colour \| null` |
| Labels / i18n | every user-visible string comes from a `*Labels` interface with English defaults, overridable per instance and app-wide via `provideHk<Name>Labels()` |
| Builders | `create<Name>(config)` returns a typed controller/config; plain object literals must also work — builders are sugar, not the only way |
| Providers | `provide<Name>(config)` returning `EnvironmentProviders`; tokens stay internal unless consumers must inject them |
| Events | past-tense or noun outputs (`selectionChange`, `rowExpand`); payloads are typed interfaces exported from `public-api.ts` |

## Angular patterns

- Standalone (default; do not write `standalone: true`), `ChangeDetectionStrategy.OnPush`.
- Native control flow (`@if`, `@for` with a real `track`, `@switch`). No `ngClass`/`ngStyle`; use `[class]` / `[style]`.
- Host bindings in the `host` object, never `@HostBinding`/`@HostListener`.
- `inject()` instead of constructor injection.
- Derived state in `computed()`. Never call a method that allocates (objects, arrays, Observables) from a template on
  every change-detection pass; precompute in a `computed()`.
- Keep RxJS where it models streams (HTTP, debounced search, overlay events); don't convert for fashion.
- Guard browser APIs (`isPlatformBrowser`, `inject(DOCUMENT)`); no `window`/`localStorage` at module load.
- No universal base class. Share behaviour through small functions in `lib/utils/` once it repeats 3+ times.

## Accessibility (WCAG 2.2 AA)

- Follow the APG pattern named in the PR: roles, states, keyboard model, focus management.
- Ids used by ARIA relationships are **unique per instance** (`generateUniqueId()` prefix), never fixed strings.
- Every form control has an accessible name and, when invalid, `aria-invalid` + `aria-describedby` → error text.
- Overlays: focus moves in on open, is trapped when modal, and returns to the trigger on close.
- Live regions exist in the DOM before content is inserted; use `polite` unless the message is urgent.
- Respect `prefers-reduced-motion` (motion directives already do; new animations must too).
- Keyboard handlers on a container must ignore events from editable descendants (inputs, textareas, contenteditable).
- Tests: at least one spec per relationship/state you add; axe in e2e for anything with a demo page.

## Styling

- daisyUI v5 classes and semantic tokens only; no hex/rgb colours, no `bg-gray-*`-style palette classes.
- Class names must be **complete literals** in the source. Map dynamic values through a literal lookup
  (`INPUT_SIZE_CLASSES[size]`), never `` `input-${size}` `` — Tailwind only generates classes it finds as text.
- Component CSS stays in the component (`styles` / `.css`); `styles.css` only for things that must be global
  (CDK overlay panes, `--hk-*` variable mapping). Prefix global keyframes/classes with `hk-`.
- Never override daisyUI globally (no `!important` on `.input`, `.btn`, …).

## Tree-shaking

The package declares `sideEffects: false`; keep it true in practice:

- No top-level statements with side effects: no module-level calls (`registerX()`, `Object.freeze(...)`, `new Foo(...)`)
  unless annotated `/* @__PURE__ */` and genuinely pure.
- **Static class fields must have literal initializers.** `static X = new Map(arr.map(...))` or
  `static Y = Object.freeze([])` makes the bundler keep the class and everything its template uses. Use literal
  entries (`new Map([['a', 0]])`) or a module-level PURE-annotated constant.
- Heavy or optional libraries are loaded with `import()` inside the feature that needs them, wrapped in try/catch with
  an install hint for optional peers.
- Verify with `npm run test:consumer`; a regression shows up as an initial-JS budget failure.

## Testing checklist

- Unit specs for inputs/outputs, CVA (write, disable/enable after render), keyboard model, ARIA relationships.
- Regression spec for every bug fixed (it must fail without the fix).
- Demo page with a minimal and an advanced example; axe in e2e.
- Public types reachable from the package root (the consumer smoke app imports representative ones).

## Documentation checklist

Plain-language description · when to use / when not · minimal example · advanced example · inputs/outputs/models/types
with defaults · accessibility & keyboard notes · theming · common mistakes · performance notes when relevant.
API tables are generated from `public-api.ts` by the docs platform (`npm run extract-api-docs`); don't hand-write them.
