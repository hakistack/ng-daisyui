import { Injectable, InjectionToken, Provider, inject } from '@angular/core';

import { ImageEngineModule, loadImageEngineModule } from '../utils/image-engine-loader';

/**
 * Optional override URL for the image-engine WASM bundle. Default `null`
 * uses the FESM-inlined base64 — works on any host with no public/ copy.
 *
 * Provide via [`provideImageEngineWasmUrl`].
 */
export const HK_IMAGE_ENGINE_WASM_URL = new InjectionToken<string | null>('HK_IMAGE_ENGINE_WASM_URL', {
  providedIn: 'root',
  factory: () => null,
});

/** Provider helper — bind once at the app root. */
export function provideImageEngineWasmUrl(url: string | null): Provider {
  return { provide: HK_IMAGE_ENGINE_WASM_URL, useValue: url };
}

/**
 * Façade over the image-engine WASM module.
 *
 * Phase 2 only exposes `decodeToPngBytes`. Future additions (downscale,
 * EXIF rotation correction, color-space conversion) slot in behind the
 * same service.
 */
@Injectable({ providedIn: 'root' })
export class ImageEngineService {
  private readonly urlOverride = inject(HK_IMAGE_ENGINE_WASM_URL);
  private modPromise: Promise<ImageEngineModule> | null = null;

  /** Load (or return cached) WASM module. Idempotent. */
  async load(): Promise<ImageEngineModule> {
    this.modPromise ??= loadImageEngineModule(this.urlOverride);
    return this.modPromise;
  }

  /** Engine version string. Useful smoke-test. */
  async version(): Promise<string> {
    const mod = await this.load();
    return mod.image_engine_version();
  }

  /**
   * Decode any supported format (TIFF, BMP, GIF, ICO, PNM, QOI, etc.)
   * and return PNG bytes ready to wrap in a `Blob`. Format is detected
   * by sniffing the input bytes — no need for the caller to pass a MIME
   * hint, which means wrong-extension files still work.
   */
  async decodeToPngBytes(bytes: Uint8Array): Promise<Uint8Array> {
    const mod = await this.load();
    return mod.decode_to_png(bytes);
  }

  /**
   * Convenience: decode bytes and wrap the result in a same-origin
   * `Blob` ready for `<img src="...">` via `URL.createObjectURL`. The
   * caller is responsible for revoking the URL when done — typically
   * in `DestroyRef.onDestroy`.
   */
  async decodeToPngBlob(bytes: Uint8Array): Promise<Blob> {
    const png = await this.decodeToPngBytes(bytes);
    return new Blob([png as BlobPart], { type: 'image/png' });
  }
}
