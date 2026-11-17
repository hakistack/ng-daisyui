# ADR-0009 — One docs app with product sections; demo-v4 stays

**Status:** Accepted (2026-11-17); applied (M8a product level + overview, M8b i18n section)

## Context
`projects/demo` is the documentation site (catalog, generated API manifest, playgrounds, ES/EN). It documents
ng-daisyui only; `@hakistack/i18n` appears in one article section. `projects/demo-v4` renders the same
`shared-demos` on daisyUI 4 / Tailwind 3: it is the only runtime proof that ng-daisyui's `styles-v4.css` legacy path
works, and it is deployed under `/v4`.

## Decision
- One central docs app for Hakistack with a section per product (Overview · ng-daisyui · i18n · Contributing).
  The app is never part of any npm bundle (it consumes packages through path aliases and is not in any `dist`).
- Keep demo-v4 while ng-daisyui ships `styles-v4.css`; remove both together if the legacy path is dropped
  (maintainer-guide backlog #21). There is no duplicated demo code: both apps render `shared-demos`.

## Consequences
Applied (M8a): every section maps to a product (`SECTION_PRODUCT` in `platform/catalog/pages.ts`); the sidebar renders
each package's sections as one group labelled with its npm name (`buildSidebar()`), ecosystem sections (Overview,
Contributing) stand alone; `/overview` is the docs root; tab titles end with the product brand. Adding a product's
docs = add its sections to `DocSection`/`SECTION_PRODUCT` and its pages to the catalog.

Applied (M8b): an `i18n` section (getting started, writing translations, runtime/loading/SSR, CLI & codegen, API
reference); `api-manifest.i18n.generated.ts` from `extractPublicApi(root, 'i18n')`. Symbol names are unique per
package, not across packages, so each package has its own API namespace (`/api/<name>`, `/api/i18n/<name>`), the
reference shows each symbol's package and import path, and a symbol is owned only by a page of its own package —
the same rule in `ownerPage()` and `docs:check`, which requires every i18n symbol to be owned. Demo snippets and
playgrounds are still checked against the ng-daisyui manifest only.
