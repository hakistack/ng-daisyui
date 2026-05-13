/**
 * Thin wrapper over the WASM `WasmFuzzyIndex` handle.
 *
 * Strings are ingested once; per-keystroke `search()` calls receive only the
 * query text and return packed (index, score) pairs that we decode into
 * the friendly `FuzzyMatch[]` shape consumers expect.
 *
 * Lifecycle is inherited from `DisposableHandle`.
 */

import { DisposableHandle } from '../../utils/disposable-handle';
import type { FuzzyMatch, FuzzySearchOpts } from './fuzzy-engine.types';

/**
 * Minimal shape of the wasm-pack-generated `WasmFuzzyIndex`. Declared inline
 * so the library's `.d.ts` build doesn't depend on the WASM bundle resolving
 * at compile time.
 */
export interface WasmFuzzyIndex {
  free(): void;
  n_items(): number;
  search(query: string, opts: unknown): Uint32Array;
}

export class FuzzyHandle extends DisposableHandle {
  private constructor(private readonly wasm: WasmFuzzyIndex) {
    super();
  }

  /** @internal — use `FuzzyEngineService.createIndex` */
  static _create(wasm: WasmFuzzyIndex): FuzzyHandle {
    return new FuzzyHandle(wasm);
  }

  protected override freeWasm(): void {
    this.wasm.free();
  }

  get itemCount(): number {
    return this.guard(() => this.wasm.n_items(), 0);
  }

  /**
   * Score every item against the query, return matches sorted by score
   * descending. Empty `query` returns an empty array — callers usually
   * branch to "show everything" in that case.
   */
  search(query: string, opts: FuzzySearchOpts = {}): FuzzyMatch[] {
    return this.guard(() => {
      const packed = this.wasm.search(query, {
        caseSensitive: opts.caseSensitive ?? false,
        maxResults: opts.maxResults ?? 0,
      });
      // Packed pairs: [idx, score, idx, score, ...]
      const out: FuzzyMatch[] = new Array(packed.length / 2);
      for (let i = 0, j = 0; i < packed.length; i += 2, j++) {
        out[j] = { index: packed[i], score: packed[i + 1] };
      }
      return out;
    }, [] as FuzzyMatch[]);
  }
}
