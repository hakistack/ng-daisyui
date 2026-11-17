# ADR-0007 — Engine stays private and close to the root; generated WASM modules are tracked

**Status:** Accepted (2026-11-17)

## Context
`hakistack-engine` (11 crates + emscripten `libheif-bridge`, vendored `pdfium-render`) has one consumer,
ng-daisyui. `build:engine` runs wasm-pack and writes TS glue + base64-inline modules into
`ng-daisyui/src/lib/wasm/`. Only `engine_wasm_*` was tracked; `document/` and `image/` modules were ignored, so a
clean clone could not build ng-daisyui (audit C1).

## Decision
- The engine stays a private, shared Cargo workspace at `hakistack-engine/` (not moved into ng-daisyui: it is a
  separate toolchain with its own CI job, and a second consumer is plausible). Crates are not products.
- Every generated module the library **imports** is tracked (`lib/wasm/.gitignore` lists them); raw wasm-pack output
  is not. `build-wasm.mjs` no longer copies wasm-pack's own `.gitignore`, which used to override that list.
- `build:ui` never runs Rust. `clean:engine` only removes engine-owned output.

## Consequences
- Builds are reproducible from the repository with Node only (CI, Vercel, new contributors).
- A Rust change ships only when the regenerated modules are committed with it (reviewers see the diff size).
- ~1.7 MB more generated source in git (on top of `engine_wasm_inline.ts` and the 6 MB PDFium worker). Revisit with
  Git LFS or a CI WASM build with a pinned toolchain if clone size becomes a problem.
