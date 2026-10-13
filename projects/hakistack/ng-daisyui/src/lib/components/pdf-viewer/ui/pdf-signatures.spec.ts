import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { readAnnotations } from '../core/annotations/annotation-io';
import { PdfDoc } from '../core/pdf-writer/document';
import { PdfEngine } from '../engine/pdf-engine.types';
import { PdfViewerComponent } from '../pdf-viewer.component';
import { createPdfViewer } from '../pdf-viewer.helpers';
import { PdfViewerConfig } from '../pdf-viewer.types';
import { PdfFormsService } from '../services/pdf-forms.service';
import { PdfSignatureStore, SavedPdfSignature, providePdfSignatureStore } from '../services/pdf-signature-store';
import { PdfSignaturesService } from '../services/pdf-signatures.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';

/** Visible signatures end to end in jsdom: draw, save for later, place freely or in a signature field, flatten. */

const enc = new TextEncoder();

/** A one-page document with an unsigned signature field at (100, 600)–(300, 650) in user space. */
function pdfWithSignatureField(): Uint8Array {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [4 0 R] >> >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Annots [4 0 R] >>',
    '<< /Type /Annot /Subtype /Widget /FT /Sig /T (signer) /Rect [100 600 300 650] >>',
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

class MemoryStore implements PdfSignatureStore {
  items: SavedPdfSignature[] = [];
  async list() {
    return this.items;
  }
  async save(s: SavedPdfSignature) {
    this.items = [s, ...this.items];
  }
  async remove(id: string) {
    this.items = this.items.filter((s) => s.id !== id);
  }
}

@Component({
  imports: [PdfViewerComponent],
  template: `<hk-pdf-viewer [src]="src" [config]="config()" />`,
})
class HostComponent {
  readonly src = pdfWithSignatureField();
  readonly config = signal<PdfViewerConfig>({});
}

describe('PDF visible signatures', () => {
  let memory: MemoryStore;

  beforeEach(() => {
    memory = new MemoryStore();
    TestBed.configureTestingModule({ providers: [providePdfSignatureStore(memory)] });
    const never = new Promise<never>(() => undefined);
    const engine: Partial<PdfEngine> = {
      open: async () => 1,
      pageCount: async () => 1,
      pageSizes: async () => [{ width: 600, height: 800 }],
      pageLabels: async () => [''],
      documentTitle: async () => '',
      renderPage: () => ({ promise: never, cancel: () => undefined }),
      renderTile: () => ({ promise: never, cancel: () => undefined }),
      pageText: async () => [],
      pagesText: async (_d, pages) => pages.map(() => []),
      pageLinks: async () => [],
      outline: async () => [],
      attachments: async () => [],
      setHiddenAnnotations: async () => undefined,
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
    await settle(fixture);
    const injector = fixture.debugElement.query(By.directive(PdfViewerComponent)).injector;
    return {
      fixture,
      viewer,
      el: fixture.nativeElement as HTMLElement,
      signatures: injector.get(PdfSignaturesService),
      forms: injector.get(PdfFormsService),
    };
  }

  /** Draw a stroke on the signature pad (jsdom: no layout, so client coordinates are pad coordinates). */
  function draw(el: HTMLElement) {
    const pad = el.querySelector<HTMLCanvasElement>('hk-pdf-signature-dialog canvas')!;
    const at = (type: string, x: number, y: number) =>
      pad.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, buttons: 1, bubbles: true }));
    at('pointerdown', 10, 40);
    at('pointermove', 60, 10);
    at('pointermove', 120, 50);
    at('pointerup', 120, 50);
  }

  const button = (el: HTMLElement, text: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('hk-pdf-signature-dialog button')).find((b) => b.textContent?.trim() === text)!;

  it('draws a signature, keeps it for later and places it with a click', async () => {
    const { el, fixture, signatures, viewer } = await load();
    el.querySelector<HTMLButtonElement>('button[aria-label="Sign"]')!.click();
    await settle(fixture);
    expect(signatures.dialog()).not.toBeNull();
    draw(el);
    await settle(fixture);
    button(el, 'Use').click();
    await settle(fixture);
    expect(memory.items).toHaveLength(1);
    expect(memory.items[0]).toMatchObject({ kind: 'signature', stamp: { kind: 'ink' } });

    const surface = el.querySelector<HTMLElement>('.hk-pdf-edit-layer.hk-pdf-edit-active')!;
    surface.dispatchEvent(new MouseEvent('pointerdown', { clientX: 0, clientY: 0, button: 0, bubbles: true }));
    surface.dispatchEvent(new MouseEvent('pointerup', { clientX: 0, clientY: 0, button: 0, bubbles: true }));
    await settle(fixture);
    const placed = viewer.getAnnotations().find((a) => a.type === 'stamp');
    expect(placed).toMatchObject({ name: 'Signature', author: 'Tester', stamp: { kind: 'ink' } });
    expect(placed!.rect.x + placed!.rect.w / 2).toBeCloseTo(300, 6); // centred on the click (page centre)
  });

  it('signs a signature field: the signature fits its box and can be merged into the page', async () => {
    const { el, fixture, forms, viewer } = await load();
    const field = forms.field('signer')!;
    const sign = forms.buildControl(field, field.widgets[0], 1) as HTMLButtonElement;
    expect(sign.getAttribute('aria-label')).toBe('Sign: signer');
    sign.click();
    await settle(fixture);
    draw(el);
    el.querySelector<HTMLInputElement>('hk-pdf-signature-dialog input[type="checkbox"]:not(:checked)')!.click(); // merge into the page
    await settle(fixture);
    button(el, 'Use').click();
    await settle(fixture);
    const stamp = viewer.getAnnotations().find((a) => a.type === 'stamp')!;
    expect(stamp).toMatchObject({ flatten: true, contents: 'signer' });
    expect(stamp.rect.x).toBeGreaterThanOrEqual(100);
    expect(stamp.rect.x + stamp.rect.w).toBeLessThanOrEqual(300);
    expect(stamp.rect.y).toBeGreaterThanOrEqual(150); // the field spans y 150–200 on the displayed page
    expect(stamp.rect.y + stamp.rect.h).toBeLessThanOrEqual(200);

    const saved = await viewer.save();
    const [page] = await readAnnotations(await PdfDoc.load(saved));
    expect(page.annotations).toHaveLength(0); // merged into the content
  });

  it('reuses a saved signature', async () => {
    memory.items = [
      {
        id: 's1',
        kind: 'signature',
        color: '#111827',
        created: '2026-01-01T00:00:00.000Z',
        stamp: { kind: 'ink', strokes: [[0, 0, 0.5, 1, 1, 0.5]], width: 0.1, aspect: 2 },
      },
    ];
    const { el, fixture, signatures, viewer } = await load();
    await signatures.open({ page: 0, rect: { x: 0, y: 0, w: 200, h: 100 } });
    await settle(fixture);
    el.querySelector<HTMLButtonElement>('hk-pdf-signature-dialog button[aria-label="Use"]')!.click();
    await settle(fixture);
    expect(viewer.getAnnotations().find((a) => a.type === 'stamp')).toMatchObject({ rect: { w: 180, h: 90 } });
  });
});
