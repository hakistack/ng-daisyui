import { Injectable, InjectionToken, Provider, inject } from '@angular/core';

import { DocumentEngineModule, loadDocumentEngineModule } from '../utils/document-engine-loader';

/**
 * Optional override URL for the document-engine WASM bundle. Default `null`
 * uses the FESM-inlined base64 — works on any host with no public/ copy.
 * Override only if you want the binary as a separately cacheable asset.
 *
 * Provide via [`provideDocumentEngineWasmUrl`].
 */
export const HK_DOCUMENT_ENGINE_WASM_URL = new InjectionToken<string | null>('HK_DOCUMENT_ENGINE_WASM_URL', {
  providedIn: 'root',
  factory: () => null,
});

/** Provider helper — bind once at the app root. */
export function provideDocumentEngineWasmUrl(url: string | null): Provider {
  return { provide: HK_DOCUMENT_ENGINE_WASM_URL, useValue: url };
}

/** Tagged cell value emitted by the WASM `parse_spreadsheet`. */
export type SpreadsheetCell =
  | { kind: 'empty' }
  | { kind: 'text'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'bool'; value: boolean }
  | { kind: 'date'; value: number }
  | { kind: 'formula'; value: string }
  | { kind: 'error'; value: string };

export interface SpreadsheetSheet {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** Row-major. Some rows may be shorter than `width`; pad to `width` for tabular display. */
  readonly rows: SpreadsheetCell[][];
}

export interface ParsedSpreadsheet {
  readonly sheets: SpreadsheetSheet[];
}

/**
 * Façade over the document-engine WASM module. Lazy: nothing loads until
 * the first method call. Subsequent calls reuse the already-initialized
 * module.
 *
 * Phase 1 only exposes spreadsheet parsing. Later phases will add `.docx`,
 * `.pptx`, and legacy `.doc`/`.ppt` parsers behind the same service.
 */
@Injectable({ providedIn: 'root' })
export class DocumentEngineService {
  private readonly urlOverride = inject(HK_DOCUMENT_ENGINE_WASM_URL);
  private modPromise: Promise<DocumentEngineModule> | null = null;

  /** Load (or return cached) WASM module. Idempotent — safe to call repeatedly. */
  async load(): Promise<DocumentEngineModule> {
    this.modPromise ??= loadDocumentEngineModule(this.urlOverride);
    return this.modPromise;
  }

  /** Engine version string. Useful smoke-test; throws if the WASM fails to load. */
  async version(): Promise<string> {
    const mod = await this.load();
    return mod.document_engine_version();
  }

  /**
   * Parse a spreadsheet from bytes. Format (xlsx / xls / xlsb / ods / etc.)
   * is auto-detected by calamine.
   *
   * The returned object is safe to hand to renderer code directly — it's
   * already a plain JS object (serde-wasm-bindgen `to_value` outputs a
   * structured clone, not a WASM-heap handle).
   */
  async parseSpreadsheet(bytes: Uint8Array): Promise<ParsedSpreadsheet> {
    const mod = await this.load();
    return mod.parse_spreadsheet(bytes) as ParsedSpreadsheet;
  }
}
