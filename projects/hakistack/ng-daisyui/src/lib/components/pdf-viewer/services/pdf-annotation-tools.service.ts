import { Injectable, inject } from '@angular/core';
import {
  HkAnnotation,
  PdfFreeTextAnnotation,
  PdfMeasureKind,
  PdfMeasurement,
  PdfRect,
  TEXT_MARKUP_TYPES,
  PdfTextMarkupType,
} from '../core/annotations/annotation.types';
import { FREE_TEXT_PADDING, NOTE_ICON_SIZE, eraseStrokes, layoutFreeText, pointsBounds } from '../core/annotations/shapes';
import { textWidth } from '../core/pdf-writer/standard-fonts';
import { pointerToLocal } from '../core/geometry';
import { PdfAnnotationTool } from '../pdf-viewer.types';
import { PdfAnnotationDialogsService } from './pdf-annotation-dialogs.service';
import { DRAFT_ID, PdfAnnotationsService, PendingStamp } from './pdf-annotations.service';
import { PdfViewerStore } from './pdf-viewer.store';
import { PdfViewportService } from './pdf-viewport.service';

/** An in-progress drawing gesture on a page (0-based `page`, points). */
type BoxTool = 'rect' | 'ellipse' | 'freetext' | 'stamp' | 'link' | 'radius';
type LineTool = 'line' | 'arrow' | 'distance';
type PolyTool = 'polygon' | 'polyline' | 'cloud' | 'perimeter' | 'area' | 'volume';

type Gesture =
  | { readonly kind: 'box'; readonly tool: BoxTool; readonly page: number; readonly x: number; readonly y: number }
  | { readonly kind: 'line'; readonly tool: LineTool; readonly page: number; readonly x: number; readonly y: number }
  | { readonly kind: 'ink'; readonly page: number; readonly points: number[] }
  | { readonly kind: 'erase'; readonly page: number }
  | { readonly kind: 'poly'; readonly tool: PolyTool; readonly page: number; readonly vertices: number[] };

const BOX_TOOLS: readonly PdfAnnotationTool[] = ['rect', 'ellipse', 'freetext', 'stamp', 'link', 'radius'];
const LINE_TOOLS: readonly PdfAnnotationTool[] = ['line', 'arrow', 'distance'];
const POLY_TOOLS: readonly PdfAnnotationTool[] = ['polygon', 'polyline', 'cloud', 'perimeter', 'area', 'volume'];
/** Poly tools that draw an open path. */
const OPEN_POLY: readonly PolyTool[] = ['polyline', 'perimeter'];

/** Below this many points a drag counts as a click. */
const MIN_DRAG = 4;
/** Eraser radius, in CSS px (converted to points at the current zoom). */
const ERASER_RADIUS_PX = 8;
/** A click this close (CSS px) to the first vertex closes a polygon. */
const CLOSE_RADIUS_PX = 8;

const isMarkupTool = (tool: PdfAnnotationTool): tool is PdfTextMarkupType => (TEXT_MARKUP_TYPES as readonly string[]).includes(tool);

/**
 * Annotation authoring: the active tool, its pointer gestures on a page's
 * drawing surface (boxes, lines, vertices, ink, eraser, notes, text boxes),
 * text markup from the selection, and the inline text editor that collects
 * free text and note comments.
 */
@Injectable()
export class PdfAnnotationToolsService {
  private readonly store = inject(PdfViewerStore);
  private readonly viewport = inject(PdfViewportService);
  private readonly annotations = inject(PdfAnnotationsService);
  private readonly dialogs = inject(PdfAnnotationDialogsService);

  private gesture: Gesture | null = null;
  /** Eraser hits run in order (each needs the strokes the previous one left). */
  private eraseChain: Promise<void> = Promise.resolve();
  private editorResolve: ((value: string | null) => void) | null = null;

  /** Whether the tool draws on the page (the drawing surface takes the pointer). Markup tools work on the text selection instead. */
  isDrawingTool(tool: PdfAnnotationTool = this.store.annotationTool()): boolean {
    return tool !== 'none' && !isMarkupTool(tool);
  }

