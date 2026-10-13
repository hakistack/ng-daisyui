import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { LucideChevronLeft, LucideChevronRight, LucideDownload, LucideMinus, LucidePencil, LucidePlus } from '@lucide/angular';
import { DocumentEditorShellComponent } from '../../document-editor/document-editor-shell.component';
import { resolveEditor } from '../../document-editor/document-editor.registry';
import { DocumentEditorController, DocumentEditorMode } from '../../document-editor/document-editor.types';
import { BUILT_IN_EDITORS } from '../../document-editor/editors';
import { MesaLayoutComponent, MesaLayoutLabels } from '../../mesa/mesa-layout.component';
import { MesaToolbarComponent } from '../../mesa/mesa-toolbar.component';
import { createPdfViewer } from '../../pdf-viewer/pdf-viewer.helpers';
import { PdfViewerConfig } from '../../pdf-viewer/pdf-viewer.types';
import { PdfWorkspaceComponent } from '../../pdf-viewer/workspace/pdf-workspace.component';
import { BUILT_IN_RENDERERS } from '../document-viewer.builtins';
import { resolveFormat } from '../document-viewer.helpers';
import { DocumentViewerHost } from '../document-viewer-host';
import { resolveRenderer } from '../document-viewer.registry';
import { DocumentSource, DocumentViewerConfig } from '../document-viewer.types';
import { DocumentUnsupportedRenderer } from '../renderers/unsupported.renderer';
import { formatBytes } from '../../../utils/format-bytes';
import { MesaStateComponent } from '../../mesa/mesa-state.component';
import { PdfWorkspaceRailExtra } from '../../pdf-viewer/workspace/pdf-workspace.state';
import { MesaDocumentListComponent, MesaDocumentListLabels } from '../../mesa/mesa-document-list.component';
import { WorkspaceDocument } from '../../mesa/workspace-document';
import {
  DEFAULT_DOCUMENT_WORKSPACE_LABELS,
  HK_DOCUMENT_WORKSPACE_LABELS,
  ResolvedDocumentWorkspaceLabels,
} from './document-workspace.labels';

/** Zoom steps of the zoom buttons. */
const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

/**
 * A workspace of documents, like a case file (docs/design/mesa-style-guide.md):
 * several documents of any format (`[documents]` + `[(active)]`), each shown
 * with its own renderer, and the same `[config]`, `[mode]` and `[editor]` as
 * `hk-document-viewer`. A workspace is for lists; one document is
 * `hk-document-viewer`.
 *
 * - **Rail** — the document list (preview, name, meta line), and the open
 *   document's sections (a workbook's sheets, a DOCX's pages).
 * - **Main column** — a toolbar (the file, section paging, zoom, Edit when the
 *   format has an editor) over the rendered document, or the editor.
 * - **Inspector** — the file (name, format, type, size), the format's own
 *   properties (a message's headers, an image's dimensions…), Download.
 *
 * PDFs open in `hk-pdf-workspace` (configure it with `[pdfConfig]`), with the
 * same list in its rail. Opening another document while the open one has
 * unsaved edits asks first. Renderers publish sections and properties through
 * {@link DocumentViewerHost}; custom renderers that don't simply show without
 * sections.
 *
 * @example
 * documents: WorkspaceDocument[] = [
 *   { id: 'contract', name: 'Contract.pdf', src: '/files/contract.pdf', description: 'Contracts' },
 *   { id: 'payroll', name: 'Payroll.xlsx', src: payrollBlob },
 * ];
 * // <hk-document-workspace class="h-[80vh]" [documents]="documents" [(active)]="activeId" />
 */
@Component({
  selector: 'hk-document-workspace',
  imports: [
    NgComponentOutlet,
    NgTemplateOutlet,
    MesaStateComponent,
    MesaDocumentListComponent,
    MesaLayoutComponent,
    MesaToolbarComponent,
    PdfWorkspaceComponent,
    DocumentUnsupportedRenderer,
    DocumentEditorShellComponent,
    LucideChevronLeft,
    LucideChevronRight,
    LucideMinus,
    LucidePlus,
    LucidePencil,
    LucideDownload,
  ],
  templateUrl: './document-workspace.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DocumentViewerHost],
  host: { class: 'block h-full min-h-0' },
})
export class DocumentWorkspaceComponent {
  protected readonly host = inject(DocumentViewerHost);
  private static nextId = 0;
  protected readonly uid = ++DocumentWorkspaceComponent.nextId;
  private readonly userLabels = inject(HK_DOCUMENT_WORKSPACE_LABELS, { optional: true });
  protected readonly labels: ResolvedDocumentWorkspaceLabels = { ...DEFAULT_DOCUMENT_WORKSPACE_LABELS, ...this.userLabels };
  protected readonly listLabels: MesaDocumentListLabels = {
    documents: this.labels.documents,
    listHint: this.labels.listHint,
    pageCountShort: this.labels.pageCountShort,
    filter: this.labels.filterDocuments,
    noMatches: this.labels.noDocumentsMatch,
  };
  /** Whether the section strip under the document is unfolded. */
  protected readonly stripOpen = signal(true);
  /** "Section 2 of 3" */
  protected readonly sectionPosition = computed(() =>
    this.labels.sectionPosition.replace('{current}', String(this.currentIndex() + 1)).replace('{total}', String(this.sections().length)),
  );

