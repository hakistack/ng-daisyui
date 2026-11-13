# @hakistack/ng-daisyui — Consumer Usage Audit

A checklist consumer apps can use to verify they are using **`@hakistack/ng-daisyui`** the way it was designed to be used. Every section pairs the **intended pattern** with a **common wrong pattern** so deviations are easy to spot during PR review.

If your code matches every ✅ row and avoids every ❌ row, you are using the library as intended.

> ⚠️ **This is a guide, not a spec.** It encodes the library's *default, recommended* usage. Real apps will have legitimate reasons to deviate — niche layouts, hybrid forms, integrations with existing state, etc. Treat ✅/❌ rows as PR-review prompts, not hard failures: if a deviation is intentional and well-reasoned, that's fine. The goal is to surface *accidental* drift away from the intended patterns, not to forbid every alternative.

---

## 0. Quick audit checklist

Tick each box; any unticked row is something to fix.

- [ ] Package installed: `@hakistack/ng-daisyui` (peer deps Angular ≥ 21, Tailwind v4, daisyUI v5 also installed)
- [ ] `styles.css` imports Tailwind, the daisyUI plugin, and `@hakistack/ng-daisyui` styles
- [ ] `<html data-theme="…">` is set, and (optional) `provideHkTheme('daisyui-v5' | 'daisyui-v4')` is in app config
- [ ] App config includes `provideToast()`, `provideAlert()`, `provideNotification(...)` only when those services are actually used
- [ ] App config includes `provideFormState({ mode })` if any form uses `autoSave`
- [ ] App config includes `providePipes()` (pass `providePipes({ myPipe: ... })` if you use custom formatter names in tables)
- [ ] App config registers Lucide icons used in your templates via `provideLucideIcons(...)`
- [ ] `<hk-notification-host />` is mounted **once** at the app shell when using `NotificationService`
- [ ] Every form uses `createForm({...})` + `field.*()` — no hand-written `FormFieldConfig` arrays
- [ ] Every form renders its own Submit/Reset buttons by calling `form.submit()` / `form.reset()` — **no `submitLabel` shopping**
- [ ] Every table uses `createTable({...})` and its returned controller is bound to `[config]`
- [ ] Tables use `fmt.*()` helpers for formatters, not raw pipe strings or inline functions where a built-in pipe would do
- [ ] Custom column cells use `<ng-template hkCellTemplate="<field>">`; custom footers use `<ng-template hkFooter>` projected inside `<hk-table>`
- [ ] CSV / JSON exports go through `exportToCsv` / `exportToJson` rather than hand-rolled serializers
- [ ] Trees use `createTree({...})` + `node.*()` (or `buildTree` / `node.fromData` for flat data)
- [ ] `<hk-command-palette>` and `<hk-pdf-viewer>` are wired through `createCommandPalette()` / `createPdfViewer()` controllers
- [ ] `<hk-pdf-viewer>` custom toolbars use `<ng-template hkPdfToolbar let-state="state">`
- [ ] `<hk-editor>` is used with `[formControl]` / `[(ngModel)]`; toolbar preset and slash commands come from `TOOLBAR_PRESETS` / `createSlashCommands()`
- [ ] `<hk-virtual-scroller>` is used for long flat / horizontal / grid lists instead of CDK virtual scroll plumbing
- [ ] `<hk-tab-group>` + `<hk-tab-panel value="…">` (not a hand-built tabs widget) for tabs
- [ ] `<hk-stepper>` is used for non-form steppers; `createForm({ steps })` covers form wizards
- [ ] `<hk-input>`, `<hk-select>`, `<hk-datepicker>`, `<hk-timepicker>`, `<hk-editor>` are bound through Angular forms (`[formControl]` / `formControlName` / `[(ngModel)]`)
- [ ] Input masking uses `[hkInputMask]` (never duct-taped regex + `(input)` handlers)
- [ ] Animations use the motion directives (`[hkAnimate]`, `[hkHover]`, `[hkPress]`, `[hkScroll]`, `[hkResize]`) — not raw `motion()` calls
- [ ] Auto-focus uses `[appAutoFocus]` instead of `ViewChild + nativeElement.focus()`
- [ ] Localization overrides go through label providers: `provideDynamicFormLabels(...)`, `provideHkPdfLabels(...)`, `provideHkCommandPaletteLabels(...)`, `provideHkNotificationLabels(...)`
- [ ] Imports come from the package barrel: `import { ... } from '@hakistack/ng-daisyui'` — never deep paths into `lib/`
- [ ] No `NgModule`s — every component is standalone, imports are listed per-component
- [ ] No `*ngIf` / `*ngFor` / `*ngSwitch` in templates — native control flow (`@if`/`@for`/`@switch`)
- [ ] No `[ngClass]` / `[ngStyle]` — use `[class]` and `[style]` bindings
- [ ] No template arrow functions, and no methods that allocate a new object/array/Date on each call inside `[ngModel]` / `[config]`

