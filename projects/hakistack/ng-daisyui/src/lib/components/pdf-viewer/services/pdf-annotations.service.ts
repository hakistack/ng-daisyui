import { Injectable, computed, inject, signal } from '@angular/core';
import { ImportedAnnotation, readAnnotations, sameAnnotation, writeAnnotationChanges } from '../core/annotations/annotation-io';
import {
  HkAnnotation,
  HkAnnotationInit,
  PdfAnnotationReply,
  PdfFreeTextAnnotation,
  PdfLineEnding,
  PdfRect,
  PdfReviewStatus,
  PdfTextMarkupType,
  newAnnotationId,
} from '../core/annotations/annotation.types';
import { mergeSelectionRects } from '../core/annotations/selection';
import { withDerivedRect } from '../core/annotations/shapes';
import { CommandStack, PdfCommand, PdfCommandStackState } from '../core/command-stack';
import { pointerToLocal } from '../core/geometry';
import { PdfDoc } from '../core/pdf-writer/document';
import type { StandardFont } from '../core/pdf-writer/standard-fonts';
import { PdfAnnotationTool } from '../pdf-viewer.types';
import { PdfViewerStore } from './pdf-viewer.store';
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
];

/** Keys a locked annotation still accepts (its comment thread and the lock itself, per the Locked flag). */
const LOCK_EXEMPT = new Set(['contents', 'replies', 'status', 'locked', 'modified']);

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
  async load(bytes: Uint8Array, pageCount: number): Promise<void> {
    this.reset();
    const seq = this.loadSeq;
    try {
      const pages = await readAnnotations(await PdfDoc.load(bytes));
      if (seq !== this.loadSeq) return;
      if (pages.length !== pageCount) throw new Error(`page count mismatch (${pages.length} vs ${pageCount})`);
      this.baseline = new Map(pages.flatMap((p) => p.annotations.map((a) => [a.annotation.id, a] as const)));
      this.list.set(pages.flatMap((p) => p.annotations.map((a) => a.annotation)));
      this.supported.set(true);
      await this.syncHidden();
    } catch {
      if (seq === this.loadSeq) this.supported.set(false);
    }
  }

  /** Send the hidden set (every imported annotation and its thread) to the render workers and repaint those pages. */
  private async syncHidden(): Promise<void> {
    const session = this.store.session();
    if (!session) return;
    const entries: number[] = [];
    const pages = new Set<number>();
    for (const b of this.baseline.values()) {
      const page = b.annotation.page;
      pages.add(page);
      for (const index of [b.index, ...b.threadIndices]) entries.push(page, index);
    }
    await session.engine.setHiddenAnnotations(session.doc, entries);
    for (const page of pages) this.viewport.rerenderPage(page + 1);
  }

  // ── Editing ─────────────────────────────────────────────────────────────

  /** Add an annotation (id, author and dates filled in). Resolves with its id. */
  add(init: HkAnnotationInit, label?: string): Promise<string> {
    return this.serial(() => this.addNow(init, label));
  }

  private async addNow(init: HkAnnotationInit, label?: string): Promise<string> {
    if (!this.supported()) throw new Error('Annotations are not editable in this document');
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
    if (before.locked && !onlyExemptChanges(before, changed)) return;
    const after = withDerivedRect({ ...changed, id, type: before.type, page: before.page, modified: before.modified } as HkAnnotation);
    if (sameAnnotation(before, after)) return;
    await this.record(opts.label ?? 'Edit annotation', before, { ...after, modified: new Date().toISOString() }, opts.mergeKey);
  }

  /** Delete an annotation (not when locked). */
  remove(id: string): Promise<void> {
    return this.serial(async () => {
      const before = this.list().find((a) => a.id === id);
      if (!before || before.locked) return;
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
    this.shiftPages((page) => (page === index ? null : page > index ? page - 1 : page));
  }

  /** A page was inserted at `index` (0-based): later pages shift down. History is cleared. */
  onPageInserted(index: number): void {
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

  /** Whether the annotations differ from the document's. */
  hasChanges(): boolean {
    const list = this.list();
    if (list.length !== this.baseline.size) return true;
    return list.some((a) => {
      const b = this.baseline.get(a.id);
      return !b || b.annotation.page !== a.page || !sameAnnotation(b.annotation, a);
    });
  }

  /** Apply the annotation changes to `bytes` (the document as PDFium saved it, or the original) as an incremental update. */
  async writeTo(bytes: Uint8Array): Promise<Uint8Array> {
    if (!this.supported() || !this.hasChanges()) return bytes;
    return writeAnnotationChanges(bytes, this.baseline, this.list());
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

/** True when `after` differs from `before` only in the keys a locked annotation accepts. */
function onlyExemptChanges(before: HkAnnotation, after: HkAnnotation): boolean {
  const strip = (a: HkAnnotation) => Object.fromEntries(Object.entries(a).filter(([k]) => !LOCK_EXEMPT.has(k))) as unknown as HkAnnotation;
  return sameAnnotation(strip(before), strip(after));
}
