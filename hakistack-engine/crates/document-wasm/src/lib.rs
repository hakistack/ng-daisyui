//! `wasm-bindgen` umbrella for the document-engine kernels.
//!
//! Compiled to a **separate WASM bundle** from `engine-wasm` so the
//! ~400 KB calamine payload only lands in apps that actually mount
//! `<hk-document-viewer>`. Apps that use `<hk-table>` alone still load
//! the lean `engine_wasm` bundle and never see this one.
//!
//! Built with `wasm-pack build --target web --out-dir <pkg>`; the loader
//! at `lib/utils/document-engine-loader.ts` mirrors `engine-loader.ts`'s
//! base64-inline path so consumers don't have to copy WASM into their
//! `public/` folder.

use wasm_bindgen::prelude::*;

use document_engine::spreadsheet;

/// Module init — runs once when wasm-bindgen instantiates the bundle.
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "debug-panics")]
    console_error_panic_hook::set_once();
}

/// Crate version. Useful smoke-test export — TS can `console.log` this to
/// confirm the bundle loaded.
#[wasm_bindgen]
pub fn document_engine_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Parse a spreadsheet from raw bytes. Format (xlsx / xls / xlsb / ods /
/// etc.) is auto-detected by calamine sniffing the input.
///
/// Returns a JS object shaped as [`spreadsheet::Workbook`]:
///
/// ```ts
/// {
///   sheets: Array<{
///     name:   string;
///     width:  number;
///     height: number;
///     rows:   Array<Array<
///       | { kind: 'empty' }
///       | { kind: 'text';    value: string }
///       | { kind: 'number';  value: number }
///       | { kind: 'bool';    value: boolean }
///       | { kind: 'date';    value: number }  // Unix ms
///       | { kind: 'formula'; value: string }
///       | { kind: 'error';   value: string }
///     >>;
///   }>;
/// }
/// ```
#[wasm_bindgen]
pub fn parse_spreadsheet(bytes: &[u8]) -> Result<JsValue, JsValue> {
    let workbook =
        spreadsheet::parse_bytes(bytes).map_err(|e| JsValue::from_str(&format!("{e}")))?;
    serde_wasm_bindgen::to_value(&workbook)
        .map_err(|e| JsValue::from_str(&format!("serialize: {e}")))
}
