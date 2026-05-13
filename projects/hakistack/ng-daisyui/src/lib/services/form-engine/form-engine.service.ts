/**
 * Lazy-loaded gateway to the WASM form engine.
 *
 * Shares the engine module with table / tree / fuzzy / pdf-search via
 * the shared `loadEngineModule()`. The second service to ask just
 * picks up the already-initialized exports.
 *
 * Consumers call `createForm(fields)` once per form instance, then
 * keep the returned `FormEngineHandle` for the lifetime of the form.
 * Call `dispose()` in `ngOnDestroy` to release the WASM heap slot.
 */

import { Injectable, inject, signal } from '@angular/core';

import { FormFieldConfig } from '../../components/dynamic-form/dynamic-form.types';
import { HK_TABLE_ENGINE_WASM_URL } from '../../components/table/engine';
import { loadEngineModule } from '../../utils/engine-loader';
import type { FormEngineHandle } from './form-engine.types';
import { FormHandle, type WasmFormEngine } from './form-handle';
import { buildSchema } from './schema-builder';

interface FormEngineExports {
  WasmFormEngine: {
    ingest(schema: unknown): WasmFormEngine;
  };
}

@Injectable({ providedIn: 'root' })
export class FormEngineService {
  private readonly wasmUrl = inject(HK_TABLE_ENGINE_WASM_URL);

  /** True once the WASM module has been loaded and initialized. */
  readonly ready = signal(false);

  /**
   * Build a `FormEngineHandle` for the given field list. The schema is
   * uploaded to WASM exactly once; per-keystroke calls only push value
   * updates across the boundary.
   *
   * Re-create the handle (and `dispose()` the previous one) whenever
   * the schema changes. The Rust side doesn't support live schema
   * mutation, matching how `<hk-dynamic-form>` rebuilds today on every
   * config swap.
   */
  async createForm(fields: readonly FormFieldConfig[]): Promise<FormEngineHandle> {
    const built = buildSchema(fields);
    const mod = await this.load();
    const wasm = mod.WasmFormEngine.ingest(built.schema);
    return FormHandle._create(wasm, built.nameToIdx, built.predicates);
  }

  /** Eagerly trigger the WASM load. Useful at app startup to warm the cache. */
  async preload(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<FormEngineExports> {
    const mod = (await loadEngineModule(this.wasmUrl)) as unknown as FormEngineExports;
    this.ready.set(true);
    return mod;
  }
}
