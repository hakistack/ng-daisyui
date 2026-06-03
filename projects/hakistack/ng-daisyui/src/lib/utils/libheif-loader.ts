/**
 * Loader for the in-tree libheif WASM module.
 *
 * Built by `npm run libheif:build` — runs Emscripten against pre-built
 * `libde265.a` + `libheif.a` static libs, then `cargo build` of the
 * Rust `libheif-bridge` crate targeting `wasm32-unknown-emscripten`.
 * See `hakistack-engine/external/libheif-wasm/README.md` for toolchain
 * prereqs and the full build flow.
 *
 * The Rust crate is a `bin` (not `cdylib`) because `cdylib` on
 * `wasm32-unknown-emscripten` produces a side module with no JS glue
 * and no embedded runtime — `bin` gives us the standalone main module
 * the loader can drive directly. Pyodide takes the same approach for
 * Rust extensions on this target.
 *
 * Loading is **conditional**: if the build artifacts aren't present
 * (consumer hasn't run `npm run libheif:build`), [`tryLoadLibheif`]
 * resolves to `null` so the caller falls back to the `heic2any` peer
 * dep. The dynamic `import()` uses `webpackIgnore`/`@vite-ignore`
 * pragmas so consumer bundlers don't fail compilation when the
 * optional artifacts are missing.
 *
 * ## Why `extern "C"` instead of embind
 *
 * Two patterns are available for Rust↔JS interop on Emscripten:
 *
 *   - **embind** (C++ pattern, also usable from Rust via cxx-shim) —
 *     auto-marshals JS objects to/from C++ structs. Nicer JS API. Pays
 *     for itself with an embind registration table that's ~30+ KB of
 *     JS glue plus a few KB of WASM-side runtime.
 *   - **`extern "C"`** (our choice) — JS calls raw `Module._fn(ptr, len)`
 *     and reads results from `HEAPU8` / `HEAP32`. Manual but minimal:
 *     ~16 KB JS glue vs embind's ~64 KB, and the marshalling logic
 *     lives in this file so it's debuggable end-to-end.
 *
 * The Rust crate's `DecodeResult` is `#[repr(C)]` with a fixed field
 * layout; this loader's `adaptToFacade` reads those fields from
 * `HEAP32`/`HEAPU32` at the offsets that match Rust's layout. Changes
 * to the struct in `crates/libheif-bridge/src/main.rs` must be mirrored
 * here.
 */

export interface LibheifModule {
  /**
   * Decode HEIC/HEIF bytes to packed RGBA. Throws (as a JS Error) on
   * any libheif failure — invalid format, corrupted file, unsupported
   * variant, etc.
   */
  decode: (bytes: Uint8Array | string) => { width: number; height: number; rgba: Uint8Array };
  /** Linked libheif version string, e.g. `"1.18.2"`. */
  libheif_version: () => string;
}

let modPromise: Promise<LibheifModule | null> | null = null;
let mod: LibheifModule | null = null;

/**
 * Resolve the libheif module on first call, then cache. Returns `null`
 * (cached) when the build hasn't been run — the caller (`LibheifService`)
 * treats that as "fall back to `heic2any` if present" rather than a
 * fatal condition.
 */
export async function tryLoadLibheif(): Promise<LibheifModule | null> {
  if (mod) return mod;
  modPromise ??= (async () => {
    try {
      const m = await loadInlined();
      mod = m;
      return m;
    } catch (e) {
      if (typeof console !== 'undefined') {
        console.debug('[hk-document-viewer] libheif WASM not present; check `npm run libheif:build`. Reason:', (e as Error).message);
      }
      return null;
    }
  })();
  return modPromise;
}

/** Raw Emscripten module — exposes `Module._*` C exports + HEAP views. */
interface RawEmModule {
  default: (opts: { wasmBinary?: Uint8Array | ArrayBuffer }) => Promise<EmscriptenRuntime>;
}

/**
 * Emscripten runtime helpers we use. The export lists are pinned in
 * `crates/libheif-bridge/build.rs` (`EXPORTED_FUNCTIONS` /
 * `EXPORTED_RUNTIME_METHODS`); if anything goes missing here, that's
 * where to add it.
 */
interface EmscriptenRuntime {
  _libheif_bridge_decode: (inputPtr: number, inputLen: number) => number;
  _libheif_bridge_free_result: (resultPtr: number) => void;
  _libheif_bridge_version: () => number;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  HEAPU8: Uint8Array;
  HEAP32: Int32Array;
  HEAPU32: Uint32Array;
  UTF8ToString: (ptr: number) => string;
}

