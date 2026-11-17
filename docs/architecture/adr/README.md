# Architecture Decision Records

Decisions about the shape of the Hakistack monorepo. Each record states the context, the decision, the alternatives
that were weighed and the consequences. A superseded record stays, with a pointer to its replacement.

| # | Decision | Status |
|---|---|---|
| [0001](0001-single-monorepo-hakistack-identity.md) | One repository; Hakistack is its identity, products keep theirs | Accepted |
| [0002](0002-angular-cli-cargo-no-meta-build-tool.md) | Angular CLI + Cargo + root npm scripts; no Nx / Turborepo | Accepted |
| [0003](0003-npm-workspaces-scope.md) | npm workspaces only where a package needs its own dependency set (demo-v4 first) | Accepted, applied |
| [0004](0004-keep-folder-layout.md) | Keep `projects/hakistack/*` and `hakistack-engine/`; no `packages/` move | Accepted |
| [0005](0005-enforced-dependency-boundaries.md) | Boundaries enforced on sources, on the built artifact and by a clean consumer install | Accepted |
| [0006](0006-independent-versioning-scoped-tags.md) | Independent versions, scoped tags, script-based release; Changesets deferred | Accepted |
| [0007](0007-engine-private-generated-wasm-tracked.md) | Engine stays a private Cargo workspace; generated WASM modules are tracked | Accepted |
| [0008](0008-selective-ci.md) | Path-filtered CI jobs per product with one aggregate required check | Accepted |
| [0009](0009-docs-app-and-demo-v4.md) | One docs app with product sections; demo-v4 stays as compatibility harness | Accepted |
| [0010](0010-peer-ranges-tested-majors.md) | Peer ranges are bound to the majors we test; `validate` rejects open-ended `>=` | Accepted, applied |
