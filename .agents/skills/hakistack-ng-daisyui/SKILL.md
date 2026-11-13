---
name: hakistack-ng-daisyui
description: How to use the @hakistack/ng-daisyui Angular UI library — install/setup, components (dynamic forms, data table, select/datepicker/timepicker inputs, toast/notification/dialog/alert overlays, command palette, rich editor, document & PDF viewers, tree, virtual scroller), builder functions (createForm/createTable/createTree/createPdfViewer/createCommandPalette), directives, services, and the signal+controller patterns. Use when building, wiring, or debugging UI with @hakistack/ng-daisyui, or when asked how a component's API/config/inputs/outputs work.
---

# @hakistack/ng-daisyui

Angular 21 standalone component library built on **DaisyUI v5 + Tailwind CSS v4**. All components are standalone, OnPush, and signal-based. Most complex components use a **builder + controller** pattern: a `create*()` factory returns a controller exposing a `config()` signal you bind to the component, plus imperative methods and state signals.

## When to use this skill

Use it whenever the task involves `@hakistack/ng-daisyui` (or its `hk-*` selectors, `create*` builders, or `provide*` functions): building UI, wiring a component, choosing the right component, or answering "how does X's API work".

## Architecture conventions (apply to every component)

- **Standalone, no NgModules.** Import the component class directly into a component's `imports`.
- **Builder + controller pattern.** `createForm`, `createTable`, `createTree`, `createPdfViewer`, `createCommandPalette`, `createDocumentEditor` return a controller. Bind `controller.config()` to the component's `[config]`, read state via `controller.state()` / signals, and drive it via methods (`submit()`, `nextPage()`, `goToPage()`, `open()`…).
- **Signals everywhere.** Inputs/outputs use `input()` / `output()` / `model()`. Pass `signal()` values; never call methods returning fresh objects inside templates (NG0103 risk — see project memory).
- **ControlValueAccessor.** Form-control components (`hk-input`, `hk-select`, `hk-datepicker`, `hk-timepicker`, `hk-editor`) work with `[formControl]`, `formControlName`, and `[(ngModel)]`.
- **Provider functions** register optional services in `app.config.ts`: `provideToast`, `provideNotification`, `provideAlert`, `provideFormState`, `providePipes`, `provideHkTheme`, plus WASM-URL providers (`provideTableEngineWasmUrl`, `provideDocumentEngineWasmUrl`, etc.).
- **DaisyUI semantic tokens** for styling (`btn btn-primary`, `badge-success`, `bg-base-200`). Prefer `[class]` object syntax over `ngClass`; prefer tinted/soft chips over loud solid variants (project conventions).

## Setup (consumer project)

```bash
ng add @hakistack/ng-daisyui          # prompts for Tailwind v4/DaisyUI v5 (recommended) or v3/v4 legacy
# or manual:
npm install @hakistack/ng-daisyui tailwindcss@^4 daisyui@^5 @angular/cdk @angular/aria
```

`styles.css` (order matters):
```css
@import "tailwindcss";
@plugin "daisyui";
@import "@hakistack/ng-daisyui";   /* component styles + class safelists */
```

Runtime deps (`@lucide/angular`, `fuse.js`, `motion`, `libphonenumber-js`) install automatically. Icons use `@lucide/angular` directly. This is a **private package** (registry `https://hakistack-registry.fly.dev`).

> Within THIS repo (the library workspace), the demo app imports the library source directly — run `npm start` / `npm run demo`. Demos in `projects/shared-demos/demos/*.component.ts` are the canonical usage examples.

## Component index → which reference to read

Load the matching reference file under `references/` for full signatures, options, and runnable snippets. Do not guess option names — they are exhaustively listed there.

| You're working on… | Selector / API | Read |
|---|---|---|
| Dynamic forms, wizards, conditional logic, auto-save | `hk-dynamic-form`, `createForm`, `field.*`, `step.*`, `validation.*`, `layout.*` | `references/forms.md` |
| Data table: sorting, filtering, pagination, tree/grouped, master-detail, inline edit, export | `hk-table`, `createTable`, `HkCellTemplate`/`HkFooter` directives | `references/table.md` |
| Text/currency/phone inputs, select (search/multi/virtual), date & time pickers, input masking | `hk-input`, `hk-select`, `hk-datepicker`, `hk-timepicker`, `[hkInputMask]`, `[appAutoFocus]` | `references/inputs-pickers.md` |
| Toasts, notifications, dialogs, alert modals, command palette | `ToastService`, `NotificationService`, `DialogService`, `AlertService`, `createCommandPalette` | `references/overlays-feedback.md` |
| Rich text editor, document viewer, document editor, PDF viewer | `hk-editor`, `hk-document-viewer`, `hk-pdf-viewer`, `createPdfViewer`, `createDocumentEditor` | `references/content-viewers.md` |
| Stepper, tabs, tree, virtual scroller, motion animations, theme, pipe registry, form-state | `hk-stepper`, `hk-tab-group`, `hk-tree`, `hk-virtual-scroller`, `[hkAnimate]`/`[hkHover]`/`[hkScroll]`, `provideHkTheme`, `providePipes`, `provideFormState` | `references/structure-misc.md` |

## Quick taste

```typescript
import { Component, signal } from '@angular/core';
import { DynamicFormComponent, createForm, field, TableComponent, createTable } from '@hakistack/ng-daisyui';

@Component({
  imports: [DynamicFormComponent, TableComponent],
  template: `
    <hk-dynamic-form [config]="form.config()" />
    <button class="btn btn-primary" (click)="form.submit()">Submit</button>

    <hk-table [data]="users()" [config]="table" />
  `,
})
export class Demo {
  users = signal<User[]>([]);

  form = createForm<{ name: string; email: string }>({
    fields: [
      field.text('name', 'Name', { required: true, minLength: 2 }),
      field.email('email', 'Email', { required: true }),
    ],
    onSubmit: (data) => { if (data.valid) console.log(data.values); },
  });

  table = createTable<User>({
    visible: ['name', 'email', 'role'],
    formatters: { createdAt: ['date', 'short'] },
    hasActions: true,
    actions: [{ type: 'edit', label: 'Edit', action: (row) => this.edit(row) }],
  });
}
```

Forms have **no built-in buttons** — drive them through the `FormController` (`form.submit()`, `form.reset()`).
