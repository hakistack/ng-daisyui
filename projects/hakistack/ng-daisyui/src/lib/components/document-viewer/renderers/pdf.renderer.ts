import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PdfViewerComponent } from '../../pdf-viewer/pdf-viewer.component';
import { createPdfViewer } from '../../pdf-viewer/pdf-viewer.helpers';
import { DocumentRendererInputs } from '../document-viewer.types';

/**
 * Adapter that lets `<hk-document-viewer>` delegate `.pdf` sources to the
 * existing `<hk-pdf-viewer>`. We don't duplicate the PDF viewer's logic —
 * we just bridge inputs and stand up a default controller.
 *
 * The PDF viewer itself lazy-loads `pdfjs-dist` via `HkPdfService.load()`
 * on first use, so importing `PdfViewerComponent` here doesn't pull
 * `pdfjs-dist` into the initial bundle.
 */
@Component({
  selector: 'hk-document-pdf-renderer',
  imports: [PdfViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <hk-pdf-viewer [src]="source()" [config]="viewer.config()" /> `,
  host: { class: 'block w-full' },
})
export class DocumentPdfRenderer {
  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();

  /**
   * Default controller. Consumers needing imperative PDF control (search,
   * goToPage, etc.) should mount `<hk-pdf-viewer>` directly instead of
   * routing through the document viewer — the registry's overrides hook
   * is the right escape hatch.
   */
  readonly viewer = createPdfViewer({});
}
