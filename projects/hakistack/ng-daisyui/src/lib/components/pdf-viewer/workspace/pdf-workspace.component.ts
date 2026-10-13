import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MesaDocumentListComponent, MesaDocumentListLabels } from '../../mesa/mesa-document-list.component';
import { MesaLayoutComponent, MesaLayoutLabels } from '../../mesa/mesa-layout.component';
import { WorkspaceDocument } from '../../mesa/workspace-document';
import { PDF_VIEWER_PROVIDERS, PdfViewerHostBase } from '../pdf-viewer-host';
import { PdfDocumentSource, PdfSidebarTab } from '../pdf-viewer.types';
import { MESA_PDF_CHROME, PDF_CHROME } from '../ui/pdf-chrome';
import { PdfAnnotationDialogsComponent } from '../ui/pdf-annotation-dialogs.component';
import { PdfAnnotationToolbarComponent } from '../ui/pdf-annotation-toolbar.component';
import { PdfDigitalSignDialogComponent } from '../ui/pdf-digital-sign-dialog.component';
import { PdfFindBarComponent } from '../ui/pdf-find-bar.component';
import { PdfFormDesignToolbarComponent } from '../ui/pdf-form-design-toolbar.component';
import { PdfPageOrganizerComponent } from '../ui/pdf-page-organizer.component';
import { PdfPagesComponent } from '../ui/pdf-pages.component';
import { PdfSignatureDialogComponent } from '../ui/pdf-signature-dialog.component';
import { PdfTextEditorComponent } from '../ui/pdf-text-editor.component';
import { PdfWorkspaceInspectorComponent } from './pdf-workspace-inspector.component';
import { PdfWorkspaceRailComponent } from './pdf-workspace-rail.component';
import { PdfWorkspaceToolbarComponent } from './pdf-workspace-toolbar.component';
import { PdfWorkspaceRailExtra, PdfWorkspaceState } from './pdf-workspace.state';

/**
 * A workspace of PDFs: several documents with every feature of
 * `hk-pdf-viewer` (same `[config]` from `createPdfViewer()`, `[(formValues)]`
 * and outputs, for whichever document is open), laid out as a Mesa work block
 * (docs/design/mesa-style-guide.md). A workspace is for lists; a single
 * document is `hk-pdf-viewer`.
 *
 * - **Rail** — the document list (`[documents]` + `[(active)]`), and the open
 *   one's page thumbnails, outline and attachments.
 * - **Main column** — a toolbar (the document, the save state, paging, zoom,
 *   the view, the tools), the annotation / form design / find bars, and the
 *   pages; or, in the Grid view, every page as a thumbnail to organize
 *   (each edit applies at once and undoes with the document).
 * - **Inspector** — the selected annotation or field, the document's
 *   properties, its digital signatures and the comments.
 *
 * Opening another document while the open one has unsaved edits asks first.
 * Side panes hide behind their divider and fold into disclosures on narrow
 * containers. `controller.toggleSidebar()` toggles the rail and
 * `controller.organizePages()` opens the Grid view.
 *
 * @example
 * viewer = createPdfViewer({ zoom: 'fit-width' });
 * documents: WorkspaceDocument[] = [
 *   { id: 'contract', name: 'Contract.pdf', src: '/files/contract.pdf' },
 *   { id: 'invoice', name: 'Invoice.pdf', src: invoiceBlob },
 * ];
 * // <hk-pdf-workspace class="h-[80vh]" [documents]="documents" [(active)]="activeId" [config]="viewer.config()" />
 */