  setTool(tool: PdfAnnotationTool): void {
    this.cancel();
    if (tool !== 'none') {
      this.annotations.select(null);
      this.store.annotationBarOpen.set(true);
    }
    this.store.annotationTool.set(tool);
  }

  /**
   * Toolbar click: a markup tool applies at once to a current text selection;
   * otherwise the tool toggles (clicking the active tool turns it off).
   */
  async toggleTool(tool: PdfAnnotationTool): Promise<void> {
    if (isMarkupTool(tool) && (await this.annotations.markupFromSelection(tool))) return;
    this.setTool(this.store.annotationTool() === tool ? 'none' : tool);
  }

  setColor(color: string): void {
    this.annotations.setColor(color);
  }

  /** Close the annotation toolbar row and return to normal interaction. */
  closeBar(): void {
    this.setTool('none');
    this.store.annotationBarOpen.set(false);
  }

  /** Abandon any in-progress gesture or draft. */
  cancel(): void {
    this.gesture = null;
    this.annotations.preview.set(null);
  }

  // ── Pointer gestures on the drawing surface ─────────────────────────────

  onPointerDown(ev: PointerEvent, pageNumber: number): void {
    const tool = this.store.annotationTool();
    if (!this.isDrawingTool(tool) || ev.button !== 0 || !this.annotations.supported()) return;
    ev.preventDefault();
    const surface = ev.currentTarget as HTMLElement;
    const page = pageNumber - 1;
    const [x, y] = this.toPoint(surface, pageNumber, ev);

    if (tool === 'note') {
      void this.addNote(page, x, y);
      return;
    }
    if (POLY_TOOLS.includes(tool)) {
      this.addVertex(tool as PolyTool, page, x, y, pageNumber);
      return;
    }
    surface.setPointerCapture?.(ev.pointerId);
    if (BOX_TOOLS.includes(tool)) {
      this.gesture = { kind: 'box', tool: tool as BoxTool, page, x, y };
      return;
    }
    if (LINE_TOOLS.includes(tool)) {
      this.gesture = { kind: 'line', tool: tool as LineTool, page, x, y };
      return;
    }
    switch (tool) {
      case 'ink':
        this.gesture = { kind: 'ink', page, points: [x, y] };
        this.annotations.preview.set(this.inkDraft(page, [x, y]));
        break;
      case 'eraser':
        this.gesture = { kind: 'erase', page };
        this.queueErase(page, x, y, pageNumber);
        break;
    }
  }

  onPointerMove(ev: PointerEvent, pageNumber: number): void {
    const g = this.gesture;
    if (!g || g.page !== pageNumber - 1) return;
    const [x, y] = this.toPoint(ev.currentTarget as HTMLElement, pageNumber, ev);
    switch (g.kind) {
      case 'box':
        this.annotations.preview.set(this.boxDraft(g.tool, g.page, boxFrom(g.x, g.y, x, y, ev.shiftKey)));
        break;
      case 'line': {
        const [ex, ey] = ev.shiftKey ? snap45(g.x, g.y, x, y) : [x, y];
        this.annotations.preview.set(this.lineDraft(g.tool, g.page, [g.x, g.y, ex, ey]));
        break;
      }
      case 'ink': {
        const n = g.points.length;
        if (Math.hypot(x - g.points[n - 2], y - g.points[n - 1]) < 0.75) return;
        g.points.push(x, y);
        this.annotations.preview.set(this.inkDraft(g.page, g.points));
        break;
      }
      case 'erase':
        if (ev.buttons & 1) this.queueErase(g.page, x, y, pageNumber);
        break;
      case 'poly':
        this.annotations.preview.set(this.polyDraft(g.tool, g.page, [...g.vertices, x, y]));
        break;
    }
  }

