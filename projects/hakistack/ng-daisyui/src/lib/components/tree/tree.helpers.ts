import { TreeNode } from '../../api/treenode';
import { generateUniqueId } from '../../utils/generate-uuid';
import { BuildTreeOptions, CreateTreeInput, FromDataOptions, TreeConfig, TreeSetup } from './tree.types';

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

function generateKey(): string {
  return `tree-node-${generateUniqueId()}`;
}

// ---------------------------------------------------------------------------
// createTree — all-in-one builder
// ---------------------------------------------------------------------------

/**
 * All-in-one tree builder. Combines nodes + configuration into a `TreeSetup`
 * that can be passed directly to `<hk-tree>`.
 *
 * ```ts
 * const tree = createTree({
 *   nodes: [node.folder('src', [...])],
 *   filterable: true,
 *   showLines: true,
 * });
 *
 * // Template
 * <hk-tree [tree]="tree" />
 * ```
 */
export function createTree<T = unknown>(input: CreateTreeInput<T>): TreeSetup<T> {
  const { nodes, ...rest } = input;

  const config: TreeConfig<T> = {
    selectionMode: rest.selectionMode ?? null,
    dragDrop: rest.dragDrop ?? false,
    dragDropSameLevel: rest.dragDropSameLevel ?? false,
    filterable: rest.filterable ?? false,
    filterMode: rest.filterMode ?? 'lenient',
    filterPlaceholder: rest.filterPlaceholder ?? 'Search...',
    showLines: rest.showLines ?? false,
    indentSize: rest.indentSize ?? 24,
    virtualScroll: rest.virtualScroll ?? false,
    virtualScrollItemHeight: rest.virtualScrollItemHeight ?? 36,
    propagateSelectionDown: rest.propagateSelectionDown ?? true,
    propagateSelectionUp: rest.propagateSelectionUp ?? true,
    selectionAllowParents: rest.selectionAllowParents ?? true,
    expandAll: rest.expandAll ?? false,
    loading: rest.loading ?? false,
    emptyMessage: rest.emptyMessage ?? 'No data available',
    keyboardNavigation: rest.keyboardNavigation ?? true,
    ariaLabel: rest.ariaLabel,
    ariaLabelledBy: rest.ariaLabelledBy,
    nodeTemplate: rest.nodeTemplate,
  };

  ensureKeys(nodes);

  return { config, nodes };
}

// ---------------------------------------------------------------------------
// node namespace — node builders
// ---------------------------------------------------------------------------

/**
 * Node builder namespace. Provides convenient factory functions for creating
 * `TreeNode` objects with sensible defaults.
 *
 * ```ts
 * node.folder('Documents', [
 *   node.file('Resume.pdf', { icon: 'FileText' }),
 *   node.lazy('Archives'),
 * ]);
 * ```
 */
export const node = {
  /**
   * Create a generic tree node.
   */
  create<T = unknown>(label: string, opts?: Partial<TreeNode<T>>): TreeNode<T> {
    return {
      key: generateKey(),
      ...opts,
      label,
    };
  },

  /**
   * Create a folder node (expandable, has children).
   * Automatically sets `icon: 'Folder'` and `expandedIcon: 'FolderOpen'` unless overridden.
   */
  folder<T = unknown>(label: string, children: TreeNode<T>[], opts?: Partial<TreeNode<T>>): TreeNode<T> {
    return {
      key: generateKey(),
      icon: 'Folder',
      expandedIcon: 'FolderOpen',
      ...opts,
      label,
      children,
    };
  },

  /**
   * Create a leaf/file node (no children).
   */
  file<T = unknown>(label: string, opts?: Partial<TreeNode<T>>): TreeNode<T> {
    return {
      key: generateKey(),
      leaf: true,
      ...opts,
      label,
    };
  },

  /**
   * Create a lazy-loading node. Sets `leaf: false` with no children so the tree
   * component will fire a `lazyLoad` event when the user expands it.
   */
  lazy<T = unknown>(label: string, opts?: Partial<TreeNode<T>>): TreeNode<T> {
    return {
      key: generateKey(),
      icon: 'Folder',
      expandedIcon: 'FolderOpen',
      ...opts,
      label,
      leaf: false,
      children: undefined,
    };
  },

  /**
   * Build `TreeNode[]` from a plain data array. Useful for converting API
   * responses or domain objects into tree nodes.
   *
   * ```ts
   * const nodes = node.fromData(departments, {
   *   labelFn: (d) => d.name,
   *   childrenFn: (d) => d.subDepartments,
   *   iconFn: (d) => d.icon,
   * });
   * ```
   */
  fromData<T>(items: T[], opts: FromDataOptions<T>): TreeNode<T>[] {
    const convert = (list: T[]): TreeNode<T>[] =>
      list.map((item) => {
        const children = opts.childrenFn?.(item);
        const n: TreeNode<T> = {
          key: opts.keyFn?.(item) ?? generateKey(),
          label: opts.labelFn(item),
          icon: opts.iconFn?.(item),
          data: item,
          children: children?.length ? convert(children) : undefined,
          leaf: !children?.length,
        };
        return n;
      });
    return convert(items);
  },
};

