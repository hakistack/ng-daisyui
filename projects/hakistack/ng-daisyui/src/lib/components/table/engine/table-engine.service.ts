/**
 * Lazy-loaded gateway to the WASM table engine.
 *
 * The first call to `createDataset` triggers the dynamic import of the
 * generated `engine_wasm` bundle and runs its `default()` initializer.
 * Subsequent calls reuse the loaded module.
 *
 * Apps that don't use any engine-backed table feature never trigger the
 * import and never download the .wasm.
 */

import { Injectable, inject, signal } from '@angular/core';

import { HK_TABLE_ENGINE_WASM_URL } from './table-engine-config';
import type { ColumnSchema } from './table-engine.types';
import { TableHandle, type WasmDataset } from './table-handle';

/**
 * Minimal shape of the wasm-pack-generated module. Declared inline so the
 * library's `.d.ts` build doesn't depend on the WASM bundle resolving at
 * compile time — the real module is loaded by dynamic import at runtime.
 */
interface EngineModule {
  default: (input?: unknown) => Promise<unknown>;
  WasmDataset: {
    ingest(nRows: number, schema: unknown, columns: unknown[]): WasmDataset;
  };
  engine_version: () => string;
}

@Injectable({ providedIn: 'root' })
export class TableEngineService {
  private readonly wasmUrl = inject(HK_TABLE_ENGINE_WASM_URL);

  private modPromise: Promise<EngineModule> | null = null;
  private mod: EngineModule | null = null;

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

  private async load(): Promise<EngineModule> {
    if (this.mod) return this.mod;
    this.modPromise ??= (async () => {
      const url = this.wasmUrl;
      let mod: EngineModule;
      try {
        // Variable-URL `import()` keeps ng-packagr's static analyzer from
        // trying (and failing) to resolve the path at library-build time.
        // At runtime the URL is whatever the consumer provided via
        // `HK_TABLE_ENGINE_WASM_URL` — typically `/assets/engine_wasm.js`.
        mod = (await import(/* @vite-ignore */ /* webpackIgnore: true */ url)) as EngineModule;
      } catch (e) {
        throw new Error(
          `hakistack-engine WASM failed to load from "${url}". ` +
            `Make sure the engine_wasm.js + engine_wasm_bg.wasm files are served at that URL ` +
            `(typically by copying node_modules/@hakistack/ng-daisyui/wasm into your assets folder, ` +
            `or running \`npm run engine:build\` for local development). ` +
            `Underlying error: ${(e as Error).message}`,
        );
      }
      // wasm-pack `web` target requires explicit init() to fetch + instantiate
      // the .wasm binary. The default initializer reads the .wasm next to the
      // .js URL, so `engine_wasm_bg.wasm` must be served from the same folder.
      await mod.default();
      this.mod = mod;
      this.ready.set(true);
      return mod;
    })();
    return this.modPromise;
  }
}
