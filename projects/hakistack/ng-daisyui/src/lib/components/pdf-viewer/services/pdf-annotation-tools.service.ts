import { Injectable, inject } from '@angular/core';
import { packRgba, pointerToLocal } from '../core/geometry';
import { PdfAnnotationTool } from '../pdf-viewer.types';
import { PdfViewerStore } from './pdf-viewer.store';
import { PdfViewportService } from './pdf-viewport.service';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Annotation authoring on the page edit layer: the active tool and colour,
 * pointer gestures (rectangle drag, note click, freehand ink), committing to
 * the engine, and the inline text editor that collects annotation text.
 */
@Injectable()
export class PdfAnnotationToolsService {
  private readonly store = inject(PdfViewerStore);
  private readonly viewport = inject(PdfViewportService);

  /** In-progress drag for rectangle tools (highlight / free text). */
  private drag: { layer: HTMLElement; startX: number; startY: number; preview: HTMLElement; pageNumber: number } | null = null;
  /** In-progress freehand stroke: CSS-px points plus the live SVG preview. */
  private ink: { layer: HTMLElement; pageNumber: number; points: number[]; svg: SVGSVGElement; poly: SVGPolylineElement } | null = null;
  private editorResolve: ((value: string | null) => void) | null = null;

  setTool(tool: PdfAnnotationTool): void {
    this.store.annotationTool.set(tool);
  }

  /** Clicking the active tool turns editing off. */
  toggleTool(tool: PdfAnnotationTool): void {
    this.store.annotationTool.update((cur) => (cur === tool ? 'none' : tool));
  }

  setColor(color: string): void {
    this.store.annotationColor.set(color);
  }

  onColorInput(ev: Event): void {
    const value = (ev.target as HTMLInputElement | null)?.value;
    if (value) this.store.annotationColor.set(value);
  }

  /** After an annotation change: mark the document edited, re-render that page, refresh the list. */
  afterChange(pageNumber: number): void {
    this.store.markDocumentEdited();
    this.store.annotations.set(null); // re-fetched on the next Annotations-tab view
    this.viewport.rerenderPage(pageNumber);
  }

  // ── Inline text editor ──────────────────────────────────────────────────

  /** Open the editor; resolves with the text, or `null` if cancelled. */
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

  // ── Pointer gestures on the edit layer ──────────────────────────────────

