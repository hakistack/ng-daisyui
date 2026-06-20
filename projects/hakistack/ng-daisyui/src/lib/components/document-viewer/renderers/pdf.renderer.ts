import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PdfViewerComponent } from '../../pdf-viewer/pdf-viewer.component';
import { createPdfViewer } from '../../pdf-viewer/pdf-viewer.helpers';
import { DocumentRendererInputs } from '../document-viewer.types';

/**
 * Adapter that lets `<hk-document-viewer>` delegate `.pdf` sources to the
 * existing `<hk-pdf-viewer>`. We don't duplicate the PDF viewer's logic —
 * we just bridge inputs and stand up a default controller.
 *
 * The PDF viewer renders via the PDFium (Rust→WASM) engine, whose worker +
 * wasm are lazy-loaded on first use, so importing `PdfViewerComponent` here
 * doesn't pull the engine into the initial bundle.
 */
@Component({
  selector: 'hk-document-pdf-renderer',
  imports: [PdfViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <hk-pdf-viewer [src]="source()" [config]="viewer.config()" /> `,
  // Layout-neutral: fill the parent. `<hk-pdf-viewer>` is `h-full` and needs a
  // bounded-height ancestor; the consumer (or demo) sizes the document viewer,
  // and this `h-full` chain passes that height down. No fixed height is baked
  // into the library — sizing is the consumer's decision.
  host: { class: 'block w-full h-full' },
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
