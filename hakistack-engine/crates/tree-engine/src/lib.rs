//! Tree component kernels.
//!
//! See `projects/hakistack/ng-daisyui/src/lib/components/tree/RUST_ENGINE.md`
//! for the full design. The kernels compose `engine_core::arena::TreeArena`
//! and `engine_core::bitset::Bitset` into the four operations the JS tree
//! component needs: filter, flatten, select-descendants, cascade-up.
//!
//! Module status:
//!
//! - **Phase 1** ✓ `dataset`, `filter`, `flatten`, `cascade`
//! - **Phase 2** TODO TS bridge + wire into `<hk-tree>` component

pub mod cascade;
pub mod dataset;
pub mod filter;
pub mod flatten;

pub use cascade::{cascade_up, select_descendants, NodeState};
pub use dataset::TreeDataset;
pub use filter::{filter, FilterMode, FilterSpec};
pub use flatten::{flatten, FlatRow};
