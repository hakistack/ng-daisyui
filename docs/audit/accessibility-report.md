# Accessibility report

Target: WCAG 2.2 AA and the WAI-ARIA Authoring Practices pattern for each widget. Sources: code review of every
interactive component, existing specs, `e2e/pdf-workspace.spec.ts` / `e2e/document-workspace.spec.ts` (the only axe
runs today), and ESLint `templateAccessibility` rules (0 errors).

## Fixed in this pass

Each fix has a spec that fails without it.

| Component | Problem | WCAG / rule | Fix | Spec |
|---|---|---|---|---|
| `hk-tree` (checkbox mode) | Checkboxes had no accessible name | 4.1.2, axe `label` | `aria-label` = node label | `tree.component.spec.ts` "gives every checkbox an accessible name" |
| `hk-stepper` | Panel `aria-labelledby="step-N"` pointed at ids that did not exist; tabs had no id/`aria-controls` | 1.3.1, 4.1.2 | Use CdkStepper `_getStepLabelId` / `_getStepContentId` | `stepper.component.spec.ts` (2 tests) |
| `hk-command-palette` | `aria-selected` on `<button>` | axe `aria-allowed-attr` | superseded by the full APG combobox in the second pass | `command-palette.component.spec.ts` |
| `hk-select` | Fixed ids `options-list` / `option-N` collided across instances (`aria-controls` / `aria-activedescendant` could point into another select) | 4.1.1/4.1.2, axe `duplicate-id-aria` | Per-instance ids | `select.component.spec.ts` "unique per instance" |
| `hk-select`, `hk-datepicker` | Disabled state went stale after first render, so a control disabled by `disabledWhen` / `control.disable()` stayed operable | 4.1.2 (state) | Signal-backed disabled flag | select + datepicker specs |
| `hk-notification` | Focus ring used `hsl(var(--p))` (exists in neither daisyUI 4 nor 5) → no visible focus indicator on panels | 2.4.7, 2.4.11 | `color-mix(var(--color-primary), …)` with v4 fallback | visual (CSS) |
| `hk-table` | Host keydown handler acted on keys typed in the search box/filters/inline editor (Space toggled a row) | 2.1.1, 3.2.2 | Ignore events from editable targets | `table.component.spec.ts` "should ignore keys typed into inputs" |
| `hk-input` / `hk-select` | `color` classes never generated → error/success colouring invisible | 1.4.1 (when colour carries state) | Literal class maps | consumer smoke CSS check |

### Second pass (same release)

