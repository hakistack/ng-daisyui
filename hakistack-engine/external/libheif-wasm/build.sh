#!/usr/bin/env bash
# Build libheif + libde265 to WebAssembly, then link a Rust shim crate
# (libheif-bridge) against them targeting wasm32-unknown-emscripten.
#
# Pipeline (idempotent — re-runs skip already-built stages):
#   1. clone pinned libde265 + libheif sources into vendor/
#   2. emcmake + emmake libde265 → libde265.a
#   3. emcmake + emmake libheif (links against libde265.a) → libheif.a
#   4. cargo build --target wasm32-unknown-emscripten -p libheif-bridge
#      → libheif_wasm.{js,wasm}  via Emscripten linker
#   5. copy artifacts + emit TS shims for Angular library inline-bundling
#
# Output:  hakistack-engine/external/libheif-wasm/build/libheif_wasm.{js,wasm}
# Plus a copy lands in:  projects/hakistack/ng-daisyui/src/lib/wasm/libheif/
#
# Run from repo root:  npm run libheif:build
#
# See ./README.md for toolchain prerequisites.

set -euo pipefail

# ─── Pinned versions ───────────────────────────────────────────────────────
LIBDE265_VERSION="1.0.15"
LIBHEIF_VERSION="1.18.2"

# Emscripten 3.1.68 matches the version Rust's pre-compiled std for
# wasm32-unknown-emscripten was tested against (per rustc platform-support
# docs). Mismatches risk ABI breakage — symptoms range from immediate
# crashes to silently wrong outputs. If your local emcc differs, you
# either need to install 3.1.68 or use `cargo +nightly -Zbuild-std` to
# rebuild std against the emcc you have.
EMSCRIPTEN_RECOMMENDED="3.1.68"

# ─── Paths ────────────────────────────────────────────────────────────────
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${HERE}/../../.." && pwd)"
VENDOR="${HERE}/vendor"
BUILD="${HERE}/build"
CARGO_TARGET_DIR="${BUILD}/cargo-target"
CRATE_DIR="${REPO_ROOT}/hakistack-engine/crates/libheif-bridge"
ANGULAR_TARGET="${REPO_ROOT}/projects/hakistack/ng-daisyui/src/lib/wasm/libheif"

LIBDE265_SRC="${VENDOR}/libde265-${LIBDE265_VERSION}"
LIBHEIF_SRC="${VENDOR}/libheif-${LIBHEIF_VERSION}"
LIBDE265_BUILD="${LIBDE265_SRC}/build"
LIBHEIF_BUILD="${LIBHEIF_SRC}/build"

# Compile flags applied to BOTH libde265 and libheif:
#
#   -fwasm-exceptions
#     Enables the WebAssembly Exception Handling proposal so libheif's
#     C++ exceptions land in trampolines compatible with what Rust's
#     pre-built std for wasm32-unknown-emscripten expects (it also has
#     -fwasm-exceptions baked in). Without this we get a link-time
#     error: "DISABLE_EXCEPTION_CATCHING=0 is not compatible with
#     -fwasm-exceptions".
#
#   -D__EMSCRIPTEN_STANDALONE_WASM__
#     libheif's heif.cc unconditionally includes its own embind
#     bindings file (heif_emscripten.h) on the Emscripten target unless
#     this macro is defined. Including embind would drag in ~30+ KB of
#     registration runtime we don't use (we expose libheif via plain
#     `extern "C"` from the Rust shim). The macro is semantically "I'm
#     building for standalone WASM (no JS host)" — not quite true since
#     we DO have a JS host, but the side-effect (skip embind) is what
#     we want.
WASMEH_FLAGS="-fwasm-exceptions -D__EMSCRIPTEN_STANDALONE_WASM__"

