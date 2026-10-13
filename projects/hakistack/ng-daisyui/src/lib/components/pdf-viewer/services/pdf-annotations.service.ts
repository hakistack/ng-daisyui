import { Injectable, computed, inject, signal } from '@angular/core';
import { ImportedAnnotation, readAnnotations, sameAnnotation } from '../core/annotations/annotation-io';
import {
  HkAnnotation,
  HkAnnotationInit,
  PdfAnnotationReply,
  PdfFreeTextAnnotation,
  PdfLineEnding,
  PdfMeasureScale,
  PdfRect,
  PdfReviewStatus,
  PdfStampContent,
  PdfTextMarkupType,
  newAnnotationId,
} from '../core/annotations/annotation.types';
import { DEFAULT_SCALE } from '../core/annotations/measure';
import { PageSpace } from '../core/annotations/page-space';
import { mergeSelectionRects } from '../core/annotations/selection';
import { translateAnnotation, withDerivedRect } from '../core/annotations/shapes';
import { exportAnnotationsJson, exportXfdf, importAnnotationsJson, importXfdf } from '../core/annotations/xfdf';
import { CommandStack, PdfCommand, PdfCommandStackState } from '../core/command-stack';
import { pointerToLocal } from '../core/geometry';
import { PdfDoc } from '../core/pdf-writer/document';
import { PDF_PERMISSION } from '../core/pdf-writer/security';
import type { StandardFont } from '../core/pdf-writer/standard-fonts';
import { PdfAnnotationTool } from '../pdf-viewer.types';
import { PdfViewerStore } from './pdf-viewer.store';
import { PdfRasterHiddenService } from './pdf-raster-hidden.service';
import { PdfViewportService } from './pdf-viewport.service';

/** Style applied to new annotations of a tool (the fields a tool doesn't use are ignored). */
export interface AnnotationToolStyle {
  readonly color: string;
  readonly opacity: number;
  readonly strokeWidth: number;
  readonly fill: string | null;
  readonly dashed: boolean;
  readonly cloudy: boolean;
  readonly startEnding: PdfLineEnding;
  readonly endEnding: PdfLineEnding;
  readonly font: StandardFont;
  readonly fontSize: number;
  readonly fontColor: string;
  readonly align: 'left' | 'center' | 'right';
  readonly icon: string;
}

type DrawingTool = Exclude<PdfAnnotationTool, 'none'>;

/** A stamp chosen in the stamp menu, placed by the next click on a page. */
export interface PendingStamp {
  readonly name: string;
  readonly stamp: PdfStampContent;
  readonly color: string;
  /** Merge it into the page on save (signatures). */
  readonly flatten?: boolean;
}

/** Where an annotation moves in its page's paint order. */
export type AnnotationArrange = 'front' | 'forward' | 'backward' | 'back';

const BASE_STYLE: AnnotationToolStyle = {
  color: '#dc2626',
  opacity: 1,
  strokeWidth: 2,
  fill: null,
  dashed: false,
  cloudy: false,
  startEnding: 'None',
  endEnding: 'None',
  font: 'Helvetica',
  fontSize: 12,
  fontColor: '#111827',
  align: 'left',
  icon: 'Comment',
};

const TOOL_DEFAULTS: Partial<Record<DrawingTool, Partial<AnnotationToolStyle>>> = {
  highlight: { color: '#ffeb3b' },
  underline: { color: '#2563eb' },
  strikeout: { color: '#dc2626' },
  squiggly: { color: '#16a34a' },
  arrow: { endEnding: 'OpenArrow' },
  cloud: { cloudy: true },
  ink: { color: '#2563eb' },
  freetext: { color: '#111827', strokeWidth: 0, fontSize: 14 },
  note: { color: '#facc15' },
  link: { color: '#2563eb', strokeWidth: 0 },
  distance: { color: '#2563eb', strokeWidth: 1, startEnding: 'Butt', endEnding: 'Butt' },
  perimeter: { color: '#2563eb', strokeWidth: 1 },
  area: { color: '#2563eb', strokeWidth: 1 },
  volume: { color: '#7c3aed', strokeWidth: 1 },
  radius: { color: '#2563eb', strokeWidth: 1 },
};

