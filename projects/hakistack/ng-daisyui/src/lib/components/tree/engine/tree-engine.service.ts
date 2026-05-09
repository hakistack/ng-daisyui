/**
 * Lazy-loaded gateway to the WASM tree engine.
 *
 * Shares the same `engine_wasm.js` bundle as the table engine — Angular
 * reuses the loaded module across services, so the second service just
 * picks up the already-initialized exports.
 */

import { Injectable, inject, signal } from '@angular/core';

import { HK_TABLE_ENGINE_WASM_URL } from '../../table/engine';
import { TreeHandle, type WasmTree } from './tree-handle';

interface EngineModule {
  default: (input?: unknown) => Promise<unknown>;
  WasmTree: {
    ingest(labels: string[], depths: Uint8Array | number[]): WasmTree;
  };
}

@Injectable({ providedIn: 'root' })
export class TreeEngineService {
  private readonly wasmUrl = inject(HK_TABLE_ENGINE_WASM_URL);

  private modPromise: Promise<EngineModule> | null = null;
  private mod: EngineModule | null = null;

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

  private async load(): Promise<EngineModule> {
    if (this.mod) return this.mod;
    this.modPromise ??= (async () => {
      const url = this.wasmUrl;
      let mod: EngineModule;
      try {
        mod = (await import(/* @vite-ignore */ /* webpackIgnore: true */ url)) as EngineModule;
      } catch (e) {
        throw new Error(
          `hakistack-engine WASM failed to load from "${url}". ` +
            `Make sure the engine_wasm.js + engine_wasm_bg.wasm files are served at that URL. ` +
            `Underlying error: ${(e as Error).message}`,
        );
      }
      await mod.default();
      this.mod = mod;
      this.ready.set(true);
      return mod;
    })();
    return this.modPromise;
  }
}