# ─── Profile ──────────────────────────────────────────────────────────────
PROFILE="${LIBHEIF_BUILD_PROFILE:-release}"
case "$PROFILE" in
  release) OPT_FLAGS="-O3 -flto"; CARGO_PROFILE_FLAG="--release"; CARGO_OUT_DIR="release" ;;
  dev)     OPT_FLAGS="-O0 -g";   CARGO_PROFILE_FLAG="";          CARGO_OUT_DIR="debug" ;;
  *) echo "Unknown LIBHEIF_BUILD_PROFILE=$PROFILE (use 'release' or 'dev')" >&2; exit 1 ;;
esac

# ─── Toolchain sanity ─────────────────────────────────────────────────────
require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    cat >&2 <<EOF
✗ Missing tool: $1

For this Rust-Emscripten build you need:
  - emcc      (Emscripten ${EMSCRIPTEN_RECOMMENDED} recommended)
  - cmake     (any recent version)
  - cargo     (stable Rust)
  - the wasm32-unknown-emscripten target:  rustup target add wasm32-unknown-emscripten

See ./README.md for install instructions.
EOF
    exit 1
  fi
}

require emcc
require emcmake
require emmake
require cmake
require cargo
require curl
require tar

# Warn if emcc isn't the recommended version. Not fatal — many versions
# work — but matches the std ABI most reliably.
EMCC_VER="$(emcc --version | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo unknown)"
if [[ "$EMCC_VER" != "$EMSCRIPTEN_RECOMMENDED" ]]; then
  echo "⚠ Emscripten ${EMCC_VER} detected; ${EMSCRIPTEN_RECOMMENDED} is the version Rust's wasm32-unknown-emscripten std was tested against."
  echo "  If link errors or ABI weirdness shows up, try:"
  echo "    ~/emsdk/emsdk install ${EMSCRIPTEN_RECOMMENDED} && ~/emsdk/emsdk activate ${EMSCRIPTEN_RECOMMENDED} && source ~/emsdk/emsdk_env.sh"
fi

# Confirm the rustup target is installed. `rustc --print target-list`
# would also work but is slower than checking the sysroot.
if ! rustup target list --installed 2>/dev/null | grep -q '^wasm32-unknown-emscripten$'; then
  echo "✗ Missing rustup target wasm32-unknown-emscripten" >&2
  echo "  Install with:  rustup target add wasm32-unknown-emscripten" >&2
  exit 1
fi

echo "▶ Toolchain: emcc ${EMCC_VER}, $(rustc --version | head -1)"
echo "▶ Profile:   $PROFILE ($OPT_FLAGS)"

mkdir -p "$VENDOR" "$BUILD" "$ANGULAR_TARGET"

# ─── Fetch + Stage 1 + Stage 2 — same as build.sh ─────────────────────────
fetch_release() {
  local repo="$1" version="$2" dest="$3"
  if [[ -d "$dest" ]]; then
    echo "✓ $(basename "$dest") source already present"
    return 0
  fi
  local url="https://github.com/${repo}/releases/download/v${version}/$(basename "$repo")-${version}.tar.gz"
  echo "▶ Fetching $url"
  curl -fsSL "$url" -o "${dest}.tar.gz"
  tar -xzf "${dest}.tar.gz" -C "$VENDOR"
  rm "${dest}.tar.gz"
}

# Stage 1: libde265
echo
echo "═══ libde265 ${LIBDE265_VERSION} ═══"
fetch_release "strukturag/libde265" "$LIBDE265_VERSION" "$LIBDE265_SRC"
if [[ ! -f "${LIBDE265_BUILD}/libde265/libde265.a" ]]; then
  mkdir -p "$LIBDE265_BUILD"
  # See build.sh for the rationale on -DCMAKE_POLICY_VERSION_MINIMUM=3.5
  # (libde265 1.0.15 declares an old cmake_minimum_required that
  # CMake 4.x rejects without this fallback).
  ( cd "$LIBDE265_BUILD" && emcmake cmake .. \
      -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
      -DCMAKE_BUILD_TYPE=Release \
      -DBUILD_SHARED_LIBS=OFF \
      -DENABLE_SDL=OFF \
      -DENABLE_DECODER=ON \
      -DENABLE_ENCODER=OFF \
      -DCMAKE_C_FLAGS="$OPT_FLAGS $WASMEH_FLAGS" \
      -DCMAKE_CXX_FLAGS="$OPT_FLAGS $WASMEH_FLAGS" )
  ( cd "$LIBDE265_BUILD" && emmake make -j"$(getconf _NPROCESSORS_ONLN || echo 4)" de265 )