---

## 1. Installation & styles

### ✅ Intended

```bash
npm install @hakistack/ng-daisyui
# peer deps you must have:
#   @angular/core @angular/common @angular/forms @angular/cdk @angular/aria @angular/router
#   tailwindcss@^4  daisyui@^5  rxjs
```

```css
/* src/styles.css */
@import "tailwindcss";
@plugin "daisyui" {
  themes: all;
}

/* Library compiled CSS — required */
@import "@hakistack/ng-daisyui";

/* Optional custom themes shipped with the lib */
@import "@hakistack/ng-daisyui/themes/kaizen";        /* dark */
@import "@hakistack/ng-daisyui/themes/kaizen-light";  /* light */
```

```html
<!-- src/index.html -->
<html data-theme="kaizen">
  <body><app-root></app-root></body>
</html>
```

### ❌ Wrong

- Installing the lib **without** Tailwind v4 + daisyUI v5 as project deps — components won't render.
- Importing styles from deep paths like `@hakistack/ng-daisyui/dist/...` instead of the package root.
- Forgetting `data-theme` on `<html>` — components look unstyled.
- Adding Tailwind safelists / `@source inline(...)` for library classes — the lib's FESM already exposes its templates to Tailwind's content scan; safelists are unnecessary and were explicitly reverted upstream.

---

## 2. App-level providers (app.config.ts)

The library uses **provider functions** (no `NgModule.forRoot()` ever). Add only what you actually use.

### ✅ Intended

```ts
import { ApplicationConfig } from '@angular/core';
import {
  provideHkTheme,
  provideToast,
  provideAlert,
  provideNotification,
  provideFormState,
  providePipes,
} from '@hakistack/ng-daisyui';
import { provideLucideIcons, LucideHouse, LucideSettings } from '@lucide/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHkTheme('daisyui-v5'),                              // swap class names for v4 if needed
    provideToast(),                                            // only if using ToastService
    provideAlert(),                                            // only if using AlertService
    provideNotification({ position: 'top-right', maxStack: 5 }), // only if using NotificationService
    provideFormState({ mode: 'localStorage' }),                // only if any form uses autoSave
    providePipes(),                                            // table formatters / pipe-by-name
    provideLucideIcons(LucideHouse, LucideSettings),           // your icons (lib brings its own internal ones)
  ],
};
```

### ❌ Wrong

- Importing a `NgDaisyuiModule` or calling `.forRoot()` — neither exists.
- Calling `provideToast()` / `provideAlert()` / `provideNotification()` **and never using the corresponding service** — dead providers.
- Forgetting `providePipes()` when a table column references a pipe by string name.
- Forgetting `provideFormState(...)` when a form sets `autoSave: { ... }` — the form silently won't persist.
- Registering icons individually inside components instead of once at the app level.

---

## 3. Component imports & standalone hygiene

### ✅ Intended

```ts
import { Component } from '@angular/core';
import { DynamicFormComponent, TableComponent, createForm, field } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-people',
  imports: [DynamicFormComponent, TableComponent],   // import only what the template uses
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `…`,
})
export class PeopleComponent { /* … */ }
```

### ❌ Wrong

- `standalone: true` written explicitly in `@Component` — it's the default in Angular 20+ and lints/CI in this project will flag it.
- Re-exporting components through a shared "ng-daisyui.module.ts" — defeats tree-shaking; just import the symbols directly.
- Deep import paths (`@hakistack/ng-daisyui/lib/...`, `dist/...`) — only the package root is a supported entry point. Subpath entries (`@hakistack/ng-daisyui/themes/...`, `/styles`) are CSS-only.
- Forgetting `changeDetection: ChangeDetectionStrategy.OnPush` in app components that interact with library signals — works, but not the intended performance baseline.

---

## 4. Dynamic Form — `createForm` + `field.*()` + FormController

### ✅ Intended

```ts
import { createForm, field, step, validation, layout, DynamicFormComponent } from '@hakistack/ng-daisyui';

@Component({
  imports: [DynamicFormComponent],
  template: `
    <hk-dynamic-form [config]="form.config()" />

    <div class="flex justify-end gap-2 mt-4">
      <button class="btn" (click)="form.reset()">Reset</button>
      <button class="btn btn-primary" (click)="form.submit()">Save</button>
    </div>
  `,
})
export class UserFormComponent {
  form = createForm<{ name: string; email: string; role: string; company?: string }>({
    ...layout.grid(2, { gap: 'md' }),
    fields: [
      field.text('name', 'Name', { ...validation.required(2, 60) }),
      field.email('email'),                                      // auto-label = "Email"
      field.select('role', 'Role', { choices: ['Admin', 'User'] }),
      field.text('company', 'Company', { showWhen: ['role', 'Admin'] }),
      field.hidden('userId', { defaultValue: currentUser.id }),
    ],
    onSubmit: ({ valid, values }) => valid && this.save(values),
  });
}
```