  /**
   * The documents of the workspace (any format): the rail lists them and the
   * one in `[(active)]` opens (the first, if none is set). PDFs keep every
   * PDF feature. A workspace is for lists; one document is `hk-document-viewer`.
   */
  readonly documents = input<readonly WorkspaceDocument[]>([]);
  /** The open document's `id` (two-way). */
  readonly active = model<string | null>(null);
  /** Hints and custom renderers (as for `hk-document-viewer`). */
  readonly config = input<DocumentViewerConfig>({});
  /** View vs edit; `'edit'` needs an `[editor]`. */
  readonly mode = input<DocumentEditorMode>('view');
  /** Editor controller from `createDocumentEditor`; with one, formats that have an editor get an Edit button. */
  readonly editor = input<DocumentEditorController | null>(null);
  /** Configuration for PDFs (`controller.config()` from `createPdfViewer`); a default one otherwise. */
  readonly pdfConfig = input<PdfViewerConfig | null>(null);
  /** `localStorage` key for which side panes are hidden; `null` doesn't remember them. */
  readonly storageKey = input<string | null>('hk-document-workspace');

  private readonly defaultPdf = createPdfViewer({ zoom: 'fit-width' });
  protected readonly pdf = computed(() => this.pdfConfig() ?? this.defaultPdf.config());

  /** The listed document that is open (`null` without a list). */
  protected readonly activeDoc = computed<WorkspaceDocument | null>(() => {
    const docs = this.documents();
    return docs.find((d) => d.id === this.active()) ?? (docs.length ? docs[0] : null);
  });
  /** What renders: the open document. */
  protected readonly source = computed<DocumentSource | null>(() => this.activeDoc()?.src ?? null);
  /** The open PDF, as a one-document list for `hk-pdf-workspace` (the rail shows this workspace's list). */
  protected readonly pdfDocuments = computed<WorkspaceDocument[]>(() => {
    const doc = this.activeDoc();
    return doc ? [doc] : [];
  });

  protected readonly resolvedFormat = computed(() => {
    const cfg = this.config();
    const doc = this.activeDoc();
    return resolveFormat(this.source() ?? '', doc?.mimeType ?? cfg.mimeType, doc?.name);
  });
  protected readonly filename = computed(() => this.activeDoc()?.name ?? null);
  protected readonly renderer = computed(() => resolveRenderer(this.resolvedFormat().format, this.config().renderers, BUILT_IN_RENDERERS));

  /** Edit toggle, seeded from `mode` (a host-driven change wins). */
  private readonly modeOverride = signal<DocumentEditorMode | null>(null);
  protected readonly editing = computed(() => (this.modeOverride() ?? this.mode()) === 'edit' && this.canEdit());
  protected readonly canEdit = computed(() => {
    const editor = this.editor();
    return !!editor && !!resolveEditor(this.resolvedFormat().format, editor.config().editors, BUILT_IN_EDITORS);
  });

  private readonly docListTemplate = viewChild.required<TemplateRef<unknown>>('docList');
  /** The document list as the PDF workspace's extra rail mode, so the rail looks the same for every format. */
  protected readonly docsRail = computed<PdfWorkspaceRailExtra | null>(() =>
    this.documents().length
      ? {
          label: this.labels.documents,
          title: this.labels.documentsTitle.replace('{count}', String(this.documents().length)),
          template: this.docListTemplate(),
        }
      : null,
  );

  /** The open PDF has unsaved edits (from `hk-pdf-workspace`). */
  protected readonly pdfDirty = signal(false);
  /** A document waiting for "discard and open". */
  protected readonly pendingOpen = signal<string | null>(null);
  private readonly confirmDialog = viewChild<ElementRef<HTMLDialogElement>>('confirm');

  protected readonly zoom = signal(1);
  protected readonly zoomLabel = computed(() => `${Math.round(this.zoom() * 100)}%`);

  protected readonly sections = this.host.sections;
  protected readonly currentIndex = computed(() => {
    const current = this.host.current();
    return Math.max(
      0,
      this.sections().findIndex((s) => s.id === current),
    );
  });

