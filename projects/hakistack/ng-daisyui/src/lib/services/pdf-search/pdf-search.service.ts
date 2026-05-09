/**
 * Lazy-loaded gateway to the WASM PDF in-document search engine.
 *
 * Shares the same `engine_wasm.js` bundle as every other service. Apps that
 * never load a PDF never trigger the import.
 */

import { Injectable, inject, signal } from '@angular/core';

import { HK_TABLE_ENGINE_WASM_URL } from '../../components/table/engine';
import { PdfSearchHandle, type WasmPdfIndex } from './pdf-search-handle';

interface EngineModule {
  default: (input?: unknown) => Promise<unknown>;
  WasmPdfIndex: {
    new (pageCount: number): WasmPdfIndex;
  };
}

@Injectable({ providedIn: 'root' })
export class PdfSearchService {
  private readonly wasmUrl = inject(HK_TABLE_ENGINE_WASM_URL);

  private modPromise: Promise<EngineModule> | null = null;
  private mod: EngineModule | null = null;

  /** True once the WASM module has been loaded and initialized. */
  readonly ready = signal(false);

  /**
   * Build a `PdfSearchHandle` for a document with the given page count.
   * Pages are uningested at this point — the caller adds each page's text
   * via `handle.addPage(idx, items)` as PDF.js's `getTextContent()` returns.
   */
  async createIndex(pageCount: number): Promise<PdfSearchHandle> {
    const mod = await this.load();
    const wasm = new mod.WasmPdfIndex(pageCount);
    return PdfSearchHandle._create(wasm);
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
