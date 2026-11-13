/**
 * Configuration tokens for the WASM table engine.
 *
 * **By default the engine is shipped inside the library's FESM bundle as a
 * base64-encoded blob** — apps don't have to copy any WASM files into their
 * `public/` folder, and deployments to Vercel / Netlify / etc. just work.
 *
 * `HK_TABLE_ENGINE_WASM_URL` is an opt-in escape hatch for consumers who
 * prefer to load the WASM as a separate (cacheable) HTTP asset. When set to
 * a non-null string, the loader fetches `engine_wasm.js` from that URL and
 * the glue resolves `engine_wasm_bg.wasm` from the same folder. When `null`
 * (the default), the loader uses the inlined bytes — no fetch.
 */

import { InjectionToken, type Provider } from '@angular/core';

/**
 * URL to load `engine_wasm.js` from. **Default: `null`** — meaning use the
 * library's inlined WASM bundle and skip the HTTP fetch entirely.
 *
 * Set via [`provideTableEngineWasmUrl`] to fetch the WASM as a separate file
 * (the file must be served from your deployment, e.g. by copying
 * `node_modules/@hakistack/ng-daisyui/wasm/engine_wasm.{js,_bg.wasm}` into
 * Angular's `public/` folder).
 */
export const HK_TABLE_ENGINE_WASM_URL = new InjectionToken<string | null>('HK_TABLE_ENGINE_WASM_URL', {
  providedIn: 'root',
  factory: () => null,
});

/**
 * Opt out of the inlined WASM bundle and load it from `url` at runtime
 * instead. Use this when you'd rather have the ~300 KB binary as a separately
 * cacheable HTTP asset than baked into the library's main JS bundle.
 */
export function provideTableEngineWasmUrl(url: string): Provider {
  return { provide: HK_TABLE_ENGINE_WASM_URL, useValue: url };
}
