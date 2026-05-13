/**
 * Thin wrapper over the WASM `WasmDataset` handle.
 *
 * Translates field names ↔ numeric column IDs, builds wire payloads from
 * ergonomic TS types, and resolves `Uint32Array` indices back into row
 * objects. The original row array is held by reference; row payloads never
 * cross the WASM boundary again after [`createTableHandle`].
 *
 * Lifecycle is inherited from `DisposableHandle`.
 */

import { DisposableHandle } from '../../../utils/disposable-handle';
import type { AggFn, AggResult, ColumnSchema, FilterDef, GroupNode, SearchSpec, SortDef } from './table-engine.types';

/**
 * Minimal shape of the wasm-pack-generated `WasmDataset`. We declare it here
 * (rather than importing from the generated `.d.ts`) so that the library's
 * own `.d.ts` build does not need the WASM bundle to resolve. The service
 * loads the real implementation at runtime via dynamic import.
 */
export interface WasmDataset {
  free(): void;
  n_rows(): number;
  filter(filters: unknown): Uint32Array;
  search(spec: unknown): Uint32Array;
  sort(indices: Uint32Array, specs: unknown): Uint32Array;
  aggregate(column: number, indices: Uint32Array | null | undefined, agg: unknown): unknown;
  group(columns: Uint32Array, indices: Uint32Array | null | undefined): unknown;
}

interface WireSchemaColumn {
  id: number;
  kind: 'text' | 'number' | 'bool' | 'date';
}

const EMPTY_U32 = new Uint32Array(0);
const NONE_RESULT: AggResult = { kind: 'none' } as AggResult;

export class TableHandle<T = unknown> extends DisposableHandle {
  private readonly fieldToId = new Map<string, number>();
  private readonly idToField = new Map<number, string>();

  private constructor(
    private readonly wasm: WasmDataset,
    private readonly rows: readonly T[],
    schema: readonly ColumnSchema<T>[],
  ) {
    super();
    schema.forEach((c, i) => {
      this.fieldToId.set(c.field, i);
      this.idToField.set(i, c.field);
    });
  }

  /** @internal — use `TableEngineService.createDataset` */
  static _create<T>(wasm: WasmDataset, rows: readonly T[], schema: readonly ColumnSchema<T>[]): TableHandle<T> {
    return new TableHandle(wasm, rows, schema);
  }

  protected override freeWasm(): void {
    this.wasm.free();
  }

  /** Number of rows ingested. */
  get rowCount(): number {
    return this.guard(() => this.wasm.n_rows(), 0);
  }

  /** Apply filters AND-combined; returns matching row indices. */
  filter(filters: readonly FilterDef<T>[]): Uint32Array {
    return this.guard(() => this.wasm.filter(filters.map((f) => this.toWireFilter(f))), EMPTY_U32);
  }

  /**
   * Apply a global multi-column search; returns matching row indices.
   * Empty term returns an empty array — callers should AND with their
   * filter mask only when the term is non-empty.
   */
  search(spec: SearchSpec<T>): Uint32Array {
    return this.guard(
      () =>
        this.wasm.search({
          term: spec.term,
          mode: spec.mode,
          columns: (spec.fields ?? []).map((f) => this.idOf(f)),
          caseSensitive: spec.caseSensitive ?? false,
        }),
      EMPTY_U32,
    );
  }

  /** Sort indices by a multi-tier composite key. Stable. */
  sort(indices: Uint32Array, specs: readonly SortDef<T>[]): Uint32Array {
    // After dispose: hand back the caller's input indices unchanged — they
    // already had a valid (filtered) set, just not a sorted one.
    return this.guard(
      () =>
        this.wasm.sort(
          indices,
          specs.map((s) => ({
            column: this.idOf(s.field),
            direction: s.direction,
            nulls: s.nulls ?? 'last',
          })),
        ),
      indices,
    );
  }

  /** Compute one aggregate. `indices === null` ⇒ aggregate over all rows. */
  aggregate(field: keyof T & string, indices: Uint32Array | null, agg: AggFn): AggResult {
    return this.guard(() => this.wasm.aggregate(this.idOf(field), indices ?? undefined, agg) as AggResult, NONE_RESULT);
  }

  /**
   * Multi-level group. Pass an array of fields for nested grouping.
   * `indices === null` ⇒ group across the entire dataset.
   */
  group(fields: readonly (keyof T & string)[], indices: Uint32Array | null): GroupNode[] {
    return this.guard(() => {
      const cols = new Uint32Array(fields.map((f) => this.idOf(f)));
      return this.wasm.group(cols, indices ?? undefined) as GroupNode[];
    }, [] as GroupNode[]);
  }