### Wizard (multi-step) — `step.*()`

```ts
form = createForm({
  steps: [
    step.create('info', 'Personal Info', [
      field.text('name', 'Name', { required: true }),
      field.email('email'),
    ]),
    step.create('prefs', 'Preferences', [
      field.toggle('newsletter', 'Send me product updates'),
    ], { optional: true }),
    step.review('review', 'Review'),
  ],
  onSubmit: ({ valid, values }) => valid && this.save(values),
});
```

### Conditional logic shorthand (`showWhen` / `hideWhen` / `requiredWhen` / `disabledWhen`)

| Shorthand                                    | When to use                                                   |
| -------------------------------------------- | ------------------------------------------------------------- |
| `'fieldKey'`                                 | Show when that form field is truthy                           |
| `['fieldKey', value]`                        | Show when that form field equals `value`                      |
| `['fieldKey', (v, form) => boolean]`         | Predicate against another form field                          |
| `() => boolean`                              | Predicate that reads signals — reactive                       |
| `this.someSignal` (no parens)                | Pass the signal **itself** — reactive                         |
| `true` / `false`                             | Static, evaluated once at build time                          |

### ❌ Wrong

- Hand-rolling `FormFieldConfig` objects: `{ type: 'text', key: 'name', validators: [...] }`. Always use `field.*()` — the type-narrowed options give you autocomplete and compile-time checking.
- Adding a built-in submit button to `<hk-dynamic-form>` — there is none. Forms render fields only; **the consumer owns the buttons** via the `FormController`.
- Looking for inputs like `submitLabel`, `buttonPosition`, `showReset` — they don't exist; place buttons wherever your layout needs them and call `form.submit()` / `form.reset()`.
- `[ngModel]="this.someMethodThatReturnsADate()"` inside a form field — fresh object per call → `NG0103 ExpressionChangedAfterItHasBeenChecked`. Convert to `computed()`.
- Using `autoSave` without `provideFormState(...)` configured at app level.
- Passing both `fields` and `steps` to `createForm` — pick one mode.

---

## 5. Table — `createTable` + `fmt` + `TableController`

### ✅ Intended

```ts
import {
  createTable, fmt, exportToCsv, exportToJson, aggregate,
  TableComponent, HkCellTemplateDirective, HkFooterDirective,
} from '@hakistack/ng-daisyui';

@Component({
  imports: [TableComponent, HkCellTemplateDirective, HkFooterDirective],
  template: `
    <hk-table [data]="users()" [config]="table" [loading]="loading()">
      <ng-template hkCellTemplate="email" let-row>
        <a [href]="'mailto:' + row.email" class="link link-primary">{{ row.email }}</a>
      </ng-template>

      <!-- Custom projected footer row (full CSS freedom; lib wraps the colspan) -->
      <ng-template hkFooter let-data let-cols="columns">
        <div class="flex justify-end gap-4 text-sm">
          <span>Total payroll: {{ totalPayroll(data) | currency }}</span>
        </div>
      </ng-template>
    </hk-table>
  `,
})
export class UsersTableComponent {
  users = signal<User[]>([]);
  loading = signal(false);

  table = createTable<User>({
    visible: ['name', 'email', 'role', 'salary', 'createdAt'],
    headers: { createdAt: 'Joined' },
    formatters: {
      salary:    fmt.currency({ currencyCode: 'USD' }),
      createdAt: fmt.date('mediumDate'),
      role:      fmt.titlecase(),
    },
    footers: { salary: 'sum' },
    selectableRows: 'multi',
    globalSearch: { enabled: true },
    pagination: { mode: 'offset', pageSize: 25 },
    actions: [
      { type: 'edit',   label: 'Edit',   icon: 'pencil',  action: (row) => this.edit(row) },
      { type: 'delete', label: 'Delete', icon: 'trash-2', action: (row) => this.remove(row) },
    ],
  });

  // Imperative API lives on the controller — no @ViewChild needed
  clear() { this.table.clearAllFilters(); this.table.clearSelection(); }

  // Server-driven pagination — push runtime state through the controller
  onPageLoaded(result: { rows: User[]; total: number }) {
    this.users.set(result.rows);
    this.table.setPagination({ totalItems: result.total });
  }
}
```

### ❌ Wrong

- Building a table out of raw `<table>` markup and `*ngFor` "because it's easier" — you lose sorting, filtering, pagination, virtualization, a11y, and column visibility wiring.
- Writing inline functions for formatting (`(v) => new Date(v).toLocaleDateString()`) when `fmt.date(...)` would do — `fmt.*()` reuses Angular's built-in pipes through the PipeRegistry and is theme/locale-aware.
- Referencing a pipe by string (`formatter: 'mycustompipe'`) without registering it through `providePipes({ mycustompipe: ... })`.
- Adding new properties to a `FieldConfig` and forgetting to extend `createFieldConfig` in `table.helpers.ts` — the whitelist normalizer silently drops unknown fields. (Library-side rule, but worth knowing as a consumer if you fork a column option.)
- Reaching into `<hk-table>` with `@ViewChild` to drive it imperatively — the `TableController` returned from `createTable()` exposes everything (`sort`, `gotoPage`, `clearSelection`, `expandToLevel`, `setPagination`, …).
- Putting cell templates outside of `<hk-table>` — they must be `<ng-template hkCellTemplate="<columnField>">` projected as content children.

