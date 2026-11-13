import { PdfStampContent } from '../core/annotations/annotation.types';
import { jpegInfo } from '../core/annotations/images';
import { bytesToBase64 } from '../core/annotations/shapes';
import { ResolvedPdfViewerLabels } from '../pdf-viewer.labels';
import { PendingStamp } from '../services/pdf-annotations.service';

/** A stamp in the stamp menu. `name` is the `/Name` written to the file (Acrobat's names for its standard set). */
export interface StampPreset {
  readonly name: string;
  readonly label: keyof ResolvedPdfViewerLabels;
  readonly color: string;
  readonly shape: 'rounded' | 'rect' | 'arrow';
}

const GREEN = '#15803d';
const RED = '#b91c1c';
const BLUE = '#1d4ed8';

export const STANDARD_STAMPS: readonly StampPreset[] = [
  { name: 'Approved', label: 'stampApproved', color: GREEN, shape: 'rounded' },
  { name: 'NotApproved', label: 'stampNotApproved', color: RED, shape: 'rounded' },
  { name: 'Draft', label: 'stampDraft', color: BLUE, shape: 'rounded' },
  { name: 'Final', label: 'stampFinal', color: GREEN, shape: 'rounded' },
  { name: 'Confidential', label: 'stampConfidential', color: RED, shape: 'rounded' },
  { name: 'ForComment', label: 'stampForComment', color: BLUE, shape: 'rounded' },
  { name: 'ForPublicRelease', label: 'stampForPublicRelease', color: GREEN, shape: 'rounded' },
  { name: 'NotForPublicRelease', label: 'stampNotForPublicRelease', color: RED, shape: 'rounded' },
  { name: 'Experimental', label: 'stampExperimental', color: BLUE, shape: 'rounded' },
  { name: 'Expired', label: 'stampExpired', color: RED, shape: 'rounded' },
  { name: 'AsIs', label: 'stampAsIs', color: BLUE, shape: 'rounded' },
  { name: 'Departmental', label: 'stampDepartmental', color: BLUE, shape: 'rounded' },
  { name: 'Sold', label: 'stampSold', color: BLUE, shape: 'rounded' },
  { name: 'TopSecret', label: 'stampTopSecret', color: RED, shape: 'rounded' },
];

/** Stamped with who and when (resolved when placed). */
export const DYNAMIC_STAMPS: readonly StampPreset[] = [
  { name: 'Approved', label: 'stampApproved', color: GREEN, shape: 'rect' },
  { name: 'Received', label: 'stampReceived', color: BLUE, shape: 'rect' },
  { name: 'Reviewed', label: 'stampReviewed', color: BLUE, shape: 'rect' },
  { name: 'Revised', label: 'stampRevised', color: BLUE, shape: 'rect' },
  { name: 'Confidential', label: 'stampConfidential', color: RED, shape: 'rect' },
];

export const SIGN_HERE_STAMPS: readonly StampPreset[] = [
  { name: 'SignHere', label: 'stampSignHere', color: '#dc2626', shape: 'arrow' },
  { name: 'InitialHere', label: 'stampInitialHere', color: GREEN, shape: 'arrow' },
  { name: 'Witness', label: 'stampWitness', color: '#ca8a04', shape: 'arrow' },
];

/** The pending stamp for a preset; dynamic ones get "{author} · {date}" filled in now. */
export function presetStamp(
  preset: StampPreset,
  labels: ResolvedPdfViewerLabels,
  dynamic: { author: string; date: Date } | null,
): PendingStamp {
  const subtext = dynamic
    ? labels.dynamicStampSubtext.replace('{author}', dynamic.author).replace('{date}', formatStampDate(dynamic.date))
    : undefined;
  const stamp: PdfStampContent = { kind: 'text', text: labels[preset.label], subtext, shape: preset.shape };
  return { name: preset.name, stamp, color: preset.color };
}

export function formatStampDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** Longest side of an image stamp, in pixels (larger images are scaled down). */
const IMAGE_STAMP_MAX = 1024;

/**
 * An image file as a stamp: JPEGs (grey or RGB) are kept as they are;
 * anything else the browser can decode (PNG, WebP, GIF, SVG, CMYK JPEG) is
 * redrawn to a PNG, scaled down to {@link IMAGE_STAMP_MAX}.
 */
export async function imageStampFromFile(file: File): Promise<PdfStampContent> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === 'image/jpeg') {
    try {
      const info = jpegInfo(bytes);
      if ((info.components === 1 || info.components === 3) && Math.max(info.width, info.height) <= IMAGE_STAMP_MAX) {
        return { kind: 'image', data: bytesToBase64(bytes), mime: 'image/jpeg', width: info.width, height: info.height };
      }
    } catch {
      /* redraw below */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, IMAGE_STAMP_MAX / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round((img.naturalWidth || 300) * k));
    canvas.height = Math.max(1, Math.round((img.naturalHeight || 150) * k));
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('could not encode the image');
    const png = new Uint8Array(await blob.arrayBuffer());
    return { kind: 'image', data: bytesToBase64(png), mime: 'image/png', width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
