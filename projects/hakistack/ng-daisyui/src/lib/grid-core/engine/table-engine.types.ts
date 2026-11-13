/**
 * TypeScript surface for the WASM table engine.
 *
 * These types map onto the Rust `engine-wasm` wire types one-to-one. We
 * reference columns by **field name** (not numeric id) at this layer for
 * ergonomics; `TableHandle` translates names to ids before crossing the WASM
 * boundary.
 *
 * See `hakistack-engine/crates/engine-wasm/src/wire.rs` for the Rust side.
 */

export type ColumnKind = 'text' | 'number' | 'bool' | 'date';

export interface ColumnSchema<T = unknown> {
  /** Field name on the row object. */
  field: keyof T & string;
  kind: ColumnKind;
}

// ─── Filters ────────────────────────────────────────────────────────────────

export type TextOp =
  | { kind: 'contains'; needle: string }
  | { kind: 'startsWith'; needle: string }
  | { kind: 'endsWith'; needle: string }
  | { kind: 'equals'; needle: string }
  | { kind: 'notEquals'; needle: string }
  | { kind: 'notContains'; needle: string }
  | { kind: 'isEmpty' }
  | { kind: 'isNotEmpty' };

export type NumberOp =
  | { kind: 'eq'; value: number }
  | { kind: 'notEq'; value: number }
  | { kind: 'gt'; value: number }
  | { kind: 'lt'; value: number }
  | { kind: 'gte'; value: number }
  | { kind: 'lte'; value: number }
  | { kind: 'between'; lo: number; hi: number }
  | { kind: 'in'; values: number[] }
  | { kind: 'notIn'; values: number[] }
  | { kind: 'isEmpty' }
  | { kind: 'isNotEmpty' };

export type BoolOp = { kind: 'eq'; value: boolean } | { kind: 'isEmpty' } | { kind: 'isNotEmpty' };

export type DateOp =
  | { kind: 'eq'; value: number }
  | { kind: 'gt'; value: number }
  | { kind: 'lt'; value: number }
  | { kind: 'gte'; value: number }
  | { kind: 'lte'; value: number }
  | { kind: 'between'; lo: number; hi: number }
  | { kind: 'isEmpty' }
  | { kind: 'isNotEmpty' };

export type FilterDef<T = unknown> =
  | { kind: 'text'; field: keyof T & string; op: TextOp }
  | { kind: 'number'; field: keyof T & string; op: NumberOp }
  | { kind: 'bool'; field: keyof T & string; op: BoolOp }
  | { kind: 'date'; field: keyof T & string; op: DateOp };

// ─── Search ─────────────────────────────────────────────────────────────────

export type SearchMode = 'contains' | 'startsWith' | 'exact';

export interface SearchSpec<T = unknown> {
  term: string;
  mode: SearchMode;
  /** Field names to search. Empty/omitted ⇒ every text column. */
  fields?: readonly (keyof T & string)[];
  /** Default: false (case-insensitive). */
  caseSensitive?: boolean;
}

// ─── Sort ───────────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc';
export type NullsPosition = 'first' | 'last';

export interface SortDef<T = unknown> {
  field: keyof T & string;
  direction: SortDirection;
  /** Defaults to `'last'` when omitted. */
  nulls?: NullsPosition;
}

// ─── Aggregate ──────────────────────────────────────────────────────────────

export type AggFn = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'median' | 'trueCount' | 'falseCount' | 'distinctCount';

export type AggResult =
  | { kind: 'none' }
  | { kind: 'number'; value: number }
  | { kind: 'date'; value: number }
  | { kind: 'count'; value: number };

// ─── Group ──────────────────────────────────────────────────────────────────

export type GroupKey =
  | { kind: 'null' }
  | { kind: 'text'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'bool'; value: boolean }
  | { kind: 'date'; value: number };

export interface GroupNode {
  key: GroupKey;
  /** Row indices into the original dataset. Union of all descendants. */
  indices: number[];
  depth: number;
  children: GroupNode[];
}