const TOOLS: readonly DrawingTool[] = [
  'highlight',
  'underline',
  'strikeout',
  'squiggly',
  'rect',
  'ellipse',
  'line',
  'arrow',
  'polygon',
  'polyline',
  'cloud',
  'ink',
  'eraser',
  'freetext',
  'note',
  'stamp',
  'link',
  'distance',
  'perimeter',
  'area',
  'radius',
  'volume',
];

/** Changes that only touch the comment thread (allowed on locked annotations and in review mode). */
const COMMENT_KEYS = new Set(['contents', 'replies', 'status']);

/** What a pasted copy doesn't keep from the original. */
const PASTE_DROPPED = ['id', 'replies', 'status', 'locked', 'created', 'author'] as const;

/** Clipboard format for annotations copied between viewers. */
export const ANNOTATION_CLIPBOARD_TYPE = 'application/x-hk-pdf-annotations+json';

interface AnnotationCommand extends PdfCommand {
  readonly id: string;
  readonly after: HkAnnotation | null;
  readonly mergeKey?: string;
}

const EMPTY: readonly HkAnnotation[] = [];

/** Id of an annotation being drawn; `add` gives it a real one. */
export const DRAFT_ID = 'draft';

/**
 * The document's editable annotations: the model (in displayed-page points),
 * selection, undoable edits, per-tool styles, and the bridge to the file.
 *
 * On load, the annotations the viewer can edit are imported with
 * hk-pdf-writer and hidden in the page rasters; the annotation layer draws
 * them instead, so edits never re-render a page. Saving replays the
 * difference from the imported state as an incremental update.
 */
@Injectable()
export class PdfAnnotationsService {
  private readonly store = inject(PdfViewerStore);
  private readonly viewport = inject(PdfViewportService);
  private readonly hidden = inject(PdfRasterHiddenService);

  /** Current annotations, in paint order. */
  readonly list = signal<readonly HkAnnotation[]>([]);
  /** An in-progress edit or a draft, shown in place of (or in addition to) the stored annotation. */
  readonly preview = signal<HkAnnotation | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly selected = computed(() => this.list().find((a) => a.id === this.selectedId()) ?? null);
  /** The document could be read for editing (false when encrypted or damaged). */
  readonly supported = signal(false);
  /** Undo/redo state. */
  readonly history = signal<PdfCommandStackState>({ canUndo: false, canRedo: false, dirty: false, undoLabel: null, redoLabel: null });
  /** The free-text box being typed into, if any. */
  readonly textEdit = signal<{ readonly annotation: PdfFreeTextAnnotation; readonly isNew: boolean } | null>(null);
  /** Ask the comments panel to reveal an annotation's thread (`seq` re-triggers for the same id). */
  readonly commentsFocus = signal<{ readonly id: string; readonly seq: number } | null>(null);
  /** The scale new measurements use ("1 in = 10 ft"), and the depth new volumes get. */
  readonly scale = signal<PdfMeasureScale>(DEFAULT_SCALE);
  readonly depth = signal(1);
  /** The stamp the stamp tool places. */
  readonly pendingStamp = signal<PendingStamp | null>(null);

  /** The document's own permissions (`/P` of an encrypted document opened with the user password) allow annotating. */
  private readonly permitted = signal(true);
  /**
   * `edit` (default): everything; `review`: comments, replies and status
   * only; `view`: read-only. A document that doesn't permit annotating is
   * always `view`.
   */
  readonly mode = computed(() => (this.permitted() ? (this.store.config().annotationMode ?? 'edit') : 'view'));
  /** New annotations can be added. */
  readonly canAdd = computed(() => this.supported() && this.mode() === 'edit');

  private readonly styles = signal<Partial<Record<DrawingTool, AnnotationToolStyle>>>({});

  /** What each page shows: the stored annotations with the preview applied. */
  readonly byPage = computed(() => {
    const preview = this.preview();
    const pages = new Map<number, HkAnnotation[]>();
    let previewPlaced = false;
    for (const a of this.list()) {
      const shown = preview && preview.id === a.id ? ((previewPlaced = true), preview) : a;
      const list = pages.get(shown.page);
      if (list) list.push(shown);
      else pages.set(shown.page, [shown]);
    }
    if (preview && !previewPlaced) pages.set(preview.page, [...(pages.get(preview.page) ?? []), preview]);
    return pages;
  });

