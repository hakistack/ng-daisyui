/**
 * Shared loader for the **document** WASM bundle.
 *
 * This is a sibling of `engine-loader.ts` for a separate WASM crate
 * (`document-wasm`) that ships calamine and friends. Keeping it isolated
 * means:
 *
 * - Apps that only use `<hk-table>` never pay the calamine binary cost
 *   (engine_wasm stays lean).
 * - Document parsing can grow new heavy formats (.docx renderer, .pptx
 *   slide engine, eventually LibreOffice WASM glue) without ballooning
 *   the table engine bundle.
 *
 * Mirrors `engine-loader.ts`'s two-mode design exactly:
 *
 * 1. **Inline (default)** — dynamic-imports the glue + base64 inline TS
 *    siblings that ng-packagr bundles into the FESM. No HTTP fetch.
 *
 * 2. **URL override** — when a consumer provides a non-null override URL,
 *    the loader `await import(url)`s the glue and lets it fetch
 *    `document_wasm_bg.wasm` from the same folder. Useful when consumers
 *    prefer the binary as a separately cacheable asset.
 *
 * The result is module-scope cached.
 */

/** Minimal shape — the union of what document services need from the module. */
export interface DocumentEngineModule {
  default: (input?: unknown) => Promise<unknown>;
  document_engine_version: () => string;
  parse_spreadsheet: (bytes: Uint8Array) => unknown;
  [key: string]: unknown;
}

let modPromise: Promise<DocumentEngineModule> | null = null;
let mod: DocumentEngineModule | null = null;

/**
 * Resolve the document engine module, initializing it on first call.
 *
 * @param urlOverride  When non-null, fetch the glue from this URL instead of
 *                     using the inlined bundle.
 */
export async function loadDocumentEngineModule(urlOverride: string | null): Promise<DocumentEngineModule> {
  if (mod) return mod;
  modPromise ??= (async () => {
    const m = urlOverride ? await loadFromUrl(urlOverride) : await loadInlined();
    mod = m;
    return m;
  })();
  return modPromise;
}

/** True when the document engine module has finished loading at least once. */
export function isDocumentEngineLoaded(): boolean {
  return mod !== null;
}

async function loadInlined(): Promise<DocumentEngineModule> {
  // Dynamic import → consumer's bundler emits these as async chunks, so
  // apps that never mount <hk-document-viewer> don't pay for the
  // calamine base64 in their initial bundle.
  const [glue, inline] = await Promise.all([
    import('../wasm/document/document_wasm_glue'),
    import('../wasm/document/document_wasm_inline'),
  ]);
  const bytes = decodeBase64((inline as { DOCUMENT_WASM_BASE64: string }).DOCUMENT_WASM_BASE64);
  // wasm-pack >=0.13 prefers the object form; passing the buffer positionally
  // works but logs a deprecation warning.
  await (glue as unknown as DocumentEngineModule).default({ module_or_path: bytes });
  return glue as unknown as DocumentEngineModule;
}

async function loadFromUrl(url: string): Promise<DocumentEngineModule> {
  let glue: DocumentEngineModule;
  try {
    glue = (await import(/* @vite-ignore */ /* webpackIgnore: true */ url)) as DocumentEngineModule;
  } catch (e) {
    throw new Error(
      `hakistack document-engine WASM failed to load from "${url}". ` +
        `Make sure document_wasm.js + document_wasm_bg.wasm are served at that URL ` +
        `(typically by copying node_modules/@hakistack/ng-daisyui/wasm/document/* into your public/ folder), ` +
        `or remove the override to use the inlined default. ` +
        `Underlying error: ${(e as Error).message}`,
    );
  }
  await glue.default();
  return glue;
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