---

## 6. Tree — `createTree` + `node.*()`

### ✅ Intended

```ts
import { createTree, node, buildTree, TreeComponent } from '@hakistack/ng-daisyui';

// Static tree
treeA = createTree({
  nodes: [
    node.folder('src', [
      node.file('app.ts'),
      node.file('main.ts'),
    ]),
    node.lazy('node_modules'),         // fires (lazyLoad) on expand
  ],
  selectionMode: 'multi',
  filterable: true,
  dragDrop: true,
});

// Flat data → tree
flat = [
  { id: 1, name: 'Engineering', parentId: null },
  { id: 2, name: 'Frontend',    parentId: 1 },
];
treeB = createTree({
  nodes: buildTree(this.flat, {
    idFn: d => d.id,
    parentIdFn: d => d.parentId,
    labelFn: d => d.name,
  }),
});
```

```html
<hk-tree [tree]="treeA" (nodeSelect)="onSelect($event)" (lazyLoad)="onLazy($event)" />
```

### ❌ Wrong

- Hand-rolling `TreeNode<T>[]` with manual `key` generation — use `node.create/folder/file/lazy` so keys are stable and defaults (`leaf`, `icon`, `expandedIcon`) are correct.
- Building parent/child arrays in a `for` loop — use `buildTree` / `node.fromData`.
- Binding `[nodes]` **and** `[tree]` — `[tree]` wins; pick one (prefer `[tree]`).

---

## 7. Command Palette — `createCommandPalette`

### ✅ Intended

```ts
import { createCommandPalette, CommandPaletteComponent } from '@hakistack/ng-daisyui';

palette = createCommandPalette({
  items: [
    { id: 'home', label: 'Home', icon: 'house', onSelect: () => this.router.navigate(['/']) },
    { id: 'docs', label: 'Docs', icon: 'book-open', group: 'help', onSelect: () => this.openDocs() },
  ],
  groups: [{ id: 'help', label: 'Help' }],
  modes: [{ prefix: '>', filterGroups: ['help'], indicatorLabel: 'Help' }],
  hotkey: 'Mod+K',
  filter: 'fuzzy',
});
```

```html
<hk-command-palette [config]="palette.config()" />
<button (click)="palette.open()" class="btn btn-sm">Open palette (⌘K)</button>
```

### ❌ Wrong

- Reaching for `@ViewChild(CommandPaletteComponent)` to call `open()` — use the controller from `createCommandPalette()`.

---

## 8. PDF Viewer — `createPdfViewer`

### ✅ Intended

```ts
import { createPdfViewer, PdfViewerComponent } from '@hakistack/ng-daisyui';

viewer = createPdfViewer({
  zoom: 'fit-width',
  layout: 'default',          // or 'preview' for embedded card-style
  onLoaded: ({ numPages }) => console.log(`${numPages} pages`),
  onError:  (e) => this.toast.error(e.message),
});

pdfUrl = signal('/docs/manual.pdf');
```

```html
<hk-pdf-viewer [src]="pdfUrl()" [config]="viewer.config()" />
```

Imperative use: `this.viewer.goToPage(5)`, `this.viewer.search('terms')`, `this.viewer.print()`.

### ❌ Wrong

- Loading `pdfjs-dist` yourself and feeding the viewer a parsed document. The lib lazy-loads it for you; just pass `[src]` (URL, ArrayBuffer, or typed-array).
- Setting `[src]` inside `createPdfViewer({...})` — `src` is the most volatile value and lives on the component input, not in the controller config.

---

## 9. Plain inputs — `hk-input`, `hk-select`, `hk-datepicker`, `hk-timepicker`

These are **ControlValueAccessor** components. Bind them through Angular forms; do **not** read/write `.value` imperatively.

### ✅ Intended (reactive forms)

```ts
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { InputComponent, SelectComponent, DatepickerComponent, TimepickerComponent } from '@hakistack/ng-daisyui';

@Component({
  imports: [ReactiveFormsModule, InputComponent, SelectComponent, DatepickerComponent, TimepickerComponent],
  template: `
    <hk-input  [formControl]="name"     variant="text"    placeholder="Name" />
    <hk-input  [formControl]="price"    variant="currency" [currencyConfig]="{ currencyCode: 'USD' }" />
    <hk-select [formControl]="role"     [options]="roles" placeholder="Pick a role" />
    <hk-datepicker [formControl]="dob"  />
    <hk-timepicker [formControl]="time" />
  `,
})
export class FormBitsComponent {
  name  = new FormControl('');
  price = new FormControl<number | null>(null);
  role  = new FormControl<string | null>(null);
  dob   = new FormControl<Date | null>(null);
  time  = new FormControl<string | null>(null);
  roles = [{ value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }];
}
```

