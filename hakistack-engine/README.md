# hakistack-engine

Rust workspace powering the compute kernels of `@hakistack/ng-daisyui`. Compiled to WebAssembly via `wasm-pack` and shipped as the npm package `@hakistack/engine`.

## Crates

| Crate | Role | wasm-bindgen? |
|-------|------|:---:|
| `engine-core`   | Pure Rust primitives: tree arena, bitset, string folding | — |
| `engine-wasm`   | Single `wasm-bindgen` umbrella, re-exports every engine | ✓ |
| `table-engine`  | Filter / sort / search / group / aggregate / tree-flatten kernels for `hk-table` | — |
| `tree-engine`   | Filter / flatten / selection cascade / descendant test for `hk-tree` | — |
| `search-engine` | `fuzzy` (palette + select) and `pdf` (pdf-viewer) substring + nucleo matchers | — |
| `form-engine`   | *Deferred.* See `crates/form-engine/README.md` | — |

Only `engine-wasm` carries `wasm-bindgen`; everything else is pure Rust so it can be tested natively with `cargo test`.

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

## Bundle size

Measured on the current commit (release profile, `wasm-opt -O3`, LTO fat,
strip, panic=abort, `--no-default-features`):

| Build | Raw size | Gzipped |
|-------|---------:|--------:|
| Dev (`--dev`)             | ~1.7 MB | — |
| Release (default features) | 436 KB | ~143 KB |
| Release (no debug-panics)  | 434 KB | ~142 KB |

Most of the bundle is `nucleo-matcher`'s Unicode tables (~80 KB raw) and the
serde wire format for the per-kernel APIs. **Counter-intuitive finding:**
`wasm-opt -O3` produced *smaller* output than `-Oz` for this codebase
(434 KB vs 432 KB raw) — aggressive inlining enables better dead-code
elimination than the conservative size pass.

If bundle size becomes a problem for apps that only use one or two kernels,
`wasm-bindgen` supports per-feature entry points — we could split into
`@hakistack/engine-table`, `@hakistack/engine-tree`, etc. without
restructuring the Rust crates. Single-bundle is the sensible default until
profiling shows the cost is real.

## Roadmap

See per-component plans under `projects/hakistack/ng-daisyui/src/lib/components/*/RUST_ENGINE.md`, indexed by `components/RUST_ENGINE_OVERVIEW.md`.

Phased rollout (high level):

1. `engine-core` + `table-engine` (Phase 0–2)
2. `search-engine::fuzzy` consumed by `command-palette`
3. `select` adopts `search-engine::fuzzy`
4. `search-engine::pdf` consumed by `pdf-viewer`
5. `tree-engine` consumed by `tree`

`form-engine` stays deferred until `dynamic-form` proves a need (see its README).
