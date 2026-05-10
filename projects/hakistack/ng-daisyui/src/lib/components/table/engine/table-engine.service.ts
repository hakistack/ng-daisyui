/**
 * Lazy-loaded gateway to the WASM table engine.
 *
 * The first call to `createDataset` triggers the engine load (inlined bytes
 * by default, URL fetch when `HK_TABLE_ENGINE_WASM_URL` is overridden) and
 * initializes the wasm-bindgen module. Subsequent calls reuse the loaded
 * module — including across the other engine services (tree / fuzzy / pdf),
 * since they all share `loadEngineModule()`.
 *
 * Apps that don't use any engine-backed table feature never trigger the
 * import and never download the .wasm bytes.
 */

import { Injectable, inject, signal } from '@angular/core';

import { loadEngineModule } from '../../../utils/engine-loader';
import { HK_TABLE_ENGINE_WASM_URL } from './table-engine-config';
import type { ColumnSchema } from './table-engine.types';
import { TableHandle, type WasmDataset } from './table-handle';

/** Subset of the wasm-bindgen module the table engine consumes. */
interface TableEngineExports {
  WasmDataset: {
    ingest(nRows: number, schema: unknown, columns: unknown[]): WasmDataset;
  };
  engine_version: () => string;
}

@Injectable({ providedIn: 'root' })
export class TableEngineService {
  private readonly wasmUrl = inject(HK_TABLE_ENGINE_WASM_URL);

  /** True once the WASM module has been loaded and initialized. */
  readonly ready = signal(false);

  /**
   * Build a TableHandle from a row array + schema.
   *
   * Loads and initializes the WASM module on first call. The row array is
   * held by reference inside the handle; mutating it externally invalidates
   * the dataset (call `dispose()` and re-create).
   */
  async createDataset<T>(rows: readonly T[], schema: readonly ColumnSchema<T>[]): Promise<TableHandle<T>> {
    const mod = await this.load();
    const wireSchema = TableHandle._schemaToWire(schema);
    const columns = TableHandle._extractColumns(rows, schema);
    const wasm = mod.WasmDataset.ingest(rows.length, wireSchema, columns);
    return TableHandle._create(wasm, rows, schema);
  }

  /** Eagerly trigger the WASM load. Useful at app startup to warm the cache. */
  async preload(): Promise<void> {
    await this.load();
  }

  /** Engine version string from the Rust crate. Useful for logging / debug. */
  async version(): Promise<string> {
    const mod = await this.load();
    return mod.engine_version();
  }

  private async load(): Promise<TableEngineExports> {
    const mod = (await loadEngineModule(this.wasmUrl)) as unknown as TableEngineExports;
    this.ready.set(true);
    return mod;
  }
}