Template-driven `[(ngModel)]` also works (these are CVAs), but reactive forms are preferred per the project coding standards.

### ❌ Wrong

- Reading `selectionChange.emit()` / `(input)` events and writing your own two-way state instead of using a `FormControl`.
- Disabling via `[disabled]="..."` on `<hk-input>` when the field is in a form — use `FormControl.disable()` / `FormGroup.disable()`.
- Passing **functions that allocate** to `[ngModel]` or `[config]` inputs — convert to `computed()`. Repeated calls returning a fresh `Date` / `{}` / `[]` cause `NG0103` change-detection cycles.

---

## 9b. Rich-text Editor — `hk-editor`

CVA-backed TipTap editor. Bind through Angular forms; configure the toolbar via the `toolbar` input (preset name or full `EditorToolbarConfig`); register slash commands via `createSlashCommands(...)` or the shorthand `slash(...)`.

### ✅ Intended

```ts
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import {
  EditorComponent, TOOLBAR_PRESETS,
  createSlashCommands, BUILT_IN_SLASH_COMMANDS, slash,
} from '@hakistack/ng-daisyui';

@Component({
  imports: [ReactiveFormsModule, EditorComponent],
  template: `
    <hk-editor
      [formControl]="body"
      [toolbar]="TOOLBAR_PRESETS.full"
      [slashCommands]="slashCommands"
      placeholder="Write your post…"
      editorHeight="320px"
      (editorReady)="onReady()"
    />
  `,
})
export class PostEditor {
  TOOLBAR_PRESETS = TOOLBAR_PRESETS;
  body = new FormControl('');

  slashCommands = createSlashCommands([
    ...BUILT_IN_SLASH_COMMANDS,
    slash({ id: 'cta', title: 'Insert CTA', icon: 'megaphone', html: '<div class="cta">…</div>' }),
  ]);
}
```

### ❌ Wrong

- Importing `EditorToolbarComponent` / `EditorSlashMenuComponent` directly — they are internal subcomponents of `<hk-editor>`. Use `<hk-editor>` and configure via inputs.
- Mounting TipTap yourself in parallel — the lib already lazy-loads its TipTap kernel.
- Bypassing `[formControl]` and reading `(textChange)` to mirror state manually.

---

## 9c. Virtual Scroller — `hk-virtual-scroller`

Use this for very long flat / horizontal / grid item lists. Required input is `[itemSize]`. Use it via projected `<ng-template>` body (the component supplies an `$implicit` item context).

### ✅ Intended

```ts
import { VirtualScrollerComponent } from '@hakistack/ng-daisyui';

@Component({
  imports: [VirtualScrollerComponent],
  template: `
    <hk-virtual-scroller
      [items]="rows()"
      [itemSize]="48"
      orientation="vertical"
      (lazyLoad)="loadMore($event)"
    >
      <ng-template let-row let-i="index">
        <div class="px-3 py-2 border-b border-base-300">{{ i }}. {{ row.label }}</div>
      </ng-template>
    </hk-virtual-scroller>
  `,
})
export class BigListComponent { /* … */ }
```

### ❌ Wrong

- Reaching for `@angular/cdk/scrolling` directly when this wrapper already provides lazy loading, orientation, and a typed `$implicit` template.
- Mixing `*cdkVirtualFor` and `<hk-virtual-scroller>` in the same template.

---

## 9d. Tabs — `hk-tab-group` + `hk-tab-panel`

Use these together; the group reads its panels via content projection. Variants and orientation are driven by inputs.

### ✅ Intended

```ts
import { TabGroupComponent, TabPanelComponent } from '@hakistack/ng-daisyui';

@Component({
  imports: [TabGroupComponent, TabPanelComponent],
  template: `
    <hk-tab-group
      [(selectedTab)]="active"
      variant="lift"
      orientation="horizontal"
      [wrap]="true"
    >
      <hk-tab-panel value="overview" label="Overview" icon="house">…</hk-tab-panel>
      <hk-tab-panel value="settings" label="Settings" icon="settings" [disabled]="!canEdit()">…</hk-tab-panel>
    </hk-tab-group>
  `,
})
export class SettingsTabs { active = signal<string | undefined>('overview'); /* … */ }
```

### ❌ Wrong

- Rolling your own daisyUI `role="tablist"` markup — accessibility (roving tabindex, ARIA selected, keyboard nav) is already implemented here.
- Using `<hk-tab-panel>` without `value="..."` — `value` is the required identifier for selection.

---

## 9e. Stepper — `hk-stepper` (raw CDK Stepper)

For **form** wizards, use `createForm({ steps })` — it handles step rendering, validation, and review steps for you. Use `<hk-stepper>` only when you want a non-form stepper or a fully custom step body. It extends Angular CDK's `CdkStepper`, so you compose its steps with `<cdk-step>`.

