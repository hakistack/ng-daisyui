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
        let bitmap = page
            .render_with_config(
                &PdfRenderConfig::new()
                    .set_target_width(target_width)
                    // Bake annotations (highlights, ink, stamps) and form-field
                    // appearances into the raster — pd​f.js drew these in DOM
                    // overlay layers; PDFium renders them directly. Links stay
                    // overlay-only (they need to be clickable — see page_links).
                    .render_annotations(true)
                    .render_form_data(true),
            )
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

/// User-meaningful annotations across the whole document, for the sidebar list.
/// Each row is `[pageIndex (0-based), annotIndex (page-local), subtype, contents]`.
/// `annotIndex` is the annotation's position in the page's annotation array —
/// the address `delete_annotation` / `set_annotation_contents` take. Subtypes
/// the sidebar doesn't display (links, popups, widgets, …) are skipped.
#[wasm_bindgen]
pub fn document_annotations(handle: u32) -> Result<Array, JsValue> {
    with_doc(handle, |doc| {
        let out = Array::new();
        let pages = doc.pages();
        let count = pages.len();
        for i in 0..count {
            let page = match pages.get(i) {
                Ok(p) => p,
                Err(_) => continue,
            };
            let annots = page.annotations();
            for j in 0..annots.len() {
                let annot = match annots.get(j) {
                    Ok(a) => a,
                    Err(_) => continue,
                };
                let subtype = annotation_type_str(annot.annotation_type());
                if subtype.is_empty() {
                    continue;
                }
                let row = Array::new();
                row.push(&JsValue::from_f64(i as f64));
                row.push(&JsValue::from_f64(j as f64));
                row.push(&JsValue::from_str(subtype));
                row.push(&JsValue::from_str(&annot.contents().unwrap_or_default()));
                out.push(&row);
            }
        }
        Ok(out)
    })
}

/// Delete the annotation at `[page_index, annot_index]` (page-local index from
/// `document_annotations`). Indices shift after a delete — re-query first.
#[wasm_bindgen]
pub fn delete_annotation(handle: u32, page_index: u16, annot_index: u16) -> Result<bool, JsValue> {
    with_doc_mut(handle, |doc| {
        let mut page = doc.pages().get(page_index as i32).map_err(to_js)?;
        let annots = page.annotations_mut();
        let annot = annots.get(annot_index as usize).map_err(to_js)?;
        annots.delete_annotation(annot).map_err(to_js)?;
        Ok(true)
    })
}

