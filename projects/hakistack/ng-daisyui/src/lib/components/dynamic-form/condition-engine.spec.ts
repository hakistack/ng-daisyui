import { describe, expect, it } from 'vitest';

import { ConditionEngine } from './condition-engine';
import { FormFieldConfig } from './dynamic-form.types';

function field(key: string, partial: Partial<FormFieldConfig> = {}): FormFieldConfig {
  return {
    id: key,
    key,
    type: 'text',
    label: key,
    ...partial,
  };
}

describe('ConditionEngine — static evaluators (parity with FormUtils)', () => {
  const values = { age: 25, name: 'Alice', tags: ['admin', 'beta'] };

  it('evaluates equals / not-equals over primitive values', () => {
    expect(ConditionEngine.evaluateCondition({ field: 'name', operator: 'equals', value: 'Alice' }, values)).toBe(true);
    expect(ConditionEngine.evaluateCondition({ field: 'name', operator: 'not-equals', value: 'Bob' }, values)).toBe(true);
    expect(ConditionEngine.evaluateCondition({ field: 'name', operator: 'equals', value: 'Bob' }, values)).toBe(false);
  });

  it('evaluates greater-than / less-than only for numeric pairs', () => {
    expect(ConditionEngine.evaluateCondition({ field: 'age', operator: 'greater-than', value: 18 }, values)).toBe(true);
    expect(ConditionEngine.evaluateCondition({ field: 'age', operator: 'less-than', value: 18 }, values)).toBe(false);
    // type mismatch returns false
    expect(ConditionEngine.evaluateCondition({ field: 'name', operator: 'greater-than', value: 'A' }, values)).toBe(false);
  });

  it('evaluates contains for string fields with string operand', () => {
    expect(ConditionEngine.evaluateCondition({ field: 'name', operator: 'contains', value: 'lic' }, values)).toBe(true);
    expect(ConditionEngine.evaluateCondition({ field: 'name', operator: 'contains', value: 'xyz' }, values)).toBe(false);
    // type mismatch returns false
    expect(ConditionEngine.evaluateCondition({ field: 'age', operator: 'contains', value: '2' }, values)).toBe(false);
  });

  it('evaluates in / not-in only for array operands', () => {
    expect(ConditionEngine.evaluateCondition({ field: 'name', operator: 'in', value: ['Alice', 'Bob'] }, values)).toBe(true);
    expect(ConditionEngine.evaluateCondition({ field: 'name', operator: 'not-in', value: ['Bob'] }, values)).toBe(true);
    expect(
      ConditionEngine.evaluateCondition({ field: 'name', operator: 'in', value: 'not-an-array' as unknown as unknown[] }, values),
    ).toBe(false);
  });

  it('evaluates function predicate and swallows thrown errors as false', () => {
    expect(
      ConditionEngine.evaluateCondition({ field: 'age', operator: 'function', value: (v: unknown) => (v as number) > 21 }, values),
    ).toBe(true);
    expect(
      ConditionEngine.evaluateCondition(
        {
          field: 'age',
          operator: 'function',
          value: () => {
            throw new Error('boom');
          },
        },
        values,
      ),
    ).toBe(false);
  });

  it('AND-aggregates multiple conditions with short-circuit', () => {
    expect(
      ConditionEngine.evaluateConditions(
        [
          { field: 'age', operator: 'greater-than', value: 18 },
          { field: 'name', operator: 'equals', value: 'Alice' },
        ],
        values,
      ),
    ).toBe(true);

    expect(
      ConditionEngine.evaluateConditions(
        [
          { field: 'age', operator: 'less-than', value: 18 },
          // would throw if reached — short-circuit prevents it
          {
            field: 'name',
            operator: 'function',
            value: () => {
              throw new Error('reached');
            },
          },
        ],
        values,
      ),
    ).toBe(false);
  });

  it('returns true for an empty condition list', () => {
    expect(ConditionEngine.evaluateConditions([], values)).toBe(true);
  });
});

