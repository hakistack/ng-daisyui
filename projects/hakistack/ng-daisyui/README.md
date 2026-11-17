# @hakistack/ng-daisyui

Reusable Angular UI components built with DaisyUI v5 and Tailwind CSS v4.

> **Note:** Primary support is **Tailwind v4 + DaisyUI v5**. A legacy **Tailwind v3 + DaisyUI v4** path ships a precompiled stylesheet, `@hakistack/ng-daisyui/styles-v4.css`, that contains every class the library uses. `ng add` will prompt you to pick.
>
> **Requirements:** Angular 21 (`@angular/core`, `common`, `forms`, `router`, `cdk`, `aria` — all `^21`), RxJS 7.8, Tailwind CSS 4 + daisyUI 5.

## Installation

### Recommended: `ng add`

```bash
ng add @hakistack/ng-daisyui
```

You'll be prompted to pick a toolchain:

**Tailwind v4 + DaisyUI v5 (recommended)** — `--target v5`
- Adds `@angular/cdk` + `@angular/aria` to `dependencies`
- Adds `tailwindcss` + `@tailwindcss/postcss` + `daisyui` to `devDependencies`
- Ensures `styles.css` contains (in order):
  ```css
  @import "tailwindcss";
  @plugin "daisyui";
  @import "@hakistack/ng-daisyui";
  ```

**Tailwind v3 + DaisyUI v4 (legacy)** — `--target v4-legacy`
- Adds `@angular/cdk` + `@angular/aria` to `dependencies`
- Adds `tailwindcss@^3`, `daisyui@^4`, `postcss`, `autoprefixer` to `devDependencies`
- Scaffolds a plain `tailwind.config.js` (daisyUI plugin, your `src/**` as content) and `postcss.config.js`
- Ensures `styles.css` contains `@import "@hakistack/ng-daisyui/styles-v4.css"` plus the classic `@tailwind base/components/utilities` directives
- Note: the package's peer ranges target Tailwind 4 / daisyUI 5, so npm reports a peer warning (or ERESOLVE with strict peer deps) on the legacy path

Flags: `--target <v5|v4-legacy>`, `--skip-install`, `--skip-style-import`, `--project <name>`.

### Manual install

```bash
npm install @hakistack/ng-daisyui
```

Tailwind and DaisyUI are set up at the consumer level; `@angular/cdk` and `@angular/aria` share Angular's injector and must be installed alongside the library:

```bash
npm install tailwindcss@^4.0.0 daisyui@^5.0.0 @angular/cdk @angular/aria
```

Runtime deps used internally (`@lucide/angular`, `fuse.js`, `motion`, `libphonenumber-js`) are installed automatically with the library.

### Configure Tailwind CSS

Add the library import to your `styles.css`:

```css
@import 'tailwindcss';
@plugin 'daisyui';
@import "@hakistack/ng-daisyui";
```

This single import provides all required CSS class safelists and component styles.

## Components

### DynamicFormComponent

Dynamic form builder with wizard/stepper support, auto-save, and conditional logic.

```typescript
import { DynamicFormComponent, createForm, field } from '@hakistack/ng-daisyui';

@Component({
  imports: [DynamicFormComponent],
  template: `
    <hk-dynamic-form [config]="form.config()" />
    <button (click)="form.submit()" class="btn btn-primary">Submit</button>
    <button (click)="form.reset()" class="btn">Reset</button>
  `
})
export class MyComponent {
  readonly form = createForm({
    title: 'User Registration',
    fields: [
      field.text('firstName', 'First Name', { required: true }),
      field.email('email', 'Email', { required: true }),
      field.password('password', 'Password', { minLength: 8 }),
      field.select('country', 'Country', { choices: ['USA', 'Canada', 'Mexico'] }),
    ],
    onSubmit: (data) => this.handleSubmit(data),
  });
}
```

#### Layout Options

```typescript
// Vertical (default) - fields stacked
createForm({
  layout: 'vertical',
  gap: 'md', // 'sm' | 'md' | 'lg'
  fields: [...]
});

// Horizontal - label beside input
createForm({
  layout: 'horizontal',
  labelWidth: 'md', // 'sm' | 'md' | 'lg' | 'xl'
  fields: [...]
});

// Grid - responsive columns
createForm({
  layout: 'grid',
  gridColumns: 3,
  fields: [
    field.text('name', 'Name', { colSpan: 2 }), // Span 2 columns
    field.text('code', 'Code'), // Span 1 column
    // Responsive colSpan
    field.text('address', 'Address', { colSpan: { default: 12, md: 6, lg: 4 } }),
  ]
});

// Field widths for non-grid layouts
createForm({
  layout: 'vertical',
  fields: [
    field.text('name', 'Name', { width: 'full' }),
    field.text('city', 'City', { width: '1/2' }),
    field.text('state', 'State', { width: '1/4' }),
    field.text('zip', 'ZIP', { width: '1/4' }),
  ]
});
```

### TableComponent

Advanced data table with sorting, filtering, pagination, and column visibility.

