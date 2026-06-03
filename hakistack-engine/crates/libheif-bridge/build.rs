//! Build-time wiring for `libheif-bridge`.
//!
//! Responsibilities:
//!
//!  1. **Static-library linking** — point cargo at our pre-built
//!     `libheif.a` and `libde265.a` (produced by
//!     `external/libheif-wasm/build.sh` stages 1–2). The paths come in
//!     via env vars set by `build-rust.sh`.
//!  2. **Emscripten linker flags** — pass `-sMODULARIZE=1` and friends
//!     through to `emcc` (which acts as the linker for this target).
//!     These match the flags used by the C++ wrapper build so JS-side
//!     loading is uniform across variants.

fn main() {
    // Only emit linker directives when actually targeting
    // wasm32-unknown-emscripten — protects against accidental host
    // builds (the workspace `exclude` already prevents this, but it's
    // cheap defense in depth).
    let target = std::env::var("TARGET").unwrap_or_default();
    if target != "wasm32-unknown-emscripten" {
        // Skip silently — a non-emscripten build will fail anyway
        // because the cdylib output would need a system libheif.
        return;
    }

    // ── Static library paths (set by the driver script) ──────────────
    let libheif_dir = std::env::var("LIBHEIF_BUILD_DIR")
        .expect("LIBHEIF_BUILD_DIR must be set (path to libheif build/ containing libheif.a)");
    let libde265_dir = std::env::var("LIBDE265_BUILD_DIR")
        .expect("LIBDE265_BUILD_DIR must be set (path to libde265 build/ containing libde265.a)");

    // Cargo turns these into `-L <path>` and `-l static=...` linker
    // flags. The bare lib names match the .a file basenames sans the
    // "lib" prefix and ".a" suffix (i.e. `libheif.a` → `heif`).
    println!("cargo:rustc-link-search=native={libheif_dir}");
    println!("cargo:rustc-link-lib=static=heif");
    println!("cargo:rustc-link-search=native={libde265_dir}");
    println!("cargo:rustc-link-lib=static=de265");

    // ── Emscripten link flags ─────────────────────────────────────────
    //
    // The Emscripten linker (invoked by rustc behind the scenes) emits
    // an ES module factory `default(opts) => Promise<Module>` that the
    // TS loader (`utils/libheif-loader.ts`) dynamic-imports and drives.
    for arg in [
        "-sMODULARIZE=1",
        "-sEXPORT_ES6=1",
        "-sEXPORT_NAME=createLibheif",
        "-sENVIRONMENT=web",
        "-sALLOW_MEMORY_GROWTH=1",
        "-sINITIAL_MEMORY=67108864", // 64 MB
        "-sFILESYSTEM=0",
        "-sASSERTIONS=0",
        // Exception model: Rust's pre-built std for
        // wasm32-unknown-emscripten enables `-fwasm-exceptions` (the
        // WASM EH proposal). We DON'T set
        // `-sDISABLE_EXCEPTION_CATCHING=0` here — that's incompatible
        // with `-fwasm-exceptions` and would error out at link time
        // ("DISABLE_EXCEPTION_CATCHING=0 is not compatible with
        // -fwasm-exceptions"). Instead, libheif itself is rebuilt with
        // `-fwasm-exceptions` in build-rust.sh so the ABIs match.
        // Expose `_malloc` / `_free` for the JS side to allocate the
        // input buffer it then memcpy's into.
        "-sEXPORTED_FUNCTIONS=_libheif_bridge_decode,_libheif_bridge_free_result,_libheif_bridge_version,_malloc,_free",
        // Expose runtime helpers we use from JS.
        "-sEXPORTED_RUNTIME_METHODS=HEAP8,HEAPU8,HEAP32,HEAPU32,UTF8ToString,stringToUTF8",
    ] {
        println!("cargo:rustc-link-arg={arg}");
    }

    // Rebuild whenever the static libs change — keeps incremental
    // builds correct if you re-run the libheif/libde265 emcmake step.
    println!("cargo:rerun-if-env-changed=LIBHEIF_BUILD_DIR");
    println!("cargo:rerun-if-env-changed=LIBDE265_BUILD_DIR");
    println!("cargo:rerun-if-changed=src/lib.rs");
}