  onPointerUp(ev: PointerEvent, pageNumber: number): void {
    const g = this.gesture;
    if (!g || g.kind === 'poly' || g.page !== pageNumber - 1) return;
    this.gesture = null;
    const [x, y] = this.toPoint(ev.currentTarget as HTMLElement, pageNumber, ev);
    const draft = this.annotations.preview();
    this.annotations.preview.set(null);
    switch (g.kind) {
      case 'box': {
        let rect = boxFrom(g.x, g.y, x, y, ev.shiftKey || g.tool === 'radius');
        const click = rect.w < MIN_DRAG && rect.h < MIN_DRAG;
        if (click && g.tool === 'freetext') {
          const style = this.annotations.toolStyle('freetext');
          rect = { x: g.x, y: g.y, w: 180, h: Math.ceil(style.fontSize * 1.16 + 2 * (FREE_TEXT_PADDING + style.strokeWidth)) };
        } else if (g.tool === 'stamp') {
          void this.placeStamp(g.page, click ? null : rect, g.x, g.y);
          return;
        } else if (click) {
          return;
        }
        if (g.tool === 'link') {
          void this.addLink(g.page, rect);
          return;
        }
        const annotation = this.boxDraft(g.tool, g.page, rect);
        if (annotation.type === 'freetext') this.annotations.textEdit.set({ annotation, isNew: true });
        else void this.annotations.add(annotation);
        break;
      }
      case 'line':
        if (
          draft &&
          draft.type === 'line' &&
          Math.hypot(draft.points[2] - draft.points[0], draft.points[3] - draft.points[1]) >= MIN_DRAG
        ) {
          void this.annotations.add(draft);
        }
        break;
      case 'ink':
        void this.annotations.add(this.inkDraft(g.page, g.points));
        break;
      case 'erase':
        break;
    }
  }

  /** Double-click finishes a polygon / polyline / cloud. */
  onDoubleClick(): void {
    void this.finishPoly();
  }

  /** Keys while drawing: Enter finishes a shape, Backspace drops its last vertex, Escape cancels. */
  onKeydown(ev: KeyboardEvent): boolean {
    const g = this.gesture;
    if (ev.key === 'Escape' && (g || this.annotations.preview())) {
      this.cancel();
      return true;
    }
    if (g?.kind !== 'poly') return false;
    if (ev.key === 'Enter') {
      void this.finishPoly();
      return true;
    }
    if (ev.key === 'Backspace') {
      g.vertices.splice(-2, 2);
      if (g.vertices.length === 0) this.cancel();
      else this.annotations.preview.set(this.polyDraft(g.tool, g.page, g.vertices));
      return true;
    }
    return false;
  }

  /** After a text selection ends with a markup tool active, mark it up. */
  onSelectionEnd(): void {
    const tool = this.store.annotationTool();
    if (isMarkupTool(tool)) void this.annotations.markupFromSelection(tool);
  }

  // ── Free text editing ───────────────────────────────────────────────────

  /** Start editing an existing text box's text in place. */
  editText(id: string): void {
    const a = this.annotations.list().find((x) => x.id === id);
    if (a?.type === 'freetext' && !a.locked) this.annotations.textEdit.set({ annotation: a, isNew: false });
  }

  /** Finish in-place text editing: a new box is added with its text (dropped if empty); an existing one is updated. */
  async commitText(text: string): Promise<void> {
    const edit = this.annotations.textEdit();
    if (!edit) return;
    this.annotations.textEdit.set(null);
    const contents = text.replace(/\s+$/, '');
    const fitted = fitFreeText({ ...edit.annotation, contents });
    if (edit.isNew) {
      if (contents) await this.annotations.add(fitted, 'Add text box');
    } else if (contents) {
      await this.annotations.update(edit.annotation.id, { contents, rect: fitted.rect }, { label: 'Edit text' });
    } else {
      await this.annotations.remove(edit.annotation.id);
    }
  }

  cancelText(): void {
    this.annotations.textEdit.set(null);
  }

  // ── Inline text prompt (note comments) ──────────────────────────────────