  /** Authors that appear on annotations or replies (for the comments filter). */
  readonly authors = computed(() => {
    const names = new Set<string>();
    for (const a of this.list()) {
      if (a.author) names.add(a.author);
      for (const r of a.replies ?? []) if (r.author) names.add(r.author);
    }
    return [...names].sort((x, y) => x.localeCompare(y));
  });

  private baseline = new Map<string, ImportedAnnotation>();
  private readonly stack = new CommandStack(200);
  /** Edits run one after another, so each reads the state the previous one left. */
  private chain: Promise<unknown> = Promise.resolve();
  private loadSeq = 0;
  private focusSeq = 0;
  /** Each page's display ↔ user-space mapping (for XFDF). */
  private spaces: PageSpace[] = [];
  /** Last copied annotations (when the system clipboard drops the custom format). */
  private clipboard: HkAnnotation[] = [];

  constructor() {
    this.stack.subscribe((state) => {
      this.history.set(state);
      this.store.setAnnotationsDirty(state.dirty);
    });
  }

  /** Annotations shown on a 1-based page. */
  forPage(pageNumber: number): readonly HkAnnotation[] {
    return this.byPage().get(pageNumber - 1) ?? EMPTY;
  }

  /** Author for new annotations and replies. */
  author(): string {
    return this.store.config().annotationAuthor || this.store.labels().defaultAuthor;
  }

  /** Whether the user may change an annotation's shape and style (or its lock). */
  canModify(a: HkAnnotation): boolean {
    if (!this.supported() || this.mode() !== 'edit') return false;
    return !this.store.config().restrictAnnotationsToAuthor || !a.author || a.author === this.author();
  }

  /** Whether the user may move, restyle or delete it: allowed and not locked. */
  canEdit(a: HkAnnotation): boolean {
    return this.canModify(a) && !a.locked;
  }

  /** Whether the user may edit its comment, replies and status. */
  canComment(_a: HkAnnotation): boolean {
    return this.supported() && this.mode() !== 'view';
  }

  // ── Loading ─────────────────────────────────────────────────────────────

  /** Forget everything (a new document is loading). */
  reset(): void {
    this.loadSeq++;
    this.baseline = new Map();
    this.list.set([]);
    this.preview.set(null);
    this.selectedId.set(null);
    this.textEdit.set(null);
    this.supported.set(false);
    this.stack.clear();
  }

  /**
   * Import the document's editable annotations from its bytes and hide them
   * in the rasters. A document hk-pdf-writer can't read (encrypted, damaged,
   * or disagreeing with PDFium on the page count) stays read-only: its
   * annotations remain in the raster and the tools are disabled.
   */
  async load(doc: PdfDoc | null, pageCount: number): Promise<void> {
    this.reset();
    const seq = this.loadSeq;
    try {
      if (!doc) throw new Error('document not readable');
      this.permitted.set(!doc.security || doc.security.allows(PDF_PERMISSION.annotate));
      const pages = await readAnnotations(doc);
      if (seq !== this.loadSeq) return;
      if (pages.length !== pageCount) throw new Error(`page count mismatch (${pages.length} vs ${pageCount})`);
      this.baseline = new Map(pages.flatMap((p) => p.annotations.map((a) => [a.annotation.id, a] as const)));
      this.spaces = pages.map((p) => p.space);
      this.list.set(pages.flatMap((p) => p.annotations.map((a) => a.annotation)));
      this.supported.set(true);
      await this.syncHidden();
    } catch {
      if (seq === this.loadSeq) this.supported.set(false);
    }
  }

  /** Leave every imported annotation and its thread out of the rasters (this layer draws them). */
  private async syncHidden(): Promise<void> {
    const entries: number[] = [];
    for (const b of this.baseline.values()) {
      for (const index of [b.index, ...b.threadIndices]) entries.push(b.annotation.page, index);
    }
    await this.hidden.set('annotations', entries);
  }

  // ── Editing ─────────────────────────────────────────────────────────────

  /** Add an annotation (id, author and dates filled in). Resolves with its id. */
  add(init: HkAnnotationInit, label?: string): Promise<string> {
    return this.serial(() => this.addNow(init, label));
  }

