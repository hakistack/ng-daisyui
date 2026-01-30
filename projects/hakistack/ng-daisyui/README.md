# @hakistack/ng-daisyui

Reusable Angular UI components built with DaisyUI and Tailwind CSS.

## Installation

```bash
npm install @hakistack/ng-daisyui
```

### Required Dependencies

```bash
npm install tailwindcss@^4.0.0 daisyui@^5.0.0 @angular/cdk lucide-angular sweetalert2 fuse.js motion
```

### Configure Tailwind CSS

**Important:** Add the library to your Tailwind source in `styles.css`:

```css
@import 'tailwindcss';
@source "../node_modules/@hakistack/ng-daisyui/**/*.{html,ts}";
@plugin 'daisyui';
```

## Components

### DynamicFormComponent

Full-featured dynamic form builder with wizard/stepper support, auto-save, and conditional logic.

```typescript
import { DynamicFormComponent, createForm, field } from '@hakistack/ng-daisyui';

@Component({
  imports: [DynamicFormComponent],
  template: `<app-dynamic-form [config]="formConfig()" />`
})
export class MyComponent {
  readonly formConfig = createForm({
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

### TableComponent

Advanced data table with sorting, filtering, pagination, and column visibility.

```typescript
import { TableComponent, createTable } from '@hakistack/ng-daisyui';

@Component({
  imports: [TableComponent],
  template: `<app-table [data]="users()" [config]="tableConfig" />`
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
    <app-select
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
    <app-datepicker
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
    <app-tab-group [(selectedTab)]="activeTab">
      <app-tab-panel value="details" label="Details" icon="FileText">
        <ng-template>Details content</ng-template>
      </app-tab-panel>
      <app-tab-panel value="settings" label="Settings" icon="Settings">
        <ng-template>Settings content</ng-template>
      </app-tab-panel>
    </app-tab-group>
  `
})
```

### ToastService

Toast notifications with stacking and progress bars.

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

### LucideIconComponent

Icon wrapper for Lucide icons.

```html
<app-lucide-icon name="User" [size]="24" />
<app-lucide-icon name="Settings" color="red" />
```

## Services

- **FormStateService** - Auto-save form state management
- **PipeRegistryService** - Custom pipe registry for table formatters
- **AccessibilityService** - Accessibility utilities

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

### Option 1: npm link (Local Development)

```bash
# In the library workspace
cd ui-library-workspace
npm run build
cd dist/hakistack/ng-daisyui
npm link

# In your consuming project
npm link @hakistack/ng-daisyui
```

### Option 2: Install from Private Git Repository

```bash
# Via SSH (recommended)
npm install git+ssh://git@github.com:hakistack/ui-library.git#dist

# Via HTTPS
npm install git+https://github.com/hakistack/ui-library.git#dist
```

Or in `package.json`:
```json
{
  "dependencies": {
    "@hakistack/ng-daisyui": "git+ssh://git@github.com:hakistack/ui-library.git#dist"
  }
}
```

### Option 3: GitHub Packages (Private Registry)

1. Create `.npmrc` in your consuming project:
```
@hakistack:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

2. Install:
```bash
npm install @hakistack/ng-daisyui
```

## License

UNLICENSED - Private package