  /** Open the text prompt; resolves with the text, or `null` if cancelled. */
  promptText(label: string, value = ''): Promise<string | null> {
    this.editorResolve?.(null); // cancel any open prompt
    this.store.textEditorDraft.set(value);
    this.store.textEditor.set({ label });
    return new Promise<string | null>((resolve) => {
      this.editorResolve = resolve;
    });
  }

  saveEditor(): void {
    this.closeEditor(this.store.textEditorDraft());
  }

  cancelEditor(): void {
    this.closeEditor(null);
  }

  /** Esc cancels, Ctrl/⌘+Enter saves. */
  onEditorKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      this.cancelEditor();
    } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      this.saveEditor();
    }
  }

  private closeEditor(value: string | null): void {
    const resolve = this.editorResolve;
    this.editorResolve = null;
    this.store.textEditor.set(null);
    resolve?.(value);
  }

  // ── Drafts ──────────────────────────────────────────────────────────────

  private boxDraft(tool: BoxTool, page: number, rect: PdfRect): HkAnnotation {
    const s = this.annotations.toolStyle(tool);
    const base = { id: DRAFT_ID, page, rect, color: s.color, opacity: s.opacity, author: this.annotations.author() };
    if (tool === 'stamp') {
      const pending = this.annotations.pendingStamp();
      return pending
        ? { ...base, type: 'stamp', color: pending.color, name: pending.name, stamp: pending.stamp }
        : { ...base, type: 'rect', strokeWidth: 1, fill: null, dash: [4, 3] };
    }
    if (tool === 'link') return { ...base, type: 'link', target: { kind: 'page', page: 0 }, strokeWidth: Math.max(1, s.strokeWidth) };
    if (tool === 'radius') {
      return {
        ...base,
        type: 'ellipse',
        strokeWidth: s.strokeWidth,
        fill: s.fill,
        dash: s.dashed ? [4, 3] : undefined,
        measure: this.measure('radius'),
      };
    }
    if (tool === 'freetext') {
      return {
        ...base,
        type: 'freetext',
        font: s.font,
        fontSize: s.fontSize,
        fontColor: s.fontColor,
        align: s.align,
        strokeWidth: s.strokeWidth,
        fill: s.fill,
      };
    }
    return {
      ...base,
      type: tool,
      strokeWidth: s.strokeWidth,
      fill: s.fill,
      dash: s.dashed ? [4, 3] : undefined,
      cloudy: s.cloudy || undefined,
    };
  }

  /** A measurement in the current scale. */
  private measure(kind: PdfMeasureKind): PdfMeasurement {
    return { kind, scale: this.annotations.scale(), depth: kind === 'volume' ? this.annotations.depth() : undefined };
  }

  private lineDraft(tool: LineTool, page: number, points: [number, number, number, number]): HkAnnotation {
    const s = this.annotations.toolStyle(tool);
    return {
      id: DRAFT_ID,
      type: 'line',
      page,
      rect: pointsBounds(points),
      points,
      color: s.color,
      opacity: s.opacity,
      strokeWidth: s.strokeWidth,
      startEnding: s.startEnding,
      endEnding: s.endEnding,
      fill: s.fill,
      dash: s.dashed ? [4, 3] : undefined,
      author: this.annotations.author(),
      measure: tool === 'distance' ? this.measure('distance') : undefined,
    };
  }

  private polyDraft(tool: PolyTool, page: number, vertices: number[]): HkAnnotation {
    const s = this.annotations.toolStyle(tool);
    const common = {
      id: DRAFT_ID,
      page,
      rect: pointsBounds(vertices),
      vertices: [...vertices],
      color: s.color,
      opacity: s.opacity,
      strokeWidth: s.strokeWidth,
      fill: s.fill,
      dash: s.dashed ? [4, 3] : undefined,
      author: this.annotations.author(),
    };
    if (tool === 'polyline' || tool === 'perimeter') {
      const measure = tool === 'perimeter' ? this.measure('perimeter') : undefined;
      return { ...common, type: 'polyline', startEnding: s.startEnding, endEnding: s.endEnding, measure };
    }
    const measure = tool === 'area' || tool === 'volume' ? this.measure(tool) : undefined;
    return { ...common, type: 'polygon', cloudy: tool === 'cloud' || s.cloudy || undefined, measure };
  }

  private inkDraft(page: number, points: readonly number[]): HkAnnotation {
    const s = this.annotations.toolStyle('ink');
    return {
      id: DRAFT_ID,
      type: 'ink',
      page,
      rect: pointsBounds(points),
      strokes: [[...points]],
      color: s.color,
      opacity: s.opacity,
      strokeWidth: s.strokeWidth,
      author: this.annotations.author(),
    };
  }

  // ── Gesture helpers ─────────────────────────────────────────────────────

  private addVertex(tool: PolyTool, page: number, x: number, y: number, pageNumber: number): void {
    let g = this.gesture;
    if (g?.kind !== 'poly' || g.page !== page || g.tool !== tool) {
      g = { kind: 'poly', tool, page, vertices: [] };
      this.gesture = g;
    }
    const v = g.vertices;
    const closeRadius = CLOSE_RADIUS_PX / this.pxPerPoint(pageNumber);
    if (!OPEN_POLY.includes(tool) && v.length >= 6 && Math.hypot(x - v[0], y - v[1]) <= closeRadius) {
      void this.finishPoly();
      return;
    }
    // The two clicks of a double-click land on the same spot: keep one vertex.
    if (v.length >= 2 && Math.hypot(x - v[v.length - 2], y - v[v.length - 1]) < 1) return;
    v.push(x, y);
    this.annotations.preview.set(this.polyDraft(tool, page, v));
  }

  private async finishPoly(): Promise<void> {
    const g = this.gesture;
    if (g?.kind !== 'poly') return;
    this.gesture = null;
    this.annotations.preview.set(null);
    const enough = OPEN_POLY.includes(g.tool) ? g.vertices.length >= 4 : g.vertices.length >= 6;
    if (enough) await this.annotations.add(this.polyDraft(g.tool, g.page, g.vertices));
  }

  /** Place the pending stamp: in the dragged box, or at its natural size centred on the click. Then back to selecting it. */
  private async placeStamp(page: number, rect: PdfRect | null, x: number, y: number): Promise<void> {
    const pending = this.annotations.pendingStamp();
    if (!pending) return;
    const size = stampSize(pending);
    const box = rect ?? { x: x - size.w / 2, y: y - size.h / 2, w: size.w, h: size.h };
    const id = await this.annotations.add({
      type: 'stamp',
      page,
      rect: box,
      color: pending.color,
      opacity: 1,
      name: pending.name,
      stamp: pending.stamp,
      flatten: pending.flatten,
    });
    this.setTool('none');
    this.annotations.select(id);
  }

  /** Ask where the dragged link goes, then add it. */
  private async addLink(page: number, rect: PdfRect): Promise<void> {
    const target = await this.dialogs.askLink();
    if (!target) return;
    const s = this.annotations.toolStyle('link');
    await this.annotations.add({ type: 'link', page, rect, target, color: s.color, opacity: 1, strokeWidth: s.strokeWidth });
  }

  private async addNote(page: number, x: number, y: number): Promise<void> {
    const text = (await this.promptText(this.store.labels().comment))?.trim();
    if (!text) return;
    const s = this.annotations.toolStyle('note');
    const half = NOTE_ICON_SIZE / 2;
    await this.annotations.add({
      type: 'note',
      page,
      rect: { x: x - half, y: y - half, w: NOTE_ICON_SIZE, h: NOTE_ICON_SIZE },
      color: s.color,
      opacity: s.opacity,
      icon: s.icon,
      contents: text,
    });
  }

  private queueErase(page: number, x: number, y: number, pageNumber: number): void {
    this.eraseChain = this.eraseChain.then(() => this.erase(page, x, y, pageNumber)).catch(() => undefined);
  }

  /** Erase ink around a point on a page. Successive erasing of one stroke folds into one undo step. */
  private async erase(page: number, x: number, y: number, pageNumber: number): Promise<void> {
    const radius = ERASER_RADIUS_PX / this.pxPerPoint(pageNumber);
    for (const a of this.annotations.list()) {
      if (a.page !== page || a.type !== 'ink' || a.locked) continue;
      const r = a.rect;
      if (x < r.x - radius || x > r.x + r.w + radius || y < r.y - radius || y > r.y + r.h + radius) continue;
      const strokes = eraseStrokes(a.strokes, x, y, radius);
      const removed = strokes.reduce((n, s) => n + s.length, 0) !== a.strokes.reduce((n, s) => n + s.length, 0);
      if (!removed) continue;
      if (strokes.length) await this.annotations.update(a.id, { strokes }, { label: 'Erase', mergeKey: `erase:${a.id}` });
      else await this.annotations.remove(a.id);
    }
  }

  /** Pointer → points on the page (unrotated by the view, top-left origin). */
  private toPoint(surface: HTMLElement, pageNumber: number, ev: PointerEvent): [number, number] {
    const size = { width: this.viewport.pageCssWidth(pageNumber), height: this.viewport.pageCssHeight(pageNumber) };
    const local = pointerToLocal(ev.clientX, ev.clientY, surface.getBoundingClientRect(), size, this.store.pageRotation(pageNumber));
    const k = this.pxPerPoint(pageNumber);
    return [local.x / k, local.y / k];
  }

  /** CSS px per point at the current zoom. */
  private pxPerPoint(pageNumber: number): number {
    const page = this.store.findPage(pageNumber);
    const width = this.viewport.pageCssWidth(pageNumber);
    return page && width > 0 ? width / page.baseWidth : this.viewport.scale() || 1;
  }
}

