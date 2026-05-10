/**
 * Lazy-loaded gateway to the WASM tree engine.
 *
 * Shares the same engine module with table / fuzzy / pdf-search via the
 * shared `loadEngineModule()` — Angular reuses the loaded module across
 * services, so the second service to ask just picks up the already-
 * initialized exports.
 */

import { Injectable, inject, signal } from '@angular/core';

import { HK_TABLE_ENGINE_WASM_URL } from '../../table/engine';
import { loadEngineModule } from '../../../utils/engine-loader';
import { TreeHandle, type WasmTree } from './tree-handle';

/** Subset of the wasm-bindgen module the tree engine consumes. */
interface TreeEngineExports {
  WasmTree: {
    ingest(labels: string[], depths: Uint8Array | number[]): WasmTree;
  };
}

@Injectable({ providedIn: 'root' })
export class TreeEngineService {
  private readonly wasmUrl = inject(HK_TABLE_ENGINE_WASM_URL);

  /** True once the WASM module has been loaded and initialized. */
  readonly ready = signal(false);

  /**
   * Build a TreeHandle from a flat DFS-preorder representation.
   *
   * `labels[i]` is the i-th node's display label; `depths[i]` is its depth
   * (0 = root). The JS caller produces these by walking its hierarchical
   * tree once — typically reusing existing flatten helpers.
   */
  async createTree(labels: readonly string[], depths: readonly number[]): Promise<TreeHandle> {
    const mod = await this.load();
    const wasm = mod.WasmTree.ingest([...labels], depths instanceof Uint8Array ? depths : new Uint8Array(depths));
    return TreeHandle._create(wasm);
  }

  /** Eagerly trigger the WASM load. */
  async preload(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<TreeEngineExports> {
    const mod = (await loadEngineModule(this.wasmUrl)) as unknown as TreeEngineExports;
    this.ready.set(true);
    return mod;
  }
}
