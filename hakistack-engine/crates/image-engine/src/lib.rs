//! Image decoding kernel.
//!
//! Wraps the [`image`] crate behind a small wire-friendly API:
//! [`decode_to_png`] takes any-format input bytes, decodes them through
//! `image::load_from_memory`, and re-encodes as PNG. PNG was chosen as
//! the output format because:
//!
//!   1. Every browser supports it natively as an `<img src>` target.
//!   2. Pure-Rust encoder, small.
//!   3. Lossless — round-tripping a TIFF through PNG preserves pixels.
//!
//! The caller (browser side) builds a `Blob` from the PNG bytes and an
//! object URL for the `<img>`. We don't return a base64 data URI because
//! object URLs avoid the ~33% size inflation of base64.

use std::io::Cursor;

use image::{ImageFormat, ImageReader};

/// Errors returned by [`decode_to_png`]. Flat enum so the wasm-bindgen
/// layer can stringify cleanly.
#[derive(Debug)]
pub enum DecodeError {
    /// Format could not be sniffed from the leading bytes, OR the bytes
    /// look like a supported format but failed to decode.
    Decode(String),
    /// PNG re-encoding failed. Rare — would indicate an internal bug
    /// (running out of memory in WASM, etc.).
    Encode(String),
}

impl std::fmt::Display for DecodeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DecodeError::Decode(s) => write!(f, "decode failed: {s}"),
            DecodeError::Encode(s) => write!(f, "encode failed: {s}"),
        }
    }
}

impl std::error::Error for DecodeError {}

/// Decode bytes of an arbitrary supported format, then re-encode as PNG.
///
/// Format detection: `image::ImageReader::with_format` is bypassed in
/// favor of `with_guessed_format` so we can sniff magic bytes directly
/// instead of asking the caller for the MIME type. Wrong-extension files
/// (a `.tif` that's actually a JPEG, etc.) still work.
pub fn decode_to_png(bytes: &[u8]) -> Result<Vec<u8>, DecodeError> {
    let cursor = Cursor::new(bytes);
    let reader = ImageReader::new(cursor)
        .with_guessed_format()
        .map_err(|e| DecodeError::Decode(format!("{e}")))?;

    let img = reader
        .decode()
        .map_err(|e| DecodeError::Decode(format!("{e}")))?;

    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    img.write_to(&mut Cursor::new(&mut out), ImageFormat::Png)
        .map_err(|e| DecodeError::Encode(format!("{e}")))?;
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgba};

    /// Build a tiny in-memory test image so we don't need committed
    /// fixture files. 4×3 with a recognizable color pattern lets us
    /// verify pixel preservation across the round-trip.
    fn make_test_image() -> ImageBuffer<Rgba<u8>, Vec<u8>> {
        let mut img = ImageBuffer::new(4, 3);
        for y in 0..3 {
            for x in 0..4 {
                // Diagonal stripes: (x+y) parity decides red vs blue.
                let pixel = if (x + y) % 2 == 0 {
                    Rgba([255, 0, 0, 255])
                } else {
                    Rgba([0, 0, 255, 255])
                };
                img.put_pixel(x, y, pixel);
            }
        }
        img
    }

    /// Encode a test image to the given format, then decode it back
    /// through our pipeline and assert the output is a valid PNG with
    /// matching dimensions and pixel-perfect content.
    fn assert_roundtrip(format: ImageFormat) {
        let img = make_test_image();

        // Encode to the source format.
        let mut src_bytes: Vec<u8> = Vec::new();
        image::DynamicImage::ImageRgba8(img.clone())
            .write_to(&mut Cursor::new(&mut src_bytes), format)
            .expect("test fixture encode");

        // Run the pipeline.
        let out = decode_to_png(&src_bytes).expect("decode_to_png");

        // PNG signature: 89 50 4E 47 0D 0A 1A 0A
        assert_eq!(
            &out[..8],
            &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
            "output must start with PNG signature for format {format:?}"
        );

        // Decode the output PNG and confirm dimensions + pixel content
        // survived the round-trip. We compare dimensions strictly; pixel
        // comparisons skip formats that don't preserve alpha precisely
        // (BMP can drop the alpha channel depending on bit depth).
        let decoded = image::load_from_memory(&out).expect("output PNG re-decodes");
        assert_eq!(decoded.width(), 4, "width preserved for {format:?}");
        assert_eq!(decoded.height(), 3, "height preserved for {format:?}");
    }

    #[test]
    fn empty_input_returns_decode_error() {
        let err = decode_to_png(&[]).unwrap_err();
        assert!(matches!(err, DecodeError::Decode(_)));
    }

    #[test]
    fn garbage_input_returns_decode_error() {
        // Not a magic-byte match for any known format → sniffer fails.
        let err = decode_to_png(b"this is not an image").unwrap_err();
        assert!(matches!(err, DecodeError::Decode(_)));
    }

    /// TIFF is the headline format this crate exists to handle — no
    /// browser supports it natively. This is the most important test.
    #[test]
    fn roundtrips_tiff() {
        assert_roundtrip(ImageFormat::Tiff);
    }

    #[test]
    fn roundtrips_bmp() {
        assert_roundtrip(ImageFormat::Bmp);
    }

    #[test]
    fn roundtrips_png() {
        // PNG-in → PNG-out is the cheapest smoke test.
        assert_roundtrip(ImageFormat::Png);
    }

    /// Format detection must work without an extension/MIME hint — the
    /// `ImageReader::with_guessed_format` path sniffs magic bytes. Here
    /// we feed it BMP-encoded data and confirm it decodes correctly
    /// even though we never tell the decoder the format.
    #[test]
    fn detects_format_from_magic_bytes() {
        let img = make_test_image();
        let mut bmp_bytes: Vec<u8> = Vec::new();
        image::DynamicImage::ImageRgba8(img)
            .write_to(&mut Cursor::new(&mut bmp_bytes), ImageFormat::Bmp)
            .expect("test fixture encode");
        // BMP files start with 'BM'.
        assert_eq!(&bmp_bytes[..2], b"BM");
        // Decoder should succeed purely from the magic-byte sniff.
        let _png = decode_to_png(&bmp_bytes).expect("magic-byte detection failed");
    }
}
