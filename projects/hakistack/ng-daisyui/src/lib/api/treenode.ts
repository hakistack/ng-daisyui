/**
 * TreeNode interface for hierarchical data structures.
 * Used by Tree, TreeTable, and other tree-based components.
 * Compatible with PrimeNG TreeNode structure.
 */
export interface TreeNode<T = unknown> {
  // ============================================================================
  // Core Properties
  // ============================================================================

  /** Display label for the node */
  label?: string;

  /** Generic data payload */
  data?: T;

  /** Unique identifier (recommended for proper tracking) */
  key?: string;

  /** Node type for template matching */
  type?: string;

  // ============================================================================
  // Hierarchy
  // ============================================================================

  /** Child nodes array */
  children?: TreeNode<T>[];

  /** Reference to parent node */
  parent?: TreeNode<T>;

  /** Indicates this is a leaf node with no children (useful for lazy loading) */
  leaf?: boolean;

  // ============================================================================
  // State
  // ============================================================================

  /** Whether the node is expanded (showing children) - default: false */
  expanded?: boolean;

  /** Selection checkbox state */
  checked?: boolean;

  /** Partial selection indicator (some children selected) */
  partialSelected?: boolean;

  /** Loading state for lazy loading */
  loading?: boolean;

  // ============================================================================
  // Visual
  // ============================================================================

  /** Display icon */
  icon?: string;

  /** Icon when node is expanded */
  expandedIcon?: string;

  /** Icon when node is collapsed */
  collapsedIcon?: string;

  /** Inline styles */
  style?: Record<string, string>;

  /** CSS classes for styling specific nodes */
  styleClass?: string;

  // ============================================================================
  // Interaction
  // ============================================================================

  /** Whether the node can be selected - default: true */
  selectable?: boolean;

  /** Whether the node can be dragged */
  draggable?: boolean;

  /** Whether the node can receive drops */
  droppable?: boolean;
}

/**
 * Event emitted when a tree node is selected
 */
export interface TreeNodeSelectEvent<T = unknown> {
  /** The original DOM event */
  originalEvent: Event;
  /** The selected node */
  node: TreeNode<T>;
}

/**
 * Event emitted when a tree node is unselected
 */
export interface TreeNodeUnselectEvent<T = unknown> {
  /** The original DOM event */
  originalEvent: Event;
  /** The unselected node */
  node: TreeNode<T>;
}

/**
 * Event emitted when a tree node is expanded
 */
export interface TreeNodeExpandEvent<T = unknown> {
  /** The original DOM event */
  originalEvent: Event;
  /** The expanded node */
  node: TreeNode<T>;
}

/**
 * Event emitted when a tree node is collapsed
 */
export interface TreeNodeCollapseEvent<T = unknown> {
  /** The original DOM event */
  originalEvent: Event;
  /** The collapsed node */
  node: TreeNode<T>;
}

/**
 * Event emitted when a tree node starts being dragged
 */
export interface TreeNodeDragStartEvent<T = unknown> {
  /** The original drag event */
  originalEvent: DragEvent;
  /** The node being dragged */
  node: TreeNode<T>;
}

/**
 * Event emitted when a tree node is dragged and dropped (`hk-tree` `nodeDrop`).
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
  /** Drop position relative to `dropNode` */
  dropPosition: 'before' | 'after' | 'inside';
  /** Original index of the dragged node among its siblings */
  dragNodeIndex: number;
  /** Index among the new siblings after the drop */
  dropIndex: number;
}

/**
 * Event emitted when a tree node drag ends
 */
export interface TreeNodeDragEndEvent<T = unknown> {
  /** The original drag event */
  originalEvent: DragEvent;
  /** The node that was dragged */
  node: TreeNode<T>;
}

/** Selection mode for tree-based components */
export type TreeSelectionMode = 'single' | 'multiple' | 'checkbox' | null;
