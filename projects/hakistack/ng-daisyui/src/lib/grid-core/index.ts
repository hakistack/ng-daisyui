/**
 * grid-core — framework-level data logic shared by `hk-table` and (upcoming) `hk-datagrid`.
 *
 * Everything here is render-agnostic: state controllers (sort, filter, paginate, select,
 * search, group, tree, footer, column UI), the WASM table-engine bridge, aggregates,
 * data helpers and the shared types. It must never import from `components/` — the
 * dependency only points the other way (enforced in eslint.config.mjs).
 *
 * Internal barrel: not re-exported wholesale from public-api.ts. The engine bridge is
 * reached via `./engine` because its type names (e.g. `SortDirection`) overlap with
 * the grid types below.
 */
export * from './grid.types';
export * from './grid.helpers';
export * from './grid-aggregates';
export * from './grid-predicates';

export { ColumnUiController, type ColumnUiControllerDeps } from './controllers/column-ui.controller';
export { FilterController, type FilterControllerDeps } from './controllers/filter.controller';
export { FooterController, type FooterControllerDeps } from './controllers/footer.controller';
export { GlobalSearchController, type GlobalSearchControllerDeps, type IndexedView } from './controllers/global-search.controller';
export { GroupController, type GroupControllerDeps } from './controllers/group.controller';
export { PaginationController, type PaginationControllerDeps, type PaginationState } from './controllers/pagination.controller';
export { SelectionController, type CheckboxCascadeMode, type SelectionControllerDeps } from './controllers/selection.controller';
export { SortController, type SortControllerDeps, type SortState } from './controllers/sort.controller';
export { TreeController, type TreeControllerDeps } from './controllers/tree.controller';