  /** Start a rectangle drag or ink stroke, or drop a note. */
  onPointerDown(ev: PointerEvent, pageNumber: number): void {
    const tool = this.store.annotationTool();
    if (tool === 'none') return;
    ev.preventDefault();
    const layer = ev.currentTarget as HTMLElement;
    const { x, y } = this.toLayer(layer, pageNumber, ev);
    if (tool === 'note') {
      void this.commitNote(layer, pageNumber, x, y);
      return;
    }
    layer.setPointerCapture(ev.pointerId);
    if (tool === 'ink') {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'hk-pdf-edit-ink');
      const poly = document.createElementNS(SVG_NS, 'polyline');
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', this.store.annotationColor());
      poly.setAttribute('stroke-width', '2');
      poly.setAttribute('stroke-linecap', 'round');
      poly.setAttribute('stroke-linejoin', 'round');
      poly.setAttribute('points', `${x},${y}`);
      svg.appendChild(poly);
      layer.appendChild(svg);
      this.ink = { layer, pageNumber, points: [x, y], svg, poly };
      return;
    }
    const preview = document.createElement('div');
    preview.className = 'hk-pdf-edit-preview';
    preview.style.left = `${x}px`;
    preview.style.top = `${y}px`;
    layer.appendChild(preview);
    this.drag = { layer, startX: x, startY: y, preview, pageNumber };
  }

  /** Grow the rectangle preview or extend the ink stroke. */
  onPointerMove(ev: PointerEvent): void {
    const ink = this.ink;
    if (ink) {
      const p = this.toLayer(ink.layer, ink.pageNumber, ev);
      ink.points.push(p.x, p.y);
      let pts = '';
      for (let i = 0; i < ink.points.length; i += 2) pts += `${ink.points[i]},${ink.points[i + 1]} `;
      ink.poly.setAttribute('points', pts.trim());
      return;
    }
    const d = this.drag;
    if (!d) return;
    const { x, y } = this.toLayer(d.layer, d.pageNumber, ev);
    const s = d.preview.style;
    s.left = `${Math.min(d.startX, x)}px`;
    s.top = `${Math.min(d.startY, y)}px`;
    s.width = `${Math.abs(x - d.startX)}px`;
    s.height = `${Math.abs(y - d.startY)}px`;
  }

  /** Commit the rectangle (highlight / free text) or ink stroke. */
  onPointerUp(ev: PointerEvent, pageNumber: number): void {
    const ink = this.ink;
    if (ink) {
      this.ink = null;
      ink.svg.remove();
      if (ink.points.length >= 4) void this.commitInk(ink.layer, pageNumber, ink.points);
      return;
    }
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    const { x, y } = this.toLayer(d.layer, d.pageNumber, ev);
    const left = Math.min(d.startX, x);
    const top = Math.min(d.startY, y);
    const w = Math.abs(x - d.startX);
    const h = Math.abs(y - d.startY);
    d.preview.remove();
    if (w < 4 || h < 4) return; // ignore taps and tiny drags
    void this.commitRect(this.store.annotationTool(), d.layer, pageNumber, left, top, w, h);
  }

  /**
   * Pointer → the page's unrotated layer-local CSS coordinates. Annotations
   * live in unrotated page space (rotation is display-only until `save()`), so
   * this places them where the user drew on the rotated page.
   */
  private toLayer(layer: HTMLElement, pageNumber: number, ev: PointerEvent): { x: number; y: number } {
    return pointerToLocal(
      ev.clientX,
      ev.clientY,
      layer.getBoundingClientRect(),
      { width: layer.clientWidth, height: layer.clientHeight },
      this.store.pageRotation(pageNumber),
    );
  }

  /** PDF points per CSS px on a page's edit layer. */
  private pointScale(layer: HTMLElement, pageNumber: number): number {
    const page = this.store.findPage(pageNumber);
    if (!page || layer.clientWidth <= 0) return 1;
    return page.baseWidth / layer.clientWidth;
  }

  /** Active colour as `0xRRGGBBAA`; highlights are semi-transparent. */
  private colorRgba(tool: PdfAnnotationTool): number {
    return packRgba(this.store.annotationColor(), tool === 'highlight' ? 0x66 : 0xff);
  }

  private async commitRect(
    tool: PdfAnnotationTool,
    layer: HTMLElement,
    pageNumber: number,
    left: number,
    top: number,
    w: number,
    h: number,
  ) {
    const session = this.store.session();
    if (!session) return;
    const s = this.pointScale(layer, pageNumber);
    const color = this.colorRgba(tool);
    try {
      if (tool === 'highlight') {
        await session.engine.addHighlight(session.doc, pageNumber - 1, left * s, top * s, w * s, h * s, color);
      } else if (tool === 'freetext') {
        const text = (await this.promptText('Text'))?.trim();
        if (!text) return;
        await session.engine.addFreeText(session.doc, pageNumber - 1, left * s, top * s, w * s, h * s, text, color);
      } else {
        return;
      }
      this.afterChange(pageNumber);
    } catch (err) {
      this.store.reportOperationError({ code: 'render_failed', message: 'Failed to add annotation.', recoverable: true, cause: err });
    }
  }

  private async commitNote(layer: HTMLElement, pageNumber: number, cssX: number, cssY: number): Promise<void> {
    const session = this.store.session();
    if (!session) return;
    const text = (await this.promptText('Note'))?.trim();
    if (!text) return;
    const s = this.pointScale(layer, pageNumber);
    try {
      await session.engine.addTextNote(session.doc, pageNumber - 1, cssX * s, cssY * s, text, this.colorRgba('note'));
      this.afterChange(pageNumber);
    } catch (err) {
      this.store.reportOperationError({ code: 'render_failed', message: 'Failed to add note.', recoverable: true, cause: err });
    }
  }

  private async commitInk(layer: HTMLElement, pageNumber: number, cssPoints: number[]): Promise<void> {
    const session = this.store.session();
    if (!session) return;
    const s = this.pointScale(layer, pageNumber);
    const points = cssPoints.map((v) => v * s); // CSS px → PDF points (top-left)
    try {
      await session.engine.addInk(session.doc, pageNumber - 1, points, this.colorRgba('ink'), 2 * s);
      this.afterChange(pageNumber);
    } catch (err) {
      this.store.reportOperationError({ code: 'render_failed', message: 'Failed to add ink.', recoverable: true, cause: err });
    }
  }
}