| Component | Fix | Spec |
|---|---|---|
| `hk-dynamic-form` | `aria-invalid` + `aria-describedby` (help/error), always-present polite error region; pickers labelled via `controlId`; radios in a labelled `radiogroup`; editor gets the field label | `dynamic-form.component.spec.ts` |
| `hk-tree` | `role="tree"` moved off the host (filter input no longer inside); `aria-level`/`setsize`/`posinset`; `aria-checked` (incl. `mixed`) in checkbox mode; single default tab stop; inner toggle/checkbox removed from tab order | `tree.component.spec.ts` |
| `hk-command-palette` | APG combobox: `role=combobox`, `aria-controls`, `aria-activedescendant`, `listbox` / `group` / `option`, named `<dialog>` | `command-palette.component.spec.ts` (new) |
| `hk-notification-host` | One named polite region; `role="alert"` removed from items/panels; severity prefix read before the title | `notification-host.component.spec.ts` (new) |
| `hk-table` | `aria-sort` on `th` in virtual, grouped and CDK layouts; sort trigger `role="button"`, Space no longer scrolls | `table.component.spec.ts` |
| `hk-select` | Space types in the search box; placeholder no longer overrides `<label for>` | `select.component.spec.ts` |
| `hk-timepicker` | Focus restored to the field on close; false `aria-modal` removed; out-of-range values disabled | `timepicker.component.spec.ts` |
| `hk-datepicker` | Week numbers rendered as `rowheader`s with a localisable label | `datepicker.component.spec.ts` |
| `hk-app-shell` / `hk-navbar` | Focus trap whenever the drawer renders as an overlay; hamburger `aria-expanded` + `aria-controls` | `app-shell.component.spec.ts` (new) |
| Toast | Hover never shortens display time (WCAG 2.2.1) | `toast.component.spec.ts` |
| Motion | Outputs keep firing under reduced motion; `animateSequence` honours it; bare `hkScroll` enables progress tracking | `motion-scroll.directive.spec.ts` |
| Kaizen themes | `*-content` colours raised to ≥ 4.5:1 | computed contrast (script in this audit) |
| Muted text (55 places) | `text-base-content/50`–`/60` → `/70`; timepicker labels/clock numbers and editor placeholder `color-mix` → 70 % (large `:` separators 60 %) | `npm run lint:contrast` (CI) |
| `AlertService` | `aria-describedby` only with a body; localisable close name and spinner text (`AlertLabels.close/loading`) | `alert.service.spec.ts` |
| `hk-table`, pickers | Filter/selection bars `role="status"`; error messages `role="alert"` without the conflicting `aria-live` | — |
| `hk-datagrid` | `aria-multiselectable` only for `selection: 'multi'` | `datagrid.component.spec.ts` |
| `hk-table` | Focusable `<table role=grid>` with `aria-activedescendant` (was set on the table while the host had focus); unique cell ids (were `cell-undefined-N` without detail rows); grouped layout: named row checkboxes, keyboard group toggle, no false `role=grid`; inline editor labelled | `table.layouts.spec.ts` (new) |
| `hk-toast` | Announced via the CDK `LiveAnnouncer` (persistent region; errors assertive); sr-only severity word; focus pauses auto-dismiss; localisable close label | `toast.component.spec.ts` |
| `hk-menu` | Links-only menus are navigation (no `menu` roles, `aria-current="page"`); real menus: roving tabindex + APG menubar / vertical keys | `menu.component.spec.ts` |
| `hk-select` | Search input is the `combobox` with `aria-activedescendant`; Escape clears then closes; focus returns to the trigger | `select.component.spec.ts` |

## Open findings (prioritised)

| Sev | Component | Finding | Evidence | Recommended fix |
|---|---|---|---|---|
| ~~High~~ | `hk-dynamic-form` | No `aria-invalid` / `aria-describedby` on fields; error text not associated nor announced | `dynamic-form.component.html:320-329` | ids on error/help, `aria-describedby`, polite live region | **(fixed)**
| ~~High~~ | `hk-dynamic-form` | Labels not associated for datepicker/timepicker (id lands on the custom element host), radio groups (no fieldset/legend), editor | template | `inputId` input on pickers; `<fieldset><legend>` for radios | **(fixed)**
| ~~High~~ | `hk-table` | `aria-activedescendant` on inner `<table>` while focus is on the host → nothing announced; `aria-sort` only in CDK layout, on a `div`; sort triggers are `div[tabindex]` without role | `table.component.html:952,1109,270` | move to host; shared header template for all three layouts (see X1) | **(fixed: the `<table>` is the focused grid)**
| ~~High~~ | `hk-tree` | No `aria-level`/`aria-setsize`/`aria-posinset`; no `aria-checked` in checkbox mode; filter input inside `role="tree"` | `tree.component.html:39`, `tree.component.ts:64` | add attributes; move filter outside the tree role | **(fixed)**
| ~~High~~ | `hk-command-palette` | Not a combobox/listbox pattern (no `role=combobox`, `aria-controls`, `aria-activedescendant`); `<dialog>` has no name | `command-palette.component.html:1-23` | full APG combobox | **(fixed)**
| ~~High~~ | `hk-notification` | Each item announced up to three times (assertive host region + `role=alert` host + inner `role=alert`) | `notification-host.component.html:1`, `notification-item.component.html:97,124,142` | one polite region at the host; no `role=alert` on items | **(fixed)**
| ~~Medium~~ | `hk-toast` | Per-item live region inserted together with its content (unreliable announcement); `aria-label=summary` hides detail; pause on hover only (not focus, WCAG 2.2.1); hardcoded "Dismiss notification" | `toast.component.html:5-8,41` | persistent live region; focus-pause; label via `ToastLabels` | **(fixed)**
| ~~Medium~~ | `hk-menu` | `menubar` uses Up/Down instead of Left/Right; every item is a tab stop (no roving tabindex); `role=menu` used for site navigation | `menu.component.ts:243-268` | `nav > ul` for navigation; APG menubar keys for real menus | **(fixed)**
| ~~Medium~~ | `hk-select` | With search enabled focus is on the search box, which lacks `aria-activedescendant`; focus not restored to trigger after Escape/selection | `select.component.html:134`, `select.component.ts:700` | | **(fixed)**
| ~~Medium~~ | `hk-timepicker` | Closing the `aria-modal` panel does not restore focus | `timepicker.component.ts:467` | mirror datepicker | **(fixed)**
| ~~Medium~~ | `hk-datagrid` | `aria-multiselectable="true"` regardless of selection mode | `datagrid.component.html:134` | bind to mode | **(fixed)**
| ~~Low~~ | `hk-alert` | `aria-describedby` points at an empty body; hardcoded "Close"/"Loading" | `alert-overlay.html:8` | | **(fixed)**
| ~~Low~~ | motion | `animateSequence` ignores `prefers-reduced-motion` (directives honour it) | `motion-sequence.ts:54` | | **(fixed)**
| ~~Low~~ | Datepicker, table bars | `role="alert"` combined with `aria-live="polite"` (conflicting) | | pick one | **(fixed)**