### ✅ Intended

```ts
import { CdkStepperModule } from '@angular/cdk/stepper';
import { StepperComponent } from '@hakistack/ng-daisyui';

@Component({
  imports: [CdkStepperModule, StepperComponent],
  template: `
    <hk-stepper [linear]="true" (completed)="finish()" (stepChange)="track($event)">
      <cdk-step label="Plan">…</cdk-step>
      <cdk-step label="Billing" [optional]="true">…</cdk-step>
      <cdk-step label="Done">…</cdk-step>
    </hk-stepper>
  `,
})
export class OnboardingStepperComponent { /* … */ }
```

### ❌ Wrong

- Reaching for `<hk-stepper>` to build a form wizard — `createForm({ steps: [...] })` already includes step rendering, validation, and a review step.

---

## 10. Services — Toast / Alert / Notification / Dialog

All four are injectable singletons (`providedIn: 'root'` style or via `provideX()`). Trigger from any component class — **no template host required** for Toast and Alert. Only `NotificationService` needs a host element.

### ✅ Intended

```ts
import { inject } from '@angular/core';
import { ToastService, AlertService, NotificationService, DialogService } from '@hakistack/ng-daisyui';

class MyComponent {
  toast        = inject(ToastService);
  alert        = inject(AlertService);
  notifications = inject(NotificationService);
  dialog       = inject(DialogService);

  async onSave() {
    this.toast.success('Saved!');                         // transient
    const ok = await this.alert.confirm({ title: 'Replace existing?' });
    if (!ok) return;

    this.notifications.success({                          // persistent overlay event
      title: 'Document shared',
      message: 'Anyone with the link can view it.',
      actions: [{ label: 'Undo', onClick: () => this.undo() }],
    });

    this.dialog.open(EditUserComponent, { data: { userId: 42 } });
  }
}
```

```html
<!-- App shell — only needed for NotificationService -->
<hk-notification-host />
```

### ❌ Wrong

- Mounting `<hk-toast />` or `<hk-alert-container />` in templates yourself — `ToastService` and `AlertService` mount their host component **programmatically** the first time they're used; manual mounts cause duplicates.
- Forgetting to mount `<hk-notification-host />` once in the app shell when using `NotificationService` — calls become no-ops.
- Calling `provideToast()` etc. without ever injecting the service — dead provider noise.
- Putting a long-running confirmation dialog (`alert.confirm`) inside a tight `signal/effect` loop — it returns a Promise; await it.

---

## 11. Icon registration (`@lucide/angular`)

The library ships with the icons **it** uses internally. Icons you reference in your own templates must be registered yourself.

### ✅ Intended

```ts
import { provideLucideIcons, LucideHouse, LucideStar, LucideDynamicIcon } from '@lucide/angular';

providers: [provideLucideIcons(LucideHouse, LucideStar)];
```

```html
<svg lucideHouse [size]="20"></svg>
<svg lucideIcon="star" [size]="16"></svg>   <!-- needs LucideDynamicIcon in component imports -->
```

### ❌ Wrong

- Importing Lucide icons inline into a leaf component and re-providing them per-component — keep registration at the app level so the bundle stays lean.
- Trying to use an icon name in templates without registering it — silent miss/blank icon.

---

## 11b. Directives

The library ships seven attribute directives. Use them instead of hand-rolled equivalents.

| Directive                       | Selector                          | What it does                                                                  |
| ------------------------------- | --------------------------------- | ----------------------------------------------------------------------------- |
| `AutoFocusDirective`            | `[appAutoFocus]`                  | Focus the element on init                                                     |
| `InputMaskDirective`            | `[hkInputMask]`                   | Pattern-mask plain `<input>`s; tokens `9` digit, `a` letter, `*` alphanumeric |
| `MotionAnimateDirective`        | `[hkAnimate]` + `[hkAnimateOptions]` | Preset/custom animations; `trigger: 'immediate' \| 'scroll' \| 'click'`     |
| `MotionHoverDirective`          | `[hkHover]`                       | Hover-only keyframes                                                          |
| `MotionPressDirective`          | `[hkPress]`                       | Press / mousedown keyframes                                                   |
| `MotionScrollDirective`         | `[hkScroll]`                      | Scroll-tied keyframes (parallax-style)                                        |
| `MotionResizeDirective`         | `[hkResize]`                      | Emit element-resize observations                                              |

Plus the imperative helper `animateSequence(...)` for chained timelines.

### ✅ Intended

```html
<input [hkInputMask]="'(999) 999-9999'" [unmask]="true" (maskValueChange)="phone.set($event)" />

<input [appAutoFocus] />

<section [hkAnimate]="'fadeInUp'" [hkAnimateOptions]="{ trigger: 'scroll', once: true, amount: 0.3 }">
  …
</section>

<button [hkHover]="{ scale: 1.05 }" [hkPress]="{ scale: 0.97 }">Click</button>
```

