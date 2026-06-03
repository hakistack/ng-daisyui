# hakistack-engine

Rust workspace powering the compute kernels of `@hakistack/ng-daisyui`.
Four WASM bundles, each lazy-loaded only when its renderer is used:
`engine_wasm` (table / tree / fuzzy / form / pdf-search), `document_wasm`
(spreadsheets), `image_wasm` (TIFF + minor formats), `libheif_wasm`
(HEIC). See [Bundle sizes](#bundle-sizes) below.

## Crates

| Crate | Role | wasm-bindgen? |
|-------|------|:---:|
| `engine-core`     | Pure Rust primitives: tree arena, bitset, string folding | — |
| `engine-wasm`     | `wasm-bindgen` umbrella for the **engine bundle** — re-exports table / tree / fuzzy / form / pdf-search | ✓ |
| `table-engine`    | Filter / sort / search / group / aggregate / tree-flatten kernels for `hk-table` | — |
| `tree-engine`     | Filter / flatten / selection cascade / descendant test for `hk-tree` | — |
| `search-engine`   | `fuzzy` (palette + select) and `pdf` (pdf-viewer) substring + nucleo matchers | — |
| `form-engine`     | Condition / dependency-graph kernel for `hk-dynamic-form` | — |
| `document-engine` | Spreadsheet parser (calamine). Backs `hk-document-viewer`'s spreadsheet renderer. | — |
| `document-wasm`   | `wasm-bindgen` umbrella for **document_wasm** bundle | ✓ |
| `image-engine`    | Image decoder (Rust `image` crate). TIFF + BMP/GIF/ICO/PNM/QOI. | — |
| `image-wasm`      | `wasm-bindgen` umbrella for **image_wasm** bundle | ✓ |
| `libheif-bridge`  | HEIC/HEIF decoder — extern "C" Rust shim over pre-built libheif.a + libde265.a. **Excluded from the workspace** (targets only `wasm32-unknown-emscripten`). | — (emscripten) |

The `engine-wasm` / `document-wasm` / `image-wasm` crates carry the
`wasm-bindgen` annotation; everything else is pure Rust testable with
`cargo test`. `libheif-bridge` is a `bin` crate targeting
`wasm32-unknown-emscripten` — it builds via `npm run libheif:build`
(see `external/libheif-wasm/README.md`).

## Why the split?

- `engine-core` is testable with `cargo test -p engine-core` — instant feedback, no WASM toolchain required.
- Feature crates (`table-engine`, etc.) compose `engine-core` primitives into kernels. Also testable natively.
- `engine-wasm` is the only place that talks to JavaScript. It re-exports the kernels through one .wasm bundle.

## Build

```bash
# Native check / test (no WASM toolchain needed)
cargo check --workspace
cargo test  --workspace

# WASM build (requires wasm-pack: `cargo install wasm-pack`)
wasm-pack build crates/engine-wasm --target web --out-dir ../../pkg
```

The repo-root `scripts/build-wasm.mjs` runs the WASM build and copies the output into `projects/hakistack/ng-daisyui/src/lib/wasm/` for the Angular library to lazy-load.

## Bundle sizes

Per-bundle release-mode sizes on the current commit. **Each is lazy-
loaded independently** — apps that never mount a renderer never pull
its WASM:

| Bundle | Raw | Gzip | Backs | Loader |
|---|---:|---:|---|---|
| `engine_wasm`   | 508 KB | 164 KB | hk-table / hk-tree / fuzzy-search / form-engine / pdf-search | `utils/engine-loader.ts` |
| `document_wasm` | 584 KB | 310 KB | spreadsheet parsing in hk-document-viewer (calamine) | `utils/document-engine-loader.ts` |
| `image_wasm`    | 652 KB | 249 KB | TIFF + BMP/GIF/ICO/PNM/QOI in hk-document-viewer (Rust `image` crate) | `utils/image-engine-loader.ts` |
| `libheif_wasm`  | 828 KB | 282 KB | HEIC/HEIF in hk-document-viewer (libheif + libde265 via Rust shim) | `utils/libheif-loader.ts` |

> Run `npm run engine:build && npm run libheif:build` to reproduce — the
> CI `libheif` job reports sizes on every run via a `::notice`.

**Counter-intuitive finding:** `wasm-opt -O3` produces *smaller* output
than `-Oz` for the `engine_wasm` codebase (aggressive inlining enables
better dead-code elimination than the conservative size pass). The
other bundles use `opt-level = "z"` because their dominant cost is
codec/parser code rather than Rust glue.

### Splitting strategy

`engine_wasm` is one bundle for five kernels (table / tree / fuzzy /
form / pdf-search) because they all share `engine-core` primitives and
splitting would duplicate code across bundles. The document-viewer
bundles (`document_wasm`, `image_wasm`, `libheif_wasm`) are split per
format family because their contents are disjoint and each has its own
heavy dep (zip+xml / image codecs / libde265 respectively).

## Roadmap

See per-component plans under `projects/hakistack/ng-daisyui/src/lib/components/*/RUST_ENGINE.md`, indexed by `components/RUST_ENGINE_OVERVIEW.md`.

Phased rollout (high level):

1. `engine-core` + `table-engine` (Phase 0–2)
2. `search-engine::fuzzy` consumed by `command-palette`
3. `select` adopts `search-engine::fuzzy`
4. `search-engine::pdf` consumed by `pdf-viewer`
5. `tree-engine` consumed by `tree`

`form-engine` stays deferred until `dynamic-form` proves a need (see its README).
