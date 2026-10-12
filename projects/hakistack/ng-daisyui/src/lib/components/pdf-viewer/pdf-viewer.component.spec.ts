import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfViewerComponent } from './pdf-viewer.component';
import { HkPdfToolbarDirective } from './pdf-viewer.directives';
import { createPdfViewer } from './pdf-viewer.helpers';
import { PdfViewerConfig, PdfViewerError } from './pdf-viewer.types';
import { PdfEngine } from './engine/pdf-engine.types';
import { PdfViewerStore } from './services/pdf-viewer.store';
import { PdfViewportService } from './services/pdf-viewport.service';

/**
 * Shell wiring tests. The test environment has no Web Worker, so the PDFium
 * engine is unavailable and any document load ends in the `unsupported` error
 * panel. That's enough to exercise the shell, its per-viewer services and the
 * `ui/` children without a real PDF; rendering itself is covered by
 * `npm run test:pdf-engine` and the demo.
 */

const pdfBytes = () => new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

@Component({
  imports: [PdfViewerComponent, HkPdfToolbarDirective],
  template: `
    <hk-pdf-viewer [src]="src()" [config]="config()" (viewerError)="errors.push($event)">
      @if (custom()) {
        <ng-template hkPdfToolbar let-state="state">
          <div class="custom-toolbar">pages: {{ state?.numPages }}</div>
        </ng-template>
      }
    </hk-pdf-viewer>
  `,
})
class HostComponent {
  readonly src = signal<Uint8Array>(pdfBytes());
  readonly config = signal<PdfViewerConfig>({});
  readonly custom = signal(false);
  readonly errors: PdfViewerError[] = [];
}