## Muted-text contrast (WCAG 1.4.3)

`base-content` at a given opacity over each background, computed from the theme CSS (oklch → sRGB, alpha blended in
sRGB as browsers composite). AA body text needs 4.5:1.

| Opacity | Fails 4.5:1 on base-100 (of 37 daisyUI + kaizen themes) | Shipped themes (light, dark, kaizen, kaizen-light) |
|---|---|---|
| `/50` | 34 | light variants fail (3.2–3.4) |
| `/60` | 15 | light 4.42–4.64, kaizen-light 4.37–4.72 — borderline |
| `/70` | 6 (caramellatte, coffee, retro, silk, valentine, winter) | ≥ 6.0 everywhere |
| `/80` | 1 (valentine) | ≥ 8.3 |

`/70` is the library minimum: it passes on every shipped theme and most daisyUI themes, and matches the 117 places
already using it. The six themes that still fail are low-contrast by design; apps using them should override muted text
(e.g. `[data-theme=winter] .text-base-content\/70 { color: … }`) or pick a darker `base-content`.

## Automated coverage

- `e2e/components-a11y.spec.ts` (CI, Chromium): axe WCAG 2.2 AA over the live examples (`[examples]`) of **every**
  example route in the docs catalog — 128 routes, serious/critical must be zero. Routes come from
  `projects/shared-demos/platform/catalog/pages.ts`, so new examples are audited automatically. Runs with reduced motion
  so contrast is never measured mid-fade. User-document content (PDF pages, converted DOCX/EML) is excluded.
- `e2e/docs-platform.spec.ts`: axe over the docs chrome on Chromium, Firefox and WebKit; `e2e/pdf-workspace.spec.ts` /
  `document-workspace.spec.ts`: workspaces in four themes. `e2e/app.spec.ts` assertions are unconditional.
- First run of the component audit (2026-11-17) found 33 failing routes. Library fixes: picker fields are
  `role="combobox"` (`aria-expanded` is not allowed on a textbox); the editor's contenteditable is a named
  `role="textbox"` (the label sat on a wrapper `<div>`); virtual-scroll viewports are focusable; `menu-title` and
  inactive tabs at the muted-text minimum; the app-shell overlay `<label>` no longer carries a prohibited
  `aria-label`; PDF display-mode buttons reach the 24 × 24 px target size. Demo-only issues were fixed by the docs
  platform.

## Manual verification still required

Screen readers cannot be automated reliably; before 1.0 verify with NVDA + Firefox and VoiceOver + Safari:

1. Select: open/close, arrow highlighting announced, multi-select chips removable by keyboard.
2. Datepicker: grid navigation announces dates; range selection state.
3. Toast / Notification: single announcement per message; dismiss reachable by keyboard; pause on focus.
4. Dialog / Alert: focus trap, Escape, focus restoration to the opener.
5. Table / DataGrid: sort state announced, row selection announced, active cell announced.
6. Tree: level/position announced, expand/collapse, checkbox state.
7. Stepper and Tabs: tab/panel association, arrow keys.
8. Reduced motion (OS setting) and 200 % / 400 % zoom (reflow, 1.4.10) on the demo app.
9. RTL (`dir="rtl"`): not tested anywhere today.
