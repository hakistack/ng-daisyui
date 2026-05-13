/**
 * Public TypeScript surface for the WASM form engine. Mirrors the
 * `form-engine` Rust kernel one-to-one. The Angular adapter
 * (`FormEngineService` + `FormEngineHandle`) sits on top.
 */

/** Three boolean axes the engine tracks per field. */
export type EngineEventKind = 'shown' | 'hidden' | 'required' | 'disabled';

/**
 * One observable transition emitted by `setValue` / `setValues` /
 * `recomputeAll`. The `field` is the original `FormFieldConfig.key`
 * the consumer registered; the engine does the index ↔ name mapping.
 *
 * - `kind: 'shown'   | 'hidden'`   — visibility flipped
 * - `kind: 'required' | 'disabled'` — that axis flipped, `value`
 *    carries the new boolean state.
 */
export type EngineEvent =
  | { kind: 'shown'; field: string }
  | { kind: 'hidden'; field: string }
  | { kind: 'required'; field: string; value: boolean }
  | { kind: 'disabled'; field: string; value: boolean };

/**
 * Lifecycle-managed handle to one form's engine instance.
 *
 * Hold one per `<hk-dynamic-form>` and call `dispose()` in
 * `ngOnDestroy` (the `DisposableHandle` base class guarantees the
 * underlying `WasmFormEngine.free()` runs exactly once).
 *
 * `setValue` / `setValues` return only the *observable* transitions;
 * an empty array means "nothing changed", and the caller can skip
 * downstream change-detection work.
 */
export interface FormEngineHandle {
  readonly fieldCount: number;
  /** True after `dispose()` has been called. */
  readonly isDisposed: boolean;

  setValue(fieldKey: string, value: unknown): EngineEvent[];
  setValues(patch: Record<string, unknown>): EngineEvent[];

  isVisible(fieldKey: string): boolean;
  isRequired(fieldKey: string): boolean;
  isDisabled(fieldKey: string): boolean;

  /**
   * Full pass. Use when an external signal moved (no form-value diff
   * available) and `function`-operator predicate fields must be
   * re-checked — they may read state the engine doesn't track.
   */
  recomputeAll(): EngineEvent[];

  /**
   * Register a `function`-operator predicate. `id` matches whatever
   * the schema-builder assigned for that condition; `fn` is a
   * zero-arg thunk the consumer wires so it reads the latest form
   * values from its own closure.
   */
  registerPredicate(id: number, fn: () => boolean): void;
  unregisterPredicate(id: number): void;

  /**
   * Bind the values getter the engine uses when resolving
   * `function`-operator predicates. The getter is called inside the
   * Rust → JS bridge; the thunk for each predicate reads this to
   * pass the current `formValues` to the user's evaluator.
   *
   * Pass `null` to clear (e.g. on disposal).
   */
  bindValuesGetter(getter: (() => Record<string, unknown>) | null): void;

  dispose(): void;
}
