import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';

import { ImageEngineService } from '../../../services/image-engine.service';
import { LibheifService } from '../../../services/libheif.service';
import { DocumentRendererInputs, ResolvedFormat } from '../document-viewer.types';
import { loadSourceAsBytes } from '../document-viewer.helpers';

/**
 * Renderer for image formats the browser **can't** decode natively.
 * Internally dispatches based on the detected format:
 *
 *   1. **HEIC / HEIF** — three-tier fallback chain:
 *
 *      a. **In-tree libheif WASM** (preferred). Loaded via
 *         [`LibheifService`] when `npm run libheif:build` has been run.
 *         Smallest, no third-party deps.
 *      b. **`heic2any` peer dep**. Used when (a) isn't available but
 *         the consumer has installed `heic2any`. Larger, still works.
 *      c. **Clean install hint** showing both options. Used when
 *         neither is available.
 *
 *   2. **Everything else (TIFF, BMP, GIF, ICO, PNM, QOI)** — routed to
 *      the in-tree Rust `image-engine` WASM bundle. Pure-Rust decoder,
 *      no peer deps, decodes → PNG → Blob URL.
 *
 * Common image formats (`.png`, `.jpg`, `.webp`, `.avif` on modern
 * browsers) go through the native `<img>`-based [`DocumentImageRenderer`]
 * instead — no decoder cost when the browser already handles them.
 */
@Component({
  selector: 'hk-document-image-special-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="text-base-content/60 py-8 text-center text-sm">{{ loadingMessage() }}</div>
    } @else if (error(); as e) {
      <div class="alert alert-error whitespace-pre-line">{{ e }}</div>
    } @else if (objectUrl(); as url) {
      <div class="flex justify-center bg-base-200 rounded p-4">
        <img [src]="url" [alt]="filename() ?? 'image'" class="max-w-full h-auto object-contain" />
      </div>
    }
  `,
  host: { class: 'block w-full' },
})
export class DocumentImageSpecialRenderer {
  private readonly engine = inject(ImageEngineService);
  private readonly libheif = inject(LibheifService);

  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();

  readonly loading = signal(true);
  readonly loadingMessage = signal('Decoding image…');
  readonly error = signal<string | null>(null);
  readonly objectUrl = signal<string | null>(null);

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect(() => {
      const src = this.source();
      this.format();
      // `decode()` reads and writes the renderer's own signals (objectUrl via
      // revoke, loading, error). Run it untracked so the effect depends only on
      // `source()`/`format()` — otherwise the objectUrl write would re-trigger
      // the effect and loop forever.
      untracked(() => void this.decode(src));
    });

    destroyRef.onDestroy(() => this.revokeObjectUrl());
  }

  private async decode(src: DocumentRendererInputs['source']): Promise<void> {
    // Revoke any prior URL before starting a new decode so we don't leak
    // if the source changes faster than decoding can complete.
    this.revokeObjectUrl();
    this.loading.set(true);
    this.loadingMessage.set('Decoding image…');
    this.error.set(null);

    try {
      const bytes = await loadSourceAsBytes(src);
      const heic = isHeicLikeFormat(this.format()) || sniffHeicMagic(bytes);
      const blob = heic ? await this.decodeHeic(bytes) : await this.engine.decodeToPngBlob(bytes);
      this.objectUrl.set(URL.createObjectURL(blob));
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to decode image.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Decode HEIC/HEIF with the in-tree libheif WASM if available,
   * falling back to the `heic2any` peer dep, and finally to a clean
   * install-hint error.
   */
  private async decodeHeic(bytes: Uint8Array): Promise<Blob> {
    if (await this.libheif.isAvailable()) {
      this.loadingMessage.set('Decoding HEIC (in-tree libheif)…');
      return this.libheif.decodeHeicToPngBlob(bytes);
    }
    return this.decodeViaHeic2Any(bytes);
  }

  /**
   * Fallback decode path using the `heic2any` peer dep. The dynamic
   * import keeps `heic2any` (+ its internal ~1.5 MB libheif.js worker)
   * out of the initial bundle — apps that never open HEIC pay nothing.
   *
   * When the peer dep isn't installed AND the in-tree libheif build
   * hasn't been run, the `import()` rejects with a module-resolution
   * error and we surface both install paths so the user (or app
   * developer) sees what to do next.
   */
  private async decodeViaHeic2Any(bytes: Uint8Array): Promise<Blob> {
    this.loadingMessage.set('Loading HEIC decoder (heic2any)…');
    let heic2any: (opts: { blob: Blob; toType?: string; quality?: number }) => Promise<Blob | Blob[]>;
    try {
      heic2any = (await import('heic2any')).default;
    } catch (e) {
      throw new Error(
        'HEIC support unavailable. Pick one:\n' +
          '  • Build the in-tree libheif WASM:  npm run libheif:build  ' +
          '(see hakistack-engine/external/libheif-wasm/README.md for prereqs)\n' +
          '  • Or install the heic2any peer dep:  npm install heic2any\n\n' +
          `Underlying error: ${(e as Error).message ?? e}`,
      );
    }

    this.loadingMessage.set('Decoding HEIC…');
    const input = new Blob([bytes as BlobPart], { type: 'image/heic' });
    const result = await heic2any({ blob: input, toType: 'image/jpeg', quality: 0.92 });
    // heic2any returns `Blob | Blob[]` — the array form is for multi-image
    // HEIC containers (e.g. live photos). Take the first frame; rendering
    // every frame as a strip is out of scope for the static viewer.
    return Array.isArray(result) ? result[0] : result;
  }

  private revokeObjectUrl(): void {
    const url = this.objectUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrl.set(null);
    }
  }
}

/**
 * HEIC by extension or MIME type. Cheap pre-check before sniffing bytes.
 *
 * Exported (rather than file-local) for unit tests — the dispatch logic
 * is a frequent source of subtle bugs ("wrong renderer chosen for
 * .HEIC vs .heic") and is much easier to cover as a pure function.
 */
export function isHeicLikeFormat(format: ResolvedFormat): boolean {
  if (format.extension === '.heic' || format.extension === '.heif') return true;
  if (format.mimeType?.startsWith('image/heic') || format.mimeType?.startsWith('image/heif')) return true;
  return false;
}

/**
 * Sniff HEIC magic bytes. HEIC files are ISO Base Media File Format
 * containers — the bytes at offset 4-7 are always `'ftyp'`, and bytes
 * 8-11 hold a four-character brand identifying the specific dialect:
 *
 *   heic, heix, hevc, hevx, heim, heis, hevm, hevs  — single-image HEIC
 *   mif1, msf1                                      — generic HEIF brands
 *   hei2                                            — HEIF with HEVC
 *
 * Sniffing handles the wrong-extension case (e.g. `.jpg` that's really a
 * HEIC from a misconfigured tool) and lets the renderer dispatch
 * correctly when the consumer doesn't pass a `filename` hint.
 */
export function sniffHeicMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (bytes[4] !== 0x66 || bytes[5] !== 0x74 || bytes[6] !== 0x79 || bytes[7] !== 0x70) return false;
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  return ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1', 'hei2'].includes(brand);
}
