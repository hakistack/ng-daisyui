# ng-daisyui workspace

Source workspace for **[`@hakistack/ng-daisyui`](projects/hakistack/ng-daisyui/README.md)** — Angular 21 components on top of
daisyUI 5 / Tailwind CSS 4 — and the smaller `@hakistack/i18n` package.

The library adds what CSS alone cannot: Angular forms integration, accessibility and keyboard behaviour, typed builder
APIs (`createForm`, `createTable`, `createDataGrid`, `createTree`, `createPdfViewer`…), data handling and document
viewing/editing. Static daisyUI components (buttons, cards, badges…) are used directly as HTML + daisyUI classes and are
deliberately **not** wrapped.

| Where | What |
|---|---|
| `projects/hakistack/ng-daisyui` | the library (`src/public-api.ts` is the only entry point) |
| `projects/hakistack/i18n` | `@hakistack/i18n` |
| `projects/demo`, `projects/shared-demos` | documentation site / live examples (daisyUI 5) |
| `projects/demo-v4` | the same demos on daisyUI 4 / Tailwind 3 (legacy path) |
| `hakistack-engine/` | Rust crates compiled to WebAssembly (table/tree/search/form engine, spreadsheet, image, PDF) |
| `tests/consumer-smoke` | minimal consumer app used to test the packed package |
| `e2e/` | Playwright tests (incl. axe) |
| `docs/` | architecture, audits, maintainer guide, migration guide |

## Requirements

Node 22, npm 11. Rust (stable) + `wasm-bindgen` only if you rebuild the WASM engines (`npm run engine:build`); the
generated output is already in the repo.

## Scripts

```bash
npm start                 # docs/demo app on http://localhost:58790
npm run build             # library → dist/hakistack/ng-daisyui (+ styles-v4.css, exports fix-up, schematics)
npm test                  # unit tests (Vitest via @angular/build:unit-test)
npm run test:schematics   # ng-add / migration schematics
npm run test:consumer     # pack dist/, install into a clean app with only required peers, build, check budget
npm run e2e               # Playwright (starts or reuses the demo server)
npm run lint              # ESLint (TS + templates incl. accessibility rules)
npm run engine:test       # cargo test for the Rust workspace
```

## Documentation

- Consumers: [library README](projects/hakistack/ng-daisyui/README.md) · [CONSUMER-USAGE.md](CONSUMER-USAGE.md) · [MIGRATION.md](MIGRATION.md) · [docs/maintenance/migration-guide.md](docs/maintenance/migration-guide.md)
- Maintainers: [docs/architecture/library-architecture.md](docs/architecture/library-architecture.md) · [docs/architecture/component-guidelines.md](docs/architecture/component-guidelines.md) · [docs/maintenance/maintainer-guide.md](docs/maintenance/maintainer-guide.md)
- Audit (2026-11): [docs/audit/](docs/audit/architecture-inventory.md)

## License

MIT — see [projects/hakistack/ng-daisyui/LICENSE](projects/hakistack/ng-daisyui/LICENSE).
