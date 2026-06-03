//! Table data pipeline kernels.
//!
//! See `projects/hakistack/ng-daisyui/src/lib/components/table/RUST_ENGINE.md`
//! for the full design. Module status:
//!
//! - **Phase 2** ✓ `dataset`, `filter`
//! - **Phase 3** ✓ `sort`
//! - **Phase 4** ✓ `aggregate`, `group`, `search` &nbsp;&nbsp; TODO `tree`, `pivot`

pub mod aggregate;
pub mod dataset;
pub mod filter;
pub mod group;
pub mod search;
pub mod sort;

pub use aggregate::{AggFn, AggResult, RowSet, compute as compute_aggregate};
pub use dataset::{
    BoolColumn, Column, ColumnId, Dataset, DatasetBuilder, DateColumn, NumberColumn, TextColumn,
};
pub use filter::{BoolOp, ColumnFilter, DateOp, NumberOp, TextOp, apply as apply_filters};
pub use group::{Group, GroupKey, group_by, group_by_multi};
pub use search::{SearchMode, SearchSpec, apply_search};
pub use sort::{Direction, NullsPosition, SortSpec, sort_from_mask, sort_indices};
