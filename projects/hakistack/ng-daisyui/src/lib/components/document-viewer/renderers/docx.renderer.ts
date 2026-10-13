import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, signal, viewChild } from '@angular/core';

import { DocumentRendererInputs } from '../document-viewer.types';
import { loadSourceAsBytes } from '../document-viewer.helpers';
import { DocumentViewerHost } from '../document-viewer-host';

/**
 * Renderer for `.docx` (Office Open XML) documents.
 *
 * Lazy-imports the optional `docx-preview` peer dep. The lib renders
 * directly into a DOM container we provide — we hand it our `#mount`
 * element and let it produce the styled output. This is different from
 * the other renderers (which load bytes → string/blob and bind it
 * declaratively) because `docx-preview` owns the rendering loop and
 * needs a host element.
 *
 * docx-preview gives us:
 *   - Paragraphs, lists, tables, headings, basic styles
 *   - Embedded images (via blob URLs)
 *   - Header / footer rendering
 *   - Page breaks (visualized as separators in the flow)
 *
 * It does NOT handle: embedded charts, SmartArt, OLE objects, complex
 * field codes. Consumers needing higher fidelity should route to
 * LibreOffice WASM (future work).
 *
 * Container cleanup: `docx-preview` doesn't expose a `dispose()` API
 * — it relies on the host element going out of scope. We clear the
 * container's children when the source changes so memory is bounded
 * to one document at a time.
 */
@Component({
  selector: 'hk-document-docx-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="text-base-content/60 py-8 text-center text-sm">Rendering DOCX…</div>
    } @else if (error(); as e) {
      <div class="alert alert-error whitespace-pre-line">{{ e }}</div>
    }
    <!-- Always-mounted container so docx-preview can find it when
         rendering finishes — even during the loading state. We hide
         via visibility (not display:none) so layout stays stable. -->
    <div
      #mount
      class="bg-base-100 p-4 rounded border border-base-content/10 overflow-auto"
      [style.visibility]="loading() || error() ? 'hidden' : 'visible'"
    ></div>
  `,
  host: { class: 'block w-full' },
})
export class DocumentDocxRenderer {
  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private readonly mount = viewChild.required<ElementRef<HTMLElement>>('mount');
  /** In a workspace: the rendered pages are its sections. */
  private readonly host = inject(DocumentViewerHost, { optional: true });
  private pageObserver: IntersectionObserver | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect(() => {
      const src = this.source();
      void this.render(src);
    });

    // On destroy, drop the rendered DOM so any blob URLs docx-preview
    // created for embedded images become eligible for revocation by
    // the browser's GC. (docx-preview doesn't expose explicit
    // disposal, so this is the cleanest we can do.)
    destroyRef.onDestroy(() => {
      this.pageObserver?.disconnect();
      this.clearMount();
    });
    this.host?.onGoTo((id) => this.pages()[Number(id)]?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }

  private async render(src: DocumentRendererInputs['source']): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.clearMount();

    try {
      const bytes = await loadSourceAsBytes(src);

      let docxPreview: typeof import('docx-preview');
      try {
        docxPreview = await import('docx-preview');
      } catch (e) {
        throw new Error(
          'DOCX rendering requires the optional peer dependency `docx-preview`.\n' +
            'Install it:  npm install docx-preview\n\n' +
            `Underlying error: ${(e as Error).message ?? e}`,
        );
      }

      const blob = new Blob([bytes as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const container = this.mount().nativeElement;

      await docxPreview.renderAsync(blob, container, undefined, {
        // Sensible defaults — render full document, skip experimental
        // CSS that mostly breaks on small viewports.
        className: 'hk-docx',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        experimental: false,
        trimXmlDeclaration: true,
        useBase64URL: false,
      });
      this.publishPages();
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to render DOCX.');
    } finally {
      this.loading.set(false);
    }
  }

  /** docx-preview's rendered pages (`breakPages`). */
  private pages(): HTMLElement[] {
    try {
      return Array.from(this.mount().nativeElement.querySelectorAll<HTMLElement>('section.hk-docx'));
    } catch {
      return [];
    }
  }

  /** Tell the workspace about the pages, and which one is on screen as the user scrolls. */
  private publishPages(): void {
    const host = this.host;
    if (!host) return;
    const pages = this.pages();
    host.sections.set(pages.map((_, i) => ({ id: String(i), label: `Page ${i + 1}`, kind: 'page' as const })));
    host.current.set(pages.length ? '0' : null);
    host.metadata.set([{ label: 'Pages', value: String(pages.length) }]);
    this.pageObserver?.disconnect();
    if (typeof IntersectionObserver === 'undefined' || pages.length < 2) return;
    this.pageObserver = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) host.current.set(String(pages.indexOf(top.target as HTMLElement)));
      },
      { threshold: 0.5 },
    );
    for (const page of pages) this.pageObserver.observe(page);
  }

  private clearMount(): void {
    // `viewChild.required` throws if accessed before the view is ready;
    // guard with a try/catch since `clearMount` may run on destroy
    // after teardown has already begun.
    try {
      this.mount().nativeElement.replaceChildren();
    } catch {
      /* view not ready or already torn down */
    }
  }
}
