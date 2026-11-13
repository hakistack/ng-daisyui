import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { readAnnotations } from '../core/annotations/annotation-io';
import { readForm } from '../core/forms/form-reader';
import { PdfDoc } from '../core/pdf-writer/document';
import { createWebCryptoSigner } from '../core/signatures/cms';
import { readSignatures, signPdf } from '../core/signatures/pdf-signature';
import { createSelfSignedCertificate } from '../core/signatures/x509';
import { PdfEngine } from '../engine/pdf-engine.types';
import { PdfViewerComponent } from '../pdf-viewer.component';
import { createPdfViewer } from '../pdf-viewer.helpers';
import { PdfDocumentSource, PdfViewerConfig } from '../pdf-viewer.types';
import { PdfPagesService } from '../services/pdf-pages.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';

/** Page organization in the viewer (jsdom): the Organize pages dialog, the page API, and what `save()` writes. */

const enc = new TextEncoder();
const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');

function serialize(objects: Record<number, string>): Uint8Array {
  let out = '%PDF-1.7\n';
  const offsets: Record<number, number> = {};
  const nums = Object.keys(objects).map(Number);
  for (const n of nums) {
    offsets[n] = out.length;
    out += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const size = Math.max(...nums) + 1;
  const xref = out.length;
  out += `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let n = 1; n < size; n++)
    out += offsets[n] !== undefined ? `${String(offsets[n]).padStart(10, '0')} 00000 n \n` : '0000000000 65535 f \n';
  out += `trailer\n<< /Size ${size} /Root 1 0 R /ID [<00112233445566778899aabbccddeeff> <00112233445566778899aabbccddeeff>] >>\nstartxref\n${xref}\n%%EOF\n`;
  return enc.encode(out);
}

const stream = (text: string) => `<< /Length ${text.length} >>\nstream\n${text}\nendstream`;

/** Pages "One", "Two" (with the text field "name") and "Three"; a square annotation on page One. */
function threePages(): Uint8Array {
  return serialize({
    1: '<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [10 0 R] /DA (/Helv 0 Tf 0 g) >> >>',
    2: '<< /Type /Pages /Kids [3 0 R 5 0 R 7 0 R] /Count 3 /MediaBox [0 0 600 800] >>',
    3: '<< /Type /Page /Parent 2 0 R /Contents 4 0 R /Annots [9 0 R] >>',
    4: stream('BT 10 10 Td (One) Tj ET'),
    5: '<< /Type /Page /Parent 2 0 R /Contents 6 0 R /Annots [10 0 R] >>',
    6: stream('BT 10 10 Td (Two) Tj ET'),
    7: '<< /Type /Page /Parent 2 0 R /Contents 8 0 R >>',
    8: stream('BT 10 10 Td (Three) Tj ET'),
    9: '<< /Type /Annot /Subtype /Square /Rect [100 600 200 700] /C [1 0 0] /BS << /W 2 >> /P 3 0 R /NM (sq-1) >>',
    10: '<< /Type /Annot /Subtype /Widget /FT /Tx /T (name) /V (Ana) /Rect [100 600 300 630] /P 5 0 R >>',
  });
}

/** One page "Extra" with its own field "name". */
function extraPage(): Uint8Array {
  return serialize({
    1: '<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [5 0 R] >> >>',
    2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 400] /Contents 4 0 R /Annots [5 0 R] >>',
    4: stream('BT 10 10 Td (Extra) Tj ET'),
    5: '<< /Type /Annot /Subtype /Widget /FT /Tx /T (name) /V (Bob) /Rect [10 10 200 40] /P 3 0 R >>',
  });
}

async function pageTexts(bytes: Uint8Array): Promise<string[]> {
  const doc = await PdfDoc.load(bytes);
  return Promise.all(
    (await doc.pages()).map(async (p) => {
      const data = await doc.streamData(p.dict.get('Contents'));
      return data ? (/\((.*?)\)/.exec(latin1(data))?.[1] ?? '') : '';
    }),
  );
}

@Component({
  imports: [PdfViewerComponent],
  template: `<hk-pdf-viewer [src]="src()" [config]="config()" />`,
})
class HostComponent {
  readonly src = signal<PdfDocumentSource>(threePages());
  readonly config = signal<PdfViewerConfig>({});
}

describe('PDF page organization (viewer)', () => {
  let rendered: { doc: number; page: number; width: number }[];
  let renderResult: ((width: number) => { bitmap: ImageBitmap; width: number; height: number }) | null;

  beforeEach(() => {
    rendered = [];
    renderResult = null;
    const never = new Promise<never>(() => undefined);
    const counts = new Map<number, number>();
    let next = 1;
    const engine: Partial<PdfEngine> = {
      open: async (bytes) => {
        const handle = next++;
        counts.set(handle, (await (await PdfDoc.load(new Uint8Array(bytes))).pages()).length);
        return handle;
      },
      pageCount: async (d) => counts.get(d) ?? 0,
      pageSizes: async (d) => Array.from({ length: counts.get(d) ?? 0 }, () => ({ width: 600, height: 800 })),
      pageLabels: async (d) => Array.from({ length: counts.get(d) ?? 0 }, () => ''),
      documentTitle: async () => '',
      renderPage: (doc, page, cssWidth, dpr) => {
        rendered.push({ doc, page, width: Math.round(cssWidth * dpr) });
        const result = renderResult?.(Math.round(cssWidth * dpr));
        return { promise: result ? Promise.resolve(result) : never, cancel: () => undefined };
      },
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

  async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }, until?: () => boolean) {
    for (let i = 0; i < 60; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise((r) => setTimeout(r, 0));
      if (i >= 5 && (!until || until())) return;
    }
  }

  async function load(options: { src?: Uint8Array; config?: Partial<PdfViewerConfig> } = {}) {
    const fixture = TestBed.createComponent(HostComponent);
    if (options.src) fixture.componentInstance.src.set(options.src);
    const viewer = createPdfViewer({ zoom: 1, ...options.config });
    fixture.componentInstance.config.set(viewer.config());
    const pages = () => fixture.debugElement.query(By.directive(PdfViewerComponent)).injector.get(PdfPagesService);
    await settle(fixture, () => pages().canOrganize() && viewer.getAnnotations().length > 0);
    return { fixture, viewer, el: fixture.nativeElement as HTMLElement, pages: pages() };
  }

  const items = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('hk-pdf-page-organizer [role="option"]'));
  const button = (el: HTMLElement, text: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('hk-pdf-page-organizer button')).find((b) => b.textContent?.trim() === text);
  const key = (target: HTMLElement, k: string, init: KeyboardEventInit = {}) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));

  it('moves pages and saves them in the new order as an incremental update', async () => {
    const original = threePages();
    const { viewer, fixture } = await load();
    await viewer.movePages([3], 1);
    await settle(fixture);
    expect(viewer.state().numPages).toBe(3);
    const saved = await viewer.save();
    expect(latin1(saved.subarray(0, original.length))).toBe(latin1(original));
    expect(await pageTexts(saved)).toEqual(['Three', 'One', 'Two']);
    // The annotation and the field went with their pages.
    expect(viewer.getAnnotations()[0].page).toBe(1);
    const { model } = await readForm(await PdfDoc.load(saved));
    expect(model.fields.map((f) => [f.name, f.widgets[0].page])).toEqual([['name', 2]]);
  });

  it('reuses the page rasters when pages move (nothing is rendered again)', async () => {
    // A canvas that "draws" and renders that complete, so the bitmap cache fills.
    const ctx = new Proxy({} as Record<string | symbol, unknown>, {
      get: (_t, prop) => (prop === 'measureText' ? () => ({ width: 0 }) : () => undefined),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx as unknown as CanvasRenderingContext2D);
    renderResult = (width) => ({
      bitmap: { width, height: width, close: () => undefined } as unknown as ImageBitmap,
      width,
      height: width,
    });
    const { viewer, fixture } = await load();
    await settle(fixture, () => rendered.length > 0);
    const id = (r: { doc: number; page: number; width: number }) => `${r.doc}:${r.page}@${r.width}`;
    const seen = new Set(rendered.map(id));
    const before = rendered.length;
    await viewer.movePages([1], 4);
    await settle(fixture);
    expect(seen.size).toBeGreaterThan(0);
    expect(rendered.slice(before).filter((r) => seen.has(id(r)))).toEqual([]);
  });

  it('duplicates a page with copies of its annotations but not its form fields; undo restores', async () => {
    const { viewer, fixture } = await load();
    await viewer.duplicatePages([1, 2]);
    await settle(fixture);
    expect(viewer.state().numPages).toBe(5);
    const annotations = viewer.getAnnotations();
    expect(annotations.map((a) => a.page).sort()).toEqual([0, 1]);
    expect(new Set(annotations.map((a) => a.id)).size).toBe(2);
    const saved = await viewer.save();
    expect(await pageTexts(saved)).toEqual(['One', 'One', 'Two', 'Two', 'Three']);
    const pages = await readAnnotations(await PdfDoc.load(saved));
    expect(pages.map((p) => p.annotations.length)).toEqual([1, 1, 0, 0, 0]);
    const { model } = await readForm(await PdfDoc.load(saved));
    expect(model.fields.map((f) => f.widgets.map((w) => w.page))).toEqual([[2]]);
    await viewer.undo();
    await settle(fixture);
    expect(viewer.state().numPages).toBe(3);
    expect(viewer.getAnnotations()).toHaveLength(1);
  });

  it('imports pages from another PDF (renaming a clashing field) and extracts pages to a new PDF', async () => {
    const { viewer, fixture } = await load();
    await expect(viewer.importPages(extraPage(), { at: 2 })).resolves.toBe(1);
    await settle(fixture);
    expect(viewer.state().numPages).toBe(4);
    const saved = await viewer.save();
    expect(await pageTexts(saved)).toEqual(['One', 'Extra', 'Two', 'Three']);
    const { model } = await readForm(await PdfDoc.load(saved));
    expect(model.fields.map((f) => [f.name, f.value])).toEqual([
      ['name', 'Ana'],
      ['name_2', 'Bob'],
    ]);
    const extracted = await viewer.extractPages([4, 2]);
    expect(await pageTexts(extracted)).toEqual(['Three', 'Extra']);
  });

  it('keeps a signature valid through page edits', async () => {
    const keys = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    const signer = createWebCryptoSigner(keys.privateKey, [await createSelfSignedCertificate(keys, { commonName: 'Signer' })]);
    const signed = await signPdf(threePages(), signer, { reason: 'OK' });
    const { viewer, fixture } = await load({ src: signed });
    await viewer.deletePages([3]);
    await viewer.rotatePages([1], 90);
    await settle(fixture);
    const saved = await viewer.save();
    const [sig] = await readSignatures(saved);
    expect(sig).toMatchObject({ status: 'valid', coversWholeDocument: false });
    const doc = await PdfDoc.load(saved);
    const pages = await doc.pages();
    expect(pages).toHaveLength(2);
    expect(pages[0].dict.get('Rotate')).toBe(90);
  });

  it('organizes in the dialog: keyboard selection, delete, move, Apply as one undo step', async () => {
    const { el, viewer, fixture, pages } = await load();
    el.querySelector<HTMLButtonElement>('button[aria-label="Organize pages"]')!.click();
    await settle(fixture);
    expect(pages.organizerOpen()).toBe(true);
    let list = items(el);
    expect(list.map((i) => i.getAttribute('aria-label'))).toEqual(['Page 1', 'Page 2', 'Page 3']);
    expect(list[0].getAttribute('aria-selected')).toBe('true'); // the current page

    // Move page 1 to the end with Alt + →, twice.
    key(list[0], 'ArrowRight', { altKey: true });
    await settle(fixture);
    key(items(el)[1], 'ArrowRight', { altKey: true });
    await settle(fixture);
    expect(el.querySelector('hk-pdf-page-organizer [aria-live]')?.textContent).toContain('Moved to position 3');
    // Select the (new) first page and delete it.
    list = items(el);
    list[0].click();
    key(list[0], 'Delete');
    await settle(fixture);
    expect(items(el)).toHaveLength(2);
    // Rotate the selection right from the toolbar.
    el.querySelector<HTMLButtonElement>('hk-pdf-page-organizer button[aria-label="Rotate right"]')!.click();
    await settle(fixture);
    expect(items(el).some((i) => i.getAttribute('aria-label') === 'Page 1, rotated 90°')).toBe(true);
    // Draft undo inside the dialog, then redo.
    el.querySelector<HTMLButtonElement>('hk-pdf-page-organizer button[aria-label="Undo"]')!.click();
    await settle(fixture);
    expect(items(el).every((i) => !i.getAttribute('aria-label')!.includes('rotated'))).toBe(true);
    el.querySelector<HTMLButtonElement>('hk-pdf-page-organizer button[aria-label="Redo"]')!.click();
    await settle(fixture);

    expect(viewer.state().numPages).toBe(3); // nothing applied yet
    button(el, 'Apply')!.click();
    await settle(fixture, () => !pages.organizerOpen());
    expect(viewer.state().numPages).toBe(2);
    expect(await pageTexts(await viewer.save())).toEqual(['Three', 'One']);
    await viewer.undo();
    await settle(fixture);
    expect(viewer.state().numPages).toBe(3);
  });

  it('cancelling the dialog changes nothing; page editing can be turned off', async () => {
    const { el, fixture, viewer, pages } = await load();
    pages.organizerOpen.set(true);
    await settle(fixture);
    items(el)[0].click();
    key(items(el)[0], 'Delete');
    await settle(fixture);
    button(el, 'Cancel')!.click();
    await settle(fixture);
    expect(pages.organizerOpen()).toBe(false);
    expect(viewer.state().numPages).toBe(3);
    fixture.destroy();

    const off = await load({ config: { pageOrganizer: false } });
    expect(off.el.querySelector('button[aria-label="Organize pages"]')).toBeNull();
    expect(off.el.querySelector('button[aria-label^="Delete page"]')).toBeNull();
  });
});
