/**
 * Lazy-loaded gateway to the WASM fuzzy-search engine.
 *
 * Shares the same `engine_wasm.js` bundle as the table and tree services —
 * Angular reuses the loaded module across services, so the third service
 * just picks up the already-initialized exports.
 */

import { Injectable, inject, signal } from '@angular/core';

import { HK_TABLE_ENGINE_WASM_URL } from '../../components/table/engine';
import { FuzzyHandle, type WasmFuzzyIndex } from './fuzzy-handle';

interface EngineModule {
  default: (input?: unknown) => Promise<unknown>;
  WasmFuzzyIndex: {
    ingest(items: string[]): WasmFuzzyIndex;
  };
}

@Injectable({ providedIn: 'root' })
export class FuzzyEngineService {
  private readonly wasmUrl = inject(HK_TABLE_ENGINE_WASM_URL);

  private modPromise: Promise<EngineModule> | null = null;
  private mod: EngineModule | null = null;

  /** True once the WASM module has been loaded and initialized. */
  readonly ready = signal(false);

  /**
   * Build a `FuzzyHandle` from a list of searchable strings. Each input
   * string becomes one item; the array index is what `search()` returns.
   *
   * Apps usually re-create the handle whenever the source list reference
   * changes (and `dispose()` the previous one).
   */
  async createIndex(items: readonly string[]): Promise<FuzzyHandle> {
    const mod = await this.load();
    const wasm = mod.WasmFuzzyIndex.ingest([...items]);
    return FuzzyHandle._create(wasm);
  }

  /** Eagerly trigger the WASM load. Useful at app startup to warm the cache. */
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
