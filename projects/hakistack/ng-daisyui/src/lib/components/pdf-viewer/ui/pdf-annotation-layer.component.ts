import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, viewChild } from '@angular/core';
import { HkAnnotation, PdfRect, isTextMarkup } from '../core/annotations/annotation.types';
import {
  DrawOp,
  annotationOps,
  cssFontFamily,
  isResizable,
  outerBounds,
  rectSegs,
  resizeAnnotation,
  svgPath,
  translateAnnotation,
  withDerivedRect,
} from '../core/annotations/shapes';
import { pointerToLocal } from '../core/geometry';
import { PdfAnnotationToolsService } from '../services/pdf-annotation-tools.service';
import { PdfAnnotationsService } from '../services/pdf-annotations.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PdfViewportService } from '../services/pdf-viewport.service';
import { annotationTypeLabel } from './pdf-annotation-labels';

/** One painted path, ready for the template. */
interface PathView {
  readonly d: string;
  readonly fill: string;
  readonly stroke: string;
  readonly width: number;
  readonly dash: string | null;
  readonly cap: string;
  readonly join: string;
  readonly opacity: number;
}

/** A block of text clipped to its box (a nested `<svg>` clips by default). */
interface TextView {
  readonly clip: PdfRect;
  readonly lines: readonly { readonly text: string; readonly x: number; readonly y: number }[];
  readonly family: string;
  readonly weight: string;
  readonly size: number;
  readonly color: string;
  readonly opacity: number;
}

interface AnnotationView {
  readonly id: string;
  readonly blend: readonly PathView[];
  readonly paths: readonly PathView[];
  readonly texts: readonly TextView[];
  /** Hit target: filled shapes are hit anywhere inside, outlines only near the stroke. */
  readonly hit: { readonly d: string; readonly area: boolean; readonly width: number };
  readonly label: string;
  readonly title: string;
  readonly locked: boolean;
}

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

type Drag =
  | { readonly kind: 'move'; readonly original: HkAnnotation; readonly x: number; readonly y: number; moved: boolean }
  | { readonly kind: 'resize'; readonly original: HkAnnotation; readonly handle: Handle }
  | { readonly kind: 'vertex'; readonly original: HkAnnotation; readonly index: number };

/** Hit tolerance around outlines, in CSS px. */
const HIT_PX = 6;
/** Size of the resize / vertex handles, in CSS px. */
const HANDLE_PX = 9;
/** Below this many CSS px a press on an annotation is a click, not a move. */
const DRAG_THRESHOLD_PX = 3;

const HANDLES: readonly Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/**
 * A page's annotation layer: the annotations the viewer manages, drawn as
 * SVG in page points (crisp at any zoom; highlights in a separate
 * multiply-blended SVG), with keyboard-focusable hit targets, the selection
 * adorner (move, resize, vertex handles), the drawing surface the tools use,
 * and the in-place free-text editor. Lives inside the page rotor, so it
 * turns with the page.
 */
