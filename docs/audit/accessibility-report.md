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
| `hk-command-palette` | `aria-selected` on `<button>` | axe `aria-allowed-attr` | `aria-current="true"` on the highlighted item | — (no spec file yet for the component; see backlog) |
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
| Motion | Outputs keep firing under reduced motion; `animateSequence` honours it | — (no motion specs; type-checked only) |
| Kaizen themes | `*-content` colours raised to ≥ 4.5:1 | computed contrast (script in this audit) |

## Open findings (prioritised)

| Sev | Component | Finding | Evidence | Recommended fix |
|---|---|---|---|---|
| ~~High~~ | `hk-dynamic-form` | No `aria-invalid` / `aria-describedby` on fields; error text not associated nor announced | `dynamic-form.component.html:320-329` | ids on error/help, `aria-describedby`, polite live region | **(fixed)**
| ~~High~~ | `hk-dynamic-form` | Labels not associated for datepicker/timepicker (id lands on the custom element host), radio groups (no fieldset/legend), editor | template | `inputId` input on pickers; `<fieldset><legend>` for radios | **(fixed)**
| High | `hk-table` | `aria-activedescendant` on inner `<table>` while focus is on the host → nothing announced; `aria-sort` only in CDK layout, on a `div`; sort triggers are `div[tabindex]` without role | `table.component.html:952,1109,270` | move to host; shared header template for all three layouts (see X1) |
| ~~High~~ | `hk-tree` | No `aria-level`/`aria-setsize`/`aria-posinset`; no `aria-checked` in checkbox mode; filter input inside `role="tree"` | `tree.component.html:39`, `tree.component.ts:64` | add attributes; move filter outside the tree role | **(fixed)**
| ~~High~~ | `hk-command-palette` | Not a combobox/listbox pattern (no `role=combobox`, `aria-controls`, `aria-activedescendant`); `<dialog>` has no name | `command-palette.component.html:1-23` | full APG combobox | **(fixed)**
| ~~High~~ | `hk-notification` | Each item announced up to three times (assertive host region + `role=alert` host + inner `role=alert`) | `notification-host.component.html:1`, `notification-item.component.html:97,124,142` | one polite region at the host; no `role=alert` on items | **(fixed)**
| Medium | `hk-toast` | Per-item live region inserted together with its content (unreliable announcement); `aria-label=summary` hides detail; pause on hover only (not focus, WCAG 2.2.1); hardcoded "Dismiss notification" | `toast.component.html:5-8,41` | persistent live region; focus-pause; label via `ToastLabels` |
| Medium | `hk-menu` | `menubar` uses Up/Down instead of Left/Right; every item is a tab stop (no roving tabindex); `role=menu` used for site navigation | `menu.component.ts:243-268` | `nav > ul` for navigation; APG menubar keys for real menus |
| Medium | `hk-select` | With search enabled focus is on the search box, which lacks `aria-activedescendant`; focus not restored to trigger after Escape/selection | `select.component.html:134`, `select.component.ts:700` | |
| ~~Medium~~ | `hk-timepicker` | Closing the `aria-modal` panel does not restore focus | `timepicker.component.ts:467` | mirror datepicker | **(fixed)**
| Medium | `hk-datagrid` | `aria-multiselectable="true"` regardless of selection mode | `datagrid.component.html:134` | bind to mode |
| Low | `hk-alert` | `aria-describedby` points at an empty body; hardcoded "Close"/"Loading" | `alert-overlay.html:8` | |
| Low | motion | `animateSequence` ignores `prefers-reduced-motion` (directives honour it) | `motion-sequence.ts:54` | |
| Low | Datepicker, table bars | `role="alert"` combined with `aria-live="polite"` (conflicting) | | pick one |

## Automated coverage

- axe runs only for the two workspace pages (light/dark/kaizen/cupcake themes) — all pass.
- **Gap:** no axe run over the other demo routes; `e2e/app.spec.ts` wraps assertions in `if (await link.isVisible())`,
  so it can pass without asserting. Recommended: one parameterised axe test over every demo route (the docs platform
  being built in parallel already enumerates routes in `projects/shared-demos/platform/catalog/pages.ts`).

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
