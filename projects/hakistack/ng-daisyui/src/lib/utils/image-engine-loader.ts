import { decodeBase64, onceAsync } from './wasm-loader';

/**
 * Shared loader for the **image** WASM bundle.
 *
 * Sibling of `engine-loader.ts` and `document-engine-loader.ts`. Each
 * bundle is loaded independently so apps pay only for the renderers they
 * actually use:
 *
 *   - hk-table only         → engine_wasm
 *   - hk-document-viewer +
 *     spreadsheet           → engine_wasm + document_wasm
 *   - hk-document-viewer +
 *     TIFF/AVIF             → engine_wasm + image_wasm
 *
 * Two-mode design (inline default + URL override) mirrors the other
 * loaders so consumer expectations stay consistent across bundles.
 */

export interface ImageEngineModule {
  default: (input?: unknown) => Promise<unknown>;
  image_engine_version: () => string;
  decode_to_png: (bytes: Uint8Array) => Uint8Array;
  [key: string]: unknown;
}

let mod: ImageEngineModule | null = null;

/** First successful load wins; a failed load is retried on the next call (see `onceAsync`). */
const loadOnce = /* @__PURE__ */ onceAsync(async (urlOverride: string | null): Promise<ImageEngineModule> => {
  const m = urlOverride ? await loadFromUrl(urlOverride) : await loadInlined();
  mod = m;
  return m;
});

/**
 * Resolve the image engine module, initializing it on first call.
 *
 * @param urlOverride  When non-null, fetch the glue from this URL instead of
 *                     using the inlined bundle.
 */
export async function loadImageEngineModule(urlOverride: string | null): Promise<ImageEngineModule> {
  if (mod) return mod;
  return loadOnce(urlOverride);
}

/** True when the image engine module has finished loading at least once. */
export function isImageEngineLoaded(): boolean {
  return mod !== null;
}

async function loadInlined(): Promise<ImageEngineModule> {
  const [glue, inline] = await Promise.all([import('../wasm/image/image_wasm_glue'), import('../wasm/image/image_wasm_inline')]);
  const bytes = decodeBase64((inline as { IMAGE_WASM_BASE64: string }).IMAGE_WASM_BASE64);
  await (glue as unknown as ImageEngineModule).default({ module_or_path: bytes });
  return glue as unknown as ImageEngineModule;
}

async function loadFromUrl(url: string): Promise<ImageEngineModule> {
  let glue: ImageEngineModule;
  try {
    glue = (await import(/* @vite-ignore */ /* webpackIgnore: true */ url)) as ImageEngineModule;
  } catch (e) {
    throw new Error(
      `hakistack image-engine WASM failed to load from "${url}". ` +
        `Make sure image_wasm.js + image_wasm_bg.wasm are served at that URL ` +
        `(the package inlines the engine, so a URL override needs the wasm-bindgen output built with ` +
        `\`npm run build:engine\` in the ng-daisyui repository, copied into your public/ folder), ` +
        `or remove the override to use the inlined default. ` +
        `Underlying error: ${(e as Error).message}`,
    );
  }
  await glue.default();
  return glue;
}
