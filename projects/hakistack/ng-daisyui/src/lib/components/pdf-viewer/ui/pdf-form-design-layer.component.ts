import { ChangeDetectionStrategy, Component, computed, inject, input, viewChild, ElementRef } from '@angular/core';
import type { PdfRect } from '../core/annotations/annotation.types';
import { pointerToLocal } from '../core/geometry';
import { PdfFormDesignerService } from '../services/pdf-form-designer.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PdfViewportService } from '../services/pdf-viewport.service';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const HANDLES: readonly Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const HANDLE_PX = 9;
const DRAG_THRESHOLD_PX = 3;
/** Default size of a field dropped with a click, by kind (points). */
const CLICK_SIZE: Record<string, [number, number]> = { checkbox: [14, 14], radio: [14, 14], signature: [180, 40], list: [150, 60] };

type Drag =
  | {
      readonly kind: 'move';
      readonly field: string;
      readonly widget: number;
      readonly from: PdfRect;
      readonly x: number;
      readonly y: number;
      moved: boolean;
    }
  | { readonly kind: 'resize'; readonly field: string; readonly widget: number; readonly from: PdfRect; readonly handle: Handle }
  | { readonly kind: 'draw'; readonly x: number; readonly y: number };

/**
 * A page's form design layer ("Prepare form"): every field widget as a
 * labelled box, the selection with resize handles, keyboard moves, and the
 * drawing surface that creates fields with the active tool.
 */
