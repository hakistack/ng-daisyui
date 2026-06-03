//! libheif bridge — Rust shim that exposes the libheif C API to JS via
//! `wasm32-unknown-emscripten`.
//!
//! Surface: `decode HEIC bytes → RGBA + dims`, via:
//!
//!   - hand-rolled `extern "C"` FFI to libheif (no `libheif-sys` dep —
//!     keeps the build hermetic against unrelated upstream changes)
//!   - C-ABI exports (`#[unsafe(no_mangle)] pub extern "C" fn ...`)
//!     that JS calls via `Module._libheif_bridge_decode` etc.
//!   - a `DecodeResult` struct allocated on the WASM heap that JS reads
//!     directly via `HEAP32` / `HEAPU32` views, then frees with
//!     `_libheif_bridge_free_result`.
//!
//! Compared to an embind-based wrapper, the `extern "C"` approach pays
//! for itself in a smaller JS glue (~16 KB vs ~64 KB), and the
//! marshalling logic lives in the matching TS loader
//! (`utils/libheif-loader.ts`) so it's debuggable end-to-end. Extending
//! later (multi-image HEIC, metadata extraction, depth maps) is just
//! more `extern "C"` exports + matching loader field offsets.

#![allow(non_camel_case_types)]
#![allow(non_snake_case)]

use std::ffi::{CString, c_char, c_int, c_uchar, c_void};

/// No-op `main` — the binary's only purpose is to be a vehicle for
/// the `extern "C"` exports below. Emscripten's runtime calls this
/// once on module init; we have nothing to do here.
///
/// We can't use `#![no_main]` because that would skip Emscripten's
/// initialization (env, heap, stdio shims) — and we still want it for
/// the malloc/free path libheif uses.
fn main() {}

// ─── libheif FFI (minimal subset we need) ─────────────────────────────
//
// All declarations match the libheif C headers in
// `external/libheif-wasm/vendor/libheif-*/libheif/heif.h`. Pinning the
// libheif version (1.18.2) in build.sh keeps these stable.
//
// We don't bind the whole API — just the ~10 functions for the
// happy-path decode flow. Extending this is a matter of copying a few
// more `extern "C"` lines.

#[repr(C)]
struct heif_context {
    _private: [u8; 0],
}
#[repr(C)]
struct heif_image_handle {
    _private: [u8; 0],
}
#[repr(C)]
struct heif_image {
    _private: [u8; 0],
}
#[repr(C)]
struct heif_decoding_options {
    _private: [u8; 0],
}

#[repr(C)]
struct heif_error {
    code: c_int,
    subcode: c_int,
    message: *const c_char,
}

const HEIF_ERROR_OK: c_int = 0;

// heif_colorspace
const HEIF_COLORSPACE_RGB: c_int = 1;

// heif_chroma
const HEIF_CHROMA_INTERLEAVED_RGBA: c_int = 11;

// heif_channel
const HEIF_CHANNEL_INTERLEAVED: c_int = 10;

// Edition 2024 requires `unsafe extern "C" { ... }` for FFI blocks —
// the safety burden moves to the declaration site, making callers
// (still wrapped in `unsafe { }` per call) responsible only for the
// per-call safety contract.
unsafe extern "C" {
    fn heif_context_alloc() -> *mut heif_context;
    fn heif_context_free(ctx: *mut heif_context);
    fn heif_context_read_from_memory_without_copy(
        ctx: *mut heif_context,
        memory: *const c_void,
        size: usize,
        options: *const c_void,
    ) -> heif_error;
    fn heif_context_get_primary_image_handle(
        ctx: *mut heif_context,
        handle: *mut *mut heif_image_handle,
    ) -> heif_error;
    fn heif_image_handle_release(handle: *mut heif_image_handle);
    fn heif_decode_image(
        handle: *mut heif_image_handle,
        out: *mut *mut heif_image,
        colorspace: c_int,
        chroma: c_int,
        options: *const heif_decoding_options,
    ) -> heif_error;
    fn heif_image_release(img: *mut heif_image);
    fn heif_image_get_width(img: *const heif_image, channel: c_int) -> c_int;
    fn heif_image_get_height(img: *const heif_image, channel: c_int) -> c_int;
    fn heif_image_get_plane_readonly(
        img: *const heif_image,
        channel: c_int,
        out_stride: *mut c_int,
    ) -> *const c_uchar;
    fn heif_get_version() -> *const c_char;
}

// ─── RAII wrappers ────────────────────────────────────────────────────
//
// Same pattern as the C++ wrapper but using Rust's `Drop` impl — no
// chance of forgetting to release on an error path, and the borrow
// checker prevents use-after-free at compile time.