  private async addNow(init: HkAnnotationInit, label?: string): Promise<string> {
    if (!this.canAdd()) throw new Error('Annotations are not editable in this document');
    const now = new Date().toISOString();
    const annotation = withDerivedRect({
      ...init,
      id: init.id && init.id !== DRAFT_ID && !this.list().some((a) => a.id === init.id) ? init.id : newAnnotationId(),
      author: init.author ?? this.author(),
      created: init.created ?? now,
      modified: now,
    } as HkAnnotation);
    await this.record(label ?? `Add ${annotation.type}`, null, annotation);
    return annotation.id;
  }

  /**
   * Change an annotation. A function receives the current version. Changes
   * with the same `mergeKey` in a row fold into one undo step (slider drags).
   * Locked annotations only accept comment, reply, status and lock changes.
   */
  update(
    id: string,
    changes: Partial<HkAnnotation> | ((a: HkAnnotation) => HkAnnotation),
    opts: { label?: string; mergeKey?: string } = {},
  ): Promise<void> {
    return this.serial(() => this.updateNow(id, changes, opts));
  }

  private async updateNow(
    id: string,
    changes: Partial<HkAnnotation> | ((a: HkAnnotation) => HkAnnotation),
    opts: { label?: string; mergeKey?: string },
  ): Promise<void> {
    const before = this.list().find((a) => a.id === id);
    if (!before) return;
    const changed = typeof changes === 'function' ? changes(before) : ({ ...before, ...changes } as HkAnnotation);
    const keys = changedKeys(before, changed);
    const allowed = keys.every((k) => COMMENT_KEYS.has(k))
      ? this.canComment(before)
      : keys.every((k) => k === 'locked' || COMMENT_KEYS.has(k))
        ? this.canModify(before)
        : this.canEdit(before);
    if (!allowed) return;
    const after = withDerivedRect({ ...changed, id, type: before.type, page: before.page, modified: before.modified } as HkAnnotation);
    if (sameAnnotation(before, after)) return;
    await this.record(opts.label ?? 'Edit annotation', before, { ...after, modified: new Date().toISOString() }, opts.mergeKey);
  }

  /** Delete an annotation (not when locked). */
  remove(id: string): Promise<void> {
    return this.serial(async () => {
      const before = this.list().find((a) => a.id === id);
      if (!before || !this.canEdit(before)) return;
      await this.record(`Delete ${before.type}`, before, null);
    });
  }

  async undo(): Promise<boolean> {
    this.preview.set(null);
    this.textEdit.set(null);
    return this.stack.undo();
  }

  async redo(): Promise<boolean> {
    this.preview.set(null);
    this.textEdit.set(null);
    return this.stack.redo();
  }

  /** Group the edits made by `run` into one undo step. */
  async transaction(label: string, run: () => Promise<void>): Promise<void> {
    this.stack.beginTransaction(label);
    try {
      await run();
      await this.stack.commitTransaction();
    } catch (err) {
      await this.stack.rollbackTransaction();
      throw err;
    }
  }

  // ── Arrange, clipboard ──────────────────────────────────────────────────

  /** Move an annotation in its page's paint order (front = drawn last). */
  arrange(id: string, where: AnnotationArrange): Promise<void> {
    return this.serial(async () => {
      const list = this.list();
      const a = list.find((x) => x.id === id);
      if (!a || !this.canEdit(a)) return;
      const page = list.filter((x) => x.page === a.page);
      const from = page.indexOf(a);
      const to =
        where === 'front'
          ? page.length - 1
          : where === 'back'
            ? 0
            : where === 'forward'
              ? Math.min(page.length - 1, from + 1)
              : Math.max(0, from - 1);
      if (to === from) return;
      const order = [...page];
      order.splice(from, 1);
      order.splice(to, 0, a);
      let k = 0;
      const next = list.map((x) => (x.page === a.page ? order[k++] : x));
      await this.stack.execute({ label: 'Arrange', apply: () => this.list.set(next), revert: () => this.list.set(list) });
    });
  }

  /** Copy annotations (for paste here or in another viewer); returns the clipboard data. */
  copy(ids: readonly string[]): string {
    this.clipboard = this.list().filter((a) => ids.includes(a.id));
    return exportAnnotationsJson(this.clipboard);
  }

  /** Plain text put on the clipboard with a copy: the comments, or a marker when there are none. */
  copyText(): string {
    return (
      this.clipboard
        .map((a) => a.contents ?? '')
        .join('\n')
        .trim() || `[${this.clipboard.length} annotation(s)]`
    );
  }

