/**
 * Configuration tokens for the WASM table engine.
 *
 * Apps consume the engine via `TableEngineService`, which lazy-imports the
 * generated `engine_wasm.js` glue at runtime. The URL is injected so apps
 * can decide where the bundle lives in their deployment — typically
 * `/assets/engine_wasm.js` after copying the file from
 * `node_modules/@hakistack/ng-daisyui/wasm/engine_wasm.js` into their
 * `src/assets/` folder (or via an `angular.json` asset glob).
 */

import { InjectionToken, type Provider } from '@angular/core';

/** URL the runtime imports `engine_wasm.js` from. Default: `/engine_wasm.js`
 *  (served from Angular's `public/` folder when the consumer copies the file
 *  there). Override via [`provideTableEngineWasmUrl`] for any other layout. */
export const HK_TABLE_ENGINE_WASM_URL = new InjectionToken<string>('HK_TABLE_ENGINE_WASM_URL', {
  providedIn: 'root',
  factory: () => '/engine_wasm.js',
});

/** Convenience provider for a custom WASM bundle URL. */
export function provideTableEngineWasmUrl(url: string): Provider {
  return { provide: HK_TABLE_ENGINE_WASM_URL, useValue: url };
}
