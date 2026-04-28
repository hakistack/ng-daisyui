import { TemplateRef } from '@angular/core';
import { TreeNode, TreeSelectionMode } from '../../api/treenode';

/**
 * Configuration for `<hk-tree>`. Pass via the `config` input, or use the
 * `createTree({ ...config, nodes })` builder which returns a `TreeInstance`
 * with imperative APIs.
 *
 * **Selection** — set `selectionMode` to `'single' | 'multiple' | 'checkbox'`.
 * In `'checkbox'` mode, `propagateSelectionDown`/`propagateSelectionUp` enable
 * three-state checkboxes (children follow parent, parent reflects children).
 * Set `selectionAllowParents: false` to restrict selection to leaf nodes only.
 *
 * **Filtering** — `filterable: true` renders a search input. `filterMode: 'lenient'`
 * (default) keeps ancestors of matched nodes visible so context is preserved;
 * `'strict'` hides everything that doesn't match.
 *
 * **Virtual scrolling** — for large trees (>500 nodes), enable `virtualScroll: true`
 * **and** set `virtualScrollItemHeight` (required, no default — measure your row).
 * Compatible with filtering and drag-drop.
 *
 * **Drag & drop** — `dragDrop: true` enables reordering. Restrict to within-parent
 * moves with `dragDropSameLevel: true` (e.g. preserve a folder hierarchy while
 * letting users sort siblings).
 *
 * @example Selection-only tree
 * config = {
 *   selectionMode: 'single',
 *   keyboardNavigation: true,
 *   ariaLabel: 'File browser',
 * };
 *
 * @example Checkbox tree with cascade selection
 * config = {
 *   selectionMode: 'checkbox',
 *   propagateSelectionDown: true,
 *   propagateSelectionUp: true,
 *   selectionAllowParents: true,
 * };
 *
 * @example Large filterable tree with drag-drop
 * config = {
 *   filterable: true,
 *   filterMode: 'lenient',
 *   dragDrop: true,
 *   dragDropSameLevel: true,
 *   virtualScroll: true,
 *   virtualScrollItemHeight: 32,
 *   showLines: true,
 *   indentSize: 20,
 * };
 */
export interface TreeConfig<T = unknown> {
  /** Selection mode: 'single', 'multiple', 'checkbox', or null (no selection) */
  selectionMode?: TreeSelectionMode;

  /** Enable drag and drop for reordering nodes */
  dragDrop?: boolean;

  /** Only allow dragging within the same parent (no cross-level moves) */
  dragDropSameLevel?: boolean;

  /** Enable filtering/search */
  filterable?: boolean;

  /** Filter mode: 'lenient' shows ancestors of matches, 'strict' hides non-matches */
  filterMode?: 'lenient' | 'strict';

  /** Placeholder text for filter input */
  filterPlaceholder?: string;

  /** Show lines connecting nodes */
  showLines?: boolean;

  /** Indentation size in pixels per level (default: 24) */
  indentSize?: number;

  /** Enable virtual scrolling for large trees */
  virtualScroll?: boolean;

  /** Virtual scroll item height (required if virtualScroll enabled) */
  virtualScrollItemHeight?: number;

  /** Propagate selection to children (checkbox mode) */
  propagateSelectionDown?: boolean;

  /** Propagate selection to parent (checkbox mode) */
  propagateSelectionUp?: boolean;

  /** Allow selecting parent nodes (or only leaf nodes) */
  selectionAllowParents?: boolean;

  /** Custom node template */
  nodeTemplate?: TemplateRef<TreeNodeTemplateContext<T>>;

  /** Expand all nodes on init */
  expandAll?: boolean;

  /** Loading indicator for the entire tree */
  loading?: boolean;

  /** Empty message when no nodes */
  emptyMessage?: string;

  /** Enable keyboard navigation */
  keyboardNavigation?: boolean;

  /** ARIA label for accessibility */
  ariaLabel?: string;

  /** ARIA labelledby for accessibility */
  ariaLabelledBy?: string;

  /** Text overrides for the tree's control UI (filter + toggle aria-labels). */
  labels?: TreeLabels;
}

/**
 * Text overrides for `<hk-tree>` UI controls. Any field undefined falls back
 * to the English default. (Node labels come from the tree data itself, not from here.)
 */
export interface TreeLabels {
  /** aria-label for the "clear filter" button. Default: "Clear filter" */
  clearFilterAriaLabel?: string;
  /** aria-label for the "expand node" toggle. Default: "Expand" */
  expandAriaLabel?: string;
  /** aria-label for the "collapse node" toggle. Default: "Collapse" */
  collapseAriaLabel?: string;
}

/**
 * Context passed to custom node templates
 */
export interface TreeNodeTemplateContext<T = unknown> {
  /** The node data */
  $implicit: TreeNode<T>;
  /** The node data (alias) */
  node: TreeNode<T>;
  /** Nesting level (0 = root) */
  level: number;
  /** Whether the node is expanded */
  expanded: boolean;
  /** Whether the node is selected */
  selected: boolean;
  /** Whether the node is partially selected (checkbox mode) */
  partialSelected: boolean;
  /** Whether the node is the first child */
  first: boolean;
  /** Whether the node is the last child */
  last: boolean;
  /** Index within siblings */
  index: number;
}

/**
 * Event emitted when a node is selected
 */