```typescript
import { TableComponent, createTable } from '@hakistack/ng-daisyui';

@Component({
  imports: [TableComponent],
  template: `<hk-table [data]="users()" [config]="tableConfig" />`
})
export class MyComponent {
  readonly tableConfig = createTable<User>({
    visible: ['name', 'email', 'role'],
    formatters: {
      createdAt: ['date', { format: 'short' }],
    },
    hasActions: true,
    actions: [
      { type: 'edit', label: 'Edit', action: (row) => this.edit(row) },
      { type: 'delete', label: 'Delete', action: (row) => this.delete(row) },
    ],
  });
}
```

### SelectComponent

Enhanced select dropdown with search and virtual scrolling.

```typescript
import { SelectComponent } from '@hakistack/ng-daisyui';

@Component({
  imports: [SelectComponent],
  template: `
    <hk-select
      [options]="countries"
      [enableSearch]="true"
      placeholder="Select country"
      (selectionChange)="onSelect($event)"
    />
  `
})
```

### DatepickerComponent

Date and date range picker with keyboard navigation.

```typescript
import { DatepickerComponent } from '@hakistack/ng-daisyui';

@Component({
  imports: [DatepickerComponent],
  template: `
    <hk-datepicker
      [range]="true"
      placeholder="Select dates"
      (selectionChange)="onDateChange($event)"
    />
  `
})
```

### StepperComponent

Multi-step wizard navigation (extends CDK Stepper).

### TabGroupComponent / TabPanelComponent

Accessible tab navigation with icons.

```typescript
import { TabGroupComponent, TabPanelComponent } from '@hakistack/ng-daisyui';

@Component({
  imports: [TabGroupComponent, TabPanelComponent],
  template: `
    <hk-tab-group [(selectedTab)]="activeTab">
      <hk-tab-panel value="details" label="Details" icon="FileText">
        <ng-template>Details content</ng-template>
      </hk-tab-panel>
      <hk-tab-panel value="settings" label="Settings" icon="Settings">
        <ng-template>Settings content</ng-template>
      </hk-tab-panel>
    </hk-tab-group>
  `
})
```

### ToastService

Toast notifications with stacking and progress bars.

**Setup** - Add `provideToast()` to your app config:

```typescript
// app.config.ts
import { provideToast } from '@hakistack/ng-daisyui';

export const appConfig: ApplicationConfig = {
  providers: [
    provideToast(),
    // or with custom config:
    provideToast({ position: 'top-end', maxToasts: 3 }),
  ],
};
```

**Usage:**

```typescript
import { ToastService } from '@hakistack/ng-daisyui';

@Component({...})
export class MyComponent {
  private toastService = inject(ToastService);

  showSuccess() {
    this.toastService.success('Saved!', 'Your changes have been saved.');
  }

  showError() {
    this.toastService.error('Error', 'Something went wrong.');
  }
}
```

### DialogService

CDK-based modal dialogs with DaisyUI styling and animations.

```typescript
import { DialogService } from '@hakistack/ng-daisyui';

@Component({...})
export class MyComponent {
  private dialogService = inject(DialogService);

  openDialog() {
    // Open with wrapper (card + animation)
    const ref = this.dialogService.open(MyDialogComponent, {
      data: { userId: 123 },
      disableClose: true,
    });

    ref.closed.subscribe(result => {
      console.log('Dialog closed with:', result);
    });
  }

  openRawDialog() {
    // Open without wrapper (full control)
    const ref = this.dialogService.openRaw(MyCustomComponent, {
      data: { mode: 'edit' },
      width: '600px',
    });
  }
}
```

**In your dialog component:**

```typescript
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

@Component({...})
export class MyDialogComponent {
  private data = inject(DIALOG_DATA);
  private dialogRef = inject(DialogRef);

  close(result?: any) {
    this.dialogRef.close(result);
  }
}
```

### Lucide Icons

Uses `@lucide/angular` v1.7+ directly. Import per-icon directives for static usage, or `LucideDynamicIcon` for runtime icon selection.

```typescript
import { LucideUser, LucideSettings, LucideDynamicIcon } from '@lucide/angular';

@Component({
  imports: [LucideUser, LucideSettings, LucideDynamicIcon],
  template: `
    <svg lucideUser [size]="24"></svg>
    <svg lucideSettings color="red"></svg>
    <svg [lucideIcon]="iconName()" [size]="20"></svg>
  `,
})
```

For string-name lookup, register icons in your app config:

```typescript
import { provideLucideIcons, provideLucideConfig, LucideUser } from '@lucide/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideLucideIcons(LucideUser /* , ... */),
    provideLucideConfig({ size: 20, strokeWidth: 1.75 }),
  ],
};
```

## Services

- **FormStateService** - Auto-save form state management
- **PipeRegistryService** - Custom pipe registry for table formatters
- **DialogService** - CDK-based modal dialogs
- **ToastService** - Toast notifications

## Directives

- **AutoFocusDirective** - Auto-focus input elements
- **MotionAnimateDirective** - Motion.js animation wrapper
- **MotionHoverDirective** - Hover animations
- **MotionScrollDirective** - Scroll-triggered animations

## Building

```bash
npm run build
```

## Local development (npm link)

```bash
# In the library workspace
npm run build
npm run link:ui

# In your consuming project
npm link @hakistack/ng-daisyui
```

## License

MIT — see [LICENSE](./LICENSE).
