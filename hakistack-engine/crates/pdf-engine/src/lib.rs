//! PDFium-backed PDF engine compiled to WASM.
//!
//! Runs PDFium inside a Web Worker so pages rasterize off the main thread —
//! **with correct text**, the thing pd​f.js cannot do off-thread. Exposes a
//! persistent-handle API: `open` parses a document once and returns a handle;
//! `render`/`page_text`/`page_size` reuse the already-parsed document on every
//! call (no re-parse), and `close` frees it. See `PDFIUM_ENGINE.md`.
//!
//! At runtime a pre-built `pdfium.wasm` (paulocoutinhox/pdfium-lib — growable
//! heap) must be loaded on the JS side first; `Pdfium::default()` binds to it.

use std::cell::RefCell;
use std::collections::HashMap;

use js_sys::{Array, Uint8Array};
use pdfium_render::prelude::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn start() {
    #[cfg(target_arch = "wasm32")]
    console_error_panic_hook::set_once();
}

thread_local! {
    /// Process-wide PDFium instance, leaked to `'static` so open documents —
    /// which borrow the library bindings — can live in the registry across
    /// calls. Initialized lazily on first use, which only happens after the JS
    /// side has run `initialize_pdfium_render(...)`, so the runtime bindings
    /// are wired by then.
    static PDFIUM: &'static Pdfium = Box::leak(Box::new(Pdfium::default()));
    /// Open documents keyed by the handle we hand back to JS.
    static DOCS: RefCell<HashMap<u32, PdfDocument<'static>>> = RefCell::new(HashMap::new());
    /// Monotonic handle allocator (never reused within a session).
    static NEXT_HANDLE: RefCell<u32> = const { RefCell::new(1) };
    /// Annotations the viewer draws itself, per document and page: hidden while
    /// rasterizing so they don't appear twice. Never persisted to the document.
    static HIDDEN: RefCell<HashMap<u32, HashMap<u16, Vec<u16>>>> = RefCell::new(HashMap::new());
}

/// Sentinel error string the JS side detects to trigger the password prompt.
pub const PASSWORD_REQUIRED: &str = "PDFIUM_PASSWORD_REQUIRED";

/// Parse a document from raw bytes and return a handle for later calls.
/// On a password-protected document with a missing/wrong password, rejects with
/// the {@link PASSWORD_REQUIRED} sentinel so the caller can prompt + retry.
#[wasm_bindgen]
pub fn open(bytes: Vec<u8>, password: Option<String>) -> Result<u32, JsValue> {
    let doc = match PDFIUM.with(|p| p.load_pdf_from_byte_vec(bytes, password.as_deref())) {
        Ok(d) => d,
        Err(PdfiumError::PdfiumLibraryInternalError(PdfiumInternalError::PasswordError)) => {
            return Err(JsValue::from_str(PASSWORD_REQUIRED));
        }
        Err(e) => return Err(to_js(e)),
    };
    let handle = NEXT_HANDLE.with(|n| {
        let mut n = n.borrow_mut();
        let h = *n;
        *n += 1;
        h
    });
    DOCS.with(|d| d.borrow_mut().insert(handle, doc));
    Ok(handle)
}

/// Release a document and free its WASM memory. No-op for unknown handles.
#[wasm_bindgen]
pub fn close(handle: u32) {
    DOCS.with(|d| {
        d.borrow_mut().remove(&handle);
    });
    HIDDEN.with(|h| {
        h.borrow_mut().remove(&handle);
    });
}

/// Replace the set of annotations left out of rendered rasters (the ones the
/// viewer draws in its own layer). `entries` is flat `[page, annotIndex, …]`;
/// an empty list clears it. Rendering hides them only for the duration of the
/// call, so a later save is unaffected.
#[wasm_bindgen]
pub fn set_hidden_annotations(handle: u32, entries: Vec<u32>) {
    let mut by_page: HashMap<u16, Vec<u16>> = HashMap::new();
    for pair in entries.chunks_exact(2) {
        by_page.entry(pair[0] as u16).or_default().push(pair[1] as u16);
    }
    HIDDEN.with(|h| {
        let mut h = h.borrow_mut();
        if by_page.is_empty() {
            h.remove(&handle);
        } else {
            h.insert(handle, by_page);
        }
    });
}

/// Run `f` (a render of `page`) with the page's hidden annotations flagged
/// Hidden, restoring their flags afterwards.
fn with_hidden_annotations<R>(handle: u32, index: u16, page: &PdfPage, f: impl FnOnce() -> R) -> R {
    let list = HIDDEN.with(|h| h.borrow().get(&handle).and_then(|pages| pages.get(&index).cloned())).unwrap_or_default();
    let mut restore = Vec::new();
    for i in list {
        if let Ok(mut annot) = page.annotations().get(i as usize) {
            if !annot.is_hidden() && annot.set_is_hidden(true).is_ok() {
                restore.push(i);
            }
        }
    }
    let result = f();
    for i in restore {
        if let Ok(mut annot) = page.annotations().get(i as usize) {
            let _ = annot.set_is_hidden(false);
        }
    }
    result
}