@Component({
  selector: 'hk-pdf-form-design-layer',
  templateUrl: './pdf-form-design-layer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hk-pdf-design-layer', '[style.width.px]': 'cssWidth()', '[style.height.px]': 'cssHeight()' },
})
export class PdfFormDesignLayerComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly designer = inject(PdfFormDesignerService);
  private readonly viewport = inject(PdfViewportService);

  /** 1-based page number. */
  readonly page = input.required<number>();

  private readonly svg = viewChild<ElementRef<SVGSVGElement>>('svg');

  protected readonly cssWidth = computed(() => this.viewport.pageCssWidth(this.page()));
  protected readonly cssHeight = computed(() => this.viewport.pageCssHeight(this.page()));
  private readonly pageWidth = computed(() => this.store.findPage(this.page())?.baseWidth ?? 1);
  private readonly k = computed(() => this.cssWidth() / this.pageWidth());
  protected readonly viewBox = computed(() => `0 0 ${this.pageWidth()} ${this.store.findPage(this.page())?.baseHeight ?? 1}`);
  protected readonly fontSize = computed(() => 9 / this.k());

  protected readonly boxes = computed(() => {
    const sel = this.designer.selection();
    return this.designer.widgetsOnPage(this.page() - 1).map(({ field, widget, index }) => ({
      key: `${field.name}#${index}`,
      field: field.name,
      kind: field.kind,
      index,
      rect: widget.rect,
      selected: !!sel && sel.field === field.name && sel.widget === index,
      label: field.kind === 'radio' ? `${field.name} · ${field.exportValues[widget.onState ?? ''] ?? widget.onState}` : field.name,
    }));
  });

  protected readonly handles = computed(() => {
    const box = this.boxes().find((b) => b.selected);
    if (!box) return [];
    const size = HANDLE_PX / this.k();
    return HANDLES.map((h) => {
      const [x, y] = handlePoint(box.rect, h);
      return { handle: h, x: x - size / 2, y: y - size / 2, size, cursor: CURSOR[h] };
    });
  });

  protected readonly draft = computed(() => {
    const p = this.designer.preview();
    return p && p.field === '' ? p.rect : null;
  });

  private drag: Drag | null = null;

  // ── Pointer ─────────────────────────────────────────────────────────────

  protected onBoxPointerDown(ev: PointerEvent, field: string, widget: number, rect: PdfRect): void {
    if (ev.button !== 0 || this.designer.tool()) return;
    ev.stopPropagation();
    ev.preventDefault();
    this.designer.selection.set({ field, widget });
    (ev.currentTarget as SVGElement).focus?.({ preventScroll: true });
    const [x, y] = this.toPoint(ev);
    this.drag = { kind: 'move', field, widget, from: rect, x, y, moved: false };
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
  }

  protected onHandlePointerDown(ev: PointerEvent, handle: Handle): void {
    const box = this.boxes().find((b) => b.selected);
    if (ev.button !== 0 || !box) return;
    ev.stopPropagation();
    ev.preventDefault();
    this.drag = { kind: 'resize', field: box.field, widget: box.index, from: box.rect, handle };
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
  }

  /** The drawing surface (active while a tool is chosen). */
  protected onSurfacePointerDown(ev: PointerEvent): void {
    if (ev.button !== 0 || !this.designer.tool()) return;
    ev.preventDefault();
    const [x, y] = this.toPoint(ev);
    this.drag = { kind: 'draw', x, y };
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
  }

  protected onPointerMove(ev: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    const [x, y] = this.toPoint(ev);
    if (d.kind === 'move') {
      const dx = x - d.x;
      const dy = y - d.y;
      if (!d.moved && Math.hypot(dx, dy) * this.k() < DRAG_THRESHOLD_PX) return;
      d.moved = true;
      this.designer.preview.set({ field: d.field, widget: d.widget, rect: { ...d.from, x: d.from.x + dx, y: d.from.y + dy } });
    } else if (d.kind === 'resize') {
      this.designer.preview.set({ field: d.field, widget: d.widget, rect: resized(d.from, d.handle, x, y) });
    } else {
      this.designer.preview.set({ field: '', widget: -1, rect: box(d.x, d.y, x, y) });
    }
  }

  protected onPointerUp(ev: PointerEvent): void {
    const d = this.drag;
    this.drag = null;
    const preview = this.designer.preview();
    this.designer.preview.set(null);
    if (!d) return;
    if (d.kind === 'draw') {
      const tool = this.designer.tool();
      if (!tool) return;
      const [x, y] = this.toPoint(ev);
      let rect = box(d.x, d.y, x, y);
      if (rect.w < 4 && rect.h < 4) {
        const [w, h] = CLICK_SIZE[tool] ?? [150, 20];
        rect = { x: d.x, y: d.y, w, h };
      }
      void this.designer.create(tool, this.page() - 1, rect);
      return;
    }
    if (!preview || (d.kind === 'move' && !d.moved)) return;
    void this.designer.setWidgetRect(d.field, d.widget, preview.rect);
  }

  /** Arrows move the selected widget (×10 with Ctrl/⌘), Shift+arrows resize it, Delete removes it. */
  protected onBoxKeydown(ev: KeyboardEvent, field: string, widget: number, rect: PdfRect): void {
    const step = ev.ctrlKey || ev.metaKey ? 10 : 1;
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const a = arrows[ev.key];
    if (a) {
      ev.preventDefault();
      ev.stopPropagation();
      this.designer.selection.set({ field, widget });
      const next = ev.shiftKey
        ? { ...rect, w: Math.max(4, rect.w + a[0]), h: Math.max(4, rect.h + a[1]) }
        : { ...rect, x: rect.x + a[0], y: rect.y + a[1] };
      void this.designer.setWidgetRect(field, widget, next, ev.shiftKey ? 'key-resize' : 'key-move');
    } else if (ev.key === 'Delete' || ev.key === 'Backspace') {
      ev.preventDefault();
      ev.stopPropagation();
      void this.designer.remove(field, widget);
    } else if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.designer.selection.set({ field, widget });
    }
  }

  protected onBoxFocus(field: string, widget: number): void {
    const s = this.designer.selection();
    if (s?.field !== field || s.widget !== widget) this.designer.selection.set({ field, widget });
  }

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
    return [local.x / this.k(), local.y / this.k()];
  }
}

const CURSOR: Record<Handle, string> = {
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
  return [
    h.includes('w') ? r.x : h.includes('e') ? r.x + r.w : r.x + r.w / 2,
    h.includes('n') ? r.y : h.includes('s') ? r.y + r.h : r.y + r.h / 2,
  ];
}

function resized(r: PdfRect, handle: Handle, x: number, y: number): PdfRect {
  let [x0, y0, x1, y1] = [r.x, r.y, r.x + r.w, r.y + r.h];
  if (handle.includes('w')) x0 = Math.min(x, x1 - 4);
  if (handle.includes('e')) x1 = Math.max(x, x0 + 4);
  if (handle.includes('n')) y0 = Math.min(y, y1 - 4);
  if (handle.includes('s')) y1 = Math.max(y, y0 + 4);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function box(x0: number, y0: number, x1: number, y1: number): PdfRect {
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
}
