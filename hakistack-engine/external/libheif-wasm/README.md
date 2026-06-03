# libheif WASM build

In-house Emscripten build of [`libheif`](https://github.com/strukturag/libheif) +
[`libde265`](https://github.com/strukturag/libde265), linked into a small
Rust shim crate that compiles to `wasm32-unknown-emscripten`. End artifact
is a single WASM module that decodes HEIC/HEIF to raw RGBA — fast path
for the HEIC renderer in `<hk-document-viewer>`, replacing the `heic2any`
peer-dep fallback.

> This directory lives **outside** the `hakistack-engine` Cargo
> workspace because the C build (libde265 + libheif) uses Emscripten +
> CMake. The Rust shim crate (`crates/libheif-bridge/`) is also excluded
> from the workspace members — it only builds on the emscripten target
> and against the pre-built `.a` files this script produces, so
> `cargo check --workspace` on host would fail otherwise.

---

## Why we own this build

| Approach | Initial cost | Per-app cost | Ownership |
|---|---|---|---|
| `heic2any` (peer dep, fallback) | 0 | ~1.5 MB lazy chunk + gifshot bloat | None — upstream owns the API |
| **This build** | toolchain install + ~4 min cold compile | ~830 KB lazy chunk, no JS-side bloat | Full — we pin libheif version, choose link flags, can trim features |

The in-tree build wins on **size**, **stability** (specific pinned
versions), and **trimmability** (we can disable AVIF / x265 / encoder
features to shrink further). Cost is the toolchain installation.

---

## Prerequisites

You need these installed locally **once**:

```bash
# 1) CMake — Homebrew on macOS, apt on Linux
brew install cmake
# or:  sudo apt install -y cmake

# 2) Emscripten SDK — ~1.5 GB, lives outside this repo.
#    Pin 3.1.68 — this is the version Rust's pre-compiled std for
#    wasm32-unknown-emscripten was tested against. Mismatches risk ABI
#    breakage.
git clone https://github.com/emscripten-core/emsdk.git ~/emsdk
~/emsdk/emsdk install 3.1.68
~/emsdk/emsdk activate 3.1.68
source ~/emsdk/emsdk_env.sh

# 3) Newer binaryen (wasm-opt). emsdk 3.1.68 bundles binaryen 119,
#    which is missing the `--enable-bulk-memory-opt` flag emcc passes.
#    Use Homebrew's newer binaryen and symlink it into emsdk:
brew install binaryen
cd ~/emsdk/upstream/bin
for tool in wasm-as wasm-ctor-eval wasm-dis wasm-emscripten-finalize \
            wasm-fuzz-lattices wasm-fuzz-types wasm-merge wasm-metadce \
            wasm-opt wasm-reduce wasm-shell wasm-split; do
  if [[ -f "$tool" && ! -L "$tool" ]]; then
    mv "$tool" "${tool}.119-bundled"
    ln -s "/opt/homebrew/bin/$tool" "$tool"
  fi
done
cd -

# 4) The Rust target for emscripten.
rustup target add wasm32-unknown-emscripten

# Sanity check — these must all print versions
emcc --version
cmake --version
wasm-opt --version    # should be 120+ (Homebrew binaryen)
rustup target list --installed | grep emscripten
```

Add `source ~/emsdk/emsdk_env.sh` to your shell rc so subsequent shells
have `emcc` on PATH.

---

## Build

From the repo root:

```bash
npm run libheif:build
```

Wraps `external/libheif-wasm/build.sh`. The script is **idempotent** —
re-runs skip stages whose inputs haven't changed.

High-level stages:

1. **Clone pinned sources** into `vendor/` (gitignored).
2. **Build `libde265`** with `emcmake` →
   `vendor/libde265-1.0.15/build/libde265/libde265.a`.
   HEVC decoder — does the actual pixel work.
3. **Build `libheif`** with `emcmake`, linking against the libde265
   build → `vendor/libheif-1.18.2/build/libheif/libheif.a`.
   HEIF container parser.
4. **`cargo build --target wasm32-unknown-emscripten`** of the
   `libheif-bridge` crate — links against the two `.a` files via
   `build.rs` link directives. Output: `libheif_wasm.{js,wasm}`.
5. **Copy artifacts** into
   `projects/hakistack/ng-daisyui/src/lib/wasm/libheif/` and emit the
   `*_glue.ts` + `*_inline.ts` TS shims so the Angular library
   inline-bundles them into the FESM (no public/ copy required at
   runtime).

Approximate build time on a modern Mac: ~4 min cold, ~5 sec for no-op
re-runs.

---

## Pinned versions

| Library | Version | Tarball |
|---|---|---|
| libde265 | 1.0.15 | https://github.com/strukturag/libde265/releases |
| libheif  | 1.18.2 | https://github.com/strukturag/libheif/releases  |
| Emscripten | 3.1.68 | (matches Rust's pre-compiled std for `wasm32-unknown-emscripten`) |

Bump versions in `build.sh` (`LIBDE265_VERSION` / `LIBHEIF_VERSION`).
Re-run `npm run libheif:build`. The script re-detects sources and
rebuilds.

---

## Key compile flags

These get applied at the libde265 + libheif compile step (see
`WASMEH_FLAGS` in `build.sh`):

| Flag | Why |
|---|---|
| `-fwasm-exceptions` | Matches Rust std's exception ABI on this target — without this, the link fails with `DISABLE_EXCEPTION_CATCHING=0 is not compatible with -fwasm-exceptions`. |
| `-D__EMSCRIPTEN_STANDALONE_WASM__` | libheif's `heif.cc` unconditionally includes its embind bindings file (`heif_emscripten.h`) on the emscripten target unless this macro is defined. We skip those — we expose libheif via plain `extern "C"` from the Rust shim, no embind needed. |
| `-DCMAKE_POLICY_VERSION_MINIMUM=3.5` | libde265 1.0.15 + libheif 1.18.2 declare an old `cmake_minimum_required`. Modern CMake (4.x) dropped pre-3.5 compatibility — this flag lets the configure step succeed without forking the upstream CMakeLists. |

`-DWITH_X265=OFF -DWITH_AOM_*=OFF -DWITH_DAV1D=OFF` and friends keep
libheif from trying to find optional encoders that aren't there (and
aren't useful in browser anyway since we only decode).

---

## What the build produces

```
hakistack-engine/external/libheif-wasm/
├── build/                   ← gitignored
│   └── cargo-target/        ← cargo's isolated CARGO_TARGET_DIR
└── vendor/                  ← cloned sources + build trees (gitignored)
    ├── libde265-1.0.15/
    └── libheif-1.18.2/

projects/hakistack/ng-daisyui/src/lib/wasm/libheif/
├── libheif_wasm.js          ← Emscripten ES6 module factory (raw)
├── libheif_wasm_bg.wasm     ← the WASM binary (raw)
├── libheif_wasm_glue.ts     ← @ts-nocheck shim of the .js, bundled into FESM
└── libheif_wasm_inline.ts   ← base64-inlined .wasm, bundled into FESM
```

Same shape as the existing `engine_wasm` / `document_wasm` /
`image_wasm` bundles — the TS loader (`utils/libheif-loader.ts`) and
service (`services/libheif.service.ts`) follow the same pattern.

---

## Progressive enhancement in the renderer

`image-special.renderer.ts` tries HEIC in this order:

1. **In-tree libheif** — used when `libheif_wasm_inline.ts` is present
   (after you've run `npm run libheif:build`). Fast path.
2. **`heic2any` peer dep** — used when the in-tree build hasn't been
   run but the consumer has `heic2any` installed.
3. **Clean error** with install instructions for both options.

The lib works whether or not you've run the build — it's a
**performance/size win**, not a correctness requirement.

---

## Troubleshooting

**`emcc: command not found`**
→ You forgot `source ~/emsdk/emsdk_env.sh` in this shell. Add it to your
   shell rc.

**`Unknown option '--enable-bulk-memory-opt'` at link time**
→ emsdk's bundled binaryen 119 is too old. Install Homebrew binaryen
   and symlink the tools as shown in Prerequisites step 3.

**`error: cannot use 'try' with exceptions disabled`**
→ libheif's C++ source uses `try`/`catch`. You shouldn't see this in
   `build.sh` (we don't pass `-fno-exceptions`), but if you've modified
   the flags, that's the cause.

**`undefined symbol: _embind_register_*`**
→ libheif's `heif_emscripten.h` got pulled in. Check that
   `-D__EMSCRIPTEN_STANDALONE_WASM__` is still in `WASMEH_FLAGS`.

**WASM crashes on a specific file**
→ Test the file natively first: `brew install libheif` then
   `heif-info path/to/file.heic`. If `heif-info` also fails, the input
   itself is the problem.

**Build is huge (>2 MB raw)**
→ Check that `opt-level = "z"` is set in
   `crates/libheif-bridge/Cargo.toml` AND that your `wasm-opt` is
   binaryen 120+ (otherwise the build script falls back to a profile
   that skips wasm-opt — ~70% size penalty).

---

## Future work

- **Trim further** — disable libheif's metadata extraction paths +
  remaining unused color-conversion routines. Target <500 KB raw.
- **AVIF in the same bundle** — libheif can also decode AVIF when
  built with libdav1d. A future spike could fold AVIF here instead of
  using the Rust `image` crate path for it.
- **CI** — add a GitHub Actions workflow that runs `npm run libheif:build`
  on `ubuntu-latest` with emsdk + binaryen installed, so the artifacts
  can be cached + downloaded by contributors who don't want to install
  Emscripten locally.
- **Multi-image HEIC** — iOS live photos pack multiple frames. The Rust
  shim currently returns the primary image only; extending to a vec
  of frames is mechanical.