struct HeifContextGuard(*mut heif_context);

impl HeifContextGuard {
    fn new() -> Result<Self, String> {
        let ptr = unsafe { heif_context_alloc() };
        if ptr.is_null() {
            return Err("heif_context_alloc returned null (out of memory)".into());
        }
        Ok(Self(ptr))
    }
}

impl Drop for HeifContextGuard {
    fn drop(&mut self) {
        if !self.0.is_null() {
            unsafe { heif_context_free(self.0) };
        }
    }
}

struct ImageHandleGuard(*mut heif_image_handle);

impl Drop for ImageHandleGuard {
    fn drop(&mut self) {
        if !self.0.is_null() {
            unsafe { heif_image_handle_release(self.0) };
        }
    }
}

struct ImageGuard(*mut heif_image);

impl Drop for ImageGuard {
    fn drop(&mut self) {
        if !self.0.is_null() {
            unsafe { heif_image_release(self.0) };
        }
    }
}

fn check_error(err: heif_error, where_: &str) -> Result<(), String> {
    if err.code == HEIF_ERROR_OK {
        return Ok(());
    }
    let msg = if err.message.is_null() {
        "(no message)".to_string()
    } else {
        unsafe {
            std::ffi::CStr::from_ptr(err.message)
                .to_string_lossy()
                .into_owned()
        }
    };
    Err(format!("libheif {where_}: {msg}"))
}

// ─── Public C ABI exposed to the Emscripten module ────────────────────
//
// The JS side calls `Module._libheif_bridge_decode(input_ptr, input_len)`
// and gets back a pointer to a `DecodeResult` struct laid out in WASM
// memory. It then reads the fields via the `HEAP32` / `HEAPU32` views
// and, when done, frees the struct (including any owned buffers) by
// calling `_libheif_bridge_free_result(result_ptr)`.

/// Result struct returned to JS. Field layout is part of the ABI —
/// changing it requires updating the JS reader in `libheif-rust-loader.ts`.
///
/// Layout (offsets in bytes on wasm32):
///
/// ```text
///  0  i32   width        (< 0 on error)
///  4  i32   height       (< 0 on error)
///  8  u32   rgba_ptr     (heap pointer; 0 on error)
/// 12  u32   rgba_len     (bytes; 0 on error)
/// 16  u32   error_ptr    (UTF-8 string pointer; 0 on success)
/// ```
#[repr(C)]
pub struct DecodeResult {
    pub width: c_int,
    pub height: c_int,
    pub rgba_ptr: *mut c_uchar,
    pub rgba_len: usize,
    pub error_ptr: *mut c_char,
}

/// Decode HEIC/HEIF bytes and return a heap-allocated [`DecodeResult`].
///
/// On error the result's `error_ptr` is set and the dimension/buffer
/// fields are zeroed. The caller (JS) is **always** responsible for
/// calling `libheif_bridge_free_result` to release the heap allocation —
/// success or failure.
///
/// # Safety
///
/// `input_ptr` must point to at least `input_len` valid bytes. The
/// pointer is read but not retained beyond this call.
//
// Edition-2024 note: `#[unsafe(no_mangle)]` is the new form — the bare
// `#[no_mangle]` is now an unsafe attribute because it lets multiple
// crates collide on the same symbol name, breaking the type system's
// usual guarantees about external linkage.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn libheif_bridge_decode(
    input_ptr: *const u8,
    input_len: usize,
) -> *mut DecodeResult {
    // `decode_inner` is a safe function — every FFI call inside it is
    // wrapped in a local `unsafe { ... }` block, so the caller doesn't
    // owe anything beyond what the pointer-validity contract already
    // requires.
    let result = match decode_inner(input_ptr, input_len) {
        Ok((width, height, rgba)) => {
            // Leak the Vec into a stable heap pointer — we'll reclaim it
            // in `libheif_bridge_free_result`. `into_raw_parts` (unstable)
            // would be cleaner; we replicate it via Box<[u8]>::into_raw.
            let len = rgba.len();
            let boxed: Box<[u8]> = rgba.into_boxed_slice();
            let rgba_ptr = Box::into_raw(boxed) as *mut c_uchar;
            DecodeResult {
                width,
                height,
                rgba_ptr,
                rgba_len: len,
                error_ptr: std::ptr::null_mut(),
            }
        }
        Err(msg) => {
            let c_str = CString::new(msg)
                .unwrap_or_else(|_| CString::new("error message contained NUL").unwrap());
            DecodeResult {
                width: -1,
                height: -1,
                rgba_ptr: std::ptr::null_mut(),
                rgba_len: 0,
                error_ptr: c_str.into_raw(),
            }
        }
    };
    Box::into_raw(Box::new(result))
}

