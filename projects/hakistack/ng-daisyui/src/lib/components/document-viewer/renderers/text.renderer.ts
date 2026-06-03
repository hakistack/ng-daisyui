import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';

import { DocumentRendererInputs } from '../document-viewer.types';
import { loadSourceAsBytes } from '../document-viewer.helpers';

/**
 * Renders text-shaped formats: `.txt`, `.md`, `.csv`, `.log`, `.json`,
 * `.html`. Phase 1 implementation is a preformatted block; later phases
 * will route `.md` through a markdown renderer (marked + DOMPurify),
 * `.csv` to `<hk-table>`, and `.html` through a sandboxed iframe.
 *
 * Decoding strategy: UTF-8 first, with a one-shot Latin-1 fallback if
 * UTF-8 yields replacement characters. This handles the common Windows
 * `.log` files saved as cp1252 without dragging in a full encoding
 * detector.
 */
@Component({
  selector: 'hk-document-text-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="text-base-content/60 py-8 text-center text-sm">Loading…</div>
    } @else if (error(); as e) {
      <div class="alert alert-error">{{ e }}</div>
    } @else {
      <pre class="overflow-auto whitespace-pre-wrap break-words bg-base-200 rounded p-4 font-mono text-sm">{{ content() }}</pre>
    }
  `,
  host: { class: 'block w-full' },
})
export class DocumentTextRenderer {
  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly content = signal<string>('');

  constructor() {
    // Load + decode whenever the source changes. The `untracked` is unnecessary
    // here because the resolution chain is pure-async (no signal writes inside
    // the awaited path that we read after the await).
    effect(() => {
      const src = this.source();
      void this.decode(src);
    });
  }

  private async decode(src: DocumentRendererInputs['source']): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const bytes = await loadSourceAsBytes(src);
      this.content.set(decodeTextWithFallback(bytes));
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to load document.');
    } finally {
      this.loading.set(false);
    }
  }
}

/**
 * Decode bytes as UTF-8. If the result contains the Unicode replacement
 * character (U+FFFD), try Latin-1 instead — this catches Windows-1252
 * log files masquerading as text/plain. Not bulletproof (cp1252 is a
 * superset of Latin-1) but covers the 95% case without a full encoding
 * detector dep.
 */
function decodeTextWithFallback(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (!utf8.includes('�')) return utf8;
  try {
    return new TextDecoder('windows-1252', { fatal: false }).decode(bytes);
  } catch {
    return utf8; // browser without cp1252 support — best-effort UTF-8.
  }
}
