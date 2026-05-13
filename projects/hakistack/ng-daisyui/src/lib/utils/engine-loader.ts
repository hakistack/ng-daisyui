/**
 * Shared loader for the WASM engine module.
 *
 * All four engine services (`TableEngineService`, `TreeEngineService`,
 * `FuzzyEngineService`, `PdfSearchService`) call into this module so the
 * .wasm binary is fetched / decoded **once per app** and reused across
 * services — even though each service exposes a different slice of the
 * generated wasm-bindgen API.
 *
 * Two paths:
 *
 * 1. **Inline (default)** — the loader dynamic-imports
 *    `../wasm/engine_wasm_glue` (the wasm-pack glue, vendored as TS so
 *    ng-packagr bundles it into the FESM) and `../wasm/engine_wasm_inline`
 *    (a base64 string of `engine_wasm_bg.wasm`). It decodes the base64 and
 *    passes the resulting `Uint8Array` to the glue's `default()` initializer,
 *    skipping the HTTP fetch entirely. This is what makes the library
 *    "just work" on Vercel/Netlify/etc. with no public/ folder copying.
 *
 * 2. **URL override** — when a consumer provides a non-null
 *    `HK_TABLE_ENGINE_WASM_URL`, the loader instead `await import(url)`s the
 *    glue and lets it fetch `engine_wasm_bg.wasm` from the same folder.
 *    Use this when you'd rather have the binary as a separately cacheable
 *    asset than inside the library JS bundle.
 *
 * The result is cached at module scope, so the second engine service to ask
 * for the module gets the already-initialized exports synchronously.
 */

/** Minimal shape — the union of what all four services need from the module. */
export interface EngineModule {
  default: (input?: unknown) => Promise<unknown>;
  // The exports below are populated by wasm-bindgen in `engine_wasm_glue.ts`.
  // Each service casts the module to its own narrower interface.
  [key: string]: unknown;
}

let modPromise: Promise<EngineModule> | null = null;
let mod: EngineModule | null = null;

/**
 * Resolve the engine module, initializing it on first call.
 *
 * @param urlOverride  When non-null, fetch the glue from this URL instead of
 *                     using the inlined bundle. Pulled from
 *                     `HK_TABLE_ENGINE_WASM_URL` by the calling service.
 */
export async function loadEngineModule(urlOverride: string | null): Promise<EngineModule> {
  if (mod) return mod;
  modPromise ??= (async () => {
    const m = urlOverride ? await loadFromUrl(urlOverride) : await loadInlined();
    mod = m;
    return m;
  })();
  return modPromise;
}

/** True when the engine module has finished loading at least once. */
export function isEngineLoaded(): boolean {
  return mod !== null;
}

async function loadInlined(): Promise<EngineModule> {
  // Dynamic import → consumer's bundler typically emits these as async
  // chunks, so apps that never trigger an engine-routed feature don't pay
  // for the ~400 KB base64 in the initial bundle.
  const [glue, inline] = await Promise.all([import('../wasm/engine_wasm_glue'), import('../wasm/engine_wasm_inline')]);
  const bytes = decodeBase64(inline.ENGINE_WASM_BASE64);
  // wasm-pack >=0.13 prefers the object form; passing the buffer positionally
  // works but logs `"using deprecated parameters for the initialization function"`.
  await (glue as unknown as EngineModule).default({ module_or_path: bytes });
  return glue as unknown as EngineModule;
}

async function loadFromUrl(url: string): Promise<EngineModule> {
  let glue: EngineModule;
  try {
    // The variable-URL `import()` is intentional — `@vite-ignore` /
    // `webpackIgnore: true` tell bundlers not to try to resolve the path at
    // build time. The browser's native dynamic import handles it at runtime.
    glue = (await import(/* @vite-ignore */ /* webpackIgnore: true */ url)) as EngineModule;
  } catch (e) {
    throw new Error(
      `hakistack-engine WASM failed to load from "${url}". ` +
        `Make sure engine_wasm.js + engine_wasm_bg.wasm are served at that URL ` +
        `(typically by copying node_modules/@hakistack/ng-daisyui/wasm/* into your public/ folder), ` +
        `or remove the provideTableEngineWasmUrl(...) call to use the inlined default. ` +
        `Underlying error: ${(e as Error).message}`,
    );
  }
  // wasm-pack `web` target requires explicit init() to fetch + instantiate
  // the .wasm. With no argument, the glue resolves `engine_wasm_bg.wasm`
  // relative to its own URL.
  await glue.default();
  return glue;
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