  /** Whether clipboard text is what our last copy put there (custom-format fallback). */
  isLastCopy(text: string | null): boolean {
    return !!text && this.clipboard.length > 0 && text === this.copyText();
  }

  lastCopy(): string | null {
    return this.clipboard.length ? exportAnnotationsJson(this.clipboard) : null;
  }

  /**
   * Paste annotations onto a page (0-based), as new ones: comment threads and
   * locks aren't copied, and a paste onto the same page shifts down-right so
   * the copy is visible. Returns the new ids (selecting the first).
   */
  async paste(text: string, page: number): Promise<string[]> {
    let items: HkAnnotation[];
    try {
      items = importAnnotationsJson(text);
    } catch {
      return [];
    }
    if (!items.length || !this.canAdd() || page < 0 || page >= this.spaces.length) return [];
    const ids: string[] = [];
    await this.transaction('Paste', async () => {
      for (const item of items) {
        const shifted = item.page === page ? translateAnnotation(item, 12, 12) : { ...item, page };
        // A paste is a new annotation by the user: no thread, lock, identity or history carries over.
        const copy: Record<string, unknown> = { ...shifted, page };
        for (const key of PASTE_DROPPED) delete copy[key];
        ids.push(await this.add(copy as unknown as HkAnnotationInit, 'Paste'));
      }
    });
    if (ids[0]) this.select(ids[0]);
    return ids;
  }

  /** Copy an annotation in place (shifted). */
  async duplicate(id: string): Promise<string | null> {
    const a = this.list().find((x) => x.id === id);
    if (!a) return null;
    const [copy] = await this.paste(exportAnnotationsJson([a]), a.page);
    return copy ?? null;
  }

  // ── Import / export ─────────────────────────────────────────────────────

  exportXfdf(href?: string): string {
    return exportXfdf(this.list(), this.spaces, href);
  }

  exportJson(): string {
    return exportAnnotationsJson(this.list());
  }

  /**
   * Import XFDF or JSON (detected from the text) as one undo step: an
   * annotation whose id already exists replaces it, the rest are added.
   * Annotations for pages this document doesn't have are skipped. Returns how
   * many were imported.
   */
  async importAnnotations(text: string): Promise<number> {
    if (!this.canAdd()) return 0;
    const items = text.trimStart().startsWith('<') ? importXfdf(text, this.spaces) : importAnnotationsJson(text);
    const valid = items.filter((a) => a.page >= 0 && a.page < this.spaces.length);
    await this.transaction('Import annotations', async () => {
      for (const a of valid) {
        if (this.list().some((x) => x.id === a.id)) await this.update(a.id, () => a, { label: 'Import annotations' });
        else await this.add(a, 'Import annotations');
      }
    });
    return valid.length;
  }

  /** Rects (points) of the link annotations of a page as the file has them: the PDFium link overlay leaves these to the annotation layer. */
  managedLinkRects(pageNumber: number): PdfRect[] {
    const out: PdfRect[] = [];
    for (const b of this.baseline.values())
      if (b.annotation.type === 'link' && b.annotation.page === pageNumber - 1) out.push(b.annotation.rect);
    return out;
  }

  // ── Comment threads ─────────────────────────────────────────────────────

  setContents(id: string, contents: string): Promise<void> {
    return this.update(id, { contents: contents || undefined }, { label: 'Edit comment' });
  }

  addReply(id: string, contents: string): Promise<void> {
    const text = contents.trim();
    if (!text) return Promise.resolve();
    const now = new Date().toISOString();
    const reply: PdfAnnotationReply = { id: newAnnotationId(), author: this.author(), contents: text, created: now, modified: now };
    return this.update(id, (a) => ({ ...a, replies: [...(a.replies ?? []), reply] }), { label: 'Reply' });
  }

  editReply(id: string, replyId: string, contents: string): Promise<void> {
    const now = new Date().toISOString();
    return this.update(id, (a) => ({ ...a, replies: a.replies?.map((r) => (r.id === replyId ? { ...r, contents, modified: now } : r)) }), {
      label: 'Edit reply',
    });
  }

  deleteReply(id: string, replyId: string): Promise<void> {
    return this.update(
      id,
      (a) => {
        const replies = a.replies?.filter((r) => r.id !== replyId);
        return { ...a, replies: replies?.length ? replies : undefined };
      },
      { label: 'Delete reply' },
    );
  }

