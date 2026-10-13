import { DocumentRendererRegistration } from './document-viewer.types';
import { DocumentDocxRenderer } from './renderers/docx.renderer';
import { DocumentEmlRenderer } from './renderers/eml.renderer';
import { DocumentEpubRenderer } from './renderers/epub.renderer';
import { DocumentHtmlRenderer } from './renderers/html.renderer';
import { DocumentImageRenderer } from './renderers/image.renderer';
import { DocumentImageSpecialRenderer } from './renderers/image-special.renderer';
import { DocumentMsgRenderer } from './renderers/msg.renderer';
import { DocumentPdfRenderer } from './renderers/pdf.renderer';
import { DocumentRtfRenderer } from './renderers/rtf.renderer';
import { DocumentSpreadsheetRenderer } from './renderers/spreadsheet.renderer';
import { DocumentTextRenderer } from './renderers/text.renderer';

/**
 * Built-in registrations. Search order matches array order — `pdf` first
 * because PDFs come up most often, but technical order doesn't matter
 * since each renderer claims disjoint format keys.
 *
 * Consumers can override any format by passing a renderer with the same
 * format key in `config.renderers` — those win because [`resolveRenderer`]
 * checks user registrations before built-ins.
 */
export const BUILT_IN_RENDERERS: readonly DocumentRendererRegistration[] = [
  { formats: ['pdf'], component: DocumentPdfRenderer },
  { formats: ['spreadsheet'], component: DocumentSpreadsheetRenderer },
  { formats: ['docx'], component: DocumentDocxRenderer },
  { formats: ['rtf'], component: DocumentRtfRenderer },
  { formats: ['html'], component: DocumentHtmlRenderer },
  { formats: ['eml'], component: DocumentEmlRenderer },
  { formats: ['msg'], component: DocumentMsgRenderer },
  { formats: ['epub'], component: DocumentEpubRenderer },
  { formats: ['image'], component: DocumentImageRenderer },
  { formats: ['image-special'], component: DocumentImageSpecialRenderer },
  { formats: ['text'], component: DocumentTextRenderer },
];