### ❌ Wrong

- Importing `motion` directly and writing `animate(...)` calls in components — the directives do this with reduced-motion handling and lifecycle cleanup built in.
- Mixing `@HostListener('keydown')` masking logic with `[hkInputMask]` on the same element.
- Using `ViewChild` + `nativeElement.focus()` for initial focus when `[appAutoFocus]` does it.

---

## 11c. Label providers (i18n / customization)

Every component that exposes user-visible strings has a matching `provideHk*Labels(...)` (or `provide*Labels(...)`) function. Use it once at the app level — don't pass labels down per-instance unless you genuinely need per-instance variation.

| Provider                              | Affects                                    |
| ------------------------------------- | ------------------------------------------ |
| `provideDynamicFormLabels(...)`       | Wizard `Previous` / `Next` / `Submit`, editor placeholder, async-loading placeholder for `<hk-dynamic-form>` |
| `provideHkPdfLabels(...)`             | All `<hk-pdf-viewer>` chrome text          |
| `provideHkCommandPaletteLabels(...)`  | Empty state, hint text, mode indicators    |
| `provideHkNotificationLabels(...)`    | Dismiss / undo / aria labels               |
| `provideHkDataGridLabels(...)`        | All `<hk-datagrid>` chrome text            |
| `provideHkDocumentWorkspaceLabels(...)` | `<hk-document-workspace>` chrome text    |
| `TOAST_CONFIG` / `provideToast(...)`  | Toast defaults + `ToastLabels`             |
| `provideAlert(...)`                   | Alert defaults + `AlertLabels`             |
| `NOTIFICATION_CONFIG` / `provideNotification(...)` | Notification defaults         |

The `provideHk*Labels` components (PDF viewer, command palette, notification, datagrid, document workspace) also export `DEFAULT_*_LABELS` and an `HK_*_LABELS` injection token if you need to read or extend the defaults programmatically. Toast, alert and dynamic-form labels are configured only through their `provide*` functions.

### ✅ Intended

```ts
providers: [
  provideHkTheme('daisyui-v5'),
  provideDynamicFormLabels({ previousButton: 'Anterior', nextButton: 'Siguiente', completeButton: 'Enviar' }),
  provideHkPdfLabels({ /* spanish strings */ }),
  provideHkCommandPaletteLabels({ empty: 'Sin resultados' }),
  provideHkNotificationLabels({ dismiss: 'Cerrar' }),
];
```

### ❌ Wrong

- Forking a component to localize labels — every label is overridable through these providers.
- Setting labels on every form / palette / viewer instance individually when an app-wide provider would do.

---

## 11d. Dialog Wrapper — `DialogWrapperComponent`

`DialogService.open(MyComponent, { data })` already wraps your component inside `DialogWrapperComponent`. You only need to import `DialogWrapperComponent` directly if you're projecting it manually (e.g. inside a CDK overlay you control). For 99 % of cases, just use `DialogService.open(...)`.

### ❌ Wrong

- Rendering `<hk-dialog-wrapper>` from your template and trying to drive it imperatively — that's not the supported path. Use `DialogService.open(...)` or `DialogService.openRaw(...)` for an un-wrapped CDK dialog.

---

## 11e. Lower-level APIs (rarely needed)

These are exported from the package root, but most consumer apps never touch them:

| Symbol                                                                       | When you might use it                                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `FormUtils`, `ConditionEngine`                                                | Building a *custom* dynamic-form renderer; `<hk-dynamic-form>` already uses these internally           |
| `projectFields`, `clearHeaderFormatCache`                                     | Custom CSV/JSON projections or invalidating header-format memoization in long-lived apps               |
| `aggregate`, `computeAggregate`                                               | Computing footer aggregates outside of a table (analytics tiles, headers)                              |
| `BUILTIN_PIPE_REGISTRY`                                                       | Inspecting which built-in pipes are registered for `PipeRegistryService`                               |
| `TableEngineService` / `TreeEngineService` / `FuzzyEngineService` / `FormEngineService` / `PdfSearchService` (+ their `*Handle`s and `Engine*` types) | WASM kernels powering the table / tree / palette / form / pdf components. Loaded **lazily** by the components — you almost never need to touch them. Reach for them only when running engine logic outside of the host component (e.g. a worker, a server-side preview) |
| `HK_TABLE_ENGINE_WASM_URL` / `provideTableEngineWasmUrl(url)`                 | Override the URL the WASM bridge fetches from (e.g. hosting the `.wasm` alongside your own assets)     |

Reach for these only when the high-level component / builder API doesn't fit. If you find yourself routinely importing from this list, that's a signal to either (a) submit a feature request upstream, or (b) re-read §4–§9 for the supported API.

---

## 12. Theme bridge — `HK_THEME`

The library supports both daisyUI v4 and v5 via a class-name map. v5 is the default; only override if your app still ships daisyUI v4.

