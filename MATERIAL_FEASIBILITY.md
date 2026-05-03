# Technical Overview: `@hakistack/ng-daisyui` — Material Feasibility Analysis

---

## Executive Summary

**Bottom line:** roughly **60–70% of this library's real value is already framework-agnostic logic** trapped inside DaisyUI-skinned components. The split is feasible and **not as painful as it looks**, because:

1. The hard parts (calendar math, tree algorithms, table aggregates, PDF.js, form validation, pagination, motion easings) are already in pure helper/service files.
2. CDK is already adopted in the gnarliest components — `CdkStepper`, `CdkTable`, `CdkVirtualScrollViewport`, `CdkTrapFocus`, `CdkPortal`, `@angular/cdk/dialog`. Material is built on the same primitives, so behavior contracts mostly match.
3. There is already an `HK_THEME` token (`src/lib/theme/theme.config.ts`) — but it only swaps 5 class names between DaisyUI v4 and v5. **It is nowhere near a real renderer abstraction**, and pretending it is would be a mistake.

**The real friction is not where you'd guess.** It's not the table or the form. It's **`SelectComponent`** (hand-rolled dropdown, must become `mat-select`), **`TreeComponent`** (custom flat-node model that doesn't match `CdkTree`'s recursive contract), and **`InputComponent`** (renders a bare `<input>` with DaisyUI variant classes — Material wants `mat-form-field` projection, which is a structurally different DOM contract).

**Recommended target:** a single `@hakistack/angular-ui` package with **secondary entry points** (`/core`, `/daisyui`, `/material`), not three separate packages. Angular's package format supports this cleanly via `ng-packagr`, and it avoids version-skew nightmares while still letting consumers tree-shake by entry point.