@Component({
  selector: 'hk-pdf-annotation-layer',
  templateUrl: './pdf-annotation-layer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'hk-pdf-annot-layer',
    '[class.hk-pdf-annot-drawing]': 'drawing()',
    '[style.width.px]': 'cssWidth()',
    '[style.height.px]': 'cssHeight()',
  },
})
export class PdfAnnotationLayerComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly annotations = inject(PdfAnnotationsService);
  protected readonly tools = inject(PdfAnnotationToolsService);
  private readonly viewport = inject(PdfViewportService);

  /** 1-based page number. */
  readonly page = input.required<number>();

  private readonly svg = viewChild<ElementRef<SVGSVGElement>>('svg');
  private readonly editor = viewChild<ElementRef<HTMLTextAreaElement>>('editor');

  protected readonly cssWidth = computed(() => this.viewport.pageCssWidth(this.page()));
  protected readonly cssHeight = computed(() => this.viewport.pageCssHeight(this.page()));
  protected readonly pageWidth = computed(() => this.store.findPage(this.page())?.baseWidth ?? 1);
  protected readonly pageHeight = computed(() => this.store.findPage(this.page())?.baseHeight ?? 1);
  /** CSS px per point. */
  private readonly k = computed(() => (this.pageWidth() > 0 ? this.cssWidth() / this.pageWidth() : 1));
  protected readonly viewBox = computed(() => `0 0 ${this.pageWidth()} ${this.pageHeight()}`);
  protected readonly drawing = computed(() => this.tools.isDrawingTool(this.store.annotationTool()));

  protected readonly views = computed(() => {
    const k = this.k();
    const labels = this.store.labels();
    const editing = this.annotations.textEdit()?.annotation.id;
    // A text box being typed into shows only its editor.
    return this.annotations
      .forPage(this.page())
      .filter((a) => a.id !== editing)
      .map((a) => toView(a, k, labels));
  });

  protected readonly selected = computed(() => {
    const id = this.annotations.selectedId();
    return id ? (this.annotations.forPage(this.page()).find((a) => a.id === id) ?? null) : null;
  });

  /** The selection adorner: the box, and the resize or vertex handles when it can change. */
  protected readonly adorner = computed(() => {
    const a = this.selected();
    if (!a || this.annotations.textEdit()?.annotation.id === a.id) return null;
    const pad = 2 / this.k();
    const box = { x: a.rect.x - pad, y: a.rect.y - pad, w: a.rect.w + 2 * pad, h: a.rect.h + 2 * pad };
    const size = HANDLE_PX / this.k();
    const editable = !a.locked;
    const vertices = editable ? vertexPoints(a) : [];
    const handles =
      editable && isResizable(a) && vertices.length === 0
        ? HANDLES.map((h) => {
            const [px, py] = handlePoint(box, h);
            return { handle: h, x: px - size / 2, y: py - size / 2, size, cursor: HANDLE_CURSOR[h] };
          })
        : [];
    return { box, handles, vertices: vertices.map(([x, y], index) => ({ index, x, y, r: size / 2 })) };
  });

  /** The in-place text editor's box and style, when editing a text box on this page. */
  protected readonly editorView = computed(() => {
    const edit = this.annotations.textEdit();
    if (!edit || edit.annotation.page !== this.page() - 1) return null;
    const a = edit.annotation;
    const k = this.k();
    return {
      left: a.rect.x * k,
      top: a.rect.y * k,
      width: Math.max(40, a.rect.w * k),
      height: Math.max(24, a.rect.h * k),
      fontSize: a.fontSize * k,
      family: cssFontFamily(a.font),
      weight: a.font === 'Helvetica-Bold' ? '700' : '400',
      color: a.fontColor,
      align: a.align,
      value: a.contents ?? '',
    };
  });

  private drag: Drag | null = null;

  constructor() {
    // Focus the editor when it opens.
    effect(() => {
      const el = this.editor()?.nativeElement;
      if (el && this.editorView()) queueMicrotask(() => el.focus());
    });
  }

  // ── Selection, move, resize ─────────────────────────────────────────────

  protected onAnnotationPointerDown(ev: PointerEvent, id: string): void {
    if (ev.button !== 0 || this.drawing()) return;
    ev.stopPropagation();
    ev.preventDefault();
    const a = this.annotations.list().find((x) => x.id === id);
    if (!a) return;
    this.annotations.select(id);
    (ev.currentTarget as SVGElement).focus?.({ preventScroll: true });
    if (a.locked) return;
    const [x, y] = this.toPoint(ev);
    this.drag = { kind: 'move', original: a, x, y, moved: false };
    this.capture(ev);
  }

  protected onHandlePointerDown(ev: PointerEvent, handle: Handle): void {
    const a = this.selected();
    if (ev.button !== 0 || !a) return;
    ev.stopPropagation();
    ev.preventDefault();
    this.drag = { kind: 'resize', original: a, handle };
    this.capture(ev);
  }

  protected onVertexPointerDown(ev: PointerEvent, index: number): void {
    const a = this.selected();
    if (ev.button !== 0 || !a) return;
    ev.stopPropagation();
    ev.preventDefault();
    this.drag = { kind: 'vertex', original: a, index };
    this.capture(ev);
  }

  protected onSvgPointerMove(ev: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    const [x, y] = this.toPoint(ev);
    if (d.kind === 'move') {
      const dx = x - d.x;
      const dy = y - d.y;
      if (!d.moved && Math.hypot(dx, dy) * this.k() < DRAG_THRESHOLD_PX) return;
      d.moved = true;
      this.annotations.preview.set(translateAnnotation(d.original, dx, dy));
    } else if (d.kind === 'resize') {
      this.annotations.preview.set(resizeAnnotation(d.original, resizedBox(d.original.rect, d.handle, x, y, ev.shiftKey)));
    } else {
      this.annotations.preview.set(moveVertex(d.original, d.index, x, y));
    }
  }

  protected onSvgPointerUp(): void {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    const result = this.annotations.preview();
    this.annotations.preview.set(null);
    if (!result || (d.kind === 'move' && !d.moved)) return;
    const label = d.kind === 'move' ? 'Move' : d.kind === 'resize' ? 'Resize' : 'Edit shape';
    void this.annotations.update(d.original.id, () => result, { label });
  }

  protected onAnnotationDoubleClick(id: string): void {
    const a = this.annotations.list().find((x) => x.id === id);
    if (!a) return;
    if (a.type === 'freetext') this.tools.editText(id);
    else this.annotations.openComments(id);
  }

  /**
   * Keyboard on a focused annotation: arrows move it (×10 with Ctrl/⌘),
   * Shift+arrows resize it, Delete removes it, Enter edits its text or opens
   * its comments, Escape clears the selection.
   */
  protected onAnnotationKeydown(ev: KeyboardEvent, id: string): void {
    const a = this.annotations.list().find((x) => x.id === id);
    if (!a) return;
    const step = ev.ctrlKey || ev.metaKey ? 10 : 1;
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const arrow = arrows[ev.key];
    if (arrow) {
      ev.preventDefault();
      ev.stopPropagation();
      this.annotations.select(id);
      if (a.locked) return;
      const [dx, dy] = arrow;
      if (ev.shiftKey && isResizable(a)) {
        const r = a.rect;
        const next = { ...r, w: Math.max(4, r.w + dx), h: Math.max(4, r.h + dy) };
        void this.annotations.update(id, (cur) => resizeAnnotation(cur, next), { label: 'Resize', mergeKey: 'key-resize' });
      } else {
        void this.annotations.update(id, (cur) => translateAnnotation(cur, dx, dy), { label: 'Move', mergeKey: 'key-move' });
      }
      return;
    }
    switch (ev.key) {
      case 'Delete':
      case 'Backspace':
        ev.preventDefault();
        ev.stopPropagation();
        void this.annotations.remove(id);
        break;
      case 'Enter':
      case ' ':
        ev.preventDefault();
        ev.stopPropagation();
        this.annotations.select(id);
        if (ev.key === 'Enter') this.onAnnotationDoubleClick(id);
        break;
      case 'Escape':
        ev.stopPropagation();
        this.annotations.select(null);
        (ev.target as SVGElement).blur?.();
        break;
    }
  }

  protected onAnnotationFocus(id: string): void {
    if (this.annotations.selectedId() !== id) this.annotations.select(id);
  }

  // ── Text editor ─────────────────────────────────────────────────────────

  protected onEditorKeydown(ev: KeyboardEvent, el: HTMLTextAreaElement): void {
    ev.stopPropagation(); // the viewer's shortcuts must not see typing
    if (ev.key === 'Escape') {
      ev.preventDefault();
      this.tools.cancelText();
    } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      void this.tools.commitText(el.value);
    }
  }

  protected onEditorBlur(el: HTMLTextAreaElement): void {
    if (this.annotations.textEdit()) void this.tools.commitText(el.value);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Keep the pointer on the pressed element (it has pointer events, unlike the layer) until release; moves bubble to the SVG. */
  private capture(ev: PointerEvent): void {
    (ev.currentTarget as Element | null)?.setPointerCapture?.(ev.pointerId);
  }

  /** Pointer → points on the page. */
  private toPoint(ev: PointerEvent): [number, number] {
    const svg = this.svg()?.nativeElement;
    if (!svg) return [0, 0];
    const local = pointerToLocal(
      ev.clientX,
      ev.clientY,
      svg.getBoundingClientRect(),
      { width: this.cssWidth(), height: this.cssHeight() },
      this.store.pageRotation(this.page()),
    );
    const k = this.k();
    return [local.x / k, local.y / k];
  }
}

