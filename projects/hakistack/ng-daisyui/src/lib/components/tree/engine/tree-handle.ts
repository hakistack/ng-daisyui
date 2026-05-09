/**
 * Thin wrapper over the WASM `WasmTree` handle.
 *
 * Translates between the engine's compact wire formats (packed `Uint32Array`s)
 * and the friendlier object shapes a TS consumer wants. The original tree
 * remains in the caller's JS heap by reference; the engine only ever sees
 * the flat (labels, depths) representation produced at ingest.
 */

import type { TreeCascadeEntry, TreeFilterSpec, TreeFlatRow, TreeNodeState } from './tree-engine.types';

/**
 * Minimal shape of the wasm-pack-generated `WasmTree`. Declared inline so the
 * library's `.d.ts` build doesn't depend on the WASM bundle resolving at
 * compile time.
 */
export interface WasmTree {
  free(): void;
  n_nodes(): number;
  filter(spec: unknown): Uint32Array;
  flatten(visible: Uint32Array, expanded: Uint32Array): Uint32Array;
  select_descendants(root: number): Uint32Array;
  cascade_up(selected: Uint32Array, changed: number): Uint32Array;
  is_descendant(root: number, candidate: number): boolean;
}

const NODE_STATE: TreeNodeState[] = ['clear', 'selected', 'indeterminate'];

export class TreeHandle {
  private constructor(private readonly wasm: WasmTree) {}

  /** @internal — use `TreeEngineService.createTree` */
  static _create(wasm: WasmTree): TreeHandle {
    return new TreeHandle(wasm);
  }

  get nodeCount(): number {
    return this.wasm.n_nodes();
  }

  /** Returns visible-node indices in source order. */
  filter(spec: TreeFilterSpec): Uint32Array {
    return this.wasm.filter({
      term: spec.term,
      mode: spec.mode,
      caseSensitive: spec.caseSensitive ?? false,
    });
  }

  /**
   * Walk the tree and emit one row per visible node whose ancestors are all
   * expanded. `visible` and `expanded` are arrays of node indices.
   */
  flatten(visible: Uint32Array, expanded: Uint32Array): TreeFlatRow[] {
    const packed = this.wasm.flatten(visible, expanded);
    // packed = (node, depth, has_children) triples
    const out: TreeFlatRow[] = [];
    for (let i = 0; i < packed.length; i += 3) {
      out.push({
        node: packed[i],
        depth: packed[i + 1],
        hasChildren: packed[i + 2] === 1,
      });
    }
    return out;
  }

  /** DFS-preorder list of every descendant of `root`, including `root`. */
  selectDescendants(root: number): Uint32Array {
    return this.wasm.select_descendants(root);
  }

  /**
   * Walk parents of `changed` and recompute each ancestor's checkbox tri-state
   * given `selected`. Returns the chain of `(ancestor, state)` pairs.
   */
  cascadeUp(selected: Uint32Array, changed: number): TreeCascadeEntry[] {
    const packed = this.wasm.cascade_up(selected, changed);
    const out: TreeCascadeEntry[] = [];
    for (let i = 0; i < packed.length; i += 2) {
      out.push({
        node: packed[i],
        state: NODE_STATE[packed[i + 1]] ?? 'clear',
      });
    }
    return out;
  }

  /** O(1) descendant test using the arena's pre-computed Euler-tour intervals. */
  isDescendant(root: number, candidate: number): boolean {
    return this.wasm.is_descendant(root, candidate);
  }

  /** Free the underlying WASM-heap memory. Call on component teardown. */
  dispose(): void {
    this.wasm.free();
  }
}
