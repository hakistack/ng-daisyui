/**
 * Thin wrapper over the WASM `WasmDataset` handle.
 *
 * Translates field names ↔ numeric column IDs, builds wire payloads from
 * ergonomic TS types, and resolves `Uint32Array` indices back into row
 * objects. The original row array is held by reference; row payloads never
 * cross the WASM boundary again after [`createTableHandle`].
 */

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

export class TableHandle<T = unknown> {
  private readonly fieldToId = new Map<string, number>();
  private readonly idToField = new Map<number, string>();

  private constructor(
    private readonly wasm: WasmDataset,
    private readonly rows: readonly T[],
    schema: readonly ColumnSchema<T>[],
  ) {
    schema.forEach((c, i) => {
      this.fieldToId.set(c.field, i);
      this.idToField.set(i, c.field);
    });
  }

  /** @internal — use `TableEngineService.createDataset` */
  static _create<T>(wasm: WasmDataset, rows: readonly T[], schema: readonly ColumnSchema<T>[]): TableHandle<T> {
    return new TableHandle(wasm, rows, schema);
  }

  /** Number of rows ingested. */
  get rowCount(): number {
    return this.wasm.n_rows();
  }

  /** Apply filters AND-combined; returns matching row indices. */
  filter(filters: readonly FilterDef<T>[]): Uint32Array {
    return this.wasm.filter(filters.map((f) => this.toWireFilter(f)));
  }

  /**
   * Apply a global multi-column search; returns matching row indices.
   * Empty term returns an empty array — callers should AND with their
   * filter mask only when the term is non-empty.
   */
  search(spec: SearchSpec<T>): Uint32Array {
    return this.wasm.search({
      term: spec.term,
      mode: spec.mode,
      columns: (spec.fields ?? []).map((f) => this.idOf(f)),
      caseSensitive: spec.caseSensitive ?? false,
    });
  }

  /** Sort indices by a multi-tier composite key. Stable. */
  sort(indices: Uint32Array, specs: readonly SortDef<T>[]): Uint32Array {
    return this.wasm.sort(
      indices,
      specs.map((s) => ({
        column: this.idOf(s.field),
        direction: s.direction,
        nulls: s.nulls ?? 'last',
      })),
    );
  }

  /** Compute one aggregate. `indices === null` ⇒ aggregate over all rows. */
  aggregate(field: keyof T & string, indices: Uint32Array | null, agg: AggFn): AggResult {
    return this.wasm.aggregate(this.idOf(field), indices ?? undefined, agg) as AggResult;
  }

  /**
   * Multi-level group. Pass an array of fields for nested grouping.
   * `indices === null` ⇒ group across the entire dataset.
   */
  group(fields: readonly (keyof T & string)[], indices: Uint32Array | null): GroupNode[] {
    const cols = new Uint32Array(fields.map((f) => this.idOf(f)));
    return this.wasm.group(cols, indices ?? undefined) as GroupNode[];
  }

  /**
   * Convenience: filter → sort → page in one call. Returns the page's row
   * objects, not indices.
   */
  query(opts: { filters?: readonly FilterDef<T>[]; sort?: readonly SortDef<T>[]; page?: { index: number; size: number } }): readonly T[] {
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
  }

  /** Resolve indices back into row objects. */
  rowsAt(indices: Uint32Array): readonly T[] {
    return Array.from(indices, (i) => this.rows[i]);
  }

  /** Free the underlying WASM-heap memory. Call on component teardown. */
  dispose(): void {
    this.wasm.free();
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

  /** @internal — used by service to extract columnar data from row array */
  static _extractColumns<T>(rows: readonly T[], schema: readonly ColumnSchema<T>[]): unknown[][] {
    return schema.map((col) => {
      const field = col.field;
      const out = new Array(rows.length);
      for (let i = 0; i < rows.length; i++) {
        const v = (rows[i] as Record<string, unknown>)[field];
        out[i] = v === undefined ? null : v;
      }
      return out;
    });
  }
}
