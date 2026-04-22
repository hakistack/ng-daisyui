# i18n Audit — Components Needing the `labels` Treatment

Audit of hardcoded user-visible English strings across `@hakistack/ng-daisyui`, capturing which components still need a configurable `labels` surface for i18n.

The `TableComponent` and all its sub-components have already been fully internationalized via `TableLabels`, `PaginationLabels`, `FilterLabels`, `ColumnVisibilityLabels`, and `GlobalSearchLabels` (see `projects/hakistack/ng-daisyui/src/lib/components/table/table.types.ts`).

## Results

### High-value (do these first)

- **DynamicFormComponent** (5 strings) — wizard nav buttons, editor/select placeholders. Hits every form user builds.
- **SelectComponent** (8 strings) — placeholder, search placeholder, "Select All" / "Clear All", empty states. Used as a primitive inside the filter component too, so fixing it ripples everywhere.
- **DatepickerComponent** (~17 strings) — the biggest surface: month/year pickers, AM/PM, Today/Clear, time labels, validation messages.
- **AlertService** (10 strings) — `Confirm` / `Cancel` / `OK` / `Yes` / `No` / `Delete` buttons, delete-confirm titles, loading title, fetch-error text. Visible across the whole app.

### Medium

- **ToastService** — online/offline network-status messages (only 2 strings).
- **StepperComponent** — `"(Optional)"` suffix.
- **TreeComponent** — filter placeholder + expand/collapse aria-labels.
- **TimepickerComponent** — placeholder + Clear button.

### Low

- **InputComponent** — password show/hide aria-labels (2 strings, but they're computed inline).

### Clean

- **TabGroup / TabPanel** — content is all user-provided.
- **OrganizationChartComponent**, **VirtualScrollerComponent**, **DialogWrapper** / **DialogService**, **FormStateService**, **AccessibilityService**, helpers — no hardcoded user-visible text.

---

## Recommended order

1. **`AlertService` first** — affects confirm dialogs everywhere, 10 strings, mechanical fix.
2. **`SelectComponent` next** — it's a primitive used inside the filter component too, so localizing it fixes a chain.
3. **`DynamicFormComponent`** — 5 quick strings, high visibility (every form).
4. **`DatepickerComponent`** — biggest surface (~17 strings), do this when you have focus.
5. **Medium batch** (Toast, Stepper, Tree, Timepicker) — 8 strings total, can knock out together.
6. **Input password toggle** — lowest value, do last or skip.

## Consistent API across all of them (matches the table work)

- `XxxLabels` interface in the component's types file.
- Either (a) `labels?: XxxLabels` on the existing config builder **or** (b) direct `labels = input<XxxLabels>({})` on the component — whichever matches that component's existing pattern.
- `resolvedLabels = computed(() => ({ ...DEFAULTS, ...this.labels() }))` merge in each component.
- Templates read `resolvedLabels().xxx`.

## Suggested first batch

`AlertService` + `SelectComponent` + `DynamicFormComponent` as the first publishable batch. `DatepickerComponent` deserves its own commit given the surface size.