  /**
   * Convenience: filter → sort → page in one call. Returns the page's row
   * objects, not indices.
   */
  query(opts: { filters?: readonly FilterDef<T>[]; sort?: readonly SortDef<T>[]; page?: { index: number; size: number } }): readonly T[] {
    return this.guard(
      () => {
        let indices = this.filter(opts.filters ?? []);
        if (opts.sort && opts.sort.length > 0) {
          indices = this.sort(indices, opts.sort);
        }
        let view = indices;
        if (opts.page) {
          const start = opts.page.index * opts.page.size;
          view = view.slice(start, start + opts.page.size);
        }
        return Array.from(view, (i) => this.rows[i]);
      },
      [] as readonly T[],
    );
  }

  /**
   * Resolve indices back into row objects. Safe on a disposed handle —
   * `rows` is the cached JS array, no WASM round-trip needed.
   */
  rowsAt(indices: Uint32Array): readonly T[] {
    return Array.from(indices, (i) => this.rows[i]);
  }

  // ─── Internals ────────────────────────────────────────────────────────

  private idOf(field: string): number {
    const id = this.fieldToId.get(field);
    if (id === undefined) {
      throw new Error(`TableHandle: unknown field '${field}' (not in schema)`);
    }
    return id;
  }

  private toWireFilter(f: FilterDef<T>): unknown {
    return {
      kind: f.kind,
      column: this.idOf(f.field),
      op: f.op,
    };
  }

  /** @internal — used by service to build the schema wire payload */
  static _schemaToWire<T>(schema: readonly ColumnSchema<T>[]): WireSchemaColumn[] {
    return schema.map((c, i) => ({ id: i, kind: c.kind }));
  }

  /**
   * @internal — build the per-column wire payload from a row array.
   *
   * Output shape depends on column kind:
   *
   * - `text` ⇒ `(string | null)[]` (serde path on the WASM side — strings
   *   have no efficient typed-array form)
   * - `number` ⇒ `{ values: Float64Array, validity: Uint8Array }`
   * - `bool` ⇒ `{ values: Uint8Array (0/1), validity: Uint8Array }`
   * - `date` ⇒ `{ values: Float64Array (ms-epoch), validity: Uint8Array }`
   *
   * Typed-array payloads are bulk-copied into Rust by wasm-bindgen
   * (`TypedArray::to_vec()` is one memcpy). The validity `Uint8Array`
   * carries one byte per row (1 = present, 0 = null); Rust packs it into
   * a `Bitset` for word-at-a-time filter scans.
   *
   * This replaces the prior all-serde path which allocated `N` boxed
   * `Option<X>` values per numeric column on the WASM heap — the dominant
   * ingest cost on large datasets.
   */
  static _extractColumns<T>(rows: readonly T[], schema: readonly ColumnSchema<T>[]): unknown[] {
    const n = rows.length;
    return schema.map((col) => {
      const field = col.field;

      if (col.kind === 'text') {
        const out = new Array<string | null>(n);
        for (let i = 0; i < n; i++) {
          const v = (rows[i] as Record<string, unknown>)[field];
          out[i] = v == null ? null : typeof v === 'string' ? v : String(v);
        }
        return out;
      }

      if (col.kind === 'number') {
        const values = new Float64Array(n);
        const validity = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          const v = (rows[i] as Record<string, unknown>)[field];
          if (v == null || typeof v !== 'number' || !Number.isFinite(v)) {
            // NaN / Infinity / null → invalid. Value slot stays 0; Rust's
            // defensive scan would zero it anyway, doing it here keeps the
            // contract explicit.
            values[i] = 0;
            validity[i] = 0;
          } else {
            values[i] = v;
            validity[i] = 1;
          }
        }
        return { values, validity };
      }

      if (col.kind === 'date') {
        const values = new Float64Array(n);
        const validity = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          const v = (rows[i] as Record<string, unknown>)[field];
          let ms: number | null = null;
          if (v == null) {
            ms = null;
          } else if (v instanceof Date) {
            const t = v.getTime();
            ms = Number.isFinite(t) ? t : null;
          } else if (typeof v === 'number') {
            ms = Number.isFinite(v) ? v : null;
          } else if (typeof v === 'string') {
            const parsed = Date.parse(v);
            ms = Number.isFinite(parsed) ? parsed : null;
          }
          if (ms == null) {
            values[i] = 0;
            validity[i] = 0;
          } else {
            values[i] = ms;
            validity[i] = 1;
          }
        }
        return { values, validity };
      }

      if (col.kind === 'bool') {
        const values = new Uint8Array(n);
        const validity = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          const v = (rows[i] as Record<string, unknown>)[field];
          if (v == null) {
            values[i] = 0;
            validity[i] = 0;
          } else {
            values[i] = v ? 1 : 0;
            validity[i] = 1;
          }
        }
        return { values, validity };
      }

      // Unknown kind — empty array so the WASM side fails fast with a clear
      // length-mismatch error rather than mis-decoding.
      return [];
    });
  }
}
