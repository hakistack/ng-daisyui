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

pub use aggregate::{compute as compute_aggregate, AggFn, AggResult, RowSet};
pub use group::{group_by, group_by_multi, Group, GroupKey};
pub use dataset::{
    BoolColumn, Column, ColumnId, DateColumn, Dataset, DatasetBuilder, NumberColumn, TextColumn,
};
pub use filter::{apply as apply_filters, BoolOp, ColumnFilter, DateOp, NumberOp, TextOp};
pub use search::{apply_search, SearchMode, SearchSpec};
pub use sort::{
    sort_from_mask, sort_indices, Direction, NullsPosition, SortSpec,
};
