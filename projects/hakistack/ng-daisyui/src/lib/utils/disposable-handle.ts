/**
 * Base class for WASM-backed handles (`TableHandle`, `TreeHandle`,
 * `FuzzyHandle`, `PdfSearchHandle`).
 *
 * All four handles share the same lifecycle: the host component captures the
 * handle into a local field; on input swap (data changed, doc swapped, …)
 * the component calls `handle.dispose()`. Without protection, any concurrent
 * captured reference that survived the swap and then calls into WASM throws
 * `"null pointer passed to rust"` because wasm-bindgen freed the heap
 * pointer.
 *
 * This base centralizes the boilerplate every handle used to repeat:
 *
 *   - `isDisposed` flag flipped exactly once
 *   - `dispose()` idempotent — second call is a no-op, not a double free
 *   - `guard(fn, fallback)` short-circuits every method body to a sensible
 *     fallback after dispose, so callers don't need try/catch
 *
 * SOLID:
 *   - **S**: each subclass focuses on its kernel-specific API, not lifecycle
 *   - **O**: lifecycle is closed for modification; subclasses extend by
 *     overriding `freeWasm()` and calling `guard()` from their methods
 *   - **L**: any handle is interchangeable through this base
 *   - **D**: the base depends only on the `freeWasm()` hook abstraction —
 *     it never sees the concrete wasm-bindgen object
 */
export abstract class DisposableHandle {
  private _disposed = false;

  /** True after `dispose()` has been called at least once. */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Release the underlying WASM-heap memory. Idempotent — calling twice is
   * safe and the second call is a no-op (the subclass's `freeWasm` only
   * runs once).
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.freeWasm();
  }

  /**
   * Short-circuit helper. Replaces the duplicated
   *   `if (this.disposed) return <fallback>;`
   * line at the top of every subclass method. After dispose this returns
   * the fallback without touching `wasm`, so calls into a freed pointer
   * are impossible.
   *
   * Stale-pointer safety: in addition to the explicit `_disposed` flag,
   * we also catch synchronous throws from `fn()`. wasm-bindgen throws
   * `"null pointer passed to rust"` when a handle's backing WASM memory
   * was freed without our `dispose()` running — this can happen via:
   *
   *   - the JS-side FinalizationRegistry reaping the inner wrapper after
   *     a `.then()` race orphans it (handleA captured locally, then
   *     `this.engineHandle = handleB` drops the only other strong ref,
   *     then GC fires before the captured caller's microtask resumes);
   *   - HMR / doc-swap races where the WASM module reinitializes;
   *   - any future wasm-bindgen internal cleanup we don't control.
   *
   * After catching, we flip `_disposed` to `true` so subsequent calls
   * short-circuit at the flag check and never re-enter the throw path.
   * The original error is rethrown for non-WASM exceptions so real bugs
   * still surface — only the known `"null pointer passed to rust"`
   * string (and the alternative `"recursive use of an object"`) are
   * swallowed.
   */
  protected guard<R>(fn: () => R, fallback: R): R {
    if (this._disposed) return fallback;
    try {
      return fn();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? '';
      if (msg.includes('null pointer passed to rust') || msg.includes('recursive use of an object')) {
        this._disposed = true;
        return fallback;
      }
      throw err;
    }
  }

  /** Subclass hook: free the concrete wasm-bindgen handle. Called exactly once. */
  protected abstract freeWasm(): void;
}