### ✅ Intended

```ts
provideHkTheme('daisyui-v5')     // or 'daisyui-v4'
```

### ❌ Wrong

- Hard-coding `tabs-lifted` / `tabs-lift` in your own templates to match the library — components handle this internally via `HK_THEME`. Just pick one daisyUI major version and tell the lib via `provideHkTheme(...)`.

---

## 13. Anti-patterns that fail review

| Smell                                                                                                 | Why it's wrong                                                                                                              |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `[ngClass]="{ 'tw-class': cond }"`                                                                    | Use `[class]="{ 'tw-class': cond }"` — the project convention                                                                |
| Many `[class.x]` lines stacked                                                                        | Collapse into a single `[class]="{ x: condX, y: condY }"`                                                                    |
| `*ngIf` / `*ngFor` / `*ngSwitch`                                                                      | Use `@if`, `@for`, `@switch` — native control flow only                                                                      |
| `@HostBinding` / `@HostListener`                                                                       | Use the `host: { ... }` metadata object on `@Component` / `@Directive`                                                       |
| `standalone: true` written explicitly                                                                  | Default in Angular 20+; do not set it                                                                                        |
| `mutate()` on a signal                                                                                 | Use `update()` or `set()`                                                                                                    |
| Arrow functions in templates                                                                          | Move into a method or `computed()`                                                                                           |
| Allocating in templates (`new Date()`, `{...}`, `[...]` per call)                                     | Pre-compute via `computed()` to avoid `NG0103`                                                                               |
| `@ViewChild(TableComponent)` to drive the table                                                       | Use the controller returned from `createTable()`                                                                             |
| `@ViewChild(DynamicFormComponent)` to submit / reset                                                  | Use `form.submit()` / `form.reset()` from the `FormController`                                                              |
| Hand-rolled `FormFieldConfig` / `TreeNode` arrays                                                     | Use `field.*()` / `node.*()` builders                                                                                        |
| Mounting `<hk-toast>` / `<hk-alert-container>` manually                                               | Their services mount them automatically                                                                                      |
| Tailwind safelists for library classes                                                                | The lib's FESM `@source` scanning covers them                                                                                |
| `submitButton` / `submitLabel` / `buttonPosition` props sought on `<hk-dynamic-form>`                  | Form renders fields only — owner of the layout owns the buttons                                                              |

---

## 14. Cheat sheet — builder/controller summary

| Component             | Builder                       | Imperative controller methods                                                                                                     |
| --------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `hk-dynamic-form`     | `createForm({...})`           | `submit()`, `reset()`                                                                                                             |
| `hk-table`            | `createTable({...})`          | `sort`, `gotoPage`, `applyColumnFilter`, `clearAllFilters`, `clearSelection`, `expandToLevel`, `setPagination`, `toggleColumnVisibility`, … |
| `hk-tree`             | `createTree({...})`           | Driven by `[tree]`; helpers: `walkTree`, `findNode`, `findNodePath`, `mapTree`, `filterTree`, `flattenTree`, `countNodes`, `buildTree` |
| `hk-command-palette`  | `createCommandPalette({...})` | `open`, `close`, `toggle`, `setQuery`, `clear`                                                                                    |
| `hk-pdf-viewer`       | `createPdfViewer({...})`      | `goToPage`, `nextPage`, `prevPage`, `zoom`, `search`, `print`, `download`                                                         |
| `hk-editor`           | *(no builder)*                | CVA — drive via `[formControl]`; slash menu via `createSlashCommands(...)`                                                        |
| `hk-virtual-scroller` | *(no builder)*                | Drive via inputs; emits `(scrolled)`, `(lazyLoad)`, `(scrollIndexChange)`                                                         |
| `hk-tab-group`        | *(no builder)*                | `[(selectedTab)]` two-way model                                                                                                   |
| `hk-stepper`          | *(no builder)*                | Inherits from CDK `CdkStepper` — `next()`, `previous()`, `selectedIndex`, …                                                       |
| `hk-input`, `hk-select`, `hk-datepicker`, `hk-timepicker` | *(no builder)* | CVAs — drive via `[formControl]` / `formControlName` / `[(ngModel)]`                                                |
| `ToastService`, `AlertService`, `NotificationService`, `DialogService` | *(injectable)* | Imperative; see §10                                                                                                       |

Every controller returns a `config` signal — bind it to the component's `[config]` input:

```html
<hk-{thing} [config]="thing.config()" />
```

---

## 15. When in doubt

1. Search the demo app under `projects/shared-demos/demos/*-demo.component.ts` — every component has at least one canonical usage there.
2. Read the JSDoc on `createForm`, `createTable`, `createTree`, `createCommandPalette`, `createPdfViewer` — each one has annotated `@example` blocks.
3. The two reference guides inside the demo app are the source of truth for the why:
   - `/getting-started` — landing tour
   - `/key-patterns` — design rationale for builders, controllers, services, signals
