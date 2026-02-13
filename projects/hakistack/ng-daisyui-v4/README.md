# @hakistack/ng-daisyui-v4

Reusable Angular UI components built with DaisyUI v4 and Tailwind CSS v3.

> **Note:** This is the v3 version targeting **DaisyUI v4 + Tailwind CSS v3**. For DaisyUI v5 + Tailwind CSS v4, use `@hakistack/ng-daisyui`.

## Installation

```bash
npm install @hakistack/ng-daisyui-v4
```

### Required Dependencies

```bash
npm install tailwindcss@^3.4.0 daisyui@^4.12.0 @angular/cdk lucide-angular motion
```

### Configure Tailwind CSS

**1. Create `tailwind.config.js`:**

```javascript
const { safelist } = require('@hakistack/ng-daisyui-v4/safelist');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  safelist: safelist,
  theme: {
    extend: {},
  },
  plugins: [
    require("daisyui"),
    require("@hakistack/ng-daisyui-v4/plugin"),
  ],
  daisyui: {
    themes: ["light", "dark", "cupcake", /* ...other themes */],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    logs: false
  }
};
```

Or with ESM:

```javascript
// tailwind.config.mjs
import { safelist } from '@hakistack/ng-daisyui-v4/safelist';
import ngDaisyuiPlugin from '@hakistack/ng-daisyui-v4/plugin';
import daisyui from 'daisyui';

export default {
  content: ["./src/**/*.{html,ts}"],
  safelist: safelist,
  plugins: [daisyui, ngDaisyuiPlugin],
  daisyui: {
    themes: ["light", "dark"],
  }
};
```

> **Why safelist?** Tailwind can't scan `node_modules`, so the safelist ensures all library component classes are included in the build.

> **Why the plugin?** The library plugin registers custom CSS variables and keyframe animations used by components.

**2. Configure `styles.css`:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import '@hakistack/ng-daisyui-v4/styles.css';
```

The library stylesheet provides styles for toast notifications, dropdown transitions, stepper animations, disabled input fixes, and reduced-motion support that can't be expressed as Tailwind utility classes.

**Alternative:** Instead of importing in CSS, you can add it to the `styles` array in `angular.json`:

```json
{
  "architect": {
    "build": {
      "options": {
        "styles": [
          "src/styles.css",
          "node_modules/@hakistack/ng-daisyui-v4/styles.css"
        ]
      }
    }
  }
}
```

## Components

### DynamicFormComponent

Dynamic form builder with wizard/stepper support, auto-save, and conditional logic.

```typescript
import { DynamicFormComponent, createForm, field } from '@hakistack/ng-daisyui-v4';

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
import { TableComponent, createTable } from '@hakistack/ng-daisyui-v4';

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
import { SelectComponent } from '@hakistack/ng-daisyui-v4';

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
import { DatepickerComponent } from '@hakistack/ng-daisyui-v4';

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
import { TabGroupComponent, TabPanelComponent } from '@hakistack/ng-daisyui-v4';

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
import { provideToast } from '@hakistack/ng-daisyui-v4';

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
import { ToastService } from '@hakistack/ng-daisyui-v4';

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

### AlertService

SweetAlert2-based dialogs with DaisyUI styling and i18n support.

**Setup** - Add `provideAlert()` to your app config:

```typescript
// app.config.ts
import { provideAlert } from '@hakistack/ng-daisyui-v4';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAlert(),
    // or with custom config:
    provideAlert({
      useSystemTheme: true, // Uses prefers-color-scheme
      // Or custom theme function:
      theme: () => themeService.isDarkMode() ? 'dark' : 'light',
      // Optional i18n support:
      translate: (key, fallback, params) => transloco.translate(key, params) || fallback,
      langChange$: transloco.langChanges$,
    }),
  ],
};
```

**Usage:**

```typescript
import { AlertService } from '@hakistack/ng-daisyui-v4';

@Component({...})
export class MyComponent {
  private alertService = inject(AlertService);

  async showSuccess() {
    await this.alertService.success('Saved!', 'Your changes have been saved.');
  }

  async showError() {
    await this.alertService.error('Error', 'Something went wrong.');
  }

  async confirmDelete() {
    const result = await this.alertService.confirmDelete({ itemName: 'User' });
    if (result.isConfirmed) {
      // Proceed with deletion
    }
  }

  async showCountdown() {
    const result = await this.alertService.countdown({
      title: 'Session Expiring',
      html: 'You will be logged out in <kbd class="kbd">{seconds}</kbd> seconds.',
      timer: 30000,
      showCancelButton: true,
      confirmButtonText: 'Stay Logged In',
    });
  }

  showLoading() {
    this.alertService.showLoading({ title: 'Processing...' });
    // Later:
    this.alertService.hideLoading();
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
- **AlertService** - SweetAlert2 dialogs with DaisyUI styling
- **ToastService** - Toast notifications

## Directives

- **AutoFocusDirective** - Auto-focus input elements
- **MotionAnimateDirective** - Motion.js animation wrapper
- **MotionHoverDirective** - Hover animations
- **MotionScrollDirective** - Scroll-triggered animations

## DaisyUI v4 vs v5 Differences

This library is designed for **DaisyUI v4**. Key differences from v5:

| Feature | DaisyUI v4 | DaisyUI v5 |
|---------|------------|------------|
| Tailwind | v3.x | v4.x |
| Config | `require("daisyui")` | `@plugin "daisyui"` |
| CSS | `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| Card sizes | `card-compact` | `card-sm` |
| Input with icon | `<div class="input flex items-center gap-2">` | `<label class="input">` |

## Building

```bash
npm run build
```

## Installation (Private Package)

### From Private Registry

1. Create `.npmrc` in your consuming project:
```
@hakistack:registry=https://hakistack-registry.fly.dev
```

2. Login (one-time):
```bash
npm login --registry=https://hakistack-registry.fly.dev
```

3. Install:
```bash
npm install @hakistack/ng-daisyui-v4
```

### Local Development (npm link)

```bash
# In the library workspace
npm run build
npm run publish:local

# In your consuming project
npm link @hakistack/ng-daisyui-v4
```

## License

UNLICENSED - Private package