describe('PdfViewerComponent (shell)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  async function setup(config: Parameters<typeof createPdfViewer>[0] = {}, custom = false) {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    const viewer = createPdfViewer(config);
    host.config.set(viewer.config());
    host.custom.set(custom);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
    return viewer;
  }

  const viewerEl = () => el.querySelector('hk-pdf-viewer') as HTMLElement;
  const key = (init: KeyboardEventInit) => {
    viewerEl().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
    fixture.detectChanges();
  };

  it('renders the default toolbar and reports the unsupported engine without throwing', async () => {
    const onError = vi.fn();
    const viewer = await setup({ onError });
    expect(el.querySelector('hk-pdf-toolbar [role="toolbar"]')).not.toBeNull();
    expect(el.querySelector('hk-pdf-pages [role="alert"]')?.textContent).toContain('not supported');
    expect(viewer.state().error?.code).toBe('unsupported');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'unsupported' }));
    expect(host.errors.map((e) => e.code)).toEqual(['unsupported']);
  });

  it('toggles the sidebar through the controller and switches tabs', async () => {
    const viewer = await setup();
    expect(el.querySelector('hk-pdf-sidebar')).not.toBeNull(); // open by default

    viewer.toggleSidebar();
    fixture.detectChanges();
    expect(el.querySelector('hk-pdf-sidebar')).toBeNull();

    viewer.toggleSidebar();
    fixture.detectChanges();
    const tabs = el.querySelectorAll<HTMLButtonElement>('hk-pdf-sidebar [role="tab"]');
    expect(tabs.length).toBe(4);

    tabs[1].click(); // bookmarks
    fixture.detectChanges();
    expect(viewer.state().sidebarTab).toBe('bookmarks');
  });

  it('opens the find bar with ⌘/Ctrl+F and closes it with Escape', async () => {
    await setup();
    expect(el.querySelector('hk-pdf-find-bar')).toBeNull();

    key({ key: 'f', ctrlKey: true });
    expect(el.querySelector('hk-pdf-find-bar [role="search"]')).not.toBeNull();

    key({ key: 'Escape' });
    expect(el.querySelector('hk-pdf-find-bar')).toBeNull();
  });

  it('renders the preview layout with its own pages area', async () => {
    await setup({ layout: 'preview' });
    expect(el.querySelector('hk-pdf-toolbar')).toBeNull(); // preview hides the toolbar by default
    expect(el.querySelector('.hk-pdf-preview-viewport')).not.toBeNull();
    expect(el.querySelector('hk-pdf-sidebar')).toBeNull();
  });

  it('replaces the default toolbar with a consumer template', async () => {
    await setup({}, true);
    expect(el.querySelector('hk-pdf-toolbar')).toBeNull();
    expect(el.querySelector('.custom-toolbar')?.textContent).toContain('pages: 0');
  });

  it('hides the toolbar when showToolbar is false', async () => {
    await setup({ showToolbar: false });
    expect(el.querySelector('hk-pdf-toolbar')).toBeNull();
  });

  it('isolates state per viewer instance', async () => {
    const a = createPdfViewer();
    const b = createPdfViewer();
    @Component({
      imports: [PdfViewerComponent],
      template: `
        <hk-pdf-viewer [src]="src" [config]="a" />
        <hk-pdf-viewer [src]="src" [config]="b" />
      `,
    })
    class TwoViewers {
      readonly src = pdfBytes();
      readonly a = a.config();
      readonly b = b.config();
    }
    const f = TestBed.createComponent(TwoViewers);
    f.detectChanges();
    await f.whenStable();
    a.toggleSidebar(); // close only the first viewer's sidebar
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelectorAll('hk-pdf-sidebar').length).toBe(1);
    expect(a.state().sidebarOpen).toBe(false);
    expect(b.state().sidebarOpen).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Virtualization with a loaded document (fake engine, no worker)
// ---------------------------------------------------------------------------

/** Just enough engine for a document of `count` letter pages; renders never settle. */
function fakeEngine(count: number): PdfEngine {
  const never = new Promise<never>(() => undefined);
  const engine: Partial<PdfEngine> = {
    open: async () => 1,
    pageCount: async () => count,
    pageSizes: async () => Array.from({ length: count }, () => ({ width: 612, height: 792 })),
    // Front matter in roman numerals, then the body restarts at 1.
    pageLabels: async () => Array.from({ length: count }, (_, i) => (i < 3 ? ['i', 'ii', 'iii'][i] : String(i - 2))),
    documentTitle: async () => '',
    renderPage: () => ({ promise: never, cancel: () => undefined }),
    renderTile: () => ({ promise: never, cancel: () => undefined }),
    pageText: async () => [],
    pagesText: async (_d, pages) => pages.map((i) => [{ text: `Page ${i + 1}`, x: 0, y: 0, w: 50, h: 10 }]),
    pageLinks: async () => [],
    formFields: async () => [],
    outline: async () => [],
    attachments: async () => [],
    setHiddenAnnotations: async () => undefined,
    dispose: () => undefined,
    destroy: () => undefined,
  };
  return engine as PdfEngine;
}

describe('PdfViewerComponent (virtualization)', () => {
  const PAGES = 1000;
  const GAP = 16;

  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    vi.spyOn(PdfViewerStore.prototype, 'ensureEngine').mockImplementation(function (this: PdfViewerStore) {
      this.engine ??= fakeEngine(PAGES);
      return this.engine;
    });
    // jsdom has no layout; make scrollTo move scrollTop so navigation is observable.
    HTMLElement.prototype.scrollTo = function (this: HTMLElement, opts?: ScrollToOptions | number) {
      this.scrollTop = typeof opts === 'number' ? opts : (opts?.top ?? 0);
    } as typeof HTMLElement.prototype.scrollTo;
  });

  async function load() {
    const fixture = TestBed.createComponent(HostComponent);
    const viewer = createPdfViewer({ zoom: 1 });
    fixture.componentInstance.config.set(viewer.config());
    for (let i = 0; i < 6; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    return { fixture, viewer, el: fixture.nativeElement as HTMLElement };
  }

  const mountedPages = (el: HTMLElement) =>
    Array.from(el.querySelectorAll<HTMLElement>('.hk-pdf-page')).map((p) => Number(p.dataset['pageNumber']));

  it('mounts only a small window of a 1,000-page document', async () => {
    const { el, viewer } = await load();
    expect(viewer.state().numPages).toBe(PAGES);
    const mounted = mountedPages(el);
    expect(mounted[0]).toBe(1);
    expect(mounted.length).toBeGreaterThan(0);
    expect(mounted.length).toBeLessThan(10);
  });

  it('sizes the spacer so the stack has the full document height', async () => {
    const { el } = await load();
    const mounted = mountedPages(el);
    const spacers = Array.from(el.querySelectorAll<HTMLElement>('.hk-pdf-page-stack > [aria-hidden="true"]'));
    expect(spacers.length).toBe(1); // nothing above page 1
    const after = parseFloat(spacers[0].style.height);
    // Mounted pages + gaps + spacer + its gap == the whole document at zoom 1.
    const total = PAGES * 792 + (PAGES - 1) * GAP;
    expect(mounted.length * (792 + GAP) + after).toBeCloseTo(total, 6);
  });

  it('mounts the target page when navigating far away', async () => {
    const { fixture, el, viewer } = await load();
    viewer.goToPage(500);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const mounted = mountedPages(el);
    expect(mounted).toContain(500);
    expect(mounted.length).toBeLessThan(10);
    expect(viewer.state().page).toBe(500);
    const spacers = el.querySelectorAll('.hk-pdf-page-stack > [aria-hidden="true"]');
    expect(spacers.length).toBe(2); // above and below the window
  });

  it('streams search results in batches and jumps to the first match', async () => {
    const { fixture, viewer } = await load();
    const engine = (fixture.debugElement.query((d) => d.name === 'hk-pdf-viewer').injector.get(PdfViewerStore).engine as PdfEngine)!;
    const pagesText = vi.spyOn(engine, 'pagesText');

    const result = await viewer.search('Page 999');
    fixture.detectChanges();

    expect(result.totalMatches).toBe(1);
    expect(viewer.state().page).toBe(999);
    expect(viewer.state().currentMatchIndex).toBe(0);
    expect(pagesText).toHaveBeenCalledTimes(PAGES / 25); // 25 pages per worker round-trip
    expect(pagesText.mock.calls.every(([, , priority]) => priority === 'low')).toBe(true);
  });

  it('answers a repeat search from the full index without refetching text', async () => {
    const { fixture, viewer } = await load();
    const engine = fixture.debugElement.query((d) => d.name === 'hk-pdf-viewer').injector.get(PdfViewerStore).engine as PdfEngine;
    await viewer.search('Page 1');
    const pagesText = vi.spyOn(engine, 'pagesText');
    const again = await viewer.search('Page 2');
    expect(pagesText).not.toHaveBeenCalled();
    expect(again.totalMatches).toBeGreaterThan(0);
  });

  it('abandons a search superseded by a newer one', async () => {
    const { viewer } = await load();
    const first = viewer.search('Page 5');
    const second = viewer.search('Page 999');
    await Promise.all([first, second]);
    expect(viewer.state().searchQuery).toBe('Page 999');
    expect(viewer.state().searchMatches).toBe(1);
  });

  it('ctrl+wheel previews the zoom with a transform, then commits it when the gesture settles', async () => {
    const { fixture, el, viewer } = await load();
    const viewport = el.querySelector<HTMLElement>('.hk-pdf-viewport')!;
    const stack = el.querySelector<HTMLElement>('.hk-pdf-page-stack')!;

    const wheel = new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: 20, clientY: 20, cancelable: true });
    viewport.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true); // the browser must not zoom the whole page
    expect(stack.style.transform).toBe('scale(1.25)');
    expect(viewer.state().zoomMode).toBe(1); // not committed yet

    await new Promise((r) => setTimeout(r, 200));
    fixture.detectChanges();
    expect(viewer.state().zoomMode).toBe(1.25);
    expect(stack.style.transform).toBe('');
  });

  it('leaves a plain wheel to scroll', async () => {
    const { el } = await load();
    const wheel = new WheelEvent('wheel', { deltaY: 100, cancelable: true });
    el.querySelector<HTMLElement>('.hk-pdf-viewport')!.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
    expect(el.querySelector<HTMLElement>('.hk-pdf-page-stack')!.style.transform).toBe('');
  });

  it('lays pages out in two-page rows in spread mode and steps by spread', async () => {
    const { fixture, el, viewer } = await load();
    viewer.setMode('spread');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const rows = Array.from(el.querySelectorAll<HTMLElement>('.hk-pdf-page-row')).map((row) =>
      Array.from(row.querySelectorAll<HTMLElement>('.hk-pdf-page')).map((p) => Number(p.dataset['pageNumber'])),
    );
    expect(rows[0]).toEqual([1, 2]);
    expect(rows[1]).toEqual([3, 4]);

    viewer.nextPage();
    expect(viewer.state().page).toBe(3); // next spread, not page 2
    viewer.previousPage();
    expect(viewer.state().page).toBe(1);
  });

  it('puts the cover page alone in spread-cover mode', async () => {
    const { fixture, el, viewer } = await load();
    viewer.setMode('spread-cover');
    fixture.detectChanges();
    const rows = Array.from(el.querySelectorAll<HTMLElement>('.hk-pdf-page-row')).map((row) => row.querySelectorAll('.hk-pdf-page').length);
    expect(rows.slice(0, 3)).toEqual([1, 2, 2]);
  });

  it('shows page labels and accepts them in the page field', async () => {
    const { fixture, el, viewer } = await load();
    fixture.detectChanges();
    const input = el.querySelector<HTMLInputElement>('hk-pdf-toolbar input[type="text"]')!;
    expect(input.value).toBe('i');

    input.value = 'iii';
    input.dispatchEvent(new Event('change'));
    expect(viewer.state().page).toBe(3);

    input.value = '1'; // label "1" is page 4: labels win over numbers
    input.dispatchEvent(new Event('change'));
    expect(viewer.state().page).toBe(4);

    input.value = 'nonsense';
    input.dispatchEvent(new Event('change'));
    expect(viewer.state().page).toBe(4);
    expect(input.value).toBe('1'); // snapped back to the current page's label
  });

  it('renders a sharp tile of the visible area when a page exceeds the canvas limit', async () => {
    const dpr = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
    const rect = (left: number, top: number, width: number, height: number) =>
      ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
    // jsdom has no layout: the viewport is 800×600 at the origin; the page is scrolled so (100, 200) is at its top-left.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('hk-pdf-viewport')) return rect(0, 0, 800, 600);
      if (this.tagName === 'CANVAS') return rect(-100, -200, 612 * 5, 792 * 5);
      return rect(0, 0, 0, 0);
    });
    try {
      const { fixture } = await load();
      const engine = fixture.debugElement.query((d) => d.name === 'hk-pdf-viewer').injector.get(PdfViewerStore).engine as PdfEngine;
      const renderTile = vi.spyOn(engine, 'renderTile');
      // 612 pt × 5 = 3060 css px × dpr 2 = 6120 device px > the 4096 canvas limit.
      fixture.debugElement
        .query((d) => d.name === 'hk-pdf-viewer')
        .injector.get(PdfViewportService)
        .setZoom(5);
      for (let i = 0; i < 4; i++) {
        fixture.detectChanges();
        await fixture.whenStable();
      }
      await new Promise((r) => setTimeout(r, 200)); // detail debounce

      expect(renderTile).toHaveBeenCalled();
      const [, page, tile, priority] = renderTile.mock.calls[0];
      expect(page).toBe(0);
      expect(priority).toBe('high');
      expect(tile.pageWidth).toBe(612 * 5 * 2);
      // Visible part (x 100–900, y 200–800 css) plus a 25% margin (200 / 150 css), clamped
      // to the page's left edge, in device px.
      expect(tile.x).toBe(0);
      expect(tile.y).toBe(2 * (200 - 150));
      expect(tile.width).toBe(2 * (900 + 200));
      expect(tile.width).toBeLessThanOrEqual(4096);
      expect(tile.height).toBeLessThanOrEqual(4096);
    } finally {
      Object.defineProperty(window, 'devicePixelRatio', { value: dpr, configurable: true });
    }
  });

  it('virtualizes the sidebar thumbnails too', async () => {
    const { el } = await load(); // the sidebar starts open on the thumbnails tab
    const items = el.querySelectorAll('hk-pdf-sidebar li[data-thumb-item]');
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(30);
    const canvas = el.querySelector<HTMLCanvasElement>('hk-pdf-sidebar canvas[data-thumb-page="1"]')!;
    expect(canvas.style.width).toBe('180px');
    expect(canvas.style.height).toBe(`${Math.round((180 * 792) / 612)}px`); // sized from the page aspect before painting
    expect(el.querySelectorAll('hk-pdf-sidebar li[aria-hidden="true"]').length).toBe(1); // spacer below the window
  });

  it('sizes each mounted canvas from the layout before it renders', async () => {
    const { el } = await load();
    const canvas = el.querySelector<HTMLCanvasElement>('.hk-pdf-page canvas')!;
    expect(canvas.style.width).toBe('612px');
    expect(canvas.style.height).toBe('792px');
  });
});
