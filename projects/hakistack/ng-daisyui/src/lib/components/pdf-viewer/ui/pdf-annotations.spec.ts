import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readAnnotations, writeAnnotationChanges } from '../core/annotations/annotation-io';
import { HkAnnotation } from '../core/annotations/annotation.types';
import { PdfDoc } from '../core/pdf-writer/document';
import { PdfEngine } from '../engine/pdf-engine.types';
import { PdfViewerComponent } from '../pdf-viewer.component';
import { createPdfViewer } from '../pdf-viewer.helpers';
import { PdfViewerConfig } from '../pdf-viewer.types';
import { PdfViewerStore } from '../services/pdf-viewer.store';

/**
 * Annotation editing end to end in jsdom: a real PDF (written by
 * hk-pdf-writer) loads through a fake engine, its annotation is imported,
 * drawn in the SVG layer and hidden in the raster, edited with the keyboard,
 * the tools and the comments panel, undone, and saved back.
 */

const enc = new TextEncoder();

function basePdf(): Uint8Array {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>',
  ];
  let out = '%PDF-1.7\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return enc.encode(out);
}

const SQUARE: HkAnnotation = {
  id: 'sq-1',
  type: 'rect',
  page: 0,
  rect: { x: 100, y: 100, w: 200, h: 100 },
  color: '#dc2626',
  opacity: 1,
  strokeWidth: 2,
  fill: null,
  author: 'Ana',
  contents: 'Check this',
  created: '2026-01-01T00:00:00.000Z',
  modified: '2026-01-01T00:00:00.000Z',
};

let annotatedPdf: Uint8Array;
beforeAll(async () => {
  annotatedPdf = await writeAnnotationChanges(basePdf(), new Map(), [SQUARE]);
});

@Component({
  imports: [PdfViewerComponent],
  template: `<hk-pdf-viewer [src]="src()" [config]="config()" (dirtyChange)="dirty.push($event)" />`,
})
class HostComponent {
  readonly src = signal<Uint8Array>(new Uint8Array());
  readonly config = signal<PdfViewerConfig>({});
  readonly dirty: boolean[] = [];
}

