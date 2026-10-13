import { Injectable, signal } from '@angular/core';
import type { MesaLayoutComponent } from '../../mesa/mesa-layout.component';

/** What the workspace's rail lists. */
export type PdfWorkspaceRailMode = 'thumbnails' | 'bookmarks' | 'attachments';

/** What the workspace's main column shows: the pages, or every page as a grid to organize. */
export type PdfWorkspaceView = 'sheet' | 'grid';

/** UI state the workspace's pieces (toolbar, rail, inspector) share. Provided by `hk-pdf-workspace`. */
@Injectable()
export class PdfWorkspaceState {
  readonly view = signal<PdfWorkspaceView>('sheet');
  readonly railMode = signal<PdfWorkspaceRailMode>('thumbnails');
  /** The Mesa layout, once rendered (to show or toggle its panes). */
  readonly layout = signal<MesaLayoutComponent | null>(null);
  /** An inspector section to scroll into view (set by "open comments", "show signatures"). */
  readonly focusSection = signal<{ id: 'selection' | 'comments' | 'signatures' | 'document'; seq: number } | null>(null);

  private seq = 0;

  revealSection(id: 'selection' | 'comments' | 'signatures' | 'document'): void {
    this.layout()?.showInspector();
    this.focusSection.set({ id, seq: ++this.seq });
  }
}
