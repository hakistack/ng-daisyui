import { Injectable, Injector, inject } from '@angular/core';
import { PdfViewerStore } from './pdf-viewer.store';
import { PdfViewportService } from './pdf-viewport.service';

/**
 * The annotations left out of the page rasters because the viewer draws
 * them itself: editable annotations (annotation layer) and form widgets
 * (form overlay). Each source sets its own list; the engine gets the union,
 * and the pages whose set changed are repainted.
 */
@Injectable()
export class PdfRasterHiddenService {
  private readonly store = inject(PdfViewerStore);
  // The viewport reaches the forms (through the layers) which reach this: resolved lazily to avoid a DI cycle.
  private readonly injector = inject(Injector);
  private get viewport(): PdfViewportService {
    return this.injector.get(PdfViewportService);
  }
  private readonly sets = new Map<string, readonly number[]>();

  /** Replace a source's flat `[page, annotIndex, …]` list. */
  async set(source: string, entries: readonly number[]): Promise<void> {
    const before = this.sets.get(source) ?? [];
    this.sets.set(source, entries);
    const session = this.store.session();
    if (!session) return;
    await session.engine.setHiddenAnnotations(session.doc, [...this.sets.values()].flat());
    const pages = new Set<number>();
    for (const list of [before, entries]) for (let i = 0; i < list.length; i += 2) pages.add(list[i]);
    for (const page of pages) this.viewport.rerenderPage(page + 1);
  }

  /** Repaint pages (0-based), e.g. so their overlays are rebuilt. */
  repaint(pages: Iterable<number>): void {
    for (const page of new Set(pages)) this.viewport.rerenderPage(page + 1);
  }

  /** Forget every source (a new document: its engine handle starts with nothing hidden). */
  reset(): void {
    this.sets.clear();
  }
}
