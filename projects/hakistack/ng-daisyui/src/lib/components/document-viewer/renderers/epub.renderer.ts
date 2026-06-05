import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, signal, viewChild } from '@angular/core';

import { DocumentRendererInputs } from '../document-viewer.types';
import { loadSourceAsBytes } from '../document-viewer.helpers';

/**
 * Renderer for `.epub` e-books.
 *
 * EPUBs are zip archives containing HTML/CSS/images organized via an
 * OPF manifest + NCX/nav table of contents. We use **`foliate-js`** —
 * a modular, modern lazy-loadable EPUB renderer (~200 KB) extracted
 * from the Foliate e-reader. Smaller and ESM-cleaner than `epub.js`.
 *
 * Approach:
 *   1. Load bytes into a Blob.
 *   2. Lazy-import `foliate-js/view.js` (its main rendering surface).
 *   3. Mount a `<foliate-view>` custom element into our container.
 *   4. Drive the view via its `.open(file)` method.
 *
 * Navigation: foliate's view ships with default keyboard handlers
 * (arrow keys + space). For richer chapter navigation we'd add a TOC
 * sidebar in a follow-up — the EPUB renderer being a "read in place"
 * surface is fine for v1.
 *
 * Container cleanup: foliate-view registers internal listeners on the
 * document; on destroy we replace the mount's children to detach the
 * element and let the GC reclaim. (foliate-js doesn't expose explicit
 * dispose; teardown is by element removal.)
 */
@Component({
  selector: 'hk-document-epub-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="text-base-content/60 py-8 text-center text-sm">Opening EPUB…</div>
    } @else if (error(); as e) {
      <div class="alert alert-error whitespace-pre-line">{{ e }}</div>
    }
    <!-- Always-mounted container so foliate has a host to attach to. -->
    <div
      #mount
      class="bg-base-100 rounded border border-base-content/10 overflow-hidden"
      [style.visibility]="loading() || error() ? 'hidden' : 'visible'"
      [style.minHeight.px]="500"
    ></div>
  `,
  host: { class: 'block w-full' },
})
export class DocumentEpubRenderer {
  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private readonly mount = viewChild.required<ElementRef<HTMLElement>>('mount');

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect(() => {
      const src = this.source();
      void this.render(src);
    });

    destroyRef.onDestroy(() => this.clearMount());
  }

  private async render(src: DocumentRendererInputs['source']): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.clearMount();

    try {
      const bytes = await loadSourceAsBytes(src);

      // foliate-js publishes its modules under multiple entry points
      // (`view.js`, `epub.js`, `ui/...`). We import the high-level
      // `view.js` entry which registers the `<foliate-view>` custom
      // element on first import.
      let foliateView: FoliateViewModule;
      try {
        foliateView = (await import('foliate-js/view.js' as string)) as unknown as FoliateViewModule;
      } catch (e) {
        throw new Error(
          'EPUB rendering requires the optional peer dependency `foliate-js`.\n' +
            'Install it:  npm install foliate-js\n\n' +
            `Underlying error: ${(e as Error).message ?? e}`,
        );
      }

      const container = this.mount().nativeElement;
      const view = document.createElement('foliate-view') as FoliateViewElement;
      // Match the host's intrinsic height so the reader has room.
      view.style.display = 'block';
      view.style.width = '100%';
      view.style.height = '600px';
      container.appendChild(view);

      // foliate's `view.open(file)` expects a File or Blob-like value.
      const file = new File([bytes as BlobPart], this.filename() ?? 'book.epub', {
        type: 'application/epub+zip',
      });

      await view.open(file);
      // Touch the import to keep TS from flagging foliateView as unused
      // when the module has side-effect-only registration.
      void foliateView;
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to open EPUB.');
    } finally {
      this.loading.set(false);
    }
  }

  private clearMount(): void {
    try {
      this.mount().nativeElement.replaceChildren();
    } catch {
      /* view not ready or already torn down */
    }
  }
}

/** foliate-js's view.js module — pure side-effect registration. */
interface FoliateViewModule {
  // No named exports we use — `import` is for the side-effect that
  // registers the `<foliate-view>` custom element with the browser.
  // The `unknown` cast in the import keeps TS happy without typing
  // foliate's internal API surface.
  readonly _sideEffect?: never;
}

/** The custom element exposed by foliate after `view.js` registers it. */
interface FoliateViewElement extends HTMLElement {
  open(file: File | Blob): Promise<void>;
}
