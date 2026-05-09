//! Shared primitives for the hakistack engine crates.
//!
//! This crate has **no** `wasm-bindgen` dependency, so every kernel and helper
//! here can be tested with plain `cargo test -p engine-core` — no WASM toolchain
//! required. Feature crates (`table-engine`, `tree-engine`, `search-engine`)
//! compose these primitives into user-facing kernels; `engine-wasm` is the only
//! crate that exposes them across the JS boundary.

pub mod arena;
pub mod bitset;
pub mod fold;

pub use rustc_hash::{FxHashMap, FxHashSet, FxHasher};

/// Index into a row, node, or item array. The whole engine standardizes on
/// `u32` for these because results cross the WASM boundary as `Uint32Array`.
pub type Idx = u32;
