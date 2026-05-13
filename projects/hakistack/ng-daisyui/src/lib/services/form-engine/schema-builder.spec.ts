import { describe, expect, it } from 'vitest';

import { FormFieldConfig } from '../../components/dynamic-form/dynamic-form.types';
import { buildSchema, toWireValue } from './schema-builder';

function field(key: string, partial: Partial<FormFieldConfig> = {}): FormFieldConfig {
  return {
    id: key,
    key,
    type: 'text',
    label: key,
    ...partial,
  };
}

describe('toWireValue', () => {
  it('normalizes primitive JS values', () => {
    expect(toWireValue(null)).toEqual({ kind: 'null' });
    expect(toWireValue(undefined)).toEqual({ kind: 'null' });
    expect(toWireValue(true)).toEqual({ kind: 'bool', value: true });
    expect(toWireValue(42)).toEqual({ kind: 'number', value: 42 });
    expect(toWireValue('hi')).toEqual({ kind: 'string', value: 'hi' });
  });

  it('collapses non-finite numbers to null', () => {
    expect(toWireValue(NaN)).toEqual({ kind: 'null' });
    expect(toWireValue(Infinity)).toEqual({ kind: 'null' });
  });

  it('walks arrays recursively', () => {
    expect(toWireValue([1, 'x', null])).toEqual({
      kind: 'array',
      items: [{ kind: 'number', value: 1 }, { kind: 'string', value: 'x' }, { kind: 'null' }],
    });
  });

  it('collapses unsupported shapes to null', () => {
    expect(toWireValue({ obj: 1 })).toEqual({ kind: 'null' });
    expect(toWireValue(() => {})).toEqual({ kind: 'null' });
  });
});

describe('buildSchema', () => {
  it('emits one wire field per config and indexes by key', () => {
    const built = buildSchema([field('a'), field('b'), field('c')]);
    expect(built.schema.fields).toHaveLength(3);
    expect(built.nameToIdx.get('a')).toBe(0);
    expect(built.nameToIdx.get('c')).toBe(2);
    expect(built.predicates).toHaveLength(0);
  });

  it('rewrites condition field references from name to index', () => {
    const built = buildSchema([
      field('country'),
      field('region', {
        showWhen: [{ field: 'country', operator: 'equals', value: 'US' }],
      }),
    ]);

    const region = built.schema.fields[1];
    expect(region.showWhen).toEqual([{ field: 0, op: 'equals', value: { kind: 'string', value: 'US' } }]);
  });

  it('captures function-operator predicates with stable ids', () => {
    const evaluator = (v: unknown) => v === 'go';
    const built = buildSchema([
      field('a'),
      field('b', {
        requiredWhen: [{ field: 'a', operator: 'function', value: evaluator }],
      }),
    ]);

    expect(built.predicates).toHaveLength(1);
    expect(built.predicates[0].id).toBe(0);
    expect(built.predicates[0].evaluator).toBe(evaluator);
    expect(built.predicates[0].sourceField).toBe('a');
    expect(built.predicates[0].sourceFieldKey).toBe('b');

    const condition = built.schema.fields[1].requiredWhen[0];
    expect(condition.op).toBe('function');
    expect(condition.value).toEqual({ kind: 'callback', id: 0 });
  });

  it('translates baseline required / disabled flags', () => {
    const built = buildSchema([field('a', { required: true, disabled: true })]);
    expect(built.schema.fields[0].requiredBaseline).toBe(true);
    expect(built.schema.fields[0].disabledBaseline).toBe(true);
  });

  it('throws on duplicate keys', () => {
    expect(() => buildSchema([field('a'), field('a')])).toThrow(/duplicate field key/);
  });

  it('throws when a condition references an unknown field', () => {
    expect(() => buildSchema([field('b', { showWhen: [{ field: 'a', operator: 'equals', value: 1 }] })])).toThrow(
      /references unknown field/,
    );
  });

  it('maps every operator to its wire form', () => {
    const built = buildSchema([
      field('a'),
      field('b', {
        showWhen: [
          { field: 'a', operator: 'equals', value: 1 },
          { field: 'a', operator: 'not-equals', value: 2 },
        ],
        hideWhen: [
          { field: 'a', operator: 'contains', value: 'x' },
          { field: 'a', operator: 'greater-than', value: 0 },
        ],
        requiredWhen: [
          { field: 'a', operator: 'less-than', value: 99 },
          { field: 'a', operator: 'in', value: ['x', 'y'] },
        ],
        disabledWhen: [{ field: 'a', operator: 'not-in', value: ['z'] }],
      }),
    ]);

    const f = built.schema.fields[1];
    expect(f.showWhen.map((c) => c.op)).toEqual(['equals', 'notEquals']);
    expect(f.hideWhen.map((c) => c.op)).toEqual(['contains', 'greaterThan']);
    expect(f.requiredWhen.map((c) => c.op)).toEqual(['lessThan', 'in']);
    expect(f.disabledWhen.map((c) => c.op)).toEqual(['notIn']);
  });
});
