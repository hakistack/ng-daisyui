import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
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
import { guessFilename, resolveFormat } from '../document-viewer.helpers';
import { DocumentViewerHost } from '../document-viewer-host';
import { resolveRenderer } from '../document-viewer.registry';
import { DocumentSource, DocumentViewerConfig } from '../document-viewer.types';
import { DocumentUnsupportedRenderer } from '../renderers/unsupported.renderer';
import { formatBytes } from '../../../utils/format-bytes';
import {
  DEFAULT_DOCUMENT_WORKSPACE_LABELS,
  HK_DOCUMENT_WORKSPACE_LABELS,
  ResolvedDocumentWorkspaceLabels,
} from './document-workspace.labels';

/** Zoom steps of the zoom buttons. */
const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

/**
 * The document viewer as a workspace (docs/design/mesa-style-guide.md): the
 * same `[src]`, `[config]`, `[mode]` and `[editor]` as `hk-document-viewer`,
 * laid out as a Mesa work block.
 *
 * - **Rail** — the document's sections (a workbook's sheets, a DOCX's pages)
 *   when the renderer publishes more than one.
 * - **Main column** — a toolbar (the file, section paging, zoom, Edit when the
 *   format has an editor) over the rendered document, or the editor.
 * - **Inspector** — the file (name, format, type, size), the format's own
 *   properties (a message's headers, an image's dimensions…), Download.
 *
 * PDFs open in `hk-pdf-workspace` (configure it with `[pdfConfig]`).
 * Renderers publish sections and properties through {@link DocumentViewerHost};
 * custom renderers that don't simply show without a rail.
 *
 * @example
 * <hk-document-workspace class="h-[80vh]" [src]="file()" />
 */
@Component({
  selector: 'hk-document-workspace',
  imports: [
    NgComponentOutlet,
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
  private readonly userLabels = inject(HK_DOCUMENT_WORKSPACE_LABELS, { optional: true });
  protected readonly labels: ResolvedDocumentWorkspaceLabels = { ...DEFAULT_DOCUMENT_WORKSPACE_LABELS, ...this.userLabels };

  /** The document to show. URL, raw bytes, or a Blob/File. */
  readonly src = input.required<DocumentSource>();
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

  protected readonly resolvedFormat = computed(() => {
    const cfg = this.config();
    return resolveFormat(this.src(), cfg.mimeType, cfg.filename);
  });
  protected readonly filename = computed(() => this.config().filename ?? guessFilename(this.src()));
  protected readonly renderer = computed(() => resolveRenderer(this.resolvedFormat().format, this.config().renderers, BUILT_IN_RENDERERS));

  /** Edit toggle, seeded from `mode` (a host-driven change wins). */
  private readonly modeOverride = signal<DocumentEditorMode | null>(null);
  protected readonly editing = computed(() => (this.modeOverride() ?? this.mode()) === 'edit' && this.canEdit());
  protected readonly canEdit = computed(() => {
    const editor = this.editor();
    return !!editor && !!resolveEditor(this.resolvedFormat().format, editor.config().editors, BUILT_IN_EDITORS);
  });

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
    const size = sourceSize(this.src());
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
    // A new document (or renderer) publishes from scratch.
    let lastRenderer: unknown;
    effect(() => {
      this.src();
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

  /** Arrows / Home / End in the rail move between sections, keeping focus on the current one. */
  protected onRailKey(event: KeyboardEvent, rail: HTMLElement): void {
    const last = this.sections().length - 1;
    const to: Record<string, number> = { ArrowUp: this.currentIndex() - 1, ArrowDown: this.currentIndex() + 1, Home: 0, End: last };
    const target = to[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const index = Math.max(0, Math.min(last, target));
    this.goToIndex(index);
    requestAnimationFrame(() => rail.querySelector<HTMLElement>(`[data-section-index="${index}"]`)?.focus());
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
    const src = this.src();
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
