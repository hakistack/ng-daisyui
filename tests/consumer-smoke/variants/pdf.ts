/**
 * Consumer smoke variant: hk-pdf-viewer. The PDFium engine (6 MB worker + WASM) must stay a lazy chunk:
 * this variant's budget is on the initial JS only.
 * `npm run test:consumer:pdf` swaps this file in for src/main.ts.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { createPdfViewer, PdfViewerComponent } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-root',
  imports: [PdfViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<hk-pdf-viewer src="/sample.pdf" title="Sample" [config]="viewer.config()" />`,
})
class AppComponent {
  readonly viewer = createPdfViewer({ zoom: 'fit-width' });
}

bootstrapApplication(AppComponent).catch((err: unknown) => console.error(err));