/** A stamp's natural size: text stamps fit their text, images keep their aspect within 160 pt, signatures are about 50 pt tall. */
function stampSize(p: PendingStamp): { w: number; h: number } {
  const s = p.stamp;
  if (s.kind === 'image') {
    const k = 160 / Math.max(s.width, s.height, 1);
    return { w: Math.max(8, s.width * k), h: Math.max(8, s.height * k) };
  }
  if (s.kind === 'ink') {
    const w = Math.min(200, 50 * s.aspect);
    return { w, h: w / Math.max(0.1, s.aspect) };
  }
  const h = s.subtext ? 46 : 34;
  const text = Math.max(textWidth(s.text, 'Helvetica-Bold', h * 0.42), s.subtext ? textWidth(s.subtext, 'Helvetica', h * 0.2) : 0);
  const w = Math.min(360, Math.max(90, text + h * 0.9 + (s.shape === 'arrow' ? h / 2 : 0)));
  return { w, h };
}

/** The rectangle spanned by two points; `square` constrains it to a square. */
function boxFrom(x0: number, y0: number, x1: number, y1: number, square: boolean): PdfRect {
  let w = x1 - x0;
  let h = y1 - y0;
  if (square) {
    const side = Math.max(Math.abs(w), Math.abs(h));
    w = Math.sign(w || 1) * side;
    h = Math.sign(h || 1) * side;
  }
  return { x: Math.min(x0, x0 + w), y: Math.min(y0, y0 + h), w: Math.abs(w), h: Math.abs(h) };
}

/** Snap a line's end to the nearest 45°. */
function snap45(x0: number, y0: number, x1: number, y1: number): [number, number] {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const angle = Math.round(Math.atan2(y1 - y0, x1 - x0) / (Math.PI / 4)) * (Math.PI / 4);
  return [x0 + Math.cos(angle) * len, y0 + Math.sin(angle) * len];
}

/** Grow a text box downward so all of its text fits. */
function fitFreeText(a: PdfFreeTextAnnotation): PdfFreeTextAnnotation {
  const layout = layoutFreeText(a);
  const last = layout.lines.at(-1);
  if (!last) return a;
  const needed = last.y + a.fontSize * 0.3 + FREE_TEXT_PADDING + a.strokeWidth - a.rect.y;
  return needed > a.rect.h ? { ...a, rect: { ...a.rect, h: Math.ceil(needed) } } : a;
}
