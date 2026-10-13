import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PdfDoc } from '../core/pdf-writer/document';
import { PdfEngine } from '../engine/pdf-engine.types';
import { PdfViewerComponent } from '../pdf-viewer.component';
import { createPdfViewer } from '../pdf-viewer.helpers';
import { PdfDocumentSource, PdfViewerConfig } from '../pdf-viewer.types';
import { PdfPagesService } from '../services/pdf-pages.service';
import { PdfAnnotationsService } from '../services/pdf-annotations.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { WorkspaceDocument } from '../../mesa/workspace-document';
import { PdfWorkspaceComponent } from './pdf-workspace.component';

/** `hk-pdf-workspace` (jsdom): the same viewer behind the Mesa workspace chrome. */

const enc = new TextEncoder();

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
  out += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
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

@Component({
  imports: [PdfWorkspaceComponent],
  template: `<hk-pdf-workspace [documents]="documents" [config]="config()" [storageKey]="storageKey()" />`,
})
class WorkspaceHost {
  readonly documents: WorkspaceDocument[] = [{ id: 'doc', name: 'document.pdf', src: threePages() }];
  readonly config = signal<PdfViewerConfig>({});
  readonly storageKey = signal<string | null>(null);
}

@Component({
  imports: [PdfWorkspaceComponent],
  template: `
    <ng-template #extra><p data-extra>My documents</p></ng-template>
    <hk-pdf-workspace
      [documents]="documents"
      [config]="config()"
      [storageKey]="null"
      [extraRail]="{ label: 'Docs', title: 'Docs · 3', template: extra }"
    />
  `,
})
class ExtraRailHost {
  readonly documents: WorkspaceDocument[] = [{ id: 'contract', name: 'Contract.pdf', src: threePages() }];
  readonly config = signal<PdfViewerConfig>({});
}

/** One page "Solo". */
function onePage(): Uint8Array {
  return serialize({
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 600 800] >>',
    3: '<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>',
    4: stream('BT 10 10 Td (Solo) Tj ET'),
  });
}

@Component({
  imports: [PdfWorkspaceComponent],
  template: `<hk-pdf-workspace [documents]="documents" [(active)]="active" [config]="config()" [storageKey]="null" />`,
})
class ListHost {
  readonly documents: WorkspaceDocument[] = [
    { id: 'three', name: 'Three.pdf', src: threePages(), description: 'Contracts', pages: 3 },
    { id: 'one', name: 'One.pdf', src: onePage() },
  ];
  readonly active = signal<string | null>(null);
  readonly config = signal<PdfViewerConfig>({});
}

@Component({
  imports: [PdfViewerComponent],
  template: `<hk-pdf-viewer [src]="src()" [config]="config()" />`,
})
class ViewerHost {
  readonly src = signal<PdfDocumentSource>(threePages());
  readonly config = signal<PdfViewerConfig>({});
}

