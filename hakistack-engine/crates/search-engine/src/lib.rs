//! Search kernels.
//!
//! Two consumers, two modules:
//!
//! - `fuzzy` — bitap / `nucleo-matcher` ranked search for `hk-command-palette`
//!   and `hk-select`. See `command-palette/RUST_ENGINE.md`.
//! - `pdf` — substring + offset-map search across pre-extracted page text for
//!   `hk-pdf-viewer`. See `pdf-viewer/RUST_ENGINE.md`.
//!
//! Both share `engine-core` primitives (string folding, `memmem`, FxHash).

pub mod fuzzy;
pub mod pdf;
