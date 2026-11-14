import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── PDF viewer (createPdfViewer builder) ──────────────────────────────────
export interface PdfViewerPgState {
  [k: string]: string | number | boolean;
  layout: string;
  mode: string;
  zoom: string;
  page: number;
  showToolbar: boolean;
  showSidebar: boolean;
  defaultSidebarTab: string;
  annotationMode: string;
}
const PDF_VIEWER_DEFAULTS: PdfViewerPgState = {
  // Library defaults for the 'default' layout (preview swaps zoom/mode/toolbar defaults).
  layout: 'default',
  mode: 'continuous',
  zoom: 'fit-width',
  page: 1,
  showToolbar: true,
  showSidebar: true,
  defaultSidebarTab: 'thumbnails',
  annotationMode: 'edit',
};

/** Served by the docs app from `public/samples/` (IRS Form W-9, public domain, 6 pages). */
export const PDF_VIEWER_SAMPLE_SRC = '/samples/fw9.pdf';

function pdfViewerCode(s: PdfViewerPgState): string {
  const d = PDF_VIEWER_DEFAULTS;
  // The 'preview' layout has its own defaults for zoom, mode and toolbar, so
  // those are written explicitly whenever it is selected.
  const preview = s.layout === 'preview';
  const opts: string[] = [];
  if (s.layout !== d.layout) opts.push(`    layout: '${s.layout}',`);
  if (preview || s.mode !== d.mode) opts.push(`    mode: '${s.mode}',`);
  if (preview || s.zoom !== d.zoom) opts.push(`    zoom: '${s.zoom}',`);
  if (s.page !== d.page) opts.push(`    page: ${s.page},`);
  if (preview || s.showToolbar !== d.showToolbar) opts.push(`    showToolbar: ${s.showToolbar},`);
  if (s.showSidebar !== d.showSidebar) opts.push(`    showSidebar: ${s.showSidebar},`);
  if (s.defaultSidebarTab !== d.defaultSidebarTab) opts.push(`    defaultSidebarTab: '${s.defaultSidebarTab}',`);
  if (s.annotationMode !== d.annotationMode) opts.push(`    annotationMode: '${s.annotationMode}',`);
  const config = opts.length ? `{\n${opts.join('\n')}\n  }` : '';

  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PdfLoadedInfo, PdfViewerComponent, PdfViewerError, createPdfViewer } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-example',
  imports: [PdfViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <!-- The viewer fills its parent: give it a bounded height. -->
    <div class="h-[32rem]">
      <hk-pdf-viewer
        [src]="src"
        [config]="viewer.config()"
        (loaded)="onLoaded($event)"
        (pageChange)="onPageChange($event)"
        (viewerError)="onError($event)"
      />
    </div>
  \`,
})
export class ExampleComponent {
  /** A URL, Uint8Array or Blob. */
  readonly src = '${PDF_VIEWER_SAMPLE_SRC}';
  readonly viewer = createPdfViewer(${config});

  onLoaded(info: PdfLoadedInfo): void {
    console.log('loaded', info);
  }

  onPageChange(page: number): void {
    console.log('pageChange', page);
  }

  onError(error: PdfViewerError): void {
    console.error('viewerError', error);
  }
}
`;
}

export const PDF_VIEWER_PLAYGROUND = definePlayground<PdfViewerPgState>({
  layout: 'wide',
  symbol: 'PdfViewerComponent',
  optionsSymbol: 'PdfViewerConfig',
  defaults: PDF_VIEWER_DEFAULTS,
  events: ['loaded', 'pageChange', 'viewerError'],
  controls: [
    { key: 'layout', kind: 'select', label: l('Layout', 'Diseño'), options: ['default', 'preview'] },
    {
      key: 'mode',
      kind: 'select',
      label: l('Display mode', 'Modo de visualización'),
      options: ['continuous', 'single', 'spread', 'spread-cover'],
    },
    { key: 'zoom', kind: 'select', label: l('Initial zoom', 'Zoom inicial'), options: ['fit-width', 'fit-page', 'auto'] },
    { key: 'page', kind: 'number', label: l('Initial page', 'Página inicial'), min: 1, max: 6, step: 1 },
    { key: 'showToolbar', kind: 'boolean', label: l('Toolbar', 'Barra de herramientas') },
    { key: 'showSidebar', kind: 'boolean', label: l('Sidebar open', 'Panel lateral abierto') },
    {
      key: 'defaultSidebarTab',
      kind: 'select',
      label: l('Sidebar tab', 'Pestaña del panel lateral'),
      options: ['thumbnails', 'bookmarks', 'attachments', 'annotations', 'signatures'],
    },
    {
      key: 'annotationMode',
      kind: 'select',
      label: l('Annotations allowed', 'Anotaciones permitidas'),
      options: ['edit', 'review', 'view'],
    },
  ],
  code: pdfViewerCode,
});