/// Replace the text contents of the annotation at `[page_index, annot_index]`
/// (e.g. a note or free-text comment body).
#[wasm_bindgen]
pub fn set_annotation_contents(handle: u32, page_index: u16, annot_index: u16, contents: &str) -> Result<bool, JsValue> {
    with_doc_mut(handle, |doc| {
        let page = doc.pages().get(page_index as i32).map_err(to_js)?;
        let mut annot = page.annotations().get(annot_index as usize).map_err(to_js)?;
        annot.set_contents(contents).map_err(to_js)?;
        Ok(true)
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

/// Interactive form fields on one page, for the form-widget overlay. Each row is
/// `[name, type, x, y, w, h, value, readOnly(0|1), checked(0|1), options[]]`.
/// Rect is top-left-origin PDF points. `type` ∈ text|checkbox|radio|combo|list|
/// button|signature. `value` is the text/selected value; `checked` applies to
/// checkbox/radio; `options` lists choice labels (combo/list).
#[wasm_bindgen]
pub fn form_fields(handle: u32, index: u16) -> Result<Array, JsValue> {
    with_doc(handle, |doc| {
        let page = doc.pages().get(index as i32).map_err(to_js)?;
        let page_height = page.height().value;
        let out = Array::new();
        let annotations = page.annotations();
        for i in 0..annotations.len() {
            let annot = match annotations.get(i) {
                Ok(a) => a,
                Err(_) => continue,
            };
            let widget = match annot.as_widget_annotation() {
                Some(w) => w,
                None => continue,
            };
            let field = match widget.form_field() {
                Some(f) => f,
                None => continue,
            };
            let bounds = match annot.bounds() {
                Ok(b) => b,
                Err(_) => continue,
            };

            let (type_str, value, checked, options): (&str, String, bool, Vec<String>) = match field.field_type() {
                PdfFormFieldType::Text => (
                    "text",
                    field.as_text_field().and_then(|t| t.value()).unwrap_or_default(),
                    false,
                    Vec::new(),
                ),
                PdfFormFieldType::Checkbox => (
                    "checkbox",
                    String::new(),
                    field.as_checkbox_field().and_then(|c| c.is_checked().ok()).unwrap_or(false),
                    Vec::new(),
                ),
                PdfFormFieldType::RadioButton => (
                    "radio",
                    field.as_radio_button_field().and_then(|r| r.group_value()).unwrap_or_default(),
                    field.as_radio_button_field().and_then(|r| r.is_checked().ok()).unwrap_or(false),
                    Vec::new(),
                ),
                PdfFormFieldType::ComboBox => (
                    "combo",
                    field.as_combo_box_field().and_then(|c| c.value()).unwrap_or_default(),
                    false,
                    field
                        .as_combo_box_field()
                        .map(|c| c.options().iter().filter_map(|o| o.label().cloned()).collect())
                        .unwrap_or_default(),
                ),
                PdfFormFieldType::ListBox => (
                    "list",
                    String::new(),
                    false,
                    field
                        .as_list_box_field()
                        .map(|l| l.options().iter().filter_map(|o| o.label().cloned()).collect())
                        .unwrap_or_default(),
                ),
                PdfFormFieldType::PushButton => ("button", String::new(), false, Vec::new()),
                PdfFormFieldType::Signature => ("signature", String::new(), false, Vec::new()),
                PdfFormFieldType::Unknown => continue,
            };

            let opts = Array::new();
            for o in options {
                opts.push(&JsValue::from_str(&o));
            }
            let row = Array::new();
            row.push(&JsValue::from_str(&field.name().unwrap_or_default()));
            row.push(&JsValue::from_str(type_str));
            row.push(&JsValue::from_f64(bounds.left().value as f64));
            row.push(&JsValue::from_f64((page_height - bounds.top().value) as f64));
            row.push(&JsValue::from_f64((bounds.right().value - bounds.left().value) as f64));
            row.push(&JsValue::from_f64((bounds.top().value - bounds.bottom().value) as f64));
            row.push(&JsValue::from_str(&value));
            row.push(&JsValue::from_f64(if field.is_read_only() { 1.0 } else { 0.0 }));
            row.push(&JsValue::from_f64(if checked { 1.0 } else { 0.0 }));
            row.push(&opts);
            out.push(&row);
        }
        Ok(out)
    })
}

/// Set a form field's value by name on a page. `value` is the text (text/combo),
/// or `"true"`/`"false"` for checkbox, or any non-empty string to select a radio.
/// Combo/list value-setting is not supported by the binding (read-only). Returns
/// `true` if a writable field was matched + updated.
#[wasm_bindgen]
pub fn set_field_value(handle: u32, index: u16, name: &str, value: &str) -> Result<bool, JsValue> {
    with_doc_mut(handle, |doc| {
        let page = doc.pages().get(index as i32).map_err(to_js)?;
        let annotations = page.annotations();
        for i in 0..annotations.len() {
            let mut annot = match annotations.get(i) {
                Ok(a) => a,
                Err(_) => continue,
            };
            let widget = match annot.as_widget_annotation_mut() {
                Some(w) => w,
                None => continue,
            };
            let field = match widget.form_field_mut() {
                Some(f) => f,
                None => continue,
            };
            if field.name().as_deref() != Some(name) {
                continue;
            }
            match field.field_type() {
                PdfFormFieldType::Text => {
                    if let Some(t) = field.as_text_field_mut() {
                        t.set_value(value).map_err(to_js)?;
                        return Ok(true);
                    }
                }
                PdfFormFieldType::Checkbox => {
                    if let Some(c) = field.as_checkbox_field_mut() {
                        c.set_checked(value == "true" || value == "on" || value == "1").map_err(to_js)?;
                        return Ok(true);
                    }
                }
                PdfFormFieldType::RadioButton => {
                    if let Some(r) = field.as_radio_button_field_mut() {
                        r.set_checked().map_err(to_js)?;
                        return Ok(true);
                    }
                }
                // Choice fields: settable via the vendored pdfium-render patch
                // (public `set_value` on combo/list — see vendor/pdfium-render).
                PdfFormFieldType::ComboBox => {
                    if let Some(c) = field.as_combo_box_field_mut() {
                        c.set_value(value).map_err(to_js)?;
                        return Ok(true);
                    }
                }
                PdfFormFieldType::ListBox => {
                    if let Some(l) = field.as_list_box_field_mut() {
                        l.set_value(value).map_err(to_js)?;
                        return Ok(true);
                    }
                }
                _ => return Ok(false), // button/signature: not settable
            }
        }
        Ok(false)
    })
}

/// Pack a `0xRRGGBBAA` value into a `PdfColor`.
fn rgba(color: u32) -> PdfColor {
    PdfColor::new(((color >> 24) & 0xFF) as u8, ((color >> 16) & 0xFF) as u8, ((color >> 8) & 0xFF) as u8, (color & 0xFF) as u8)
}

/// Build a PDF rect (bottom-left origin) from a top-left-origin box in points.
fn rect_from_top_left(page_height: f32, x: f32, y: f32, w: f32, h: f32) -> PdfRect {
    PdfRect::new_from_values(page_height - (y + h), x, page_height - y, x + w)
}

/// Add a highlight annotation over the rect `[x,y,w,h]` (top-left points) with
/// `color` (`0xRRGGBBAA`). Appearance regenerates automatically (default page
/// strategy), so it shows in `render` + `save_document`.
#[wasm_bindgen]
pub fn add_highlight(handle: u32, index: u16, x: f32, y: f32, w: f32, h: f32, color: u32) -> Result<bool, JsValue> {
    with_doc_mut(handle, |doc| {
        let mut page = doc.pages().get(index as i32).map_err(to_js)?;
        let rect = rect_from_top_left(page.height().value, x, y, w, h);
        let mut annot = page.annotations_mut().create_highlight_annotation().map_err(to_js)?;
        annot.set_bounds(rect).map_err(to_js)?;
        annot.set_fill_color(rgba(color)).map_err(to_js)?;
        annot
            .attachment_points_mut()
            .create_attachment_point_at_end(PdfQuadPoints::from_rect(&rect))
            .map_err(to_js)?;
        Ok(true)
    })
}

/// Add a sticky-note (Text) annotation at `[x,y]` (top-left points) carrying
/// `contents` as the comment body.
#[wasm_bindgen]
pub fn add_text_note(handle: u32, index: u16, x: f32, y: f32, contents: &str, color: u32) -> Result<bool, JsValue> {
    with_doc_mut(handle, |doc| {
        let mut page = doc.pages().get(index as i32).map_err(to_js)?;
        // A note is a fixed-size icon; give it a ~18pt box at the click point.
        let rect = rect_from_top_left(page.height().value, x, y, 18.0, 18.0);
        let mut annot = page.annotations_mut().create_text_annotation(contents).map_err(to_js)?;
        annot.set_bounds(rect).map_err(to_js)?;
        annot.set_fill_color(rgba(color)).map_err(to_js)?;
        Ok(true)
    })
}

/// Add a free-text box over the rect `[x,y,w,h]` (top-left points) with the
/// typed `contents`.
#[wasm_bindgen]
pub fn add_free_text(handle: u32, index: u16, x: f32, y: f32, w: f32, h: f32, contents: &str, color: u32) -> Result<bool, JsValue> {
    with_doc_mut(handle, |doc| {
        let mut page = doc.pages().get(index as i32).map_err(to_js)?;
        let rect = rect_from_top_left(page.height().value, x, y, w, h);
        let mut annot = page.annotations_mut().create_free_text_annotation(contents).map_err(to_js)?;
        annot.set_bounds(rect).map_err(to_js)?;
        annot.set_stroke_color(rgba(color)).map_err(to_js)?;
        Ok(true)
    })
}

/// Add a freehand ink stroke. `points` is a flat `[x0,y0,x1,y1,…]` polyline in
/// top-left PDF points; `color` = `0xRRGGBBAA`; `width` in points. Built as a
/// stroked path object inside an Ink annotation.
#[wasm_bindgen]
pub fn add_ink(handle: u32, index: u16, points: Vec<f32>, color: u32, width: f32) -> Result<bool, JsValue> {
    if points.len() < 4 {
        return Ok(false); // need at least two points
    }
    with_doc_mut(handle, |doc| {
        let mut page = doc.pages().get(index as i32).map_err(to_js)?;
        let page_height = page.height().value;

        // Path objects use bottom-left origin → flip each y.
        let mut path = PdfPagePathObject::new(
            doc,
            PdfPoints::new(points[0]),
            PdfPoints::new(page_height - points[1]),
            Some(rgba(color)),
            Some(PdfPoints::new(width)),
            None,
        )
        .map_err(to_js)?;
        let mut i = 2;
        while i + 1 < points.len() {
            path.line_to(PdfPoints::new(points[i]), PdfPoints::new(page_height - points[i + 1])).map_err(to_js)?;
            i += 2;
        }

        let mut ink = page.annotations_mut().create_ink_annotation().map_err(to_js)?;
        ink.objects_mut().add_path_object(path).map_err(to_js)?;
        Ok(true)
    })
}

/// Delete the page at `index` (0-based). Page count + indices shift after —
/// the caller must refresh its page structure.
#[wasm_bindgen]
pub fn delete_page(handle: u32, index: u16) -> Result<bool, JsValue> {
    with_doc_mut(handle, |doc| {
        let page = doc.pages().get(index as i32).map_err(to_js)?;
        page.delete().map_err(to_js)?;
        Ok(true)
    })
}

/// Insert a blank page of `width`×`height` points at `index` (0-based; clamped
/// to the page count, so `index == count` appends).
#[wasm_bindgen]
pub fn insert_blank_page(handle: u32, index: u16, width: f32, height: f32) -> Result<bool, JsValue> {
    with_doc_mut(handle, |doc| {
        let size = PdfPagePaperSize::new_custom(PdfPoints::new(width), PdfPoints::new(height));
        doc.pages_mut().create_page_at_index(size, index as i32).map_err(to_js)?;
        Ok(true)
    })
}

/// Set a page's rotation (`degrees` ∈ {0, 90, 180, 270}). Applied to the saved
/// document; the viewer also rotates its display via CSS so overlays stay
/// aligned, so this is used transiently around `save_document`.
#[wasm_bindgen]
pub fn set_page_rotation(handle: u32, index: u16, degrees: u16) -> Result<bool, JsValue> {
    with_doc_mut(handle, |doc| {
        let mut page = doc.pages().get(index as i32).map_err(to_js)?;
        let rotation = match degrees % 360 {
            90 => PdfPageRenderRotation::Degrees90,
            180 => PdfPageRenderRotation::Degrees180,
            270 => PdfPageRenderRotation::Degrees270,
            _ => PdfPageRenderRotation::None,
        };
        page.set_rotation(rotation);
        Ok(true)
    })
}

/// Serialize the (possibly form-filled) document back to PDF bytes — for save /
/// download. Includes any `set_field_value` edits.
#[wasm_bindgen]
pub fn save_document(handle: u32) -> Result<Uint8Array, JsValue> {
    with_doc(handle, |doc| {
        let bytes = doc.save_to_bytes().map_err(to_js)?;
        Ok(Uint8Array::from(bytes.as_slice()))
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

/// Map a PDFium annotation type to the pd​f.js-style subtype string the sidebar
/// expects. Returns `""` for types the sidebar doesn't list (so they're filtered).
fn annotation_type_str(t: PdfPageAnnotationType) -> &'static str {
    match t {
        PdfPageAnnotationType::Highlight => "Highlight",
        PdfPageAnnotationType::Underline => "Underline",
        PdfPageAnnotationType::Strikeout => "StrikeOut",
        PdfPageAnnotationType::Squiggly => "Squiggly",
        PdfPageAnnotationType::Text => "Text",
        PdfPageAnnotationType::FreeText => "FreeText",
        PdfPageAnnotationType::Ink => "Ink",
        PdfPageAnnotationType::Stamp => "Stamp",
        PdfPageAnnotationType::Caret => "Caret",
        _ => "",
    }
}

/// Borrow an open document by handle, mapping a missing handle to a JS error.
fn with_doc<R>(handle: u32, f: impl FnOnce(&PdfDocument<'static>) -> Result<R, JsValue>) -> Result<R, JsValue> {
    DOCS.with(|d| {
        let docs = d.borrow();
        let doc = docs.get(&handle).ok_or_else(|| JsValue::from_str("unknown document handle"))?;
        f(doc)
    })
}

/// Mutably borrow an open document by handle (form-field edits go through here).
fn with_doc_mut<R>(handle: u32, f: impl FnOnce(&mut PdfDocument<'static>) -> Result<R, JsValue>) -> Result<R, JsValue> {
    DOCS.with(|d| {
        let mut docs = d.borrow_mut();
        let doc = docs.get_mut(&handle).ok_or_else(|| JsValue::from_str("unknown document handle"))?;
        f(doc)
    })
}

fn to_js<E: core::fmt::Debug>(e: E) -> JsValue {
    JsValue::from_str(&format!("{e:?}"))
}