  setStatus(id: string, status: PdfReviewStatus): Promise<void> {
    return this.update(id, { status: status === 'None' ? undefined : status }, { label: 'Set status' });
  }

  // ── Selection ───────────────────────────────────────────────────────────

  /** Select an annotation; `reveal` scrolls its page into view. */
  select(id: string | null, reveal = false): void {
    this.selectedId.set(id);
    const a = id ? this.list().find((x) => x.id === id) : null;
    if (a && reveal) this.viewport.goToPage(a.page + 1);
  }

  /** Open the comments panel on an annotation's thread. */
  openComments(id: string): void {
    this.select(id);
    this.commentsFocus.set({ id, seq: ++this.focusSeq });
    this.store.patchState((s) => ({ ...s, sidebarOpen: true, sidebarTab: 'annotations' }));
  }

  // ── Tool styles ─────────────────────────────────────────────────────────

  toolStyle(tool: PdfAnnotationTool): AnnotationToolStyle {
    if (tool === 'none') return BASE_STYLE;
    return this.styles()[tool] ?? { ...BASE_STYLE, ...TOOL_DEFAULTS[tool] };
  }

  setToolStyle(tool: PdfAnnotationTool, patch: Partial<AnnotationToolStyle>): void {
    if (tool === 'none') return;
    this.styles.update((s) => ({ ...s, [tool]: { ...this.toolStyle(tool), ...patch } }));
  }

  /** The active tool's colour, or every tool's when none is active (the controller's `setAnnotationColor`). */
  setColor(color: string): void {
    const tool = this.store.annotationTool();
    for (const t of tool === 'none' ? TOOLS : [tool]) this.setToolStyle(t, { color });
  }

  // ── Text markup from the selection ──────────────────────────────────────

  /**
   * Mark up the current text selection on every page it spans (one undo
   * step), then clear the selection. Returns false when nothing is selected
   * inside the pages.
   */
  async markupFromSelection(type: PdfTextMarkupType): Promise<boolean> {
    if (!this.supported()) return false;
    const selection = this.store.element.ownerDocument.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;
    const byPage = this.selectionRects(selection);
    if (byPage.size === 0) return false;
    const style = this.toolStyle(type);
    await this.transaction(`Add ${type}`, async () => {
      for (const [page, rects] of byPage) {
        const quads = mergeSelectionRects(rects);
        if (!quads.length) continue;
        await this.add({ type, page, quads, rect: quads[0], color: style.color, opacity: style.opacity });
      }
    });
    selection.removeAllRanges();
    return true;
  }

  /** The selection's client rects, mapped to points on each page they fall on. */
  private selectionRects(selection: Selection): Map<number, PdfRect[]> {
    const out = new Map<number, PdfRect[]>();
    const wrappers = [...this.viewport.pageWrappers()];
    for (let i = 0; i < selection.rangeCount; i++) {
      for (const r of Array.from(selection.getRangeAt(i).getClientRects())) {
        if (r.width < 1 || r.height < 1) continue;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const hit = wrappers.find(([, el]) => {
          const b = el.getBoundingClientRect();
          return cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom;
        });
        if (!hit) continue;
        const [pageNumber, wrapper] = hit;
        const layer = wrapper.querySelector<HTMLElement>('.hk-pdf-text-layer');
        const page = this.store.findPage(pageNumber);
        if (!layer || !page) continue;
        const size = { width: this.viewport.pageCssWidth(pageNumber), height: this.viewport.pageCssHeight(pageNumber) };
        const bounds = layer.getBoundingClientRect();
        const rotation = this.store.pageRotation(pageNumber);
        const a = pointerToLocal(r.left, r.top, bounds, size, rotation);
        const b = pointerToLocal(r.right, r.bottom, bounds, size, rotation);
        const s = size.width > 0 ? page.baseWidth / size.width : 1;
        const rect = { x: Math.min(a.x, b.x) * s, y: Math.min(a.y, b.y) * s, w: Math.abs(b.x - a.x) * s, h: Math.abs(b.y - a.y) * s };
        const list = out.get(pageNumber - 1);
        if (list) list.push(rect);
        else out.set(pageNumber - 1, [rect]);
      }
    }
    return out;
  }

  // ── Page structure ──────────────────────────────────────────────────────

