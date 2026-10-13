import type { StandardFont } from '../pdf-writer/standard-fonts';

/**
 * Annotation model. Everything is in **PDF points on the displayed page**:
 * origin at the top-left of the page as the viewer shows it (the page's own
 * `/Rotate` applied, the viewer's display rotation not), x right, y down.
 * That is the space the viewer's layers and pointer math already use; the
 * conversion to PDF user space happens only when reading and writing the
 * file (see `page-space.ts`).
 */

/** An axis-aligned rectangle (top-left origin). */
export interface PdfRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Line-ending styles (ISO 32000 Table 179). */
export type PdfLineEnding =
  | 'None'
  | 'Square'
  | 'Circle'
  | 'Diamond'
  | 'OpenArrow'
  | 'ClosedArrow'
  | 'Butt'
  | 'ROpenArrow'
  | 'RClosedArrow'
  | 'Slash';

/** Review states (`/StateModel /Review`). */
export type PdfReviewStatus = 'None' | 'Accepted' | 'Rejected' | 'Cancelled' | 'Completed';

/** A reply in an annotation's comment thread (written as a Text annotation with `/IRT`). */
export interface PdfAnnotationReply {
  readonly id: string;
  readonly author: string;
  readonly contents: string;
  /** ISO 8601. */
  readonly created?: string;
  readonly modified?: string;
}

/** Real-world units a page scale converts to (`'ft-in'` shows feet and inches). */
export type PdfMeasureUnit = 'pt' | 'in' | 'cm' | 'mm' | 'pica' | 'ft' | 'ft-in' | 'm';

/** A page scale: `ratio` real units per PDF point, e.g. "1 in = 10 ft" is 10 ft / 72 pt. */
export interface PdfMeasureScale {
  readonly ratio: number;
  readonly unit: PdfMeasureUnit;
  /** Human-readable scale, written as the `/Measure` `/R` (e.g. `1 in = 10 ft`). */
  readonly label: string;
  /** Decimals shown (default 2). */
  readonly precision?: number;
}

export type PdfMeasureKind = 'distance' | 'perimeter' | 'area' | 'radius' | 'volume';

/**
 * Makes a line (distance), polyline (perimeter), polygon (area or volume) or
 * ellipse (radius) a measurement: it shows its value and is written with a
 * `/Measure` dictionary. The scale is captured when it's drawn.
 */
export interface PdfMeasurement {
  readonly kind: PdfMeasureKind;
  readonly scale: PdfMeasureScale;
  /** Depth for volumes, in the scale's unit. */
  readonly depth?: number;
}

interface PdfAnnotationBase {
  /** Unique within the document (`/NM`). */
  readonly id: string;
  /** 0-based page index. */
  readonly page: number;
  /**
   * The selection box: the shape's box for rectangles, ellipses, free text and
   * notes; the bounds of the points, quads or strokes for the others.
   */
  readonly rect: PdfRect;
  /** `#rrggbb`: stroke colour (markup colour for text markup, icon colour for notes, border colour for free text). */
  readonly color: string;
  /** 0–1 (`/CA`). */
  readonly opacity: number;
  readonly author?: string;
  /** The comment text (`/Contents`); for free text, the text shown on the page. */
  readonly contents?: string;
  readonly subject?: string;
  /** ISO 8601. */
  readonly created?: string;
  readonly modified?: string;
  /** Locked annotations can't be moved, resized or deleted (`/F` Locked). */
  readonly locked?: boolean;
  readonly status?: PdfReviewStatus;
  readonly replies?: readonly PdfAnnotationReply[];
}

export type PdfTextMarkupType = 'highlight' | 'underline' | 'strikeout' | 'squiggly';

/** Highlight, underline, strikeout or squiggly over text: one quad per line fragment. */
export interface PdfTextMarkupAnnotation extends PdfAnnotationBase {
  readonly type: PdfTextMarkupType;
  readonly quads: readonly PdfRect[];
}

/** Rectangle (`/Square`) or ellipse (`/Circle`). The stroke is drawn inside `rect`. */
export interface PdfShapeAnnotation extends PdfAnnotationBase {
  readonly type: 'rect' | 'ellipse';
  readonly strokeWidth: number;
  /** Interior colour, or `null` for none. */
  readonly fill: string | null;
  readonly dash?: readonly number[];
  /** Cloudy border (`/BE /S /C`). */
  readonly cloudy?: boolean;
  /** An ellipse can measure its radius. */
  readonly measure?: PdfMeasurement;
}

/** A straight line; an arrow is a line with an arrow ending. */
export interface PdfLineAnnotation extends PdfAnnotationBase {
  readonly type: 'line';
  /** `[x1, y1, x2, y2]`. */
  readonly points: readonly [number, number, number, number];
  readonly strokeWidth: number;
  readonly startEnding: PdfLineEnding;
  readonly endEnding: PdfLineEnding;
  /** Fill for closed endings, or `null`. */
  readonly fill: string | null;
  readonly dash?: readonly number[];
  /** A measured distance. */
  readonly measure?: PdfMeasurement;
}