/// Number of pages in an open document.
#[wasm_bindgen]
pub fn page_count(handle: u32) -> Result<u32, JsValue> {
    with_doc(handle, |doc| Ok(doc.pages().len() as u32))
}

/// Page dimensions in PDF points (1/72"): `[widthPt, heightPt]`.
#[wasm_bindgen]
pub fn page_size(handle: u32, index: u16) -> Result<Array, JsValue> {
    with_doc(handle, |doc| {
        let page = doc.pages().get(index as i32).map_err(to_js)?;
        let out = Array::new();
        out.push(&JsValue::from_f64(page.width().value as f64));
        out.push(&JsValue::from_f64(page.height().value as f64));
        Ok(out)
    })
}

/// Rasterize page `index` to `target_width` device px. Returns
/// `[widthPx, heightPx, Uint8Array(RGBA)]` (`len == widthPx * heightPx * 4`).
#[wasm_bindgen]
pub fn render(handle: u32, index: u16, target_width: i32) -> Result<Array, JsValue> {
    with_doc(handle, |doc| {
        let page = doc.pages().get(index as i32).map_err(to_js)?;
        let bitmap = with_hidden_annotations(handle, index, &page, || {
            page.render_with_config(
                &PdfRenderConfig::new()
                    .set_target_width(target_width)
                    // Bake annotations (highlights, ink, stamps) and form-field
                    // appearances into the raster — pd​f.js drew these in DOM
                    // overlay layers; PDFium renders them directly. Links stay
                    // overlay-only (they need to be clickable — see page_links).
                    // Annotations the viewer edits are drawn by its own layer
                    // and hidden here (see set_hidden_annotations).
                    .render_annotations(true)
                    .render_form_data(true),
            )
        })
        .map_err(to_js)?;
        let w = bitmap.width() as u32;
        let h = bitmap.height() as u32;
        let rgba = bitmap.as_rgba_bytes();
        let out = Array::new();
        out.push(&JsValue::from_f64(w as f64));
        out.push(&JsValue::from_f64(h as f64));
        out.push(&Uint8Array::from(rgba.as_slice()));
        Ok(out)
    })
}

/// Render one tile: the region `(x, y, w, h)` (device px, top-left origin) of the
/// page scaled to `page_width × page_height` device px. Returns `[w, h, rgba]`
/// like `render`. Lets the viewer show a sharp viewport at zooms where the whole
/// page would exceed the browser's canvas limits.
#[wasm_bindgen]
pub fn render_tile(handle: u32, index: u16, page_width: i32, page_height: i32, x: i32, y: i32, w: i32, h: i32) -> Result<Array, JsValue> {
    with_doc(handle, |doc| {
        let page = doc.pages().get(index as i32).map_err(to_js)?;
        let bitmap = with_hidden_annotations(handle, index, &page, || page.render_region(page_width, page_height, x, y, w, h)).map_err(to_js)?;
        let out = Array::new();
        out.push(&JsValue::from_f64(bitmap.width() as f64));
        out.push(&JsValue::from_f64(bitmap.height() as f64));
        out.push(&Uint8Array::from(bitmap.as_rgba_bytes().as_slice()));
        Ok(out)
    })
}

/// Extract page text as positioned segments for the text layer + search index.
/// Each entry is `[text, x, y, w, h]` where the rect is in PDF points with a
/// **top-left** origin (already Y-flipped) so JS only has to multiply by the
/// render scale. Segments are returned in reading order.
#[wasm_bindgen]
pub fn page_text(handle: u32, index: u16) -> Result<Array, JsValue> {
    with_doc(handle, |doc| {
        let page = doc.pages().get(index as i32).map_err(to_js)?;
        let page_height = page.height().value;
        let text = page.text().map_err(to_js)?;

        let out = Array::new();
        for segment in text.segments().iter() {
            let b = segment.bounds();
            let left = b.left().value;
            let top = b.top().value;
            let right = b.right().value;
            let bottom = b.bottom().value;

            let seg = Array::new();
            seg.push(&JsValue::from_str(&segment.text()));
            seg.push(&JsValue::from_f64(left as f64)); // x (top-left origin)
            seg.push(&JsValue::from_f64((page_height - top) as f64)); // y (flipped)
            seg.push(&JsValue::from_f64((right - left) as f64)); // w
            seg.push(&JsValue::from_f64((top - bottom) as f64)); // h
            out.push(&seg);
        }
        Ok(out)
    })
}

