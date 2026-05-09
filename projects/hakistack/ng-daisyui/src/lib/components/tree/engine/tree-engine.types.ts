/**
 * TypeScript surface for the tree engine. Mirrors `tree-engine` Rust kernels.
 */

export type TreeFilterMode = 'lenient' | 'strict';

export interface TreeFilterSpec {
  term: string;
  mode: TreeFilterMode;
  /** Default: false (case-insensitive). */
  caseSensitive?: boolean;
}

/** One emitted row from the flatten kernel. */
export interface TreeFlatRow {
  /** Index into the original DFS-preorder ingest sequence. */
  node: number;
  depth: number;
  /** True if the node has at least one *visible* child (after filter). */
  hasChildren: boolean;
}

/** Tri-state for a node in cascade results. */
export type TreeNodeState = 'clear' | 'selected' | 'indeterminate';

export interface TreeCascadeEntry {
  node: number;
  state: TreeNodeState;
}