**Migration approach:** strangler pattern. Extract `/core` first (zero risk — it's just relocating exports). Build `/material` second, component by component, in difficulty order. Keep `/daisyui` shipping the whole time. Most components will end up `REUSE-LOGIC-SWAP-RENDERER`; a few (Select, Tree) will be rewrites against Material primitives.

---

## 1. Current Architecture

### Workspace layout
```
ui-library-workspace/
├── projects/
│   ├── hakistack/ng-daisyui/        # the published library
│   │   ├── src/lib/                 # components, services, helpers, types, directives, theme, api, utils
│   │   ├── src/public-api.ts        # ~300 exports
│   │   ├── themes/                  # daisyui-v4/v5 CSS, kaizen, obsidian themes + v4 plugin shim
│   │   ├── schematics/              # ng-add schematic
│   │   ├── styles.css               # ~280 lines of `--hk-*` tokens, keyframes, dropdown/toast/step CSS
│   │   └── ng-package.json          # cssUrl: "inline", ships themes/ as assets
│   ├── demo/                        # Angular 21 + DaisyUI v5 demo
│   ├── demo-v4/                     # parallel demo on Tailwind v3 + DaisyUI v4 (compat verification)
│   └── shared-demos/                # demo components shared between v4 and v5 demos
```

**Single library project**, not a true monorepo. `angular.json` has one buildable library (`@hakistack/ng-daisyui`) plus demo apps.

### Build setup
- `ng-packagr` builds FESM2022 + UMD. `cssUrl: "inline"` inlines per-component CSS.
- `scripts/fix-exports.mjs` post-processes the package, `scripts/build-schematics.mjs` compiles `ng-add`.
- `themes/` ships as raw assets — consumers `@source` from there in their Tailwind config.
- `styles.css` ships as an asset too: ~280 lines of `--hk-*` CSS variables, keyframes (`hk-slide-in-*`, `hk-fade-in`), and semantic classes for `.toast-*`, `.dropdown-*`, `.step-*`.

### Public API (`src/public-api.ts`)
Roughly 300 exports across:
- **Components** (15): DynamicForm, Table (+ 6 sub-components), Input, Select, Datepicker, Timepicker, Stepper, TabGroup/Panel, Toast, DialogWrapper, PdfViewer, Tree, VirtualScroller, Editor (Tiptap-based)
- **Builders/factories**: `createForm`, `field.*`, `step`, `validation`, `layout`, `createTable`, `createTree`, `node.*`, `createPdfViewer`
- **Services**: FormStateService, PipeRegistryService, DatepickerUtilsService, HkPdfService, DialogService, AlertService, ToastService
- **Directives**: AutoFocus, InputMask, MotionAnimate/Hover/Press/Resize/Scroll/Sequence
- **~50 type definitions** (FormConfig, ColumnDefinition, TreeNode, etc.)
- **Theme token**: `HK_THEME`, `provideHkTheme('daisyui-v4' | 'daisyui-v5')`

### Dependencies that matter for this analysis
- **Behavior (already framework-neutral)**: `@angular/cdk`, `@angular/aria`, `@lucide/angular`, `motion`, `fuse.js`, `pdfjs-dist`, `libphonenumber-js`
- **DaisyUI-only**: `daisyui` (devDep), `tailwindcss` (peer/dev), `@tailwindcss/postcss`
- **Other**: `@tiptap/*` (editor — orthogonal), `@jsverse/transloco` (i18n)

The fact that CDK + Aria + Lucide + Motion are already pulled in is the single biggest tailwind for a Material port. None of those need to change.

---

## 2. DaisyUI / Tailwind Coupling — Critical Findings

### Coupling severity per component

| Component | Severity | Why |
|---|---|---|
| **Alert / AlertOverlay** | HIGH | Built on DaisyUI `.modal` + `.modal-box` + `.modal-backdrop` DOM contract. `BUTTON_CLASS_MAP` (`alert-overlay.component.ts:56`) maps semantic intent → `'btn btn-primary'` strings. |
| **Datepicker** | HIGH | 25+ DaisyUI classes, computed `inputClasses()` for size/color, popover styled with raw Tailwind utilities. |
| **Select** | HIGH | Custom dropdown using `.input/.input-*/.badge/.menu/.dropdown` + hand-rolled `.dropdown-*` animations in `styles.css:247–277`. |
| **Table** | HIGH | 40+ DaisyUI classes spread across cell templates (`.btn`, `.badge`, `.toggle`, `.input`, `.loading`, `.text-error`). |
| **Timepicker** | HIGH | Picker overlay class string is hardcoded literal: `'bg-base-100 border-base-300 absolute z-50 mt-1 rounded-lg border p-4 shadow-lg'` (`timepicker.component.ts:203`). |
| **Toast** | MEDIUM | DaisyUI `.toast-top/bottom/start/end` positioning + custom `hk-slide-*` keyframes shipped from `styles.css`. |
| **DynamicForm** | MEDIUM | Mostly delegates to `<hk-input>`/`<hk-select>` etc., so coupling is transitive. Direct usage is `.card`, `.btn`, `.steps`. |
| **Stepper** | MEDIUM | Extends `CdkStepper` (good), but template uses `.steps`/`.step-primary` and `card bg-base-100 shadow-lg ${theme.classes.cardBorder}` — the only place `HK_THEME` actually does work. |
| **Tabs** | MEDIUM | Uses `@angular/aria` (good behavior), but `tabs-lift/box/border` variants are DaisyUI-only. |
| **Editor** | MEDIUM | Tiptap is renderer-agnostic; toolbar buttons use `.btn .btn-ghost`. |
| **Input** | MEDIUM | `inputClasses()` returns `'input input-${size} input-${color}'` — 50/50 logic vs DaisyUI strings. |
| **Tree** | MEDIUM | Most coupling is `hover:bg-base-200`-style state classes; the actual tree algorithms are in pure helpers. |
| **PdfViewer** | MEDIUM | Toolbar uses `.btn`/`.card`; PDF.js core is untouched. |
| **DialogWrapper** | LOW | Renders into CDK Portal; only sizing utilities. |
| **VirtualScroller** | LOW | Thin CDK wrapper, almost no DaisyUI. |

### Top Material-hostile constructs (with file:line)

1. **Native `<dialog>` + `.modal-box` DOM contract** — `components/alert/alert-overlay.component.html`. Material/`MatDialog` uses CDK Overlay (a positioned panel), not a `.modal` element.
2. **`.steps` + `.step-primary` state classes** — `components/stepper/stepper.component.html:13–27`. Mat Stepper doesn't render steps as a `.steps` flexbox; renders `mat-stepper-header` cells.
3. **`.tabs-lift/-box/-border` DaisyUI variants** — `theme/theme.config.ts:7–14`. The token swaps v4↔v5 but nothing maps to a Material tab look.
4. **Class-string variant generation in `Input`** — `input.component.ts:174–183`. `'input input-${size} input-${color}'` would have to be replaced by a `mat-form-field` host structure (different DOM, not just different classes).
5. **Hand-rolled dropdown in `Select`** — `select.component.html` + custom CSS in `styles.css:247–277`. `mat-select` owns its own overlay; you can't just reskin.
6. **`.badge badge-primary badge-sm gap-1` chip rendering** — `select.component.html:21,44`. Material wants `mat-chip-set` / `mat-chip`.
7. **Custom toast positioning + keyframes** — `toast.component.ts:46–54` + `styles.css:134–220`. `MatSnackBar`'s positioning model is fundamentally different (single live region, queue).
8. **`exportToCsv` / `exportToJson` touch the DOM** — `table/table.helpers.ts`. They `document.createElement('a')` and click it. Pretends to be pure but isn't. Belongs in core but needs an injectable downloader port.
9. **`AlertContainerComponent` rendering inside `AlertService.show()`** — `alert/alert.service.ts`. The service-as-public-API is pure; the bootstrap path hard-codes the DaisyUI component.
10. **Per-row/per-cell `[class]` bindings in TableComponent** that bake `.badge`, `.btn`, `.loading` into cell templates — moving these to Material requires per-cell renderer abstraction, not just a CSS swap.

### What about the `HK_THEME` token?

It's a fig leaf, not an abstraction. It currently only handles 5 class-name swaps (`tabsLift`, `tabsBox`, `tabsBorder`, `menuActive`, `cardBorder`) for DaisyUI v4 vs v5 compatibility. Don't try to overload it for Material — it would balloon to hundreds of class slots and still not solve DOM-structure differences. **A Material adapter needs different components, not different class names.**

---

## 3. Reusable Core Logic — Inventory

This is the good news. The _renderer-free behavioral surface_ is already very large.

### PURE — lift to `/core` as-is

**Pure config builders / factories** (zero DOM, zero classes):
- `dynamic-form/dynamic-form.helpers.ts` — `createForm`, `field.*` (15+ field types), `step`, `validation`, `layout`
- `dynamic-form/dynamic-form.utils.ts` — `FormUtils.createValidators`, `createFormGroup`, conditional-required logic
- `table/table.helpers.ts` — `createTable`, `projectFields`, `clearHeaderFormatCache` (NB: `exportToCsv`/`exportToJson` touch DOM — see "split needed")
- `table/table-aggregates.ts` — `computeAggregate`, `aggregate`, `AGGREGATE_LABELS` (pure math)
- `tree/tree.helpers.ts` — `createTree`, `node.*`, `walkTree`, `findNode`, `findNodePath`, `mapTree`, `filterTree`, `flattenTree`, `countNodes`, `ensureKeys`, `buildTree`
- `pdf-viewer/pdf-viewer.helpers.ts` — `createPdfViewer`
- `helpers/pagination.helper.ts` — `createCursorPagination`, `createOffsetPagination`, HTTP params builders
- `utils/generate-uuid.ts`

**Pure types** (no styling references):
- All of `dynamic-form.types.ts` (~25 interfaces)
- All of `table.types.ts` (~30 interfaces)
- All of `tree.types.ts` + `api/treenode.ts` (`styleClass`/`style` are uninterpreted strings — adapter-defined)
- `datepicker.types.ts`
- `pdf-viewer.types.ts`
- `toast.types.ts`, `alert.types.ts` (config types)
- `input/input.types.ts`, `select/select.types.ts`
- `directives/motion.types.ts`, `directives/input-mask/input-mask.types.ts`
- `types/base-pipes.type.ts`, `types/currency-codes.types.ts`

**Pure services** (compute, no DOM):
- `services/form-state.service.ts` — localStorage/API persistence
- `services/pipe-registry.service.ts` — pipe injection container
- `components/datepicker/datepicker-utils.service.ts` — calendar math (`buildCalendarWeeks`, `isDateInRange`, ISO week numbers, `Intl.DateTimeFormat`)
- `components/pdf-viewer/pdf.service.ts` — PDF.js loader

**Pure directives / engines**:
- `directives/auto-focus/auto-focus.directive.ts` (pure focus call)
- `directives/input-mask/input-mask.engine.ts` (string manipulation)
- All `directives/motion-*.ts` — Motion One library is framework-neutral; the directives are thin DOM-binding wrappers but the easings/keyframes are pure data

**Pure strategy pattern**:
- `components/input/input-variant-strategies.ts` — TextStrategy, CurrencyStrategy, PhoneStrategy (libphonenumber-js), PercentageStrategy, PasswordStrategy. Each implements `format`/`parse`/`getInputType`/`getInputMode`. **Zero CSS classes.**

### SEMI — split into core API + adapter rendering

These need a clean cut:

| Service | Core (extract) | Adapter (keep per-renderer) |
|---|---|---|
| `DialogService` | `.openRaw()` (already CDK-only) | `.open()` + `DialogWrapperComponent` |
| `AlertService` | promise-based API surface, timer/countdown logic, config types | `AlertContainerComponent` rendering |
| `ToastService` | queue signal, timer/auto-dismiss, position state, dedup logic | `ToastComponent` rendering |
| `table/table.helpers.ts` exporters | a `download(blob, filename)` *port* | platform implementation that does `document.createElement('a')` |

### COUPLED — stays in renderer adapters

All `*Component` classes, all per-component `.html`/`.css` files, the `theme/` token, `styles.css`, and the `themes/` directory.

### Approximate split

- **~100 exports** are pure → `/core`
- **~5 services** need a split (DialogService, AlertService, ToastService, plus the CSV/JSON exporters, plus the rendering of validators)
- **~40 components/directives** stay per-adapter

---

## 4. Material Feasibility Scorecard

Sorted from least-to-most work, taken from the per-component deep dive:

| # | Component | Verdict | Effort |
|---|---|---|---|
| 1 | VirtualScroller | REUSE-AS-IS | ~0% — pure CDK wrapper |
| 2 | Stepper | REUSE-AS-IS | ~5% — already extends `CdkStepper`, swap template |
| 3 | PdfViewer | REUSE-LOGIC-SWAP-RENDERER | ~15% — service untouched, toolbar to Material buttons |
| 4 | Datepicker | REUSE-LOGIC-SWAP-RENDERER | ~20% — `DatepickerUtilsService` reusable; render via `mat-datepicker` (range support is a gotcha — see §7) |
| 5 | DynamicForm | REUSE-LOGIC-SWAP-RENDERER | ~25% — swap field-renderer registry; `createForm`/`FormGroup` building unchanged |
| 6 | TabGroup | REUSE-LOGIC-SWAP-RENDERER | ~25% — Aria → `mat-tab-group` API maps directly |
| 7 | Input | REUSE-LOGIC-SWAP-RENDERER | ~30% — keep variant strategies; wrap in `mat-form-field` (DOM contract change!) |
| 8 | Dialog | REUSE-LOGIC-SWAP-RENDERER | ~30% — already CDK-based |
| 9 | AlertService | NEEDS-ADAPTER-ABSTRACTION | ~45% — service maps to `MatDialog.open()`, timer/countdown stays |
| 10 | ToastService | NEEDS-ADAPTER-ABSTRACTION | ~50% — queue stays, render via `MatSnackBar` (positioning model is different) |
| 11 | Select | REWRITE | ~60% — replace internals with `mat-select` + `mat-optgroup` + CDK virtual scroll |
| 12 | Table | NEEDS-ADAPTER-ABSTRACTION | ~65% — `MatTable` + `MatSort` + `MatPaginator` have different event contracts; cell templates portable |
| 13 | Tree | REWRITE | ~70% — flat-node model doesn't fit `CdkTree`/`MatTree`'s nested contract |

The Table number looks worse than it is. The data-source layer (`createTable`, `TableController`, `computeAggregate`, `projectFields`, sort/filter operators, pagination state) is **all pure** and stays in core. The 65% effort is the *rendering* — wiring CDK Table cell defs and translating events between your `TableController` and Mat's event sources. It's a one-time adapter, not a per-feature port.

---

## 5. Recommended Target Architecture

### Use secondary entry points, not separate packages

```
@hakistack/angular-ui                 # parent package
├── /core                             # framework-agnostic logic (pure)
├── /daisyui                          # current implementation
└── /material                         # new implementation
```

Each is a separate `ng-package.json` entry point inside the same npm package. Consumers do:

```ts
import { createForm, field, ColumnDefinition, TreeNode } from '@hakistack/angular-ui/core';
import { DynamicFormComponent, TableComponent } from '@hakistack/angular-ui/daisyui';
// or
import { DynamicFormComponent, TableComponent } from '@hakistack/angular-ui/material';
```

**Why secondary entry points and not three packages:**
- Single version, single tag, single release pipeline. No version-skew.
- `/daisyui` and `/material` both depend on `/core` — secondary entry points handle this trivially; separate packages need you to coordinate semver.
- Tree-shaking is per entry point — a Material-only consumer won't pull DaisyUI CSS.
- One published name keeps your current `@hakistack/ng-daisyui` consumers' migration path trivial: rename the import. (Republish the legacy package as a deprecation shim that re-exports `@hakistack/angular-ui/daisyui` for one major.)

**When to upgrade to separate packages:** only if `/material` ends up needing materially different peer-dep ranges (e.g. an `@angular/material` major bump that doesn't apply to DaisyUI). Don't pre-optimize.

### Concrete folder layout

```
projects/hakistack/angular-ui/
├── core/
│   ├── src/lib/
│   │   ├── form/
│   │   │   ├── form.helpers.ts          # createForm, field, step, validation, layout
│   │   │   ├── form.utils.ts            # FormUtils (validators, FormGroup builder)
│   │   │   ├── form.types.ts            # all field/step/config types
│   │   │   └── form-state.service.ts    # persistence
│   │   ├── table/
│   │   │   ├── table.helpers.ts         # createTable, projectFields (NO exporters)
│   │   │   ├── table.types.ts
│   │   │   ├── table.aggregates.ts
│   │   │   ├── table.controller.ts      # TableController class (sort/filter/paginate state)
│   │   │   └── table.exporters.ts       # exportToCsv/Json — uses Downloader port
│   │   ├── tree/
│   │   │   ├── tree.helpers.ts
│   │   │   ├── tree.types.ts
│   │   │   └── treenode.ts              # from current src/lib/api/treenode.ts
│   │   ├── datepicker/
│   │   │   ├── datepicker-utils.service.ts
│   │   │   └── datepicker.types.ts
│   │   ├── pdf-viewer/
│   │   │   ├── pdf-viewer.helpers.ts
│   │   │   ├── pdf.service.ts
│   │   │   ├── pdf-viewer.types.ts
│   │   │   └── pdf-viewer.labels.ts
│   │   ├── input/
│   │   │   ├── input-variant-strategies.ts
│   │   │   └── input.types.ts
│   │   ├── select/
│   │   │   └── select.types.ts
│   │   ├── pagination/
│   │   │   └── pagination.helper.ts
│   │   ├── pipes/
│   │   │   ├── pipe-registry.service.ts
│   │   │   ├── base-pipes.type.ts
│   │   │   └── currency-codes.types.ts
│   │   ├── motion/
│   │   │   ├── motion.types.ts
│   │   │   ├── motion.utils.ts
│   │   │   └── easings.ts
│   │   ├── input-mask/
│   │   │   ├── input-mask.engine.ts
│   │   │   └── input-mask.types.ts
│   │   ├── dialog/
│   │   │   ├── dialog.types.ts          # DialogConfig, DialogRef
│   │   │   └── dialog.tokens.ts         # HK_DIALOG_RENDERER injection token
│   │   ├── alert/
│   │   │   ├── alert.types.ts
│   │   │   └── alert.tokens.ts          # HK_ALERT_RENDERER token
│   │   ├── toast/
│   │   │   ├── toast.types.ts
│   │   │   ├── toast-queue.service.ts   # pure queue logic, no rendering
│   │   │   └── toast.tokens.ts          # HK_TOAST_RENDERER token
│   │   ├── ports/
│   │   │   ├── downloader.port.ts       # injectable port for blob → download
│   │   │   └── platform-platform.port.ts # browser-only operations
│   │   └── utils/
│   │       └── generate-uuid.ts
│   ├── ng-package.json
│   └── public-api.ts
│
├── daisyui/
│   ├── src/lib/
│   │   ├── components/                  # current components
│   │   ├── theme/                       # current HK_THEME (renamed HK_DAISYUI_THEME)
│   │   ├── renderers/
│   │   │   ├── daisyui-dialog.renderer.ts   # implements HK_DIALOG_RENDERER
│   │   │   ├── daisyui-alert.renderer.ts
│   │   │   ├── daisyui-toast.renderer.ts
│   │   │   └── daisyui-downloader.ts
│   │   └── providers/
│   │       └── provide-daisyui.ts       # provideHkDaisyUI() — wires all renderers
│   ├── themes/                          # daisyui-v4/v5/kaizen/obsidian CSS
│   ├── styles.css
│   ├── ng-package.json
│   └── public-api.ts
│
└── material/
    ├── src/lib/
    │   ├── components/                  # mat-* wrappers
    │   ├── renderers/
    │   │   ├── material-dialog.renderer.ts  # uses MatDialog
    │   │   ├── material-alert.renderer.ts   # uses MatDialog with custom alert component
    │   │   └── material-toast.renderer.ts   # uses MatSnackBar
    │   └── providers/
    │       └── provide-material.ts      # provideHkMaterial()
    ├── ng-package.json
    └── public-api.ts
```

### Concrete examples — what moves where

**Example A — DynamicForm:**
- → `/core`: `createForm`, `field.*`, `step`, `validation`, `layout`, all `*FieldOptions` types, `FormConfig`, `FormController`, `FormUtils.createValidators`, `FormStateService`
- → `/daisyui`: `DynamicFormComponent` rendering `<hk-input>`/`<hk-select>` etc.
- → `/material`: `DynamicFormComponent` rendering `<mat-form-field><mat-input>` etc., reading the same `FormConfig`. **Same `createForm()` builder for both renderers.**

**Example B — Table:**
- → `/core`: `createTable`, `TableController` (extracted from inside the current component), `ColumnDefinition`, all sort/filter/paginate state, `computeAggregate`, `projectFields`. Plus a new `TableExporter` that takes a `Downloader` port.
- → `/daisyui`: `TableComponent` using `CdkTable` + DaisyUI classes for cells. Provides the `Downloader` impl that touches `document`.
- → `/material`: `TableComponent` using `MatTable` + `MatSort` + `MatPaginator`, with a small adapter that subscribes Mat's `sortChange`/`page` events into your `TableController`.

**Example C — DialogService:**
- → `/core`: `DialogConfig`, `DialogRef`, `HK_DIALOG_RENDERER` token (interface: `open<T>(component, config): DialogRef<T>`), and a `DialogService` that delegates to the injected renderer.
- → `/daisyui`: `DaisyUIDialogRenderer` using CDK Dialog + `DialogWrapperComponent`.
- → `/material`: `MaterialDialogRenderer` using `MatDialog`.

---

## 6. Migration Plan — Step by Step

The whole point is **zero downtime for current consumers**. Steps below assume you keep `@hakistack/ng-daisyui` shipping until the new package is at parity.

### Phase 0 — Pre-work (1 day)
- Add a CHANGELOG and an ADR (`docs/adr/0001-multi-renderer.md`) capturing the architecture decision.
- Bump current package to a stable version, tag it. This is your fallback.
- Add `size-limit` budgets per entry point.

### Phase 1 — Stand up the new workspace, add `/core` (1–2 weeks)
1. Create `projects/hakistack/angular-ui/` with three secondary entry points (`/core`, `/daisyui`, `/material`). Stub `/material` with a placeholder export — it's there to validate the build.
2. **Move (not copy)** to `/core`, in this order, with one PR per group:
   - **PR 1**: pure types only. `dynamic-form.types`, `table.types`, `tree.types`, `datepicker.types`, `pdf-viewer.types`, `input.types`, `select.types`, `toast.types`, `alert.types`, `motion.types`, `input-mask.types`, `treenode.ts`, `base-pipes.type`, `currency-codes.types`. Re-export from `/daisyui/public-api.ts` so consumers see no break.
   - **PR 2**: pure helpers. `form.helpers`, `form.utils`, `table.helpers` (without exporters), `table-aggregates`, `tree.helpers`, `pdf-viewer.helpers`, `pagination.helper`, `generate-uuid`. Re-export.
   - **PR 3**: pure services. `FormStateService`, `PipeRegistryService`, `DatepickerUtilsService`, `HkPdfService`. Re-export.
   - **PR 4**: pure directives' engines. `input-mask.engine` and motion utilities (the directives themselves stay in `/daisyui` for now and import from `/core`).
   - **PR 5**: extract `TableController` from `TableComponent` (it's currently embedded — pull sort/filter/paginate state into a standalone class instantiated by `createTable()`).
3. Add a `Downloader` port in `/core/ports/`; refactor `exportToCsv`/`exportToJson` to require it; provide a default `BrowserDownloader` in `/daisyui`.
4. **Verify**: existing demo app still works, no API-surface changes for consumers.

### Phase 2 — Carve out renderer-shaped seams in `/daisyui` (1 week)
1. Define `HK_DIALOG_RENDERER`, `HK_ALERT_RENDERER`, `HK_TOAST_RENDERER` injection tokens in `/core`.
2. In `/daisyui`, refactor `DialogService`/`AlertService`/`ToastService` so the public API stays the same but internal wiring goes through the renderer interface. The "DaisyUI renderer" is just a wrapper around the existing `DialogWrapperComponent`/`AlertContainerComponent`/`ToastComponent`.
3. Add `provideHkDaisyUI()` (in `/daisyui/providers/`) that wires all DaisyUI renderers in one call. Update demo app to use it.
4. Run all tests; confirm no behavior change.

### Phase 3 — Build `/material`, easiest first (4–8 weeks)
Tackle in this order based on the scorecard. After each one, ship it; consumers can opt in piece by piece.

1. **VirtualScroller** + **Stepper** (1 week, both at once) — REUSE-AS-IS.
2. **PdfViewer** — render toolbar with `mat-icon-button`; service unchanged.
3. **Datepicker** — wrap `mat-datepicker`; range mode via `MatDateRangeInput`; keep your i18n labels and validation.
4. **DynamicForm** — implement Material field-renderer registry. This is where you find out whether your `FormConfig` truly is renderer-agnostic. (Bet: 95% yes; you'll find one or two field types — colour picker, range slider — that need adapter hooks.)
5. **Tabs** — straight `mat-tab-group` mapping.
6. **Input** — biggest semantic shift: DaisyUI puts classes on the `<input>`; Material projects the `<input matInput>` into `<mat-form-field>`. Resolve by making the `/material` Input component be the form-field wrapper, with the variant strategies producing matSuffix icons / hints / errors.
7. **Dialog** — drop in a `MaterialDialogRenderer` using `MatDialog`. Service surface stays.
8. **AlertService** — `MaterialAlertRenderer` opens a Material-themed alert via `MatDialog`. Countdown/loading flows in core unchanged.
9. **ToastService** — `MaterialToastRenderer` adapts your queue to `MatSnackBar`. Big mismatch: snackbar shows one at a time. Decide whether to (a) accept Material's UX for the Material adapter, or (b) bypass `MatSnackBar` and render a stack via `Overlay` directly. Document the decision.
10. **Select** — rewrite with `mat-select` (+ `mat-optgroup`, virtual scroll). Same `SelectOption<T>` config.
11. **Table** — `MatTable` + `MatSort` + `MatPaginator` driven by your `TableController`. Cell templates port mostly unchanged.
12. **Tree** — `MatTree` with `CdkTreeFlattener`. Convert your flat-node model to `MatTreeFlatDataSource`.

### Phase 4 — Deprecate, document, release (1 week)
1. Publish `@hakistack/angular-ui` 1.0 with all three entry points at parity.
2. Republish `@hakistack/ng-daisyui` as a thin re-export of `@hakistack/angular-ui/daisyui`, marked deprecated in `package.json`. Keep for one major.
3. Migration guide: `s/@hakistack\/ng-daisyui/@hakistack\/angular-ui\/daisyui/g`.

### Suggested parallelism

Phases 1–2 are sequential (foundations). Inside Phase 3, you can run two parallel branches: one engineer on the easy components (1–4), another on the rewrites (Select/Tree/Table). The dependency between them is `/core`'s `TableController` — finish that in Phase 1.

---

## 7. Risks and Gotchas

These are the things I'd worry about, in order:

### Architectural risks

1. **`mat-form-field` projection is a DOM contract, not a class swap.** Material expects `<input matInput>` *as a child* of `<mat-form-field>`. Your current `InputComponent` renders the `<input>` itself with prefix/suffix as siblings. The Material `InputComponent` is a wrapper *around* the form-field, not a wrapper around an input. Plan accordingly — your DynamicForm's field renderer registry must produce a different DOM shape per renderer.

2. **`ControlValueAccessor` portability is real but watch out for `setDisabledState`.** Your CVA implementations on Input/Select/Datepicker should port cleanly. Material components implement their own CVAs, so the `/material` versions delegate to Mat's CVA rather than implementing one. A composed CVA that forwards to a child CVA is fine but easy to get wrong (touched/dirty propagation).

3. **`MatTable` DataSource contract vs your `TableController`.** Mat expects `connect(): Observable<T[]>`. You currently expose signals. Bridge with `toObservable()` from `@angular/core/rxjs-interop`. Easy in isolation; just don't accidentally double-subscribe.

4. **`MatSort` and `MatPaginator` are *separate* directives**, not part of the table. The `/material` `TableComponent` will need to host them and translate their events into your `TableController`'s API. Your sort/filter API exposes columns by string key; `MatSort` exposes `MatSortable` by id. Keep the keys identical.

5. **`MatDatepicker` range support uses `MatDateRangeInput` with two child `<input>` elements.** Your single `DatepickerComponent` with a range mode will need to switch DOM shape based on `mode === 'range'`. Range CVA is doable but fiddly.

6. **`MatSnackBar` shows one snackbar at a time by design.** Your toast service stacks. Either accept a UX divergence in `/material` (document it!) or build a custom Overlay-based renderer that ignores `MatSnackBar`. Don't let this block phase 3 — defer the decision until you get there.

7. **`MatDialog` vs your `DialogService.openRaw()`.** Both wrap CDK Dialog. The contracts are nearly identical, but `MatDialog` adds backdrop classes and animations Material consumers expect. Don't try to reuse your `DialogWrapperComponent` inside Material; let Mat own its host.

8. **`MatTree` doesn't use a flat-node array. It uses a `MatTreeFlattener` over a hierarchy.** Your tree algorithms (`flattenTree`, `walkTree`) actually fit this — you can adapt your data shape into `MatTreeFlatDataSource` cleanly. But selection model and lazy-load are different (`SelectionModel`, custom `getChildren` callback).

### Tailwind-only assumptions

9. **`styles.css` ships ~280 lines of `--hk-*` tokens, keyframes, and semantic CSS** that current consumers `@source` from their Tailwind config. A Material consumer should *not* need Tailwind. Make sure `/material` does **not** import from `styles.css` or the `themes/` directory. Build a separate CSS file (or rely entirely on Material theming) for the Material adapter.

10. **`themes/` ships Tailwind plugin/preset files for v4.** Keep them in `/daisyui/themes/`; `/material` and `/core` must not reference them.

11. **DaisyUI v4 vs v5 was already a breaking change you handled with `HK_THEME`.** Don't extend that token to cover Material. Use a new `HK_MATERIAL_DENSITY` (or skip and use Material's tokens directly).

### Accessibility gotchas

12. **Material components have stronger built-in a11y** than DaisyUI components. When you swap renderers, you may *gain* a11y (good) but also gain different ARIA contracts that consumers' tests might check for. Flag this in your migration guide.

13. **`@angular/aria` (used by your Tabs) and `MatTabGroup` have different keyboard contracts in edge cases** (Home/End behavior, focus on tab change). Test both.

14. **Your alert overlay uses `CdkTrapFocus`.** `MatDialog` does its own focus trap. Don't double-trap.

### Density / theming

15. **Material's density system (`mat.private-define-density-config`)** has no DaisyUI analogue. Document for `/material` consumers that density is configured via Material theme, not via your `size` props.

16. **Material color = palette tokens (primary/accent/warn).** DaisyUI has 6 semantic colors (primary/secondary/accent/info/success/warning/error). Your `Toast.severity = 'info' | 'success' | 'warning' | 'error'` maps cleanly to MatSnackBar's `panelClass` styling but the visual mapping is up to you.

### Hidden coupling smells you should fix while you're in there

17. **`exportToCsv`/`exportToJson` in `table.helpers.ts` quietly touch the DOM** (`document.createElement('a')`). Already flagged — make this a port.

18. **`AlertService.show()` has the rendering component as a hard import.** Pull it behind `HK_ALERT_RENDERER` even if you only have one renderer for now; that's the seam.

19. **Hardcoded class string in `timepicker.component.ts:203`** (`'bg-base-100 border-base-300 absolute z-50 mt-1 rounded-lg border p-4 shadow-lg'`). This is the kind of thing that bites you during migration. Sweep for similar literals while extracting.

20. **`HK_THEME` only covers v4↔v5 swaps.** Don't try to grow it; rename to `HK_DAISYUI_THEME` so it's clearly DaisyUI-internal, and let `/material` ignore it entirely.

---

## TL;DR — What I'd do this week

1. Create `projects/hakistack/angular-ui/` with `/core`, `/daisyui`, `/material` secondary entry points.
2. Move *types* to `/core` first (lowest risk, highest signal). Re-export from current paths.
3. Extract `TableController` from `TableComponent` into `/core/table/table.controller.ts`. This unblocks both renderers.
4. Define `HK_DIALOG_RENDERER`, `HK_ALERT_RENDERER`, `HK_TOAST_RENDERER` tokens in `/core`. Refactor existing services to go through them. (No consumer-visible change.)
5. Stand up `/material` with `VirtualScroller` and `Stepper` only — these are nearly free and will validate the entry-point + renderer-token plumbing end-to-end before you commit to the harder ports.

That sequence gets the hardest decisions (entry points, renderer tokens, controller extraction) out of the way in the first sprint, and gives you a working multi-renderer build before any of the "REWRITE" components are touched.
