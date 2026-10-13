import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PdfSigner, createWebCryptoSigner } from '../core/signatures/cms';
import { signPdf } from '../core/signatures/pdf-signature';
import { createSelfSignedCertificate } from '../core/signatures/x509';
import { PdfEngine } from '../engine/pdf-engine.types';
import { PdfViewerComponent } from '../pdf-viewer.component';
import { createPdfViewer } from '../pdf-viewer.helpers';
import { PdfDocumentSource, PdfViewerConfig } from '../pdf-viewer.types';
import { PdfSignaturesService } from '../services/pdf-signatures.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';

/** Digital signatures in the viewer (jsdom): the Signatures panel, and signing from the toolbar and from a field. */

const enc = new TextEncoder();

/** A one-page document with an unsigned signature field `signer`. */
function pdfWithSignatureField(): Uint8Array {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [4 0 R] >> >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Annots [4 0 R] >>',
    '<< /Type /Annot /Subtype /Widget /FT /Sig /T (signer) /Rect [100 600 300 650] /P 3 0 R >>',
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

@Component({
  imports: [PdfViewerComponent],
  template: `<hk-pdf-viewer [src]="src()" [config]="config()" />`,
})
class HostComponent {
  readonly src = signal<PdfDocumentSource>(pdfWithSignatureField());
  readonly config = signal<PdfViewerConfig>({});
}

let signer: PdfSigner;

beforeAll(async () => {
  const keys = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  signer = createWebCryptoSigner(keys.privateKey, [await createSelfSignedCertificate(keys, { commonName: 'Ana Pérez' })]);
}, 60_000);

describe('PDF digital signatures (viewer)', () => {
  beforeEach(() => {
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

  async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }, until?: () => boolean) {
    for (let i = 0; i < 60; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise((r) => setTimeout(r, 0));
      if (i >= 5 && (!until || until())) return;
    }
  }

  async function load(options: { src?: Uint8Array; signer?: PdfSigner } = {}) {
    const fixture = TestBed.createComponent(HostComponent);
    if (options.src) fixture.componentInstance.src.set(options.src);
    const viewer = createPdfViewer({ zoom: 1, signer: options.signer });
    fixture.componentInstance.config.set(viewer.config());
    const signatures = () => fixture.debugElement.query(By.directive(PdfViewerComponent)).injector.get(PdfSignaturesService);
    await settle(fixture, () => signatures().digital() !== null);
    return { fixture, viewer, el: fixture.nativeElement as HTMLElement, signatures: signatures() };
  }

  const buttonIn = (el: HTMLElement, scope: string, text: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>(`${scope} button`)).find((b) => b.textContent?.trim() === text);

  it('validates the signatures of a signed document and lists them in the Signatures panel', async () => {
    const signed = await signPdf(pdfWithSignatureField(), signer, { field: 'signer', reason: 'Approved', location: 'Madrid' });
    const { el, fixture, viewer } = await load({ src: signed });
    expect(viewer.getSignatures()).toHaveLength(1);
    expect(viewer.getSignatures()[0]).toMatchObject({ field: 'signer', status: 'valid', signer: 'Ana Pérez', reason: 'Approved' });

    const tab = el.querySelector<HTMLButtonElement>('button[role="tab"][aria-label="Signatures"]');
    expect(tab).not.toBeNull();
    tab!.click();
    await settle(fixture);
    const panel = el.querySelector('hk-pdf-signatures-panel')!;
    expect(panel.textContent).toContain('Signed by Ana Pérez');
    expect(panel.textContent).toContain('Valid');
    expect(panel.textContent).toContain('Approved');
    expect(panel.textContent).toContain("The signer's identity isn't verified");
    expect(buttonIn(el, 'hk-pdf-signatures-panel', 'Show signature')).toBeDefined();
    expect(buttonIn(el, 'hk-pdf-signatures-panel', 'Download the signed version')).toBeUndefined(); // nothing changed since
  });

  it('has no Signatures tab or digital signing without signatures or a signer', async () => {
    const { el } = await load();
    expect(el.querySelector('button[role="tab"][aria-label="Signatures"]')).toBeNull();
    expect(el.querySelector('button[aria-label="Sign digitally"]')).toBeNull();
  });

  it('signs digitally from the toolbar, into the empty signature field, and reloads the signed document', async () => {
    const { el, fixture, viewer, signatures } = await load({ signer });
    expect(signatures.emptyFields()).toEqual(['signer']);
    el.querySelector<HTMLButtonElement>('button[aria-label="Sign digitally"]')!.click();
    await settle(fixture);
    const dialog = el.querySelector('hk-pdf-digital-sign-dialog')!;
    expect(signatures.digitalDialog()).toEqual({ field: undefined });
    const select = dialog.querySelector<HTMLSelectElement>('select')!;
    expect(select.value).toBe('signer'); // the empty field is preselected
    const reason = dialog.querySelector<HTMLInputElement>('input[type="text"]')!;
    reason.value = 'Looks good';
    reason.dispatchEvent(new Event('input'));
    buttonIn(el, 'hk-pdf-digital-sign-dialog', 'Sign')!.click();
    await settle(fixture, () => viewer.getSignatures().length === 1);

    expect(viewer.getSignatures()[0]).toMatchObject({ field: 'signer', status: 'valid', reason: 'Looks good', coversWholeDocument: true });
    expect(signatures.digitalDialog()).toBeNull();
    expect(viewer.state().sidebarTab).toBe('signatures');
    expect(signatures.emptyFields()).toEqual([]);
  });

  it('signs invisibly and resolves with the signed bytes', async () => {
    const { fixture, viewer } = await load({ signer });
    const signed = await viewer.signDigitally({ reason: 'API', certify: 2 });
    await settle(fixture, () => viewer.getSignatures().length === 1);
    expect(new TextDecoder('latin1').decode(signed)).toContain('/DocMDP');
    expect(viewer.getSignatures()[0]).toMatchObject({ field: 'Signature1', status: 'valid', certified: 2, page: null });
  });

  it('reports a signing failure in the dialog', async () => {
    const failing: PdfSigner = { ...signer, sign: async () => Promise.reject(new Error('token locked')) };
    const { el, fixture, signatures } = await load({ signer: failing });
    signatures.openDigital();
    await settle(fixture);
    buttonIn(el, 'hk-pdf-digital-sign-dialog', 'Sign')!.click();
    await settle(fixture, () => !!el.querySelector('hk-pdf-digital-sign-dialog [role="alert"]'));
    expect(el.querySelector('hk-pdf-digital-sign-dialog [role="alert"]')?.textContent).toContain('token locked');
    expect(signatures.digitalDialog()).not.toBeNull();
  });

  it("offers digital signing from a signature field's visual dialog", async () => {
    const { el, fixture, signatures } = await load({ signer });
    await signatures.open({ page: 0, rect: { x: 100, y: 150, w: 200, h: 50 }, field: 'signer' });
    await settle(fixture);
    buttonIn(el, 'hk-pdf-signature-dialog', 'Sign digitally')!.click();
    await settle(fixture);
    expect(signatures.dialog()).toBeNull();
    expect(signatures.digitalDialog()).toEqual({ field: 'signer' });
  });
});
