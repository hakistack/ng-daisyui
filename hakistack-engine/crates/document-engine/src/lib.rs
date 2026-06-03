//! Document parsing kernels — pure Rust, testable natively.
//!
//! Phase 1 ships spreadsheet parsing via [`calamine`]. Later phases will add
//! `.docx` / `.pptx` / legacy office formats here.
//!
//! ## Design
//!
//! Each format module produces a small, serializable data model (see
//! [`spreadsheet::Workbook`]). The wasm-bindgen umbrella crate
//! (`document-wasm`) takes those models and pushes them across the JS
//! boundary via `serde-wasm-bindgen`. Keeping the parsing logic here as
//! plain Rust means we can `cargo test` it natively — no WASM toolchain
//! required for inner-loop iteration.

pub mod spreadsheet;
