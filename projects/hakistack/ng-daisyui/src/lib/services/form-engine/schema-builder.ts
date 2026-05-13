/**
 * Translate a `FormFieldConfig[]` schema into the WASM engine's wire
 * format.
 *
 * The Rust side never sees field names on the hot path — only indices
 * — so this builder:
 *
 * 1. Walks the field list and assigns a `0..N` index to every field.
 * 2. Rewrites every `ConditionalLogic.field` from string to index.
 * 3. Normalizes JS values into the tagged `WireFormValue` shape.
 * 4. Extracts `function`-operator predicates into a side table the
 *    adapter registers with the engine post-ingest.
 *
 * Validation:
 *
 * - Duplicate keys throw — the engine's name → index map needs to be
 *   unambiguous.
 * - Conditions that reference unknown field names throw — same
 *   reason; mirrors `FormUtils.validateFormConfig`.
 *
 * The builder is pure: callers can run it without the WASM module
 * loaded, which is how parity tests verify the wire shape.
 */
import { FormFieldConfig, ConditionalLogic } from '../../components/dynamic-form/dynamic-form.types';

type WireOp = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn' | 'function';

export type WireFormValue =
  | { kind: 'null' }
  | { kind: 'bool'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'array'; items: WireFormValue[] }
  | { kind: 'callback'; id: number };

export interface WireFormCondition {
  field: number;
  op: WireOp;
  value: WireFormValue;
}

export interface WireFormField {
  name: string;
  requiredBaseline: boolean;
  disabledBaseline: boolean;
  showWhen: WireFormCondition[];
  hideWhen: WireFormCondition[];
  requiredWhen: WireFormCondition[];
  disabledWhen: WireFormCondition[];
}

export interface WireFormSchema {
  fields: WireFormField[];
}

/**
 * Predicate captured from a `function`-operator condition. The engine
 * resolves these by id — the adapter registers each `id → fn` mapping
 * after schema ingest.
 */
export interface PredicateEntry {
  id: number;
  evaluator: (fieldValue: unknown, formValues: Record<string, unknown>) => boolean;
  /** The owning field's key + which array the predicate sits in — used
   *  only for diagnostics today. */
  sourceFieldKey: string;
  sourceField: string;
}

export interface BuiltSchema {
  schema: WireFormSchema;
  /** field key → index. Cached by the adapter so per-keystroke
   *  `setValue` calls skip the lookup on the hot path. */
  nameToIdx: Map<string, number>;
  /** All `function`-operator predicates discovered during the walk. */
  predicates: PredicateEntry[];
}

const OP_MAP: Record<ConditionalLogic['operator'], WireOp> = {
  equals: 'equals',
  'not-equals': 'notEquals',
  contains: 'contains',
  'greater-than': 'greaterThan',
  'less-than': 'lessThan',
  in: 'in',
  'not-in': 'notIn',
  function: 'function',
};

/**
 * Coerce an arbitrary JS value into a `WireFormValue`. Unknown shapes
 * (objects, undefined, …) collapse to `null` — consistent with how
 * the JS evaluator treats them as falsy operands.
 */
export function toWireValue(input: unknown): WireFormValue {
  if (input === null || input === undefined) return { kind: 'null' };
  if (typeof input === 'boolean') return { kind: 'bool', value: input };
  if (typeof input === 'number') return Number.isFinite(input) ? { kind: 'number', value: input } : { kind: 'null' };
  if (typeof input === 'string') return { kind: 'string', value: input };
  if (Array.isArray(input)) return { kind: 'array', items: input.map(toWireValue) };
  // Objects / functions / etc. — nothing useful to compare against in the
  // engine; collapse to null so the operator dispatch returns false.
  return { kind: 'null' };
}

export function buildSchema(fields: readonly FormFieldConfig[]): BuiltSchema {
  const nameToIdx = new Map<string, number>();
  for (let i = 0, len = fields.length; i < len; i++) {
    const key = fields[i].key;
    if (nameToIdx.has(key)) {
      throw new Error(`FormEngine: duplicate field key "${key}"`);
    }
    nameToIdx.set(key, i);
  }

  const predicates: PredicateEntry[] = [];
  let nextPredicateId = 0;

  const wireFields: WireFormField[] = fields.map((f) => ({
    name: f.key,
    requiredBaseline: !!f.required,
    disabledBaseline: !!f.disabled,
    showWhen: translateArray(f.showWhen, f.key, 'showWhen', nameToIdx, predicates, () => nextPredicateId++),
    hideWhen: translateArray(f.hideWhen, f.key, 'hideWhen', nameToIdx, predicates, () => nextPredicateId++),
    requiredWhen: translateArray(f.requiredWhen, f.key, 'requiredWhen', nameToIdx, predicates, () => nextPredicateId++),
    disabledWhen: translateArray(f.disabledWhen, f.key, 'disabledWhen', nameToIdx, predicates, () => nextPredicateId++),
  }));

  return { schema: { fields: wireFields }, nameToIdx, predicates };
}

function translateArray(
  arr: readonly ConditionalLogic[] | undefined,
  ownerKey: string,
  source: 'showWhen' | 'hideWhen' | 'requiredWhen' | 'disabledWhen',
  nameToIdx: Map<string, number>,
  predicates: PredicateEntry[],
  nextId: () => number,
): WireFormCondition[] {
  if (!arr || arr.length === 0) return [];
  const out: WireFormCondition[] = [];
  for (let i = 0, len = arr.length; i < len; i++) {
    const c = arr[i];
    const fieldIdx = nameToIdx.get(c.field);
    if (fieldIdx === undefined) {
      throw new Error(`FormEngine: field "${ownerKey}".${source}[${i}] references unknown field "${c.field}"`);
    }

    let wireValue: WireFormValue;
    if (c.operator === 'function') {
      // Capture the predicate; the engine resolves it by id.
      const id = nextId();
      predicates.push({
        id,
        evaluator: c.value as PredicateEntry['evaluator'],
        sourceFieldKey: ownerKey,
        sourceField: c.field,
      });
      wireValue = { kind: 'callback', id };
    } else {
      wireValue = toWireValue(c.value);
    }

    out.push({ field: fieldIdx, op: OP_MAP[c.operator], value: wireValue });
  }
  return out;
}