// ---------------------------------------------------------------------------
// Tree utility functions
// ---------------------------------------------------------------------------

/**
 * Depth-first walk over all nodes. The callback can return `false` to stop traversal.
 */
export function walkTree<T>(nodes: TreeNode<T>[], callback: (node: TreeNode<T>, parent: TreeNode<T> | null) => boolean | void): void {
  const walk = (list: TreeNode<T>[], parent: TreeNode<T> | null): boolean => {
    for (const n of list) {
      if (callback(n, parent) === false) return false;
      if (n.children?.length && walk(n.children, n) === false) return false;
    }
    return true;
  };
  walk(nodes, null);
}

/**
 * Find the first node matching a predicate (DFS).
 */
export function findNode<T>(nodes: TreeNode<T>[], predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | undefined {
  let found: TreeNode<T> | undefined;
  walkTree(nodes, (n) => {
    if (predicate(n)) {
      found = n;
      return false;
    }
    return undefined;
  });
  return found;
}

/**
 * Return the ancestor path (from root) to the first node matching the predicate.
 * Returns `undefined` if not found.
 */
export function findNodePath<T>(nodes: TreeNode<T>[], predicate: (node: TreeNode<T>) => boolean): TreeNode<T>[] | undefined {
  const search = (list: TreeNode<T>[]): TreeNode<T>[] | undefined => {
    for (const n of list) {
      if (predicate(n)) return [n];
      if (n.children?.length) {
        const childPath = search(n.children);
        if (childPath) return [n, ...childPath];
      }
    }
    return undefined;
  };
  return search(nodes);
}

/**
 * Transform every node in the tree, returning a new tree.
 * The callback receives the original node and should return a new node.
 * Children are mapped recursively before being passed to the callback.
 */
export function mapTree<T>(nodes: TreeNode<T>[], fn: (node: TreeNode<T>) => TreeNode<T>): TreeNode<T>[] {
  return nodes.map((n) => {
    const mapped = fn({
      ...n,
      children: n.children?.length ? mapTree(n.children, fn) : n.children,
    });
    return mapped;
  });
}

/**
 * Keep only nodes matching the predicate. Ancestors of matching nodes are
 * preserved so the tree structure stays intact.
 */
export function filterTree<T>(nodes: TreeNode<T>[], predicate: (node: TreeNode<T>) => boolean): TreeNode<T>[] {
  const result: TreeNode<T>[] = [];
  for (const n of nodes) {
    const filteredChildren = n.children?.length ? filterTree(n.children, predicate) : [];
    if (predicate(n) || filteredChildren.length > 0) {
      result.push({
        ...n,
        children: filteredChildren.length > 0 ? filteredChildren : n.children?.length ? [] : undefined,
      });
    }
  }
  return result;
}

/**
 * Flatten the tree to a single array in DFS order.
 */
export function flattenTree<T>(nodes: TreeNode<T>[]): TreeNode<T>[] {
  const result: TreeNode<T>[] = [];
  walkTree(nodes, (n) => {
    result.push(n);
  });
  return result;
}

/**
 * Count total nodes in the tree recursively.
 */
export function countNodes<T>(nodes: TreeNode<T>[]): number {
  let count = 0;
  walkTree(nodes, () => {
    count++;
  });
  return count;
}

/**
 * Assign unique keys to any nodes that don't already have one (mutates in place).
 */
export function ensureKeys<T>(nodes: TreeNode<T>[], prefix?: string): void {
  walkTree(nodes, (n) => {
    if (!n.key) {
      n.key = prefix ? `${prefix}-${generateKey()}` : generateKey();
    }
  });
}

/**
 * Convert a flat list with parent IDs into a `TreeNode[]` tree.
 *
 * ```ts
 * const tree = buildTree(employees, {
 *   idFn: (e) => e.id,
 *   parentIdFn: (e) => e.managerId,
 *   labelFn: (e) => e.name,
 * });
 * ```
 */
export function buildTree<T>(items: T[], opts: BuildTreeOptions<T>): TreeNode<T>[] {
  const nodeMap = new Map<string, TreeNode<T>>();
  const roots: TreeNode<T>[] = [];

  // First pass: create all nodes
  for (const item of items) {
    const id = opts.idFn(item);
    nodeMap.set(id, {
      key: id,
      label: opts.labelFn(item),
      icon: opts.iconFn?.(item),
      data: item,
      children: [],
    });
  }

  // Second pass: link parents
  for (const item of items) {
    const id = opts.idFn(item);
    const parentId = opts.parentIdFn(item);
    const treeNode = nodeMap.get(id)!;

    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)!.children!.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  // Clean up empty children arrays → mark as leaf
  walkTree(roots, (n) => {
    if (n.children && n.children.length === 0) {
      n.children = undefined;
      n.leaf = true;
    }
  });

  return roots;
}
