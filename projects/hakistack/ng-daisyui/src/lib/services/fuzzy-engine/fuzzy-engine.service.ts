/**
 * Lazy-loaded gateway to the WASM fuzzy-search engine.
 *
 * Shares the same engine module with table / tree / pdf-search via the
 * shared `loadEngineModule()` — Angular reuses the loaded module across
 * services, so the second service to ask just picks up the already-
 * initialized exports.
 */

import { Injectable, inject, signal } from '@angular/core';

import { HK_TABLE_ENGINE_WASM_URL } from '../../components/table/engine';
import { loadEngineModule } from '../../utils/engine-loader';
import { FuzzyHandle, type WasmFuzzyIndex } from './fuzzy-handle';

interface FuzzyEngineExports {
  WasmFuzzyIndex: {
    ingest(items: string[]): WasmFuzzyIndex;
  };
}

@Injectable({ providedIn: 'root' })
export class FuzzyEngineService {
  private readonly wasmUrl = inject(HK_TABLE_ENGINE_WASM_URL);

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

  private async load(): Promise<FuzzyEngineExports> {
    const mod = (await loadEngineModule(this.wasmUrl)) as unknown as FuzzyEngineExports;
    this.ready.set(true);
    return mod;
  }
}