@Component({
  selector: 'hk-pdf-workspace',
  imports: [
    MesaLayoutComponent,
    MesaDocumentListComponent,
    PdfWorkspaceToolbarComponent,
    PdfWorkspaceRailComponent,
    PdfWorkspaceInspectorComponent,
    PdfAnnotationToolbarComponent,
    PdfFormDesignToolbarComponent,
    PdfFindBarComponent,
    PdfPagesComponent,
    PdfPageOrganizerComponent,
    PdfTextEditorComponent,
    PdfAnnotationDialogsComponent,
    PdfSignatureDialogComponent,
    PdfDigitalSignDialogComponent,
  ],
  templateUrl: './pdf-workspace.component.html',
  // The page, text, annotation and form layers are styled by the viewer's stylesheet (scoped to this host too).
  styleUrl: '../pdf-viewer.component.css',
  // The pages fill the main column here (the classic viewer caps them at 75vh).
  styles: `
    :host ::ng-deep .hk-pdf-viewport {
      max-height: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [...PDF_VIEWER_PROVIDERS, PdfWorkspaceState, { provide: PDF_CHROME, useValue: MESA_PDF_CHROME }],
  host: { class: 'block h-full min-h-0 outline-none' },
})
export class PdfWorkspaceComponent extends PdfViewerHostBase {
  protected readonly ws = inject(PdfWorkspaceState);

  /** `localStorage` key for which side panes are hidden; `null` doesn't remember them. */
  readonly storageKey = input<string | null>('hk-pdf-workspace');

  /**
   * The PDFs of the workspace: the rail lists them and the one in
   * `[(active)]` opens (the first, if none is set). A workspace is for
   * lists; for a single document use `hk-pdf-viewer`.
   */
  readonly documents = input<readonly WorkspaceDocument[]>([]);
  /** The open document's `id` (two-way). */
  readonly active = model<string | null>(null);

  /** An extra rail mode of your own (shown first and selected): `hk-document-workspace` lists its documents there. */
  readonly extraRail = input<PdfWorkspaceRailExtra | null>(null);

  /** The listed document that is open (`null` without a list). */
  protected readonly activeDoc = computed<WorkspaceDocument | null>(() => {
    const docs = this.documents();
    return docs.find((d) => d.id === this.active()) ?? (docs.length ? docs[0] : null);
  });

  private readonly docListTemplate = viewChild.required<TemplateRef<unknown>>('docList');
  protected readonly listLabels = computed<MesaDocumentListLabels>(() => {
    const l = this.store.labels();
    return { documents: l.documents, listHint: l.documentListHint, pageCountShort: l.pageCountShort };
  });
  /** The rail's extra mode: the host's own, or this workspace's document list. */
  private readonly railExtra = computed<PdfWorkspaceRailExtra | null>(() => {
    const extra = this.extraRail();
    if (extra) return extra;
    const docs = this.documents();
    if (!docs.length) return null;
    const l = this.store.labels();
    return { label: l.documents, title: l.documentsTitle.replace('{count}', String(docs.length)), template: this.docListTemplate() };
  });

  private static nextId = 0;
  protected readonly uid = `hk-pdf-ws-${++PdfWorkspaceComponent.nextId}`;

  /** A document waiting for "discard and open". */
  protected readonly pendingOpen = signal<string | null>(null);
  private readonly confirmDialog = viewChild<ElementRef<HTMLDialogElement>>('confirm');

  private readonly layout = viewChild(MesaLayoutComponent);

  protected readonly layoutLabels = computed<MesaLayoutLabels>(() => {
    const l = this.store.labels();
    return {
      rail: l.workspaceRail,
      inspector: l.workspaceInspector,
      showRail: l.showRail,
      hideRail: l.hideRail,
      showInspector: l.showInspector,
      hideInspector: l.hideInspector,
      skipToRail: l.skipToPages,
    };
  });

  constructor() {
    super();
    effect(() => this.ws.layout.set(this.layout() ?? null));
    // Another document opens clean: no tool, no find, the pages view.
    let lastDoc: WorkspaceDocument | null = null;
    effect(() => {
      const doc = this.activeDoc();
      untracked(() => {
        if (lastDoc && doc !== lastDoc) {
          this.tools.closeBar();
          this.find.closeBar();
          this.ws.view.set('sheet');
        }
        lastDoc = doc;
      });
    });
    // A list with nothing open opens its first document.
    effect(() => {
      const docs = this.documents();
      if (docs.length && !docs.some((d) => d.id === this.active())) untracked(() => this.active.set(docs[0].id));
    });
    effect(() => {
      const open = this.pendingOpen() !== null;
      const dialog = this.confirmDialog()?.nativeElement;
      if (!dialog) return;
      untracked(() => {
        if (open && !dialog.open) dialog.showModal?.();
        else if (!open && dialog.open) dialog.close?.();
      });
    });
    effect(() => {
      const extra = this.railExtra();
      untracked(() => {
        const had = this.ws.extraRail() !== null;
        this.ws.extraRail.set(extra);
        if (extra && !had) this.ws.railMode.set('extra');
        else if (!extra && this.ws.railMode() === 'extra') this.ws.railMode.set('thumbnails');
      });
    });

    // Panels on screen: the rail's mode (outline and attachments load with the rail, so its
    // modes know whether the document has them), and the inspector's comments and signatures.
    effect(() => {
      const layout = this.layout();
      const shown = new Set<PdfSidebarTab>();
      if (layout?.railVisible()) {
        shown.add('bookmarks');
        shown.add('attachments');
        if (this.ws.railMode() === 'thumbnails') shown.add('thumbnails');
      }
      if (layout?.inspectorVisible()) {
        shown.add('annotations');
        shown.add('signatures');
      }
      this.store.shownPanels.set(shown);
    });

    this.store.revealHandler = (panel) => {
      if (panel === 'annotations') this.ws.revealSection('comments');
      else if (panel === 'signatures') this.ws.revealSection('signatures');
      else {
        this.ws.railMode.set(panel);
        this.layout()?.showRail();
      }
    };

    // Form design and the grid are exclusive: designing goes back to the pages.
    effect(() => {
      if (this.designer.active()) untracked(() => this.ws.view.set('sheet'));
    });
  }

  protected currentSource(): PdfDocumentSource | null {
    return this.activeDoc()?.src ?? null;
  }

  protected currentFileName(): string | null {
    return this.activeDoc()?.name ?? null;
  }

  /** Open a listed document; with unsaved changes in the open one, ask first. */
  protected openDocument(id: string): void {
    if (id === this.activeDoc()?.id) return;
    if (this.store.dirty()) this.pendingOpen.set(id);
    else this.active.set(id);
  }

  protected confirmOpen(): void {
    const id = this.pendingOpen();
    this.pendingOpen.set(null);
    if (id) this.active.set(id);
  }

  protected cancelOpen(): void {
    this.pendingOpen.set(null);
  }

  protected override toggleSidebar(): void {
    this.layout()?.toggleRail();
  }

  protected override organizePages(): void {
    if (this.pages.canOrganize()) this.ws.view.set('grid');
  }
}
