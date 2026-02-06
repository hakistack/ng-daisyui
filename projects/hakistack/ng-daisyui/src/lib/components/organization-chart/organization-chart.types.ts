import type { TreeNode, TreeSelectionMode } from '../../api/treenode';

// Re-export TreeNode for convenience
export type { TreeNode };

/** Selection mode for the organization chart */
export type OrgChartSelectionMode = TreeSelectionMode;

/** Event emitted when a node is selected */
export interface OrgChartNodeSelectEvent<T = unknown> {
  /** The original DOM event */
  originalEvent: Event;
  /** The selected node */
  node: TreeNode<T>;
}

/** Event emitted when a node is unselected */
export interface OrgChartNodeUnselectEvent<T = unknown> {
  /** The original DOM event */
  originalEvent: Event;
  /** The unselected node */
  node: TreeNode<T>;
}

/** Event emitted when a node is expanded */
export interface OrgChartNodeExpandEvent<T = unknown> {
  /** The original DOM event */
  originalEvent: Event;
  /** The expanded node */
  node: TreeNode<T>;
}

/** Event emitted when a node is collapsed */
export interface OrgChartNodeCollapseEvent<T = unknown> {
  /** The original DOM event */
  originalEvent: Event;
  /** The collapsed node */
  node: TreeNode<T>;
}

/** Available color themes for nodes */
export type OrgChartNodeColor = 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error';

/** Chart orientation */
export type OrgChartOrientation = 'vertical' | 'horizontal';

/** Node template context for custom rendering */
export interface OrgChartNodeTemplateContext<T = unknown> {
  /** The node data */
  $implicit: TreeNode<T>;
  /** The node (alias) */
  node: TreeNode<T>;
  /** Whether the node is selected */
  selected: boolean;
  /** Whether the node is expanded */
  expanded: boolean;
  /** Depth level of the node (0 for root) */
  level: number;
  /** Toggle expand/collapse */
  toggle: () => void;
  /** Select the node */
  select: (event: Event) => void;
}
