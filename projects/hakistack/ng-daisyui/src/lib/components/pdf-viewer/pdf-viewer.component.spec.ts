import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfViewerComponent } from './pdf-viewer.component';
import { HkPdfToolbarDirective } from './pdf-viewer.directives';
import { createPdfViewer } from './pdf-viewer.helpers';
import { PdfViewerConfig, PdfViewerError } from './pdf-viewer.types';

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
