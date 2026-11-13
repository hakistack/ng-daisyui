import { Injectable, signal } from '@angular/core';

/** A navigable part of a document: a page, a sheet, a chapter, an attachment. */
export interface DocumentSection {
  readonly id: string;
  readonly label: string;
  readonly kind: 'page' | 'sheet' | 'chapter' | 'part';
}

/** A property shown in the workspace inspector ("From", "Sheets", "Dimensions"…). */
export interface DocumentMetadataEntry {
  readonly label: string;
  readonly value: string;
}

/**
 * What a renderer can tell the chrome around it, and how the chrome drives
 * it back. `hk-document-workspace` provides one per document; a renderer
 * that wants a rail of sections or inspector properties injects it
 * optionally (`inject(DocumentViewerHost, { optional: true })`) and
 * publishes. Renderers that don't (including custom ones) work as before.
 */
@Injectable()
export class DocumentViewerHost {
  /** The document's sections, in order. Fewer than two: the workspace shows no rail. */
  readonly sections = signal<readonly DocumentSection[]>([]);
  /** The section on screen (`id`), if any. */
  readonly current = signal<string | null>(null);
  /** Format-specific properties for the inspector. */
  readonly metadata = signal<readonly DocumentMetadataEntry[]>([]);

  private goToHandler: ((id: string) => void) | null = null;

  /** Called by the renderer: how to show a section. */
  onGoTo(handler: (id: string) => void): void {
    this.goToHandler = handler;
  }

  /** Called by the chrome: show a section. */
  goTo(id: string): void {
    this.goToHandler?.(id);
  }

  /**
   * Forget what the previous document published. The navigation handler is
   * kept unless `rendererChanged` (a renderer registers it once, when created).
   */
  reset(rendererChanged = true): void {
    this.sections.set([]);
    this.current.set(null);
    this.metadata.set([]);
    if (rendererChanged) this.goToHandler = null;
  }
}