const HANDLE_CURSOR: Record<Handle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

function handlePoint(r: PdfRect, h: Handle): [number, number] {
  const x = h.includes('w') ? r.x : h.includes('e') ? r.x + r.w : r.x + r.w / 2;
  const y = h.includes('n') ? r.y : h.includes('s') ? r.y + r.h : r.y + r.h / 2;
  return [x, y];
}

/** The box after dragging `handle` to `(x, y)`; `keepRatio` preserves the aspect ratio on corners. */
function resizedBox(r: PdfRect, handle: Handle, x: number, y: number, keepRatio: boolean): PdfRect {
  let x0 = r.x;
  let y0 = r.y;
  let x1 = r.x + r.w;
  let y1 = r.y + r.h;
  if (handle.includes('w')) x0 = Math.min(x, x1 - 4);
  if (handle.includes('e')) x1 = Math.max(x, x0 + 4);
  if (handle.includes('n')) y0 = Math.min(y, y1 - 4);
  if (handle.includes('s')) y1 = Math.max(y, y0 + 4);
  if (keepRatio && handle.length === 2 && r.w > 0 && r.h > 0) {
    const scale = Math.max((x1 - x0) / r.w, (y1 - y0) / r.h);
    const w = r.w * scale;
    const h = r.h * scale;
    if (handle.includes('w')) x0 = x1 - w;
    else x1 = x0 + w;
    if (handle.includes('n')) y0 = y1 - h;
    else y1 = y0 + h;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Editable vertices: a line's two ends, a polygon's or polyline's points. */
function vertexPoints(a: HkAnnotation): [number, number][] {
  const flat = a.type === 'line' ? a.points : a.type === 'polygon' || a.type === 'polyline' ? a.vertices : null;
  if (!flat) return [];
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
  return out;
}

function moveVertex(a: HkAnnotation, index: number, x: number, y: number): HkAnnotation {
  const set = (flat: readonly number[]) => flat.map((v, i) => (i === index * 2 ? x : i === index * 2 + 1 ? y : v));
  if (a.type === 'line') return withDerivedRect({ ...a, points: set(a.points) as unknown as [number, number, number, number] });
  if (a.type === 'polygon' || a.type === 'polyline') return withDerivedRect({ ...a, vertices: set(a.vertices) });
  return a;
}

/** Build the template view of an annotation at `k` CSS px per point. */
function toView(a: HkAnnotation, k: number, labels: Parameters<typeof annotationTypeLabel>[1]): AnnotationView {
  const ops = annotationOps(a);
  const blend: PathView[] = [];
  const paths: PathView[] = [];
  const texts: TextView[] = [];
  for (const op of ops) {
    if (op.kind === 'text') {
      texts.push({
        clip: op.clip,
        lines: op.lines.map((l) => ({ text: l.text, x: l.x - op.clip.x, y: l.y - op.clip.y })),
        family: cssFontFamily(op.font),
        weight: op.font === 'Helvetica-Bold' ? '700' : '400',
        size: op.fontSize,
        color: op.color,
        opacity: op.opacity,
      });
      continue;
    }
    (op.blend === 'multiply' ? blend : paths).push(pathView(op));
  }
  const filled = isTextMarkup(a) || a.type === 'note' || a.type === 'freetext' || ops.some((op) => op.kind === 'path' && !!op.fill);
  const hitD = isTextMarkup(a)
    ? svgPath(a.quads.flatMap(rectSegs))
    : a.type === 'freetext' || a.type === 'note'
      ? svgPath(rectSegs(a.rect))
      : ops.map((op) => (op.kind === 'path' ? svgPath(op.segs) : svgPath(rectSegs(op.clip)))).join('');
  const strokeWidth = 'strokeWidth' in a ? a.strokeWidth : 0;
  const type = annotationTypeLabel(a, labels);
  const author = a.author || labels.defaultAuthor;
  return {
    id: a.id,
    blend,
    paths,
    texts,
    hit: { d: hitD || svgPath(rectSegs(outerBounds(a))), area: filled, width: Math.max(strokeWidth, (2 * HIT_PX) / k) },
    label: labels.annotationAriaLabel.replace('{type}', type).replace('{author}', author),
    title: a.contents ? `${author}: ${a.contents}` : `${type} — ${author}`,
    locked: !!a.locked,
  };
}

function pathView(op: Extract<DrawOp, { kind: 'path' }>): PathView {
  return {
    d: svgPath(op.segs),
    fill: op.fill ?? 'none',
    stroke: op.stroke?.color ?? 'none',
    width: op.stroke?.width ?? 0,
    dash: op.stroke?.dash ? op.stroke.dash.join(' ') : null,
    cap: op.stroke?.cap ?? 'butt',
    join: op.stroke?.join ?? 'miter',
    opacity: op.opacity,
  };
}