/// Release a `DecodeResult` allocated by [`libheif_bridge_decode`].
/// Must be called once per successful or failed `decode` to avoid
/// leaking the result struct AND its owned buffers.
///
/// # Safety
///
/// `result` must have come from `libheif_bridge_decode` and not have
/// been freed already.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn libheif_bridge_free_result(result: *mut DecodeResult) {
    if result.is_null() {
        return;
    }
    // SAFETY: `result` was produced by `Box::into_raw` in
    // `libheif_bridge_decode`; the caller contract guarantees we own it
    // exclusively at this point. Same applies to the owned RGBA slice
    // and the error CString below.
    unsafe {
        let owned = Box::from_raw(result);
        if !owned.rgba_ptr.is_null() && owned.rgba_len > 0 {
            // `slice_from_raw_parts_mut` builds a `*mut [u8]` directly,
            // avoiding the `as *mut [u8]` cast clippy warns about (the
            // cast obscures intent and could shadow alignment bugs in
            // similar-looking code paths).
            let _slice = Box::from_raw(std::ptr::slice_from_raw_parts_mut(
                owned.rgba_ptr,
                owned.rgba_len,
            ));
        }
        if !owned.error_ptr.is_null() {
            let _ = CString::from_raw(owned.error_ptr);
        }
    }
}

/// Return the linked libheif version as a UTF-8 string. The returned
/// pointer is valid for the lifetime of the WASM instance — it's a
/// `static const char*` in libheif's data segment. JS reads it via
/// `Module.UTF8ToString(ptr)`; no free required.
#[unsafe(no_mangle)]
pub extern "C" fn libheif_bridge_version() -> *const c_char {
    unsafe { heif_get_version() }
}

// ─── Decoding core ────────────────────────────────────────────────────

fn decode_inner(input_ptr: *const u8, input_len: usize) -> Result<(c_int, c_int, Vec<u8>), String> {
    if input_ptr.is_null() || input_len == 0 {
        return Err("decode: empty input".into());
    }

    let ctx = HeifContextGuard::new()?;
    let err = unsafe {
        heif_context_read_from_memory_without_copy(
            ctx.0,
            input_ptr as *const c_void,
            input_len,
            std::ptr::null(),
        )
    };
    check_error(err, "read_from_memory")?;

    let mut handle_raw: *mut heif_image_handle = std::ptr::null_mut();
    let err = unsafe { heif_context_get_primary_image_handle(ctx.0, &mut handle_raw) };
    check_error(err, "get_primary_image_handle")?;
    let handle = ImageHandleGuard(handle_raw);

    let mut img_raw: *mut heif_image = std::ptr::null_mut();
    let err = unsafe {
        heif_decode_image(
            handle.0,
            &mut img_raw,
            HEIF_COLORSPACE_RGB,
            HEIF_CHROMA_INTERLEAVED_RGBA,
            std::ptr::null(),
        )
    };
    check_error(err, "decode_image")?;
    let img = ImageGuard(img_raw);

    let width = unsafe { heif_image_get_width(img.0, HEIF_CHANNEL_INTERLEAVED) };
    let height = unsafe { heif_image_get_height(img.0, HEIF_CHANNEL_INTERLEAVED) };
    if width <= 0 || height <= 0 {
        return Err("decode: image reports non-positive dimensions".into());
    }

    let mut stride: c_int = 0;
    let src =
        unsafe { heif_image_get_plane_readonly(img.0, HEIF_CHANNEL_INTERLEAVED, &mut stride) };
    if src.is_null() {
        return Err("decode: heif_image_get_plane_readonly returned null".into());
    }

    // libheif aligns rows — `stride` may be > width*4. Pack into a
    // tightly-laid-out buffer so the JS side doesn't have to know.
    let row_bytes = (width as usize) * 4;
    let total = row_bytes * (height as usize);
    let mut packed = Vec::<u8>::with_capacity(total);
    // SAFETY: `src` points to at least `stride * height` bytes per the
    // libheif contract; we only read `row_bytes` of each row, so even
    // when stride > row_bytes we stay within bounds. The destination
    // `packed.spare_capacity_mut()` is uninitialized but we write into
    // it before calling `set_len`.
    unsafe {
        let dst = packed.as_mut_ptr();
        for y in 0..(height as usize) {
            let src_row = src.add(y * stride as usize);
            let dst_row = dst.add(y * row_bytes);
            std::ptr::copy_nonoverlapping(src_row, dst_row, row_bytes);
        }
        packed.set_len(total);
    }

    Ok((width, height, packed))
}