  /** A page was deleted (0-based): its annotations go, later pages shift up. History is cleared. */
  onPageRemoved(index: number): void {
    this.spaces.splice(index, 1);
    this.shiftPages((page) => (page === index ? null : page > index ? page - 1 : page));
  }

  /** A page of `width` × `height` points was inserted at `index` (0-based): later pages shift down. History is cleared. */
  onPageInserted(index: number, width = 612, height = 792): void {
    this.spaces.splice(index, 0, new PageSpace([0, 0, width, height], 0));
    this.shiftPages((page) => (page >= index ? page + 1 : page));
  }

  private shiftPages(map: (page: number) => number | null): void {
    const move = <A extends { page: number }>(a: A): A | null => {
      const page = map(a.page);
      return page === null ? null : page === a.page ? a : { ...a, page };
    };
    this.list.update((list) => list.flatMap((a) => move(a) ?? []));
    const baseline = new Map<string, ImportedAnnotation>();
    for (const [id, b] of this.baseline) {
      const annotation = move(b.annotation);
      if (annotation) baseline.set(id, { ...b, annotation });
    }
    this.baseline = baseline;
    this.preview.set(null);
    this.textEdit.set(null);
    if (this.selectedId() && !this.list().some((a) => a.id === this.selectedId())) this.selectedId.set(null);
    this.stack.clear(); // commands hold page indices from before the change
    void this.syncHidden();
  }

  // ── Saving ──────────────────────────────────────────────────────────────

  /** Whether the annotations differ from the document's (content or paint order). */
  hasChanges(): boolean {
    const list = this.list();
    if (list.length !== this.baseline.size) return true;
    const lastIndex = new Map<number, number>();
    return list.some((a) => {
      const b = this.baseline.get(a.id);
      if (!b || b.annotation.page !== a.page || !sameAnnotation(b.annotation, a)) return true;
      const reordered = b.index < (lastIndex.get(a.page) ?? -1);
      lastIndex.set(a.page, b.index);
      return reordered;
    });
  }

  /** What a save writes (the imported baseline and the current annotations), or null when nothing changed. */
  changes(): { baseline: ReadonlyMap<string, ImportedAnnotation>; current: readonly HkAnnotation[] } | null {
    return this.supported() && this.hasChanges() ? { baseline: this.baseline, current: this.list() } : null;
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private serial<T>(op: () => Promise<T>): Promise<T> {
    const run = this.chain.then(op);
    this.chain = run.catch(() => undefined);
    return run;
  }

  private record(label: string, before: HkAnnotation | null, after: HkAnnotation | null, mergeKey?: string): Promise<void> {
    const id = (after ?? before)!.id;
    const position = before ? this.list().findIndex((a) => a.id === id) : -1;
    return this.stack.execute(this.command(label, id, before, after, position, mergeKey));
  }

  private command(
    label: string,
    id: string,
    before: HkAnnotation | null,
    after: HkAnnotation | null,
    position: number,
    mergeKey?: string,
  ): AnnotationCommand {
    return {
      label,
      id,
      after,
      mergeKey,
      apply: () => this.put(id, after, position),
      revert: () => this.put(id, before, position),
      merge: (next) => {
        const n = next as Partial<AnnotationCommand>;
        if (!mergeKey || n.id !== id || n.mergeKey !== mergeKey || n.after === undefined) return null;
        return this.command(label, id, before, n.after, position, mergeKey);
      },
    };
  }

  /** Put `value` in place of annotation `id` (or remove it); a re-added annotation returns to `position`. */
  private put(id: string, value: HkAnnotation | null, position: number): void {
    this.list.update((list) => {
      const i = list.findIndex((a) => a.id === id);
      if (value === null) return i < 0 ? list : list.filter((a) => a.id !== id);
      if (i >= 0) return list.map((a) => (a.id === id ? value : a));
      const at = position >= 0 && position <= list.length ? position : list.length;
      return [...list.slice(0, at), value, ...list.slice(at)];
    });
    if (value === null && this.selectedId() === id) this.selectedId.set(null);
  }
}

/** The keys whose values differ between two versions (ignoring `modified`). */
function changedKeys(before: HkAnnotation, after: HkAnnotation): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  keys.delete('modified');
  const b = before as unknown as Record<string, unknown>;
  const a = after as unknown as Record<string, unknown>;
  return [...keys].filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
}
