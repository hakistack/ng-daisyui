/**
 * Lifecycle-managed wrapper over the WASM `WasmFormEngine` instance.
 *
 * Mirrors `FuzzyHandle` / `TableHandle`: extends `DisposableHandle` so
 * the host component just calls `handle.dispose()` in `ngOnDestroy`
 * and never has to special-case post-dispose use.
 */
import { DisposableHandle } from '../../utils/disposable-handle';
import type { EngineEvent, FormEngineHandle } from './form-engine.types';
import { toWireValue, type PredicateEntry, type WireFormValue } from './schema-builder';

/**
 * Minimal shape of the wasm-pack-generated `WasmFormEngine`. Declared
 * inline so the library's `.d.ts` build doesn't depend on the WASM
 * bundle resolving at compile time.
 */
export interface WasmFormEngine {
  free(): void;
  field_count(): number;
  index_of(name: string): number;
  is_visible(field: number): boolean;
  is_required(field: number): boolean;
  is_disabled(field: number): boolean;
  set_value(field: number, value: WireFormValue): Uint32Array;
  set_values(pairs: Array<[number, WireFormValue]>): Uint32Array;
  recompute_all(): Uint32Array;
  register_predicate(id: number, evaluator: () => boolean): void;
  unregister_predicate(id: number): void;
}

// Event-kind tags must stay in lockstep with `form_engine::EventKind` in
// the Rust crate. The engine emits packed `(kind, field, payload)`
// triples; we decode them here.
const KIND_SHOWN = 0;
const KIND_HIDDEN = 1;
const KIND_REQUIRED_CHANGED = 2;
const KIND_DISABLED_CHANGED = 3;

export class FormHandle extends DisposableHandle implements FormEngineHandle {
  private readonly idxToName: string[];

  private constructor(
    private readonly wasm: WasmFormEngine,
    private readonly nameToIdx: Map<string, number>,
  ) {
    super();
    this.idxToName = new Array(nameToIdx.size);
    for (const [name, idx] of nameToIdx) this.idxToName[idx] = name;
  }

  /** @internal — use `FormEngineService.createForm`. */
  static _create(wasm: WasmFormEngine, nameToIdx: Map<string, number>, predicates: PredicateEntry[]): FormHandle {
    const handle = new FormHandle(wasm, nameToIdx);
    // Register every captured function-operator predicate. The thunk
    // closes over the registered `evaluator` so the engine resolves it
    // by id without crossing the boundary with field values.
    for (const p of predicates) {
      const evaluator = p.evaluator;
      const sourceField = p.sourceField;
      // Predicates receive the watched field's value plus the full
      // form values map. The thunk captures both via the closure the
      // caller passes through `consumeValuesGetter`; the default
      // (no getter wired) feeds `undefined` and `{}` to preserve the
      // try/catch-returns-false safety of the JS evaluator.
      wasm.register_predicate(p.id, () => {
        try {
          const getValues = handle._valuesGetter;
          const values = getValues ? getValues() : {};
          return !!evaluator(values[sourceField], values);
        } catch {
          return false;
        }
      });
    }
    return handle;
  }

  /**
   * Wire the values getter the predicate registry uses. The component
   * (or whatever owns the FormGroup) calls this once with a closure
   * that reads the *latest* form values — typically `() => form.value`.
   */
  bindValuesGetter(getter: (() => Record<string, unknown>) | null): void {
    this._valuesGetter = getter;
  }
  private _valuesGetter: (() => Record<string, unknown>) | null = null;

  protected override freeWasm(): void {
    this.wasm.free();
  }

  get fieldCount(): number {
    return this.guard(() => this.wasm.field_count(), 0);
  }

  isVisible(fieldKey: string): boolean {
    return this.guard(() => {
      const idx = this.nameToIdx.get(fieldKey);
      return idx === undefined ? true : this.wasm.is_visible(idx);
    }, true);
  }

  isRequired(fieldKey: string): boolean {
    return this.guard(() => {
      const idx = this.nameToIdx.get(fieldKey);
      return idx === undefined ? false : this.wasm.is_required(idx);
    }, false);
  }

  isDisabled(fieldKey: string): boolean {
    return this.guard(() => {
      const idx = this.nameToIdx.get(fieldKey);
      return idx === undefined ? false : this.wasm.is_disabled(idx);
    }, false);
  }

  setValue(fieldKey: string, value: unknown): EngineEvent[] {
    return this.guard(() => {
      const idx = this.nameToIdx.get(fieldKey);
      if (idx === undefined) return [];
      const packed = this.wasm.set_value(idx, toWireValue(value));
      return this.decodeEvents(packed);
    }, [] as EngineEvent[]);
  }

  setValues(patch: Record<string, unknown>): EngineEvent[] {
    return this.guard(() => {
      const pairs: Array<[number, WireFormValue]> = [];
      for (const key in patch) {
        const idx = this.nameToIdx.get(key);
        if (idx === undefined) continue;
        pairs.push([idx, toWireValue(patch[key])]);
      }
      if (pairs.length === 0) return [];
      const packed = this.wasm.set_values(pairs);
      return this.decodeEvents(packed);
    }, [] as EngineEvent[]);
  }

  recomputeAll(): EngineEvent[] {
    return this.guard(() => this.decodeEvents(this.wasm.recompute_all()), [] as EngineEvent[]);
  }

  registerPredicate(id: number, fn: () => boolean): void {
    this.guard(() => {
      this.wasm.register_predicate(id, fn);
      return undefined;
    }, undefined);
  }

  unregisterPredicate(id: number): void {
    this.guard(() => {
      this.wasm.unregister_predicate(id);
      return undefined;
    }, undefined);
  }

  private decodeEvents(packed: Uint32Array): EngineEvent[] {
    // Packed triples: [kind, field, payload, kind, field, payload, …]
    const len = packed.length;
    const out: EngineEvent[] = new Array(len / 3);
    let j = 0;
    for (let i = 0; i < len; i += 3) {
      const kind = packed[i];
      const fieldIdx = packed[i + 1];
      const payload = packed[i + 2];
      const fieldKey = this.idxToName[fieldIdx] ?? '';
      switch (kind) {
        case KIND_SHOWN:
          out[j++] = { kind: 'shown', field: fieldKey };
          break;
        case KIND_HIDDEN:
          out[j++] = { kind: 'hidden', field: fieldKey };
          break;
        case KIND_REQUIRED_CHANGED:
          out[j++] = { kind: 'required', field: fieldKey, value: payload === 1 };
          break;
        case KIND_DISABLED_CHANGED:
          out[j++] = { kind: 'disabled', field: fieldKey, value: payload === 1 };
          break;
        default:
          // Unknown kind: drop the slot rather than poison the array.
          break;
      }
    }
    out.length = j;
    return out;
  }
}
