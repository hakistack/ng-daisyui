# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm start                  # Serve demo app for local testing
npm run demo               # Serve demo app and open browser
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
projects/
├── hakistack/ng-daisyui/   # Library source
│   ├── src/lib/
│   │   ├── components/     # Standalone UI components
│   │   ├── directives/     # Animation and behavior directives
│   │   ├── services/       # FormStateService, PipeRegistryService, AccessibilityService
│   │   ├── helpers/        # Pagination helpers, search algorithms, fake data
│   │   ├── types/          # Shared TypeScript definitions
│   │   └── utils/          # Utility functions
│   ├── src/public-api.ts   # Library exports (barrel file)
│   └── ng-package.json     # ng-packagr configuration
└── demo/                   # Demo app for local testing (imports library source directly)
    └── src/app/            # Demo app components
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
<hk-dynamic-form [config]="form.config()" />
<button (click)="form.submit()">Submit</button>
<button (click)="form.reset()">Reset</button>
```

#### Layout Options

| Property | Values | Description |
|----------|--------|-------------|
| `layout` | `'vertical'` (default), `'horizontal'`, `'grid'` | Form layout mode |
| `gap` | `'sm'`, `'md'`, `'lg'` | Gap between fields |
| `gridColumns` | 1-12 | Number of columns (grid only) |
| `labelWidth` | `'sm'`, `'md'`, `'lg'`, `'xl'` | Label width (horizontal only) |

**Field-level layout:**
- `colSpan`: Grid column span. Supports responsive: `{ default: 12, md: 6, lg: 4 }`
- `width`: Non-grid field width: `'full'`, `'1/2'`, `'1/3'`, `'1/4'`, `'2/3'`, `'3/4'`, `'auto'`

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

## Coding Standards

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

### TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

### Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

### Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

### State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

### Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).

### Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