interface LibheifInlineModule {
  LIBHEIF_WASM_BASE64: string;
}

async function loadInlined(): Promise<LibheifModule> {
  const gluePath = '../wasm/libheif/libheif_wasm_glue';
  const inlinePath = '../wasm/libheif/libheif_wasm_inline';
  const [glueMod, inlineMod] = await Promise.all([
    importMaybeMissing<RawEmModule>(gluePath),
    importMaybeMissing<LibheifInlineModule>(inlinePath),
  ]);

  if (!glueMod || !inlineMod) {
    throw new Error('libheif WASM artifacts not present');
  }

  const wasmBinary = decodeBase64(inlineMod.LIBHEIF_WASM_BASE64);
  const runtime = await glueMod.default({ wasmBinary });

  return adaptToFacade(runtime);
}

/**
 * Wrap the raw Emscripten runtime in the [`LibheifModule`] façade used
 * by `LibheifService`. The marshalling logic is non-trivial — see the
 * struct layout in `crates/libheif-bridge/src/main.rs::DecodeResult`.
 */
function adaptToFacade(rt: EmscriptenRuntime): LibheifModule {
  // ── DecodeResult field offsets (in `HEAP32`/`HEAPU32` 4-byte units) ──
  // Must stay in sync with the `#[repr(C)] DecodeResult` layout on
  // wasm32 (where `usize` is 4 bytes, pointers 4 bytes, c_int 4 bytes).
  //
  //   0  width      (i32)
  //   4  height     (i32)
  //   8  rgba_ptr   (u32 pointer)
  //  12  rgba_len   (u32, since usize == u32 on wasm32)
  //  16  error_ptr  (u32 pointer; 0 on success)
  const OFFSET_WIDTH = 0;
  const OFFSET_HEIGHT = 1;
  const OFFSET_RGBA_PTR = 2;
  const OFFSET_RGBA_LEN = 3;
  const OFFSET_ERROR_PTR = 4;

  return {
    decode(bytes: Uint8Array | string): { width: number; height: number; rgba: Uint8Array } {
      // Promote string input (defensive — callers pass Uint8Array in practice).
      const buf = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;

      // 1) Copy input bytes onto the WASM heap.
      const inputPtr = rt._malloc(buf.byteLength);
      if (inputPtr === 0) {
        throw new Error('libheif: _malloc returned null for input buffer');
      }
      rt.HEAPU8.set(buf, inputPtr);

      let resultPtr = 0;
      try {
        // 2) Run the decoder. Returns a heap pointer to `DecodeResult`.
        resultPtr = rt._libheif_bridge_decode(inputPtr, buf.byteLength);
        if (resultPtr === 0) {
          throw new Error('libheif: decoder returned a null result pointer');
        }

        // 3) Read the result struct from the heap.
        const idx = resultPtr >>> 2; // u32 index
        const width = rt.HEAP32[idx + OFFSET_WIDTH];
        const height = rt.HEAP32[idx + OFFSET_HEIGHT];
        const rgbaPtr = rt.HEAPU32[idx + OFFSET_RGBA_PTR];
        const rgbaLen = rt.HEAPU32[idx + OFFSET_RGBA_LEN];
        const errorPtr = rt.HEAPU32[idx + OFFSET_ERROR_PTR];

        if (errorPtr !== 0) {
          throw new Error('libheif: ' + rt.UTF8ToString(errorPtr));
        }
        if (rgbaPtr === 0 || rgbaLen === 0) {
          throw new Error('libheif: empty RGBA payload despite success status');
        }

        // 4) Copy RGBA out into a fresh `Uint8Array` owned by JS. We
        // can't return a view into `HEAPU8.buffer` because (a) the heap
        // may grow and move, and (b) we're about to free the underlying
        // allocation in step 5.
        const rgba = rt.HEAPU8.slice(rgbaPtr, rgbaPtr + rgbaLen);
        return { width, height, rgba };
      } finally {
        // 5) Always free the result struct (and its owned buffers) +
        // the input copy. try/finally guarantees this on every code
        // path including the throw.
        if (resultPtr !== 0) rt._libheif_bridge_free_result(resultPtr);
        rt._free(inputPtr);
      }
    },

    libheif_version(): string {
      const ptr = rt._libheif_bridge_version();
      return ptr === 0 ? '' : rt.UTF8ToString(ptr);
    },
  };
}

async function importMaybeMissing<T>(path: string): Promise<T | null> {
  try {
    return (await import(/* @vite-ignore */ /* webpackIgnore: true */ path)) as T;
  } catch {
    return null;
  }
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