/// Each page's label from the document's `/PageLabels` ("iv", "A-1"), or `""`
/// where none is defined. Read without loading the pages.
#[wasm_bindgen]
pub fn page_labels(handle: u32) -> Result<Array, JsValue> {
    with_doc(handle, |doc| {
        let pages = doc.pages();
        let out = Array::new();
        for i in 0..pages.len() {
            out.push(&JsValue::from_str(&pages.label(i).unwrap_or_default()));
        }
        Ok(out)
    })
}

/// Embedded document Title (from the metadata dictionary), or `""` if unset.
#[wasm_bindgen]
pub fn document_title(handle: u32) -> Result<String, JsValue> {
    with_doc(handle, |doc| {
        Ok(doc
            .metadata()
            .get(PdfDocumentMetadataTagType::Title)
            .map(|t| t.value().to_string())
            .unwrap_or_default())
    })
}

/// Document outline (bookmarks) as a tree. Each node is
/// `[title, pageIndex, children[]]` where `pageIndex` is 0-based (`-1` if the
/// bookmark has no page destination) and `children` is an array of the same
/// node shape, in document order.
#[wasm_bindgen]
pub fn outline(handle: u32) -> Result<Array, JsValue> {
    with_doc(handle, |doc| {
        let out = Array::new();
        let bookmarks = doc.bookmarks();
        let mut cur = bookmarks.root();
        while let Some(b) = cur {
            out.push(&bookmark_node(&b));
            cur = b.next_sibling();
        }
        Ok(out)
    })
}

/// Link rectangles for one page, for the clickable overlay. Each row is
/// `[x, y, w, h, pageIndex, uri]`: rect in PDF points with a top-left origin
/// (already Y-flipped); `pageIndex` is the 0-based jump target (`-1` if none);
/// `uri` is the external URL (`""` if none). A link has one or the other.
#[wasm_bindgen]
pub fn page_links(handle: u32, index: u16) -> Result<Array, JsValue> {
    with_doc(handle, |doc| {
        let page = doc.pages().get(index as i32).map_err(to_js)?;
        let page_height = page.height().value;
        let out = Array::new();
        for link in page.links().iter() {
            let rect = match link.rect() {
                Ok(r) => r,
                Err(_) => continue,
            };
            let page_idx = link.destination().and_then(|d| d.page_index().ok());
            let uri = link
                .action()
                .and_then(|a| a.as_uri_action().and_then(|u| u.uri().ok()))
                .unwrap_or_default();
            if page_idx.is_none() && uri.is_empty() {
                continue; // nothing actionable
            }
            let row = Array::new();
            row.push(&JsValue::from_f64(rect.left().value as f64));
            row.push(&JsValue::from_f64((page_height - rect.top().value) as f64));
            row.push(&JsValue::from_f64((rect.right().value - rect.left().value) as f64));
            row.push(&JsValue::from_f64((rect.top().value - rect.bottom().value) as f64));
            row.push(&JsValue::from_f64(page_idx.map(|p| p as f64).unwrap_or(-1.0)));
            row.push(&JsValue::from_str(&uri));
            out.push(&row);
        }
        Ok(out)
    })
}

/// Embedded files. Each row is `[name, Uint8Array(bytes)]`.
#[wasm_bindgen]
pub fn attachments(handle: u32) -> Result<Array, JsValue> {
    with_doc(handle, |doc| {
        let out = Array::new();
        for att in doc.attachments().iter() {
            let bytes = att.save_to_bytes().unwrap_or_default();
            let row = Array::new();
            row.push(&JsValue::from_str(&att.name()));
            row.push(&Uint8Array::from(bytes.as_slice()));
            out.push(&row);
        }
        Ok(out)
    })
}

/// Recursively project a bookmark into a `[title, pageIndex, children[]]` node.
fn bookmark_node(b: &PdfBookmark) -> Array {
    let node = Array::new();
    node.push(&JsValue::from_str(&b.title().unwrap_or_default()));
    let page = b.destination().and_then(|d| d.page_index().ok());
    node.push(&JsValue::from_f64(page.map(|p| p as f64).unwrap_or(-1.0)));
    let children = Array::new();
    for child in b.iter_direct_children() {
        children.push(&bookmark_node(&child));
    }
    node.push(&children);
    node
}

/// Borrow an open document by handle, mapping a missing handle to a JS error.
fn with_doc<R>(handle: u32, f: impl FnOnce(&PdfDocument<'static>) -> Result<R, JsValue>) -> Result<R, JsValue> {
    DOCS.with(|d| {
        let docs = d.borrow();
        let doc = docs.get(&handle).ok_or_else(|| JsValue::from_str("unknown document handle"))?;
        f(doc)
    })
}

fn to_js<E: core::fmt::Debug>(e: E) -> JsValue {
    JsValue::from_str(&format!("{e:?}"))
}
