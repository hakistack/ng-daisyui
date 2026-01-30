# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run build              # Production build to dist/hakistack/ng-daisyui
npm run build:watch        # Development build with watch mode
npm run watch              # Alias for build:watch with development config
npm test                   # Run unit tests (Vitest)
npm run publish:local      # npm link from dist for local testing
npm run publish:registry   # Publish to private Verdaccio registry
npm run release:patch      # Bump patch version and build
npm run release:minor      # Bump minor version and build
npm run release:major      # Bump major version and build
```

## Architecture

This is an Angular 21 monorepo containing a single UI component library (`@hakistack/ng-daisyui`).

### Project Structure

```
projects/hakistack/ng-daisyui/
├── src/lib/
│   ├── components/     # Standalone UI components
│   ├── directives/     # Animation and behavior directives
│   ├── services/       # FormStateService, PipeRegistryService, AccessibilityService
│   ├── helpers/        # Pagination helpers, search algorithms, fake data
│   ├── types/          # Shared TypeScript definitions
│   └── utils/          # Utility functions
├── src/public-api.ts   # Library exports (barrel file)
└── ng-package.json     # ng-packagr configuration
```

### Key Patterns

- **Standalone Components**: All components use Angular standalone API (no NgModules)
- **OnPush Change Detection**: Used throughout for performance
- **Signals & Computed**: Angular 21 signals for reactive state (`signal()`, `computed()`, `input()`, `output()`)
- **Builder Functions**: `createForm()`, `createTable()`, `field.*()`, `step()` for type-safe configuration
- **FormController Pattern**: `createForm()` returns a controller with `config`, `submit()`, `reset()` for external control
- **Injection Tokens**: `CUSTOM_PIPES`, `FORM_STATE_OPTIONS` for extensibility
- **Provider Functions**: `provideFormState()` for optional service configuration

### DynamicFormComponent Usage

Forms do not include built-in buttons. Use FormController for external control:

```typescript
const form = createForm({
  fields: [
    field.text('name', 'Name', { required: true }),
    field.email('email', 'Email'),
  ],
  onSubmit: (data) => console.log(data),
});

// Template
<app-dynamic-form [config]="form.config()" />
<button (click)="form.submit()">Submit</button>
<button (click)="form.reset()">Reset</button>
```

### Major Components

- **DynamicFormComponent**: Form builder with wizard support, auto-save, conditional logic (showWhen/hideWhen/requiredWhen/disabledWhen). No built-in buttons - use FormController.
- **TableComponent**: Data table with sorting, filtering, pagination (cursor + offset), CDK DataSource integration, PipeRegistry formatters
- **SelectComponent**: Enhanced dropdown with search and virtual scrolling
- **DatepickerComponent**: Date/range picker with keyboard navigation
- **StepperComponent**: Multi-step wizard (extends CDK Stepper)
- **TabGroup/TabPanel**: Accessible tabs with icon support
- **ToastService/ToastComponent**: Notification system with stacking

### Dependencies

**Required peer dependencies**: Tailwind CSS v4+, DaisyUI v5+, @angular/cdk, lucide-angular, sweetalert2, fuse.js, motion

## Code Style

- Strict TypeScript mode enabled (strict templates, strict injection parameters)
- 2-space indentation, single quotes, 140 character line width (Prettier)
- Component files follow pattern: `component-name.component.ts` with co-located `.types.ts`, `.helpers.ts`