describe('PDF annotation editing', () => {
  let hidden: number[][];

  let pageCount: number;

  beforeEach(() => {
    hidden = [];
    pageCount = 1;
    const never = new Promise<never>(() => undefined);
    const engine: Partial<PdfEngine> = {
      open: async () => 1,
      pageCount: async () => 1,
      pageSizes: async () => Array.from({ length: pageCount }, () => ({ width: 612, height: 792 })),
      pageLabels: async () => Array.from({ length: pageCount }, () => ''),
      insertBlankPage: async () => {
        pageCount++;
        return true;
      },
      documentTitle: async () => '',
      renderPage: () => ({ promise: never, cancel: () => undefined }),
      renderTile: () => ({ promise: never, cancel: () => undefined }),
      pageText: async () => [],
      pagesText: async (_d, pages) => pages.map(() => []),
      pageLinks: async () => [],
      formFields: async () => [],
      outline: async () => [],
      attachments: async () => [],
      setHiddenAnnotations: async (_d, entries) => void hidden.push([...entries]),
      dispose: () => undefined,
      destroy: () => undefined,
    };
    HTMLElement.prototype.scrollTo ??= function () {} as typeof HTMLElement.prototype.scrollTo;
    vi.spyOn(PdfViewerStore.prototype, 'ensureEngine').mockImplementation(function (this: PdfViewerStore) {
      this.engine ??= engine as PdfEngine;
      return this.engine;
    });
  });

  afterEach(() => vi.restoreAllMocks());

  async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    for (let i = 0; i < 6; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  async function load() {
    const fixture = TestBed.createComponent(HostComponent);
    const viewer = createPdfViewer({ zoom: 1, annotationAuthor: 'Tester' });
    fixture.componentInstance.config.set(viewer.config());
    fixture.componentInstance.src.set(annotatedPdf);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const host = el.querySelector<HTMLElement>('hk-pdf-viewer')!;
    const key = async (target: Element, k: string, init: KeyboardEventInit = {}) => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
      await settle(fixture);
    };
    return { fixture, viewer, el, host, key };
  }

  const hits = (el: HTMLElement) => Array.from(el.querySelectorAll<SVGPathElement>('.hk-pdf-annot-hit'));

  it('imports the document’s annotations, draws them and hides them in the raster', async () => {
    const { el, viewer } = await load();
    expect(viewer.getAnnotations().map((a) => a.id)).toEqual(['sq-1']);
    expect(hidden.at(-1)).toEqual([0, 0]); // page 0, /Annots index 0
    const [hit] = hits(el);
    expect(hit.getAttribute('aria-label')).toBe('Rectangle by Ana');
    expect(hit.getAttribute('tabindex')).toBe('0');
  });

  it('moves, deletes and restores an annotation from the keyboard, tracking dirty state', async () => {
    const { el, viewer, key, host, fixture } = await load();
    await key(hits(el)[0], 'ArrowRight', { ctrlKey: true });
    expect(viewer.getAnnotations()[0].rect.x).toBe(110);
    await key(hits(el)[0], 'Delete');
    expect(viewer.getAnnotations()).toEqual([]);
    expect(hits(el)).toHaveLength(0);

    await key(host, 'z', { ctrlKey: true });
    expect(viewer.getAnnotations()[0].rect.x).toBe(110);
    await key(host, 'z', { ctrlKey: true });
    expect(viewer.getAnnotations()[0].rect.x).toBe(100);
    expect(fixture.componentInstance.dirty).toEqual([true, false]);
    await key(host, 'y', { ctrlKey: true });
    expect(viewer.getAnnotations()[0].rect.x).toBe(110);
  });

  it('refuses to move or delete a locked annotation', async () => {
    const { el, viewer, key } = await load();
    await viewer.updateAnnotation('sq-1', { locked: true });
    await key(hits(el)[0], 'ArrowRight');
    await key(hits(el)[0], 'Delete');
    expect(viewer.getAnnotations()[0]).toMatchObject({ locked: true, rect: { x: 100 } });
  });

  it('draws a rectangle with the tool', async () => {
    const { el, viewer, fixture } = await load();
    viewer.setAnnotationTool('rect');
    await settle(fixture);
    const surface = el.querySelector<HTMLElement>('.hk-pdf-edit-layer.hk-pdf-edit-active')!;
    expect(surface).toBeTruthy();
    // jsdom has no layout: the surface's box is empty, so a client point maps to (point + page size / 2).
    const at = (type: string, x: number, y: number) =>
      surface.dispatchEvent(new MouseEvent(type, { clientX: x - 306, clientY: y - 396, button: 0, buttons: 1, bubbles: true }));
    at('pointerdown', 50, 60);
    at('pointermove', 150, 120);
    at('pointerup', 150, 120);
    await settle(fixture);
    const drawn = viewer.getAnnotations().find((a) => a.id !== 'sq-1')!;
    expect(drawn).toMatchObject({ type: 'rect', author: 'Tester', rect: { x: 50, y: 60, w: 100, h: 60 } });
  });

  /** Dispatch a pointer event at page point `(x, y)` (jsdom has no layout; see 'draws a rectangle with the tool'). */
  const pointer = (surface: HTMLElement, type: string, x: number, y: number) =>
    surface.dispatchEvent(new MouseEvent(type, { clientX: x - 306, clientY: y - 396, button: 0, buttons: 1, bubbles: true }));

  it('draws a polygon vertex by vertex and finishes it with Enter', async () => {
    const { el, viewer, fixture, key, host } = await load();
    viewer.setAnnotationTool('polygon');
    await settle(fixture);
    const surface = el.querySelector<HTMLElement>('.hk-pdf-edit-layer.hk-pdf-edit-active')!;
    for (const [x, y] of [
      [10, 10],
      [110, 10],
      [60, 90],
    ])
      pointer(surface, 'pointerdown', x, y);
    await settle(fixture);
    await key(host, 'Enter');
    const poly = viewer.getAnnotations().find((a) => a.type === 'polygon');
    expect(poly?.type === 'polygon' && poly.vertices).toEqual([10, 10, 110, 10, 60, 90]);
    expect(poly?.rect).toEqual({ x: 10, y: 10, w: 100, h: 80 });
  });

  it('types a text box in place and grows it to fit', async () => {
    const { el, viewer, fixture } = await load();
    viewer.setAnnotationTool('freetext');
    await settle(fixture);
    const surface = el.querySelector<HTMLElement>('.hk-pdf-edit-layer.hk-pdf-edit-active')!;
    pointer(surface, 'pointerdown', 40, 400);
    pointer(surface, 'pointerup', 40, 400);
    await settle(fixture);
    const editor = el.querySelector<HTMLTextAreaElement>('textarea.hk-pdf-annot-editor')!;
    expect(editor).toBeTruthy();
    editor.value = 'First line\nSecond line\nThird line';
    editor.dispatchEvent(new Event('blur'));
    await settle(fixture);
    const box = viewer.getAnnotations().find((a) => a.type === 'freetext');
    expect(box).toMatchObject({ contents: 'First line\nSecond line\nThird line', rect: { x: 40, y: 400, w: 180 } });
    expect(box!.rect.h).toBeGreaterThan(3 * 14);
    expect(el.querySelector('textarea.hk-pdf-annot-editor')).toBeNull();
  });

  it('keeps annotations on their page when a page is inserted before it', async () => {
    const { viewer, fixture } = await load();
    await viewer.insertBlankPage(1);
    await settle(fixture);
    expect(viewer.getAnnotations()[0].page).toBe(1);
    expect(hidden.at(-1)).toEqual([1, 0]);
    // Saving starts from PDFium's bytes then; this fake engine has none, so only the model is checked here.
  });

  it('adds replies and a review status from the comments panel', async () => {
    const { el, viewer, fixture } = await load();
    if (!viewer.state().sidebarOpen) viewer.toggleSidebar();
    await settle(fixture);
    el.querySelector<HTMLButtonElement>('button[aria-label="Annotations"]')!.click();
    await settle(fixture);
    const card = el.querySelector<HTMLElement>('[data-comment-id="sq-1"]')!;
    expect(card.textContent).toContain('Check this');
    const box = card.querySelector<HTMLTextAreaElement>('textarea[data-reply]')!;
    box.value = 'Looks good';
    Array.from(card.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Reply')!
      .click();
    const status = card.querySelector<HTMLSelectElement>('select')!;
    status.value = 'Accepted';
    status.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(viewer.getAnnotations()[0]).toMatchObject({ status: 'Accepted', replies: [{ author: 'Tester', contents: 'Looks good' }] });
  });

  it('saves the edits as an incremental update the writer reads back', async () => {
    const { viewer, fixture } = await load();
    await viewer.updateAnnotation('sq-1', { color: '#2563eb' });
    const id = await viewer.addAnnotation({
      type: 'note',
      page: 0,
      rect: { x: 10, y: 10, w: 20, h: 20 },
      color: '#facc15',
      opacity: 1,
      icon: 'Comment',
      contents: 'Hi',
    });
    await settle(fixture);
    const saved = await viewer.save();
    expect(saved.length).toBeGreaterThan(annotatedPdf.length);
    expect(Array.from(saved.subarray(0, annotatedPdf.length))).toEqual(Array.from(annotatedPdf));
    const [page] = await readAnnotations(await PdfDoc.load(saved));
    const back = page.annotations.map((a) => a.annotation);
    expect(back.find((a) => a.id === 'sq-1')?.color).toBe('#2563eb');
    const note = back.find((a) => a.id === id);
    expect({ type: note?.type, author: note?.author, contents: note?.contents }).toEqual({
      type: 'note',
      author: 'Tester',
      contents: 'Hi',
    });
  });
});
