import { Injectable } from '@angular/core';

import { LibheifModule, tryLoadLibheif } from '../utils/libheif-loader';

/**
 * Façade over the in-tree libheif WASM module
 * (Rust `libheif-bridge` crate → `wasm32-unknown-emscripten`, linked
 * against pre-built libde265.a + libheif.a — see
 * `hakistack-engine/external/libheif-wasm/README.md`).
 *
 * Always safe to inject even when the build hasn't been run —
 * `isAvailable()` resolves to `false`, letting callers fall back to
 * the `heic2any` peer dep instead of throwing module-not-found.
 */
@Injectable({ providedIn: 'root' })
export class LibheifService {
  private resolvedModule: LibheifModule | null | undefined;

  /**
   * `true` when the in-tree libheif WASM artifacts are present and
   * loadable. Resolves lazily on first call; cached afterward.
   */
  async isAvailable(): Promise<boolean> {
    if (this.resolvedModule === undefined) {
      this.resolvedModule = await tryLoadLibheif();
    }
    return this.resolvedModule !== null;
  }

  /** Linked libheif version string, e.g. `"1.18.2"`. Throws if unavailable. */
  async version(): Promise<string> {
    const mod = await this.requireModule();
    return mod.libheif_version();
  }

  /**
   * Decode HEIC/HEIF bytes to a PNG `Blob` ready for `<img src>`. PNG
   * conversion is done browser-side via OffscreenCanvas (in workers)
   * or a regular `<canvas>` (main thread) — `canvas.toBlob('image/png')`
   * is well-supported across modern browsers.
   *
   * Throws if the in-tree libheif build hasn't been run. Callers should
   * check `isAvailable()` first and route to a fallback.
   */
  async decodeHeicToPngBlob(bytes: Uint8Array): Promise<Blob> {
    const mod = await this.requireModule();
    const { width, height, rgba } = mod.decode(bytes);
    return rgbaToPngBlob(rgba, width, height);
  }

  private async requireModule(): Promise<LibheifModule> {
    if (this.resolvedModule === undefined) {
      await this.isAvailable();
    }
    if (!this.resolvedModule) {
      throw new Error(
        'libheif WASM module not available. Build with: npm run libheif:build  ' +
          '(requires Emscripten + the `wasm32-unknown-emscripten` Rust target — ' +
          'see hakistack-engine/external/libheif-wasm/README.md).',
      );
    }
    return this.resolvedModule;
  }
}

/**
 * Convert a packed RGBA buffer to a PNG `Blob` via the Canvas API.
 *
 * `OffscreenCanvas` is preferred (works in workers, doesn't touch the
 * DOM), but falls back to a detached `<canvas>` on older browsers. The
 * detached canvas is GC'd as soon as the Blob is produced — no need
 * to attach to the DOM.
 */
async function rgbaToPngBlob(rgba: Uint8Array, width: number, height: number): Promise<Blob> {
  const expected = width * height * 4;
  if (rgba.byteLength !== expected) {
    throw new Error(`libheif: RGBA buffer size mismatch (got ${rgba.byteLength}, expected ${expected} for ${width}×${height})`);
  }

  // `new Uint8ClampedArray(typedArray)` allocates a fresh
  // `ArrayBuffer`-backed view (copy), which dodges the `SharedArrayBuffer`
  // variance in modern TS DOM libs that rejects views over the raw
  // `rgba.buffer`. The copy is a single memcpy — negligible vs the
  // canvas + PNG encoding work that follows.
  const clamped = new Uint8ClampedArray(rgba);
  const imageData = new ImageData(clamped, width, height);

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('OffscreenCanvas 2d context unavailable');
    ctx.putImageData(imageData, 0, 0);
    return canvas.convertToBlob({ type: 'image/png' });
  }

  // Main-thread fallback. Detached canvas — no DOM attachment needed
  // for `toBlob` to work.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.putImageData(imageData, 0, 0);

  return new Promise<Blob>((resolveBlob, rejectBlob) => {
    canvas.toBlob((blob) => (blob ? resolveBlob(blob) : rejectBlob(new Error('canvas.toBlob returned null'))), 'image/png');
  });
}
