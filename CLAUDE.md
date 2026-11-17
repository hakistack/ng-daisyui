# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

Scripts follow `<verb>:<product>` with products `ui` (@hakistack/ng-daisyui), `i18n` (@hakistack/i18n), `engine` (Rust/WASM) and `docs`. A bare verb runs every product. Full reference: CONTRIBUTING.md.

```bash
npm start                  # Docs/demo app on :58790 (npm run demo also opens the browser)
npm run build              # build:ui + build:i18n (the engine is never rebuilt implicitly)
npm run build:ui           # @hakistack/ng-daisyui → dist/hakistack/ng-daisyui (PDFium worker, CSS, exports, schematics)
npm run build:i18n         # @hakistack/i18n → dist/hakistack/i18n (+ CLI, schematics)
npm run build:engine       # Rust → WASM, output copied into the ui sources (needs wasm-pack)
npm run build:watch        # ng-daisyui development build in watch mode
npm test                   # Unit tests of both libraries (Vitest); test:ui / test:i18n / test:engine per product
npm run lint               # ESLint + dependency boundaries (scripts/workspace/check-boundaries.mjs)
npm run validate:ui        # Validate the BUILT package (exports, types, bin, schematics load, pack)
npm run test:consumer:ui   # Pack + install into a clean app + build (test:consumer:i18n for i18n)
npm run docs:check         # Docs in sync with public API (manifest, ownership, routes, links, ES/EN)
npm run docs:snippets      # Compile every docs quickStart + playground snippet (strict templates)
npm run link:ui            # npm link from dist for local testing (link:i18n)
npm run release -- ui patch   # Bump ONE package, commit, tag @hakistack/ng-daisyui@x.y.z, build (no push/publish)
npm run publish:ui         # Publish from dist after release (guards: validated, tagged, not on npm) — publish:i18n
```

## Architecture

This is the Hakistack monorepo (Angular CLI workspace + Cargo workspace). Products: `@hakistack/ng-daisyui` (Angular UI library, `projects/hakistack/ng-daisyui`), `@hakistack/i18n` (Transloco-based i18n, `projects/hakistack/i18n`, independent of ng-daisyui), `hakistack-engine/` (private Rust/WASM engines consumed by ng-daisyui) and the docs app (`projects/demo` + `projects/shared-demos`). Packages are versioned and released independently; a published package may only import what its own package.json declares (`npm run lint:boundaries`). Architecture: docs/architecture/monorepo.md.

### Project Structure

```
projects/
├── hakistack/ng-daisyui/   # Library source
│   ├── src/lib/
│   │   ├── components/     # Standalone UI components
│   │   ├── grid-core/      # Render-agnostic grid logic shared by hk-table + hk-datagrid (controllers, WASM table engine, aggregates, types). Must not import from components/ (ESLint-enforced)
│   │   ├── directives/     # Animation and behavior directives
│   │   ├── services/       # DialogService, FormStateService, PipeRegistryService, WASM engine services
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
- **Configuration via provider functions** (`providePipes()`, `provideToast()`, `provideHk*Labels()`…); the injection tokens behind them are internal unless exported from `public-api.ts`
- **Provider Functions**: `provideFormState()` for optional service configuration

### DynamicFormComponent Usage

Forms do not include built-in buttons. Use FormController for external control:

```typescript
const form = createForm({
  fields: [
    field.text('name', 'Name', { required: true, minLength: 2 }),
    field.email('email', 'Email'),
    field.select('role', 'Role', { choices: ['Admin', 'User'] }),
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
- **DataGridComponent** (`hk-datagrid`): Enterprise grid built on `grid-core` — one render pipeline with row + column virtualization, multi-sort, ARIA grid keyboard model (aria-activedescendant), serializable `DataGridState` (`getState`/`setState` with validation issues, `stateSchema()` JSON Schema for the AI layer), client or server `dataSource`. AI layer built in: the consumer passes `ai: { apiKey }` (from their environment) and `controller.ask(query)` calls Claude from the browser with structured outputs (`lib/utils/claude-json.ts`, `@anthropic-ai/sdk` as an optional peer loaded with dynamic import); the reply goes through `setState`. `ai.complete` is an optional custom transport. New grid features go here, not in hk-table.
- **SelectComponent**: Enhanced dropdown with search and virtual scrolling
- **DatepickerComponent**: Date/range picker with keyboard navigation
- **StepperComponent**: Multi-step wizard (extends CDK Stepper)
- **TabGroup/TabPanel**: Accessible tabs on `@angular/aria`; optional `icon` per panel (registered Lucide name or icon data — unknown names render nothing instead of throwing)
- **ToastService/ToastComponent**: Notification system with stacking

### Docs platform (demo app = official docs)

The `demo` app is the documentation site. Pieces live in `projects/shared-demos/platform/`:

- `catalog/pages.ts` — every docs page (route, section, plain-language summary EN/ES, keywords, examples, and `areas`/`symbols` = which public API it owns). Drives the sidebar, search and coverage.
- `content/components/<id>.ts`, `content/articles/<id>.ts` — lazy long-form content (`{ en, es }` everywhere).
- `api/api-manifest.generated.ts` (ng-daisyui) and `api/api-manifest.i18n.generated.ts` (@hakistack/i18n) — generated by `npm run extract-api-docs` from each package's `public-api.ts` (TS type checker). Never edit by hand; API tables/pages read only from them. Symbol names are unique per package: ng-daisyui symbols live at `/api/<name>`, i18n ones at `/api/i18n/<name>`, and a symbol is owned only by a page of its own package (i18n pages = section `i18n`).
- `playground/` — one spec (`specs/<id>.ts`) + one lazy host (`hosts/<id>.playground.ts`) per page; controls must map to real inputs or (dotted) config-interface members (checked).
- `i18n/demo-strings.es.ts` — Spanish for every `<app-doc-section title/description>` in the live demos (keyed by the English text; `docs:check` fails on missing/stale entries).
- Demo apps register only the Lucide icons the source names (`npm run docs:icons` regenerates `lucide-icons.generated.ts`; checked in `docs:check`). A new icon name in a template just needs that command.
- Demo components (`shared-demos/demos/*`) are the live examples; `app-demo-page` wraps them with Overview / Examples / Playground / API / Accessibility / Technical tabs (`?tab=`).

**Adding or changing public API:** export it in `public-api.ts` → `npm run extract-api-docs` → make sure a page in `catalog/pages.ts` owns its area → add the route + demo → `npm run docs:check && npm run docs:snippets && npm run test:docs`. CI runs the same checks; `npm run docs:report` regenerates `docs/audit/documentation-*.md`.

### Dependencies

**Required peer dependencies** (`^21` for Angular): @angular/core, common, forms, router, cdk, aria; rxjs ^7.8; Tailwind CSS v4; daisyUI v5. **Bundled dependencies**: @lucide/angular, fuse.js, motion, libphonenumber-js (lazy, phone inputs only), uuid. **Optional peers** (lazy-loaded features): @tiptap/* (hk-editor / `field.editor()`), docx-preview, @kenjiuno/msgreader, postal-mime, heic2any, dompurify, foliate-js, @anthropic-ai/sdk, ts-morph (schematics).

**Package checks**: `npm run test:consumer` packs `dist/`, installs it into a clean app with only required peers, builds it and enforces the initial-JS budget. Architecture, conventions and the backlog live in `docs/architecture/` and `docs/maintenance/`.

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
