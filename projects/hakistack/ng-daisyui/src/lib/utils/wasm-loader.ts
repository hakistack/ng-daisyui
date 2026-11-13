/**
 * Shared helpers for the lazy WASM loaders (`engine-loader`, `image-engine-loader`,
 * `document-engine-loader`, `libheif-loader`). Each loader used to carry its own copy of these.
 */

/** Decode the base64 string emitted by `scripts/build-wasm.mjs` into raw WASM bytes. */
export function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Run an async initializer at most once while it succeeds. Concurrent callers share the
 * in-flight promise; a REJECTED attempt is forgotten so the next call retries (a single flaky
 * chunk fetch used to disable the engine until the page was reloaded).
 */
export function onceAsync<A extends unknown[], T>(init: (...args: A) => Promise<T>): (...args: A) => Promise<T> {
  let pending: Promise<T> | null = null;
  return (...args: A) => {
    pending ??= init(...args).catch((err: unknown) => {
      pending = null;
      throw err;
    });
    return pending;
  };
}
