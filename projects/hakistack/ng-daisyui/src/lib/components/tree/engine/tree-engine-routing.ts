/**
 * Helpers that bridge the JS hierarchical `TreeNode<T>` shape and the engine's
 * flat (labels, depths) ingest format.
 *
 * The engine works on indices into a DFS-preorder array. The TS layer needs
 * extra metadata for rendering (parent pointers, sibling-position flags,
 * ancestor "is last child" masks for connecting lines). We compute every
 * derived value once at ingest and read by index later — same indices the
 * engine returns.
 */

import type { TreeNode } from '../../../api';

/**
 * One ingest produces one of these. All arrays are parallel and indexed by
 * DFS-preorder position. Engine and TS use the same index space.
 */
export interface TreeIndex<T> {
  /** Original node references in DFS order. Engine indices map straight in. */
  readonly nodes: readonly TreeNode<T>[];
  /** Display labels — what the engine filters against. */
  readonly labels: readonly string[];
  /** Node depth (0 = root). Same length as `nodes`. */
  readonly depths: readonly number[];
  /** Stable keys per node (some may be undefined if the user didn't supply one). */
  readonly keys: readonly (string | undefined)[];
  /** Quick lookup string-key → DFS index. */
  readonly keyToIdx: ReadonlyMap<string, number>;
  /** Parent reference per node (null for roots). */
  readonly parents: readonly (TreeNode<T> | null)[];
  /** Position of this node among its siblings (0-based). */
  readonly siblingIndex: readonly number[];
  /** True when this node is the last child of its parent (or last root). */
  readonly isLastSibling: readonly boolean[];
  /** Sibling-index path from the root to this node (length = depth + 1). */
  readonly path: readonly (readonly number[])[];
  /**
   * For each node, the chain of ancestor `isLastSibling` flags from the
   * outermost ancestor down to the node itself. Used by the connecting-line
   * renderer in the template.
   */
  readonly ancestorIsLastMask: readonly (readonly boolean[])[];
  /**
   * Pre-built `[0, 1, …, n-1]` indices array. The engine-routed flatten path
   * passes this whenever no filter is active — saves a per-keystroke /
   * per-expand allocation of a fresh `Uint32Array(n)`.
   */
  readonly allIndices: Uint32Array;
}

/**
 * Build a [`TreeIndex`] from a hierarchical node list. Single DFS walk.
 *
 * Roots that don't have a `key` field still appear in the index — they just
 * don't show up in `keyToIdx`. The engine doesn't care about keys; only the
 * TS layer needs them for round-tripping with the existing `expandedKeys`
 * `Set<string>`.
 */
export function buildTreeIndex<T>(roots: readonly TreeNode<T>[]): TreeIndex<T> {
  const nodes: TreeNode<T>[] = [];
  const labels: string[] = [];
  const depths: number[] = [];
  const keys: (string | undefined)[] = [];
  const parents: (TreeNode<T> | null)[] = [];
  const siblingIndex: number[] = [];
  const isLastSibling: boolean[] = [];
  const path: number[][] = [];
  const ancestorIsLastMask: boolean[][] = [];
  const keyToIdx = new Map<string, number>();

  const walk = (
    list: readonly TreeNode<T>[],
    parent: TreeNode<T> | null,
    depth: number,
    parentPath: readonly number[],
    parentMask: readonly boolean[],
  ): void => {
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      const isLast = i === list.length - 1;
      const myPath = [...parentPath, i];
      const myMask = [...parentMask, isLast];

      const idx = nodes.length;
      nodes.push(n);
      labels.push(n.label ?? '');
      depths.push(depth);
      keys.push(n.key);
      parents.push(parent);
      siblingIndex.push(i);
      isLastSibling.push(isLast);
      path.push(myPath);
      ancestorIsLastMask.push(myMask);
      if (n.key) keyToIdx.set(n.key, idx);

      if (n.children?.length) {
        walk(n.children, n, depth + 1, myPath, myMask);
      }
    }
  };
  walk(roots, null, 0, [], []);

  const allIndices = new Uint32Array(nodes.length);
  for (let i = 0; i < nodes.length; i++) allIndices[i] = i;

  return {
    nodes,
    labels,
    depths,
    keys,
    keyToIdx,
    parents,
    siblingIndex,
    isLastSibling,
    path,
    ancestorIsLastMask,
    allIndices,
  };
}

/**
 * Convert a `Set<string>` of node keys to a `Uint32Array` of arena indices.
 * Used to translate `expandedKeys` / `selectedKeys` for the engine.
 */
export function keysToIndices(keys: ReadonlySet<string>, keyToIdx: ReadonlyMap<string, number>): Uint32Array {
  const out = new Uint32Array(keys.size);
  let i = 0;
  for (const k of keys) {
    const idx = keyToIdx.get(k);
    if (idx !== undefined) {
      out[i++] = idx;
    }
  }
  // Trim if any key wasn't in the index (stale key from a previous tree).
  return i === keys.size ? out : out.slice(0, i);
}

/** Convert engine indices to a `Set<string>` of keys. Skips nodes without keys. */
export function indicesToKeys(indices: Uint32Array, keys: readonly (string | undefined)[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < indices.length; i++) {
    const k = keys[indices[i]];
    if (k !== undefined) out.add(k);
  }
  return out;
}
