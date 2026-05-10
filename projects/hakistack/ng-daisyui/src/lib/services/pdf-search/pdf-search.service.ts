/**
 * Lazy-loaded gateway to the WASM PDF in-document search engine.
 *
 * Shares the same engine module with table / tree / fuzzy via the shared
 * `loadEngineModule()`. Apps that never load a PDF never trigger the import.
 */

import { Injectable, inject, signal } from '@angular/core';

import { HK_TABLE_ENGINE_WASM_URL } from '../../components/table/engine';
import { loadEngineModule } from '../../utils/engine-loader';
import { PdfSearchHandle, type WasmPdfIndex } from './pdf-search-handle';

interface PdfSearchExports {
  WasmPdfIndex: {
    new (pageCount: number): WasmPdfIndex;
  };
}

@Injectable({ providedIn: 'root' })
export class PdfSearchService {
  private readonly wasmUrl = inject(HK_TABLE_ENGINE_WASM_URL);

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

  private async load(): Promise<PdfSearchExports> {
    const mod = (await loadEngineModule(this.wasmUrl)) as unknown as PdfSearchExports;
    this.ready.set(true);
    return mod;
  }
}