fi
[[ -f "${LIBDE265_BUILD}/libde265/libde265.a" ]] || { echo "✗ libde265.a not produced" >&2; exit 1; }
echo "✓ libde265.a: $(du -h "${LIBDE265_BUILD}/libde265/libde265.a" | awk '{print $1}')"

# Stage 2: libheif
echo
echo "═══ libheif ${LIBHEIF_VERSION} ═══"
fetch_release "strukturag/libheif" "$LIBHEIF_VERSION" "$LIBHEIF_SRC"
if [[ ! -f "${LIBHEIF_BUILD}/libheif/libheif.a" ]]; then
  mkdir -p "$LIBHEIF_BUILD"
  # See build.sh for -DCMAKE_POLICY_VERSION_MINIMUM=3.5 rationale.
  ( cd "$LIBHEIF_BUILD" && emcmake cmake .. \
      -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
      -DCMAKE_BUILD_TYPE=Release \
      -DBUILD_SHARED_LIBS=OFF \
      -DBUILD_TESTING=OFF \
      -DWITH_EXAMPLES=OFF \
      -DWITH_LIBDE265=ON \
      -DLIBDE265_INCLUDE_DIR="${LIBDE265_SRC}" \
      -DLIBDE265_LIBRARY="${LIBDE265_BUILD}/libde265/libde265.a" \
      -DWITH_X265=OFF \
      -DWITH_AOM_DECODER=OFF \
      -DWITH_AOM_ENCODER=OFF \
      -DWITH_DAV1D=OFF \
      -DWITH_RAV1E=OFF \
      -DWITH_SvtEnc=OFF \
      -DWITH_FFMPEG_DECODER=OFF \
      -DWITH_JPEG_DECODER=OFF \
      -DWITH_JPEG_ENCODER=OFF \
      -DWITH_OpenJPEG_DECODER=OFF \
      -DWITH_OpenJPEG_ENCODER=OFF \
      -DWITH_KVAZAAR=OFF \
      -DWITH_UVG266=OFF \
      -DWITH_OpenH264_DECODER=OFF \
      -DWITH_OpenH264_ENCODER=OFF \
      -DCMAKE_C_FLAGS="$OPT_FLAGS $WASMEH_FLAGS" \
      -DCMAKE_CXX_FLAGS="$OPT_FLAGS $WASMEH_FLAGS" )
  ( cd "$LIBHEIF_BUILD" && emmake make -j"$(getconf _NPROCESSORS_ONLN || echo 4)" heif )
fi
[[ -f "${LIBHEIF_BUILD}/libheif/libheif.a" ]] || { echo "✗ libheif.a not produced" >&2; exit 1; }
echo "✓ libheif.a: $(du -h "${LIBHEIF_BUILD}/libheif/libheif.a" | awk '{print $1}')"

# ─── Stage 3: cargo build (libheif-bridge → wasm32-unknown-emscripten) ────
echo
echo "═══ libheif-bridge ═══"

# Env vars consumed by build.rs to emit `-L` / `-l` link directives.
export LIBHEIF_BUILD_DIR="${LIBHEIF_BUILD}/libheif"
export LIBDE265_BUILD_DIR="${LIBDE265_BUILD}/libde265"

# rustc/clang need libheif's source + build-generated heif_version.h on
# the include path so it can resolve `<libheif/heif.h>` and the version
# header it transitively includes. The libde265 root is here for any
# direct includes we add later.
export CFLAGS="-I${LIBHEIF_SRC} -I${LIBHEIF_BUILD} -I${LIBDE265_SRC}"
export CXXFLAGS="$CFLAGS"

# Pin cargo to our isolated target dir so we don't pollute the workspace
# `target/`. Also lets `libheif:clean` wipe just our build artifacts.
export CARGO_TARGET_DIR

