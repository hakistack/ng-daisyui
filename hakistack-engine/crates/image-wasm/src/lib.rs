//! `wasm-bindgen` umbrella for the image-engine kernel.
//!
//! Compiled to a **separate WASM bundle** from `engine-wasm` and
//! `document-wasm` so each renderer pays only for what it actually uses:
//!
//!   - apps mounting `<hk-table>` alone get `engine_wasm`
//!   - apps viewing spreadsheets get `engine_wasm` + `document_wasm`
//!   - apps viewing TIFFs/etc. get `engine_wasm` + `image_wasm`
//!
//! Built with `wasm-pack build --target web --out-dir <pkg>`; the loader
//! at `lib/utils/image-engine-loader.ts` mirrors the document-engine
//! loader's base64-inline path so consumers don't have to copy WASM into
//! their `public/` folder.

use js_sys::Uint8Array;
use wasm_bindgen::prelude::*;

use image_engine::decode_to_png as decode_to_png_inner;

#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "debug-panics")]
    console_error_panic_hook::set_once();
}

/// Crate version. Smoke-test export — useful for confirming the right
/// bundle loaded.
#[wasm_bindgen]
pub fn image_engine_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Decode any supported input format and return PNG bytes.
///
/// The browser side wraps the result in a `Blob` + object URL and uses
/// it as an `<img src>`. We always emit PNG because:
///
///   1. Every browser supports PNG as an `<img>` target with zero
///      polyfilling.
///   2. Pure-Rust PNG encoder is small.
///   3. Lossless — round-tripping a TIFF through PNG preserves pixels.
///
/// Returns the PNG bytes as a fresh `Uint8Array` (a single bulk memcpy
/// out of WASM linear memory — same pattern as the engine-wasm bundle).
#[wasm_bindgen]
pub fn decode_to_png(bytes: &[u8]) -> Result<Uint8Array, JsValue> {
    let png = decode_to_png_inner(bytes).map_err(|e| JsValue::from_str(&format!("{e}")))?;
    let out = Uint8Array::new_with_length(png.len() as u32);
    out.copy_from(&png);
    Ok(out)
}
