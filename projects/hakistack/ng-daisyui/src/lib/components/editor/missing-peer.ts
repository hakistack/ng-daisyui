/**
 * `@tiptap/*` are optional peers. esbuild only tolerates an unresolvable `import()` (an app that
 * never installed Tiptap) when the call itself has a `.catch()` — a surrounding try/catch is not
 * enough — so every Tiptap import goes through this pass-through handler.
 */
export function rethrowMissingPeer(error: unknown): never {
  throw error;
}