echo "▶ cargo build --target wasm32-unknown-emscripten ${CARGO_PROFILE_FLAG}"
( cd "$CRATE_DIR" && cargo build --target wasm32-unknown-emscripten $CARGO_PROFILE_FLAG )

# `bin` crate targeting wasm32-unknown-emscripten emits `.wasm` + `.js`
# (the Emscripten ES6 module factory). The names match the package's
# `[[bin]] name` — `libheif_bridge` (underscores, not hyphens).
CARGO_WASM="${CARGO_TARGET_DIR}/wasm32-unknown-emscripten/${CARGO_OUT_DIR}/libheif_bridge.wasm"
CARGO_JS="${CARGO_TARGET_DIR}/wasm32-unknown-emscripten/${CARGO_OUT_DIR}/libheif_bridge.js"

[[ -f "$CARGO_WASM" ]] || { echo "✗ cargo build did not produce $CARGO_WASM" >&2; exit 1; }
[[ -f "$CARGO_JS"   ]] || { echo "✗ cargo build did not produce $CARGO_JS"   >&2; exit 1; }

echo "✓ libheif_bridge.wasm: $(du -h "$CARGO_WASM" | awk '{print $1}')"
echo "✓ libheif_bridge.js:   $(du -h "$CARGO_JS"   | awk '{print $1}')"

# ─── Stage 4: Angular library copy + TS shims ─────────────────────────────
echo
echo "═══ Stage 4: Angular library copy + TS shims ═══"

rm -rf "$ANGULAR_TARGET"
mkdir -p "$ANGULAR_TARGET"
cp "$CARGO_JS"   "$ANGULAR_TARGET/libheif_wasm.js"
cp "$CARGO_WASM" "$ANGULAR_TARGET/libheif_wasm_bg.wasm"

# Emit the @ts-nocheck'd glue — same pattern as the other in-tree WASM
# bundles (engine_wasm / document_wasm / image_wasm).
{
  echo "// @ts-nocheck"
  echo "/* eslint-disable */"
  echo "// Auto-generated by external/libheif-wasm/build.sh"
  echo "// Source: libheif_bridge.js (Emscripten ES6 module, wasm32-unknown-emscripten target)"
  cat "$CARGO_JS"
} > "$ANGULAR_TARGET/libheif_wasm_glue.ts"

# Emit the base64 inline.
node -e "
  const fs = require('node:fs');
  const bytes = fs.readFileSync(process.argv[1]);
  const b64 = bytes.toString('base64');
  const out =
    '// Auto-generated by external/libheif-wasm/build.sh\n' +
    '// Base64 of libheif_wasm_bg.wasm (' + bytes.length.toLocaleString() + ' raw bytes).\n' +
    'export const LIBHEIF_WASM_BASE64 = ' + JSON.stringify(b64) + ';\n';
  fs.writeFileSync(process.argv[2], out);
" "$CARGO_WASM" "$ANGULAR_TARGET/libheif_wasm_inline.ts"

# Demo public copy (dev-server convenience; the lib's FESM inlines the
# base64 for the real loader, so this isn't strictly required at
# runtime — but matches the convention of the other WASM bundles).
for demo in projects/demo/public projects/demo-v4/public; do
  abs="${REPO_ROOT}/$demo"
  if [[ -d "$abs" ]]; then
    cp "$CARGO_JS"   "$abs/libheif_wasm.js"
    cp "$CARGO_WASM" "$abs/libheif_wasm.wasm"
    echo "✓ $demo (libheif_wasm.{js,wasm})"
  fi
done

echo
echo "✅ libheif WASM build complete."
echo "   bundle:   $ANGULAR_TARGET/libheif_wasm_bg.wasm  ($(du -h "$CARGO_WASM" | awk '{print $1}'))"
echo "   glue ts:  $ANGULAR_TARGET/libheif_wasm_glue.ts"
echo "   inline:   $ANGULAR_TARGET/libheif_wasm_inline.ts"
