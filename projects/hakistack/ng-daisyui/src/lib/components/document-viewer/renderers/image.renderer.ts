import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';

import { DocumentRendererInputs } from '../document-viewer.types';

/**
 * Native browser image renderer. Handles `.png`, `.jpg`, `.gif`, `.webp`,
 * `.bmp`, `.svg`, `.ico` — anything `<img>` can decode without help.
 *
 * For `Uint8Array`/`Blob` sources we create an object URL and revoke it
 * on destroy so the bytes can be GC'd. String URLs are used as-is.
 *
 * `image-special` formats (HEIC, TIFF, AVIF on older browsers) are *not*
 * handled here — they'll land in their own renderer in Phase 2 once we
 * have the Rust `image` crate compiled to WASM.
 */
@Component({
  selector: 'hk-document-image-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex justify-center bg-base-200 rounded p-4">
      <img [src]="resolvedUrl()" [alt]="filename() ?? 'image'" class="max-w-full h-auto object-contain" />
    </div>
  `,
  host: { class: 'block w-full' },
})
export class DocumentImageRenderer {
  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();

  /** Holds the URL we created for a Blob/Uint8Array source so we can revoke it. */
  private readonly objectUrl = signal<string | null>(null);

  /** What goes into `<img src>`. URLs pass through; blobs go through an object URL. */
  readonly resolvedUrl = computed(() => {
    const src = this.source();
    if (typeof src === 'string') return src;
    return this.objectUrl() ?? '';
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect(() => {
      const src = this.source();
      // Everything below reads AND writes `objectUrl`. Keep it untracked so the
      // only dependency is `source()` — otherwise revoking/setting the URL would
      // re-trigger this effect, which re-sets the URL, looping forever (a frozen
      // tab on any Blob/Uint8Array source).
      untracked(() => {
        // Revoke the prior object URL before creating a new one so we don't
        // leak memory when the source changes during the component's life.
        this.revokeObjectUrl();
        if (typeof src === 'string') return;

        // `new Blob([Uint8Array])` is valid at runtime; the cast keeps TS
        // happy across DOM lib variants that constrain BlobPart's buffer to
        // ArrayBuffer (excluding SharedArrayBuffer). Our bytes always come
        // from a plain ArrayBuffer-backed view (fetch + arrayBuffer), so the
        // distinction is benign.
        const blob = src instanceof Blob ? src : new Blob([src as BlobPart]);
        this.objectUrl.set(URL.createObjectURL(blob));
      });
    });

    destroyRef.onDestroy(() => this.revokeObjectUrl());
  }

  private revokeObjectUrl(): void {
    const url = this.objectUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrl.set(null);
    }
  }
}