describe('ConditionEngine — dependency graph', () => {
  it('returns every conditional field when dirty is null (initial pass)', () => {
    const engine = new ConditionEngine();
    engine.bindSchema([
      field('a'),
      field('b', { showWhen: [{ field: 'a', operator: 'equals', value: 1 }] }),
      field('c', { requiredWhen: [{ field: 'a', operator: 'equals', value: 1 }] }),
      field('d'),
    ]);

    const out = engine.affectedKeys(null);
    expect(new Set(out)).toEqual(new Set(['b', 'c']));
  });

  it('returns only fields whose deps intersect dirty', () => {
    const engine = new ConditionEngine();
    engine.bindSchema([
      field('country'),
      field('region', { showWhen: [{ field: 'country', operator: 'equals', value: 'US' }] }),
      field('province', { showWhen: [{ field: 'country', operator: 'equals', value: 'CA' }] }),
      field('newsletter', { disabledWhen: [{ field: 'email', operator: 'equals', value: '' }] }),
    ]);

    const onlyCountry = engine.affectedKeys(new Set(['country']));
    expect(new Set(onlyCountry)).toEqual(new Set(['region', 'province']));

    const onlyEmail = engine.affectedKeys(new Set(['email']));
    expect(new Set(onlyEmail)).toEqual(new Set(['newsletter']));

    const both = engine.affectedKeys(new Set(['country', 'email']));
    expect(new Set(both)).toEqual(new Set(['region', 'province', 'newsletter']));
  });

  it('includes fields with function-operator predicates regardless of dirty (signal-safety)', () => {
    const engine = new ConditionEngine();
    engine.bindSchema([
      field('a'),
      field('b', { showWhen: [{ field: 'a', operator: 'equals', value: 1 }] }),
      field('signal-bound', {
        // Function predicates may read external signals — must always re-eval.
        requiredWhen: [{ field: 'unused', operator: 'function', value: () => true }],
      }),
    ]);

    // Empty dirty (external signal tick): only the function-predicate field.
    expect(new Set(engine.affectedKeys(new Set()))).toEqual(new Set(['signal-bound']));

    // Dirty unrelated to function predicate: function-predicate field still included.
    expect(new Set(engine.affectedKeys(new Set(['a'])))).toEqual(new Set(['b', 'signal-bound']));
  });

  it('handles a field with no conditions as not-tracked', () => {
    const engine = new ConditionEngine();
    engine.bindSchema([field('a'), field('b')]);
    expect(engine.hasFieldConditions('a')).toBe(false);
    expect(engine.affectedKeys(new Set(['a'])).size).toBe(0);
  });

  it('is idempotent across re-binds (rebuilding clears prior graph)', () => {
    const engine = new ConditionEngine();
    engine.bindSchema([field('b', { showWhen: [{ field: 'a', operator: 'equals', value: 1 }] })]);
    expect(new Set(engine.affectedKeys(new Set(['a'])))).toEqual(new Set(['b']));

    engine.bindSchema([field('y', { showWhen: [{ field: 'x', operator: 'equals', value: 1 }] })]);
    expect(new Set(engine.affectedKeys(new Set(['a'])))).toEqual(new Set()); // old dep gone
    expect(new Set(engine.affectedKeys(new Set(['x'])))).toEqual(new Set(['y']));
  });

  it('collects deps from all four condition arrays on the same field', () => {
    const engine = new ConditionEngine();
    engine.bindSchema([
      field('target', {
        showWhen: [{ field: 's', operator: 'equals', value: 1 }],
        hideWhen: [{ field: 'h', operator: 'equals', value: 1 }],
        requiredWhen: [{ field: 'r', operator: 'equals', value: 1 }],
        disabledWhen: [{ field: 'd', operator: 'equals', value: 1 }],
      }),
    ]);

    for (const k of ['s', 'h', 'r', 'd']) {
      expect(new Set(engine.affectedKeys(new Set([k])))).toEqual(new Set(['target']));
    }
  });

  it('reset() drops the graph', () => {
    const engine = new ConditionEngine();
    engine.bindSchema([field('b', { showWhen: [{ field: 'a', operator: 'equals', value: 1 }] })]);
    engine.reset();
    expect(engine.affectedKeys(null).size).toBe(0);
    expect(engine.affectedKeys(new Set(['a'])).size).toBe(0);
  });
});