describe('hk-pdf-workspace', () => {
  beforeEach(() => {
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
      documentTitle: async () => 'Three pages',
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
    HTMLElement.prototype.scrollIntoView ??= function () {} as typeof HTMLElement.prototype.scrollIntoView;
    (globalThis as { CSS?: { escape?: (s: string) => string } }).CSS ??= {};
    globalThis.CSS.escape ??= (s: string) => s.replace(/["\\]/g, '\\$&');
    vi.spyOn(PdfViewerStore.prototype, 'ensureEngine').mockImplementation(function (this: PdfViewerStore) {
      this.engine ??= engine as PdfEngine;
      return this.engine;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }, until?: () => boolean) {
    for (let i = 0; i < 60; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise((r) => setTimeout(r, 0));
      if (i >= 5 && (!until || until())) return;
    }
  }

  async function load(options: { storageKey?: string } = {}) {
    const fixture = TestBed.createComponent(WorkspaceHost);
    if (options.storageKey) fixture.componentInstance.storageKey.set(options.storageKey);
    const viewer = createPdfViewer({ zoom: 1 });
    fixture.componentInstance.config.set(viewer.config());
    const injector = () => fixture.debugElement.query(By.directive(PdfWorkspaceComponent)).injector;
    await settle(fixture, () => injector().get(PdfPagesService).canOrganize() && viewer.getAnnotations().length > 0);
    return { fixture, viewer, el: fixture.nativeElement as HTMLElement, store: injector().get(PdfViewerStore) };
  }

  const buttonByLabel = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  const buttonByText = (el: HTMLElement, text: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);

  it('lays the document out as rail · main column · inspector', async () => {
    const { el } = await load();
    expect(el.querySelector('hk-mesa-layout section[aria-label="Document navigation"] hk-pdf-workspace-rail')).not.toBeNull();
    expect(el.querySelector('hk-mesa-layout aside[aria-label="Details"] hk-pdf-workspace-inspector')).not.toBeNull();
    // The toolbar's badge names the file and its pages; the inspector lists the document's properties.
    expect(el.querySelector('hk-mesa-toolbar .badge')?.textContent).toContain('document.pdf · 3 pages');
    const props = Array.from(el.querySelectorAll('[data-section="document"] dd')).map((d) => d.textContent?.trim());
    expect(props).toEqual(['document.pdf', 'Three pages', '3', expect.stringMatching(/B$/), '1 fields']);
    // One thumbnail per page in the strip under the pages; the current one holds its tab stop.
    const thumbs = Array.from(el.querySelectorAll<HTMLButtonElement>('[data-strip-page]'));
    expect(thumbs.length).toBe(3);
    expect(thumbs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    expect(thumbs[0].getAttribute('aria-current')).toBe('page');
  });

  it('keeps the viewer API: the controller pages, and the rail follows', async () => {
    const { viewer, fixture, el } = await load();
    viewer.goToPage(2);
    await settle(fixture, () => viewer.state().page === 2);
    expect(viewer.state().page).toBe(2);
    expect(el.querySelector('[data-strip-page="2"]')?.getAttribute('aria-current')).toBe('page');
    expect((el.querySelector('hk-mesa-toolbar input') as HTMLInputElement).value).toBe('2');
  });

  it('toggleSidebar hides the rail; the choice is remembered', async () => {
    const { viewer, fixture, el } = await load({ storageKey: 'ws-test' });
    viewer.toggleSidebar();
    await settle(fixture);
    expect(buttonByLabel(el, 'Show side panel')?.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('section[aria-label="Document navigation"]')?.hasAttribute('inert')).toBe(true);
    expect(JSON.parse(localStorage.getItem('ws-test') ?? '{}')).toEqual({ railHidden: true, inspectorHidden: false });

    fixture.destroy();
    const again = await load({ storageKey: 'ws-test' });
    expect(buttonByLabel(again.el, 'Show side panel')).not.toBeNull();
  });

  it('folds the page strip', async () => {
    const { fixture, el } = await load();
    const toggle = el.querySelector<HTMLButtonElement>('hk-pdf-workspace-strip button[aria-expanded]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(el.textContent).toContain('Page 1 of 3');
    toggle.click();
    await settle(fixture);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelectorAll('[data-strip-page]').length).toBe(0);
  });

  it('organizePages opens the Organize pages dialog, as in hk-pdf-viewer', async () => {
    const { viewer, fixture, el } = await load();
    const pages = fixture.debugElement.query(By.directive(PdfWorkspaceComponent)).injector.get(PdfPagesService);
    expect(el.querySelector('hk-pdf-page-organizer dialog')).not.toBeNull();
    viewer.organizePages();
    await settle(fixture);
    expect(pages.organizerOpen()).toBe(true);
    buttonByText(el, 'Organize pages')!.click();
    expect(pages.organizerOpen()).toBe(true);
  });

  it('the Grid view lays the pages out in place; its edits apply at once and undo with the document', async () => {
    const { viewer, fixture, el, store } = await load();
    buttonByText(el, 'Grid')!.click();
    await settle(fixture);
    const options = () => Array.from(el.querySelectorAll<HTMLElement>('hk-pdf-page-organizer[inline] [role="option"]'));
    expect(options().length).toBe(3);

    // The pages stay mounted under the grid, inert.
    expect(el.querySelector('hk-pdf-pages')?.parentElement?.hasAttribute('inert')).toBe(true);

    const order = () => store.pageLayout().map((p) => p.index);
    buttonByLabel(el, 'Move later')!.click(); // page 1 is selected
    await settle(fixture, () => order().join() === '1,0,2');
    expect(order()).toEqual([1, 0, 2]);
    expect(viewer.getAnnotations()[0].page).toBe(1);

    buttonByLabel(el.querySelector('hk-pdf-page-organizer[inline]')!, 'Undo')!.click();
    await settle(fixture, () => order().join() === '0,1,2');
    expect(order()).toEqual([0, 1, 2]);

    // Ctrl+Z on a page undoes once (the grid's key doesn't also reach the viewer's shortcut).
    buttonByLabel(el, 'Move later')!.click();
    await settle(fixture, () => order().join() === '1,0,2');
    buttonByLabel(el, 'Move later')!.click();
    await settle(fixture, () => order().join() === '1,2,0');
    const undo = vi.spyOn(fixture.debugElement.query(By.directive(PdfWorkspaceComponent)).injector.get(PdfAnnotationsService), 'undo');
    options()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    await settle(fixture, () => order().join() === '1,0,2');
    expect(undo).toHaveBeenCalledTimes(1);
    await settle(fixture, () => order().join() === '1,0,2');
    expect(order()).toEqual([1, 0, 2]);

    buttonByText(el, 'Sheet')!.click();
    await settle(fixture);
    expect(el.querySelector('hk-pdf-page-organizer[inline]')).toBeNull();
  });

  it('shows a selected annotation’s properties docked in the inspector', async () => {
    const { viewer, fixture, el } = await load();
    viewer.selectAnnotation(viewer.getAnnotations()[0].id);
    await settle(fixture);
    const panel = el.querySelector<HTMLElement>('hk-pdf-workspace-inspector section[aria-label="Annotation properties"]');
    expect(panel).not.toBeNull();
    expect(panel!.className).not.toContain('absolute');
  });

  it('leaves hk-pdf-viewer’s chrome as it was', async () => {
    const fixture = TestBed.createComponent(ViewerHost);
    const viewer = createPdfViewer({ zoom: 1 });
    fixture.componentInstance.config.set(viewer.config());
    await settle(fixture, () => viewer.getAnnotations().length > 0);
    viewer.selectAnnotation(viewer.getAnnotations()[0].id);
    await settle(fixture);
    const panel = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('section[aria-label="Annotation properties"]');
    expect(panel?.className).toContain('absolute');
    expect((fixture.nativeElement as HTMLElement).querySelector('hk-mesa-layout')).toBeNull();
  });

  it('shows a host’s own list in the rail', async () => {
    const fixture = TestBed.createComponent(ExtraRailHost);
    const viewer = createPdfViewer({ zoom: 1 });
    fixture.componentInstance.config.set(viewer.config());
    await settle(fixture, () => viewer.getAnnotations().length > 0);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('hk-pdf-workspace-rail [data-extra]')?.textContent).toBe('My documents');
    const headings = Array.from(el.querySelectorAll('hk-pdf-workspace-rail h2')).map((h) => h.textContent?.trim());
    expect(headings).toEqual(['Docs · 3']);
    // The list in the rail; the open document's pages in the strip under them.
    expect(el.querySelectorAll('[data-strip-page]').length).toBe(3);
    expect(el.querySelector('hk-mesa-toolbar .badge')?.textContent).toContain('Contract.pdf · 3 pages');
  });

  describe('with a document list', () => {
    async function loadList() {
      const fixture = TestBed.createComponent(ListHost);
      const viewer = createPdfViewer({ zoom: 1 });
      fixture.componentInstance.config.set(viewer.config());
      await settle(fixture, () => viewer.state().numPages === 3 && viewer.getAnnotations().length > 0);
      const store = fixture.debugElement.query(By.directive(PdfWorkspaceComponent)).injector.get(PdfViewerStore);
      return { fixture, viewer, store, el: fixture.nativeElement as HTMLElement };
    }
    const rows = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLButtonElement>('hk-mesa-document-list [data-document-index]'));

    it('lists the documents, and opens the first', async () => {
      const { fixture, el, viewer } = await loadList();
      expect(fixture.componentInstance.active()).toBe('three');
      expect(rows(el).map((r) => r.querySelector('.font-medium')?.textContent?.trim())).toEqual(['Three.pdf', 'One.pdf']);
      expect(rows(el)[0].textContent).toContain('PDF · Contracts · 3 p.');
      expect(rows(el)[0].getAttribute('aria-current')).toBe('page');
      // The documents in the rail; the open one's pages in the strip under them.
      const headings = Array.from(el.querySelectorAll('hk-pdf-workspace-rail h2')).map((h) => h.textContent?.trim());
      expect(headings).toEqual(['Documents · 2']);
      expect(el.querySelectorAll('[data-strip-page]').length).toBe(3);
      expect(el.querySelector('hk-mesa-toolbar .badge')?.textContent).toContain('Three.pdf · 3 pages');
      expect(viewer.state().numPages).toBe(3);
    });

    it('opens another document (two-way), with the same controller', async () => {
      const { fixture, el, viewer } = await loadList();
      rows(el)[1].click();
      await settle(fixture, () => viewer.state().numPages === 1);
      expect(fixture.componentInstance.active()).toBe('one');
      expect(viewer.state().numPages).toBe(1);
      expect(el.querySelector('hk-mesa-toolbar .badge')?.textContent).toContain('One.pdf · 1 page');
      expect(rows(el)[1].getAttribute('aria-current')).toBe('page');
    });

    it('asks before leaving a document with unsaved edits', async () => {
      const { fixture, el, viewer, store } = await loadList();
      HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      };
      HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      };
      await viewer.deleteAnnotation(viewer.getAnnotations()[0].id);
      await settle(fixture, () => store.dirty());
      expect(store.dirty()).toBe(true);

      rows(el)[1].click();
      await settle(fixture);
      expect(fixture.componentInstance.active()).toBe('three');
      const dialog = el.querySelector<HTMLDialogElement>('dialog[open]');
      expect(dialog?.textContent).toContain('“Three.pdf” has unsaved changes');

      Array.from(dialog!.querySelectorAll('button'))
        .find((b) => b.textContent?.trim() === 'Keep editing')!
        .click();
      await settle(fixture);
      expect(fixture.componentInstance.active()).toBe('three');
      expect(el.querySelector('dialog[open]')).toBeNull();

      rows(el)[1].click();
      await settle(fixture);
      Array.from(el.querySelectorAll<HTMLButtonElement>('dialog[open] button'))
        .find((b) => b.textContent?.trim() === 'Discard and open')!
        .click();
      await settle(fixture, () => viewer.state().numPages === 1);
      expect(fixture.componentInstance.active()).toBe('one');
      expect(store.dirty()).toBe(false);
    });
  });
});