/** Polygon (closed, optionally cloudy) or polyline (open, with endings). */
export interface PdfPolyAnnotation extends PdfAnnotationBase {
  readonly type: 'polygon' | 'polyline';
  /** Flat `[x0, y0, x1, y1, …]`. */
  readonly vertices: readonly number[];
  readonly strokeWidth: number;
  readonly fill: string | null;
  readonly dash?: readonly number[];
  readonly cloudy?: boolean;
  readonly startEnding?: PdfLineEnding;
  readonly endEnding?: PdfLineEnding;
  /** A measured perimeter (polyline) or area / volume (polygon). */
  readonly measure?: PdfMeasurement;
}

/** Freehand ink: one flat point list per stroke. */
export interface PdfInkAnnotation extends PdfAnnotationBase {
  readonly type: 'ink';
  readonly strokes: readonly (readonly number[])[];
  readonly strokeWidth: number;
}

/** Text drawn on the page (`/FreeText`). `contents` is the text; `color` the border. */
export interface PdfFreeTextAnnotation extends PdfAnnotationBase {
  readonly type: 'freetext';
  readonly font: StandardFont;
  readonly fontSize: number;
  readonly fontColor: string;
  readonly align: 'left' | 'center' | 'right';
  /** Border width; 0 for none. */
  readonly strokeWidth: number;
  readonly fill: string | null;
}

/** A sticky note (`/Text`): an icon whose comment opens in the comments panel. */
export interface PdfNoteAnnotation extends PdfAnnotationBase {
  readonly type: 'note';
  /** `/Name`: Comment, Note, Key, Help, NewParagraph, Paragraph, Insert. */
  readonly icon: string;
}

/**
 * What a stamp shows: text in a frame (standard, dynamic and custom stamps,
 * "Sign here" arrows), or an image (base64 PNG or JPEG).
 */
export type PdfStampContent =
  | {
      readonly kind: 'text';
      readonly text: string;
      /** Second line (dynamic stamps: who and when). */
      readonly subtext?: string;
      readonly shape: 'rounded' | 'rect' | 'arrow';
    }
  | {
      readonly kind: 'image';
      /** Base64 file bytes. */
      readonly data: string;
      readonly mime: 'image/png' | 'image/jpeg';
      /** Pixel size. */
      readonly width: number;
      readonly height: number;
    }
  | {
      /** A drawn signature: vector strokes with pressure. */
      readonly kind: 'ink';
      /** Per stroke, flat `[x, y, pressure, …]` with x and y in 0–1 of the stamp's box (y down) and pressure in 0–1. */
      readonly strokes: readonly (readonly number[])[];
      /** The widest stroke, as a fraction of the box height. */
      readonly width: number;
      /** Width ÷ height of the box it was drawn in. */
      readonly aspect: number;
    };

/** A rubber stamp (`/Stamp`). `name` is its `/Name` (`Approved`, `Draft`, … or a custom name). */
export interface PdfStampAnnotation extends PdfAnnotationBase {
  readonly type: 'stamp';
  readonly name: string;
  readonly stamp: PdfStampContent;
  /** Merge it into the page content on save (it can't be moved or removed afterwards). */
  readonly flatten?: boolean;
}

/** Where a link goes: a web address or a page (0-based) of this document. */
export type PdfLinkTarget = { readonly kind: 'uri'; readonly uri: string } | { readonly kind: 'page'; readonly page: number };

/** A link area (`/Link`). `color` is its border colour, drawn when `strokeWidth` > 0. */
export interface PdfLinkAnnotation extends PdfAnnotationBase {
  readonly type: 'link';
  readonly target: PdfLinkTarget;
  readonly strokeWidth: number;
}

/** An annotation the viewer can display, edit and save. */
export type HkAnnotation =
  | PdfTextMarkupAnnotation
  | PdfShapeAnnotation
  | PdfLineAnnotation
  | PdfPolyAnnotation
  | PdfInkAnnotation
  | PdfFreeTextAnnotation
  | PdfNoteAnnotation
  | PdfStampAnnotation
  | PdfLinkAnnotation;

export type HkAnnotationType = HkAnnotation['type'];

/** Annotations without an `id` (generated when added). */
export type HkAnnotationInit = HkAnnotation extends infer A
  ? A extends HkAnnotation
    ? Omit<A, 'id'> & { readonly id?: string }
    : never
  : never;

export const TEXT_MARKUP_TYPES: readonly PdfTextMarkupType[] = ['highlight', 'underline', 'strikeout', 'squiggly'];

export function isTextMarkup(a: HkAnnotation): a is PdfTextMarkupAnnotation {
  return (TEXT_MARKUP_TYPES as readonly string[]).includes(a.type);
}

/** A fresh annotation id (`/NM`). */
export function newAnnotationId(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return 'hk-' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
