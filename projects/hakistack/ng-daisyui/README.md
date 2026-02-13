# @hakistack/ng-daisyui

Reusable Angular UI components built with DaisyUI v5 and Tailwind CSS v4.

> **Note:** This library targets **DaisyUI v5 + Tailwind CSS v4**. For DaisyUI v4 + Tailwind CSS v3, use `@hakistack/ng-daisyui-v3`.

## Installation

```bash
npm install @hakistack/ng-daisyui
```

### Required Dependencies

```bash
npm install tailwindcss@^4.0.0 daisyui@^5.0.0 @angular/cdk lucide-angular sweetalert2 fuse.js motion
```

### Configure Tailwind CSS

Add the library to your Tailwind source in `styles.css`:

```css
@import 'tailwindcss';
@source "@hakistack/ng-daisyui";
@plugin 'daisyui';
```

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
      field.password('password', 'Password', { validation: { minLength: 8 } }),
      field.select('country', ['USA', 'Canada', 'Mexico'], 'Country'),
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

### LucideIconComponent

Icon wrapper for Lucide icons.

```html
<hk-lucide-icon name="User" [size]="24" />
<hk-lucide-icon name="Settings" color="red" />
```

## Services

- **FormStateService** - Auto-save form state management
- **PipeRegistryService** - Custom pipe registry for table formatters
- **AccessibilityService** - Accessibility utilities
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

## Installation (Private Package)

### From Private Registry

1. Create `.npmrc` in your consuming project:

```text
@hakistack:registry=https://hakistack-registry.fly.dev
```

2. Login (one-time):

```bash
npm login --registry=https://hakistack-registry.fly.dev
```

3. Install:

```bash
npm install @hakistack/ng-daisyui
```

### Local Development (npm link)

```bash
# In the library workspace
npm run build
npm run publish:local

# In your consuming project
npm link @hakistack/ng-daisyui
```

## License

UNLICENSED - Private package