  /** "report.xlsx · XLSX" */
  protected readonly badge = computed(() => {
    const name = this.filename() ?? this.labels.documentAria;
    const ext = this.resolvedFormat().extension?.replace(/^\./, '').toUpperCase();
    return ext ? `${name} · ${ext}` : name;
  });

  protected readonly fileRows = computed(() => {
    const l = this.labels;
    const f = this.resolvedFormat();
    const rows = [
      { label: l.fileName, value: this.filename() ?? '—' },
      { label: l.format, value: f.extension?.replace(/^\./, '').toUpperCase() ?? f.format },
    ];
    if (f.mimeType) rows.push({ label: l.mimeType, value: f.mimeType });
    const src = this.source();
    const size = src === null ? null : sourceSize(src);
    if (size !== null) rows.push({ label: l.size, value: formatBytes(size) });
    return rows;
  });

  protected readonly layoutLabels = computed<MesaLayoutLabels>(() => ({
    rail: this.labels.rail,
    inspector: this.labels.inspector,
    showRail: this.labels.showRail,
    hideRail: this.labels.hideRail,
    showInspector: this.labels.showInspector,
    hideInspector: this.labels.hideInspector,
    skipToRail: this.labels.skipToRail,
  }));

  private downloadUrl: string | null = null;

  constructor() {
    effect(() => {
      this.mode();
      this.modeOverride.set(null);
    });
    // A list with nothing open opens its first document.
    effect(() => {
      const docs = this.documents();
      if (docs.length && !docs.some((d) => d.id === this.active())) untracked(() => this.active.set(docs[0].id));
    });
    // Another document: not editing, nothing unsaved yet.
    effect(() => {
      this.activeDoc();
      untracked(() => {
        this.modeOverride.set(null);
        this.pdfDirty.set(false);
      });
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
    // A new document (or renderer) publishes from scratch.
    let lastRenderer: unknown;
    effect(() => {
      this.source();
      const renderer = this.renderer();
      untracked(() => {
        this.host.reset(renderer !== lastRenderer);
        lastRenderer = renderer;
        this.zoom.set(1);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
    });
  }

  /** Open a listed document; with unsaved changes in the open one, ask first. */
  protected openDocument(id: string): void {
    if (id === this.activeDoc()?.id) return;
    if (this.hasUnsavedChanges()) this.pendingOpen.set(id);
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

  private hasUnsavedChanges(): boolean {
    if (this.resolvedFormat().format === 'pdf') return this.pdfDirty();
    return this.editing() && !!this.editor()?.isDirty();
  }

  protected setEditing(on: boolean): void {
    this.modeOverride.set(on ? 'edit' : 'view');
  }

  protected goToIndex(index: number): void {
    const section = this.sections()[Math.max(0, Math.min(this.sections().length - 1, index))];
    if (section) this.host.goTo(section.id);
  }

  protected onPositionInput(input: HTMLInputElement): void {
    const n = Number(input.value);
    if (Number.isInteger(n) && n >= 1 && n <= this.sections().length) this.goToIndex(n - 1);
    input.value = String(this.currentIndex() + 1);
  }

  /** ← → Home End in the section strip move between sections, keeping focus on the current one. */
  protected onStripKey(event: KeyboardEvent, strip: HTMLElement): void {
    const last = this.sections().length - 1;
    const to: Record<string, number> = { ArrowLeft: this.currentIndex() - 1, ArrowRight: this.currentIndex() + 1, Home: 0, End: last };
    const target = to[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const index = Math.max(0, Math.min(last, target));
    this.goToIndex(index);
    requestAnimationFrame(() => {
      const button = strip.querySelector<HTMLElement>(`[data-section-index="${index}"]`);
      button?.focus();
      button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
  }

  protected zoomBy(direction: 1 | -1): void {
    const z = this.zoom();
    const next = direction > 0 ? ZOOM_STEPS.find((s) => s > z + 0.001) : [...ZOOM_STEPS].reverse().find((s) => s < z - 0.001);
    if (next) this.zoom.set(next);
  }

  protected canZoom(direction: 1 | -1): boolean {
    return direction > 0 ? this.zoom() < ZOOM_STEPS[ZOOM_STEPS.length - 1] : this.zoom() > ZOOM_STEPS[0];
  }

  protected download(): void {
    const src = this.source();
    if (src === null) return;
    const name = this.filename() ?? 'document';
    let href: string;
    if (typeof src === 'string') href = src;
    else {
      if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
      this.downloadUrl = URL.createObjectURL(src instanceof Blob ? src : new Blob([src as BlobPart]));
      href = this.downloadUrl;
    }
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.rel = 'noopener';
    a.click();
  }
}

function sourceSize(src: DocumentSource): number | null {
  if (src instanceof Blob) return src.size;
  if (src instanceof Uint8Array) return src.byteLength;
  return null;
}
