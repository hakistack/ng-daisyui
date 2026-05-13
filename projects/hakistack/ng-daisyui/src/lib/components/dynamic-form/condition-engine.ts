/**
 * `ConditionEngine` — pure-TS evaluator for `showWhen` / `hideWhen` /
 * `requiredWhen` / `disabledWhen` rules on `hk-dynamic-form` fields.
 *
 * This is the seam the Rust/WASM form engine will plug into (see
 * `hakistack-engine/crates/form-engine/README.md`).
 *
 * Two surfaces:
 *
 * - **Static evaluators** (`evaluateCondition` / `evaluateConditions`) — the
 *   raw operator dispatch. Pure functions over `(condition, values)`. Used
 *   by the component for actual visibility / required / disabled checks
 *   and by the dependency graph to test whether a rule has flipped.
 *
 * - **Instance dependency graph** (`bindSchema` + `affectedKeys`) — built
 *   once per form. Inverts the field → conditions relation so a value
 *   change on field X only triggers re-evaluation for fields whose rules
 *   reference X. Phase 2 (WASM) will own the same graph in Rust.
 *
 * The graph is conservative: fields whose conditions include a
 * `function`-operator predicate are always re-evaluated, because the
 * predicate may read external signals we can't statically inspect.
 */
import { FormGroup } from '@angular/forms';

import { ConditionalLogic, FormFieldConfig } from './dynamic-form.types';

export class ConditionEngine {
  /** field-key → keys of *form fields* whose values it reads. */
  private readonly fieldDeps = new Map<string, ReadonlySet<string>>();
  /** input-field-key → keys of fields that re-evaluate when that input changes. */
  private readonly dependents = new Map<string, Set<string>>();
  /** Fields with `function`-operator predicates: always re-evaluated. */
  private readonly alwaysReeval = new Set<string>();
  /** Every field that carries at least one condition. */
  private readonly conditionalFieldKeys = new Set<string>();

  /** Evaluate a single condition against the current form values. */
  static evaluateCondition(condition: ConditionalLogic, formValues: Record<string, unknown>, formGroup?: FormGroup): boolean {
    const fieldValue = formValues[condition.field];
    const conditionValue = condition.value;

    if (condition.operator === 'function') {
      if (typeof conditionValue !== 'function') return false;
      try {
        return (conditionValue as (v: unknown, vs: Record<string, unknown>, g?: FormGroup) => boolean)(fieldValue, formValues, formGroup);
      } catch {
        return false;
      }
    }

    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not-equals':
        return fieldValue !== conditionValue;
      case 'contains':
        return typeof fieldValue === 'string' && typeof conditionValue === 'string' && fieldValue.includes(conditionValue);
      case 'greater-than':
        return typeof fieldValue === 'number' && typeof conditionValue === 'number' && fieldValue > conditionValue;
      case 'less-than':
        return typeof fieldValue === 'number' && typeof conditionValue === 'number' && fieldValue < conditionValue;
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'not-in':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      default:
        return false;
    }
  }

  /** Evaluate an AND-aggregate of conditions. Empty list ⇒ `true`. */
  static evaluateConditions(conditions: readonly ConditionalLogic[], formValues: Record<string, unknown>, formGroup?: FormGroup): boolean {
    if (conditions.length === 0) return true;

    for (let i = 0, len = conditions.length; i < len; i++) {
      if (!ConditionEngine.evaluateCondition(conditions[i], formValues, formGroup)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Build the inverse field → rules index for the given form schema.
   * Idempotent — calling again clears the previous graph and rebuilds.
   */
  bindSchema(fields: readonly FormFieldConfig[]): void {
    this.fieldDeps.clear();
    this.dependents.clear();
    this.alwaysReeval.clear();
    this.conditionalFieldKeys.clear();

    for (let i = 0, len = fields.length; i < len; i++) {
      const f = fields[i];
      const hasAny =
        (f.showWhen?.length ?? 0) > 0 ||
        (f.hideWhen?.length ?? 0) > 0 ||
        (f.requiredWhen?.length ?? 0) > 0 ||
        (f.disabledWhen?.length ?? 0) > 0;
      if (!hasAny) continue;

      this.conditionalFieldKeys.add(f.key);
      const deps = new Set<string>();
      let hasFunc = false;

      this.collectDeps(f.showWhen, deps, () => (hasFunc = true));
      this.collectDeps(f.hideWhen, deps, () => (hasFunc = true));
      this.collectDeps(f.requiredWhen, deps, () => (hasFunc = true));
      this.collectDeps(f.disabledWhen, deps, () => (hasFunc = true));

      this.fieldDeps.set(f.key, deps);
      if (hasFunc) this.alwaysReeval.add(f.key);

      for (const d of deps) {
        let bucket = this.dependents.get(d);
        if (!bucket) {
          bucket = new Set();
          this.dependents.set(d, bucket);
        }
        bucket.add(f.key);
      }
    }
  }

  /** Drop the graph. Safe to call multiple times. */
  reset(): void {
    this.fieldDeps.clear();
    this.dependents.clear();
    this.alwaysReeval.clear();
    this.conditionalFieldKeys.clear();
  }

  /** True when the graph has been built and recognizes the field. */
  hasFieldConditions(fieldKey: string): boolean {
    return this.conditionalFieldKeys.has(fieldKey);
  }

  /**
   * Field keys whose visibility / required / disabled status may have
   * changed given the set of *just-changed* form field keys.
   *
   * - `dirty === null` ⇒ assume nothing about what changed; return every
   *   field with any condition (initial pass / unknown trigger).
   * - `dirty.size === 0` ⇒ no form value changed (likely an external
   *   signal tick); return only fields with function-operator predicates.
   * - otherwise ⇒ fields with deps intersecting `dirty`, plus every
   *   field with a function predicate (signal reads aren't tracked here).
   */
  affectedKeys(dirty: ReadonlySet<string> | null): ReadonlySet<string> {
    if (dirty === null) return this.conditionalFieldKeys;

    if (dirty.size === 0) return this.alwaysReeval;

    const out = new Set<string>(this.alwaysReeval);
    for (const k of dirty) {
      const bucket = this.dependents.get(k);
      if (!bucket) continue;
      for (const dep of bucket) out.add(dep);
    }
    return out;
  }

  private collectDeps(conditions: readonly ConditionalLogic[] | undefined, deps: Set<string>, markFunction: () => void): void {
    if (!conditions) return;
    for (let i = 0, len = conditions.length; i < len; i++) {
      const c = conditions[i];
      if (c.operator === 'function') markFunction();
      deps.add(c.field);
    }
  }
}
