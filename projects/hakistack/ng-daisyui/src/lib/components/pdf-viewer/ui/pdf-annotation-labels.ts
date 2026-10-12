import { HkAnnotation, PdfLineEnding, PdfReviewStatus } from '../core/annotations/annotation.types';
import { ResolvedPdfViewerLabels } from '../pdf-viewer.labels';

/** The localized name of an annotation's kind (a line with an arrow ending reads as an arrow). */
export function annotationTypeLabel(
  a: Pick<HkAnnotation, 'type'> & Partial<{ endEnding: PdfLineEnding; cloudy: boolean }>,
  labels: ResolvedPdfViewerLabels,
): string {
  switch (a.type) {
    case 'highlight':
      return labels.highlight;
    case 'underline':
      return labels.underline;
    case 'strikeout':
      return labels.strikeout;
    case 'squiggly':
      return labels.squiggly;
    case 'rect':
      return labels.rectangle;
    case 'ellipse':
      return labels.ellipse;
    case 'line':
      return a.endEnding && a.endEnding !== 'None' ? labels.arrow : labels.line;
    case 'polygon':
      return a.cloudy ? labels.cloud : labels.polygon;
    case 'polyline':
      return labels.polyline;
    case 'ink':
      return labels.ink;
    case 'freetext':
      return labels.textBox;
    case 'note':
      return labels.stickyNote;
  }
}

export const REVIEW_STATUSES: readonly PdfReviewStatus[] = ['None', 'Accepted', 'Rejected', 'Cancelled', 'Completed'];

export function statusLabel(status: PdfReviewStatus | undefined, labels: ResolvedPdfViewerLabels): string {
  switch (status ?? 'None') {
    case 'Accepted':
      return labels.statusAccepted;
    case 'Rejected':
      return labels.statusRejected;
    case 'Cancelled':
      return labels.statusCancelled;
    case 'Completed':
      return labels.statusCompleted;
    default:
      return labels.statusNone;
  }
}

/** Line endings offered in the properties panel (the reversed arrows are read and kept, not offered). */
export const LINE_ENDINGS: readonly { readonly value: PdfLineEnding; readonly label: keyof ResolvedPdfViewerLabels }[] = [
  { value: 'None', label: 'endingNone' },
  { value: 'OpenArrow', label: 'endingOpenArrow' },
  { value: 'ClosedArrow', label: 'endingClosedArrow' },
  { value: 'Circle', label: 'endingCircle' },
  { value: 'Square', label: 'endingSquare' },
  { value: 'Diamond', label: 'endingDiamond' },
  { value: 'Butt', label: 'endingButt' },
  { value: 'Slash', label: 'endingSlash' },
];