export interface TreeNodeSelectEvent<T = unknown> {
  /** The original DOM event */
  originalEvent: Event;
  /** The selected node */
  node: TreeNode<T>;
}

/**
 * Event emitted when a node is unselected
 */
export interface TreeNodeUnselectEvent<T = unknown> {
  /** The original DOM event */
  originalEvent: Event;
  /** The unselected node */
  node: TreeNode<T>;
}

/**
 * Event emitted when a node is expanded
 */
export interface TreeNodeExpandEvent<T = unknown> {
  /** The original DOM event */
  originalEvent: Event;
  /** The expanded node */
  node: TreeNode<T>;
}

/**
 * Event emitted when a node is collapsed
 */
export interface TreeNodeCollapseEvent<T = unknown> {
  /** The original DOM event */
  originalEvent: Event;
  /** The collapsed node */
  node: TreeNode<T>;
}

/**
 * Event emitted when nodes are reordered via drag and drop
 */
export interface TreeNodeDropEvent<T = unknown> {
  /** The original drag event */
  originalEvent: DragEvent;
  /** The node being dragged */
  dragNode: TreeNode<T>;
  /** The target node (drop location) */
  dropNode: TreeNode<T> | null;
  /** Original parent of the dragged node */
  dragNodeParent: TreeNode<T> | null;
  /** New parent of the dragged node */
  dropNodeParent: TreeNode<T> | null;
  /** Drop position: 'before', 'after', or 'inside' */
  dropPosition: 'before' | 'after' | 'inside';
  /** Original index of the dragged node */
  dragNodeIndex: number;
  /** New index after drop */
  dropIndex: number;
}

/**
 * Event emitted when drag starts
 */
export interface TreeNodeDragStartEvent<T = unknown> {
  /** The original drag event */
  originalEvent: DragEvent;
  /** The node being dragged */
  node: TreeNode<T>;
}

/**
 * Event emitted when drag ends
 */
export interface TreeNodeDragEndEvent<T = unknown> {
  /** The original drag event */
  originalEvent: DragEvent;
  /** The node that was dragged */
  node: TreeNode<T>;
}

/**
 * Event emitted for lazy loading when a node is expanded
 */
export interface TreeLazyLoadEvent<T = unknown> {
  /** The original DOM event */
  originalEvent: Event;
  /** The node being expanded (needs children loaded) */
  node: TreeNode<T>;
}

/**
 * Event emitted when filter value changes
 */
export interface TreeFilterEvent {
  /** The filter value */
  filter: string;
  /** Nodes that match the filter */
  matchedNodeCount: number;
}

/** All-in-one input for createTree — nodes + config combined */
export interface CreateTreeInput<T = unknown> extends TreeConfig<T> {
  /** Tree nodes data */
  nodes: TreeNode<T>[];
}

/** Return value from createTree */
export interface TreeSetup<T = unknown> {
  /** Normalized config (without nodes) */
  config: TreeConfig<T>;
  /** The tree nodes */
  nodes: TreeNode<T>[];
}

/**
 * Options for building a tree from a flat data array using node.fromData
 */
export interface FromDataOptions<T> {
  /** Extract label from item */
  labelFn: (item: T) => string;
  /** Extract unique key from item (optional, auto-generated if omitted) */
  keyFn?: (item: T) => string;
  /** Extract children array from item (for nested source data) */
  childrenFn?: (item: T) => T[] | undefined;
  /** Extract icon name from item */
  iconFn?: (item: T) => string | undefined;
}

/**
 * Options for building a tree from a flat list with parent IDs
 */
export interface BuildTreeOptions<T> {
  /** Extract unique ID from item */
  idFn: (item: T) => string;
  /** Extract parent ID from item (null/undefined for root items) */
  parentIdFn: (item: T) => string | null | undefined;
  /** Extract label from item */
  labelFn: (item: T) => string;
  /** Extract icon from item */
  iconFn?: (item: T) => string | undefined;
}

/**
 * Internal type for tracking node state.
 *
 * Transient states that change on every interaction — drag, drop, focus — are
 * intentionally NOT stored here. Keeping them out lets the flatten computation
 * remain stable during drag operations, and they are queried per-row in the
 * template via `isDragging()`, `isDropTarget()`, and `isFocused()`.
 */
export interface TreeNodeState {
  /** Whether the node is expanded */
  expanded: boolean;
  /** Whether the node is selected */
  selected: boolean;
  /** Whether the node is partially selected */
  partialSelected: boolean;
  /** Whether the node is visible (not filtered out) */
  visible: boolean;
  /** Whether the node is loading children */
  loading: boolean;
}

/**
 * Flattened node for rendering (includes hierarchy info)
 */
export interface FlatTreeNode<T = unknown> {
  /** The tree node data */
  node: TreeNode<T>;
  /** Nesting level (0 = root) */
  level: number;
  /** Parent node (null for root nodes) */
  parent: TreeNode<T> | null;
  /** Whether this is the first sibling */
  first: boolean;
  /** Whether this is the last sibling */
  last: boolean;
  /** Index within siblings */
  index: number;
  /** Full path of indices from root */
  path: readonly number[];
  /** Precomputed indent in px for `padding-left` */
  indentPx: number;
  /** Precomputed `children.length > 0 || leaf === false` */
  hasChildren: boolean;
  /** For each ancestor level (0..level), whether that ancestor is last among its siblings */
  ancestorIsLastMask: readonly boolean[];
  /** Node state */
  state: TreeNodeState;
}
