import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';

import { DocumentRendererInputs } from '../document-viewer.types';
import { loadSourceAsBytes } from '../document-viewer.helpers';

/**
 * Renderer for `.html` / `.htm` documents.
 *
 * Approach: load the bytes, decode as UTF-8 (with cp1252 fallback for
 * legacy Windows-saved files), optionally sanitize via DOMPurify if the
 * consumer has it installed, and render the result inside a **sandboxed
 * iframe** (`srcdoc` + `sandbox=""` with no allow-* flags). The sandbox
 * with no permissions effectively turns the iframe into a static-page
 * renderer — no JS execution, no top-level navigation, no popups, no
 * cookie/localStorage access, no forms.
 *
 * Defense layers (so each one alone wouldn't be sufficient, but together
 * cover the common attack surfaces):
 *
 *   1. **Sanitization** (DOMPurify, optional) strips `<script>`,
 *      `javascript:` URLs, event handlers, etc. before the HTML ever
 *      reaches the iframe. When the peer dep is absent we skip this
 *      step but warn at debug level.
 *   2. **Sandbox attribute** prevents script execution, top-level
 *      navigation, etc. — the iframe behaves like a paused web view.
 *   3. **Object URL** for the iframe `src` (alternative to `srcdoc`)
 *      isolates the document into an opaque blob origin so even a
 *      same-origin sandbox bypass leaks nothing about the host page.
 *
 * We use `srcdoc` here because it makes the document a same-origin
 * sibling of the host page — but the sandbox attribute defangs the
 * usual same-origin risks. If you ever loosen the sandbox to include
 * `allow-same-origin`, switch to a `blob:` object URL instead.
 */
@Component({
  selector: 'hk-document-html-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="text-base-content/60 py-8 text-center text-sm">Loading…</div>
    } @else if (error(); as e) {
      <div class="alert alert-error">{{ e }}</div>
    } @else if (rawHtml(); as html) {
      <!--
        [attr.srcdoc] sidesteps Angular's per-property security strip
        (which would treat srcdoc as a resource URL and refuse the
        binding). The sandbox="" attribute is the real defense — empty
        value means no allow-* permissions, so the iframe can't run
        JS, navigate, or read storage. DOMPurify (if installed) ran
        first as belt-and-suspenders.
      -->
      <iframe
        [attr.srcdoc]="html"
        sandbox=""
        [title]="filename() ?? 'HTML document'"
        class="w-full min-h-[50vh] border border-base-content/10 rounded"
        loading="lazy"
        referrerpolicy="no-referrer"
      ></iframe>
    }
  `,
  host: { class: 'block w-full' },
})
export class DocumentHtmlRenderer {
  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rawHtml = signal<string>('');

  constructor() {
    effect(() => {
      const src = this.source();
      void this.decode(src);
    });
  }

  private async decode(src: DocumentRendererInputs['source']): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.rawHtml.set('');
    try {
      const bytes = await loadSourceAsBytes(src);
      const raw = decodeTextWithFallback(bytes);
      const sanitized = await sanitizeHtml(raw);
      this.rawHtml.set(sanitized);
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to load HTML.');
    } finally {
      this.loading.set(false);
    }
  }
}

/**
 * UTF-8 first with a Windows-1252 fallback for legacy `.html` saved on
 * Windows. Same strategy as the text renderer — see comment there.
 */
function decodeTextWithFallback(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (!utf8.includes('�')) return utf8;
  try {
    return new TextDecoder('windows-1252', { fatal: false }).decode(bytes);
  } catch {
    return utf8;
  }
}

/**
 * Sanitize HTML with DOMPurify when it's available as an optional peer
 * dep, otherwise pass through unchanged. The sandbox attribute is the
 * primary defense — DOMPurify is belt-and-suspenders for hosts that
 * may relax the sandbox in the future.
 */
async function sanitizeHtml(raw: string): Promise<string> {
  try {
    const mod = await import('dompurify');
    const DOMPurify = (mod.default ?? mod) as typeof import('dompurify').default;
    return DOMPurify.sanitize(raw, {
      // Allow rich inline styles but strip event handlers + script.
      // The sandbox attribute below would catch these anyway, but
      // DOMPurify ensures `view-source:` and developer tools see clean
      // HTML.
      ALLOW_UNKNOWN_PROTOCOLS: false,
      USE_PROFILES: { html: true },
    });
  } catch {
    if (typeof console !== 'undefined') {
      console.debug(
        '[hk-document-viewer] DOMPurify not installed; HTML rendered through sandbox-only defense. Install with: npm install dompurify',
      );
    }
    return raw;
  }
}
