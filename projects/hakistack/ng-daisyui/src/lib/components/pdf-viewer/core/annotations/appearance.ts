import { ContentBuilder } from '../pdf-writer/content';
import { PdfDict, PdfName, PdfRef, PdfStream, PdfValue } from '../pdf-writer/objects';
import type { StandardFont } from '../pdf-writer/standard-fonts';
import type { HkAnnotation, PdfRect } from './annotation.types';
import { imageXObject } from './images';
import { PageSpace } from './page-space';
import { DrawOp, PathSeg, annotationOps, base64ToBytes, hexToRgb, outerBounds } from './shapes';

/** Acrobat's default-resource names for the standard fonts (also used in `/DA`). */
export const FONT_RESOURCE: Record<StandardFont, string> = {
  Helvetica: 'Helv',
  'Helvetica-Bold': 'HeBo',
  'Times-Roman': 'TiRo',
  Courier: 'Cour',
};

/**
 * The normal appearance (`/AP /N`) of an annotation: a form XObject whose
 * `/BBox` is the annotation's `/Rect` in user space, drawn from the same
 * display list as the screen. Drawing happens in "display-up" coordinates
 * (the displayed page with y flipped up) under a `cm` that maps them to user
 * space, so the appearance is upright on rotated pages too.
 */
export function buildAppearance(
  a: HkAnnotation,
  space: PageSpace,
  addObject: (value: PdfValue) => PdfRef,
  images: Map<string, PdfRef> = new Map(),
): Promise<PdfStream> {
  return appearanceStream(annotationOps(a), outerBounds(a), space, addObject, images);
}

/** A form XObject drawing `ops` (displayed-page points) with `box` as its `/BBox`, for any annotation or widget. */
export async function appearanceStream(
  ops: readonly DrawOp[],
  box: PdfRect,
  space: PageSpace,
  addObject: (value: PdfValue) => PdfRef,
  images: Map<string, PdfRef> = new Map(),
): Promise<PdfStream> {
  const bbox = space.rectToUser(box);
  const content = new ContentBuilder();
  const states = new Map<string, { name: string; dict: PdfDict }>();
  const fonts = new Map<string, StandardFont>();
  const xobjects = new Map<string, PdfRef>();
  const [ma, mb, mc, md, me, mf] = space.matrix;
  const up = (y: number) => space.height - y;

  content.save().transform(ma, mb, mc, md, me, mf);
  for (const op of ops) {
    content.save();
    const gs = graphicsState(op, states);
    if (gs) content.extGState(gs);
    if (op.kind === 'image') {
      // Images are shared within a save (the same stamp placed twice is stored once).
      let ref = images.get(op.data);
      if (!ref) {
        const { image, smask } = await imageXObject(base64ToBytes(op.data), op.mime);
        if (smask) image.dict.set('SMask', addObject(smask));
        ref = addObject(image);
        images.set(op.data, ref);
      }
      const resource = `Im${xobjects.size}`;
      xobjects.set(resource, ref);
      const r = op.rect;
      content.transform(r.w, 0, 0, r.h, r.x, up(r.y + r.h)).raw(`/${resource} Do`);
    } else if (op.kind === 'text') {
      const resource = FONT_RESOURCE[op.font];
      fonts.set(resource, op.font);
      content
        .rect(op.clip.x, up(op.clip.y + op.clip.h), op.clip.w, op.clip.h)
        .clip()
        .endPath();
      content.beginText().font(resource, op.fontSize).fillColor(hexToRgb(op.color));
      for (const line of op.lines) {
        content.raw(`1 0 0 1 ${fmt(line.x)} ${fmt(up(line.y))} Tm`).showText(line.text);
      }
      content.endText();
    } else {
      appendPath(content, op.segs, up);
      if (op.stroke) {
        content.strokeColor(hexToRgb(op.stroke.color)).lineWidth(op.stroke.width);
        content.lineCap(op.stroke.cap === 'round' ? 1 : op.stroke.cap === 'square' ? 2 : 0);
        content.lineJoin(op.stroke.join === 'round' ? 1 : op.stroke.join === 'bevel' ? 2 : 0);
        if (op.stroke.dash) content.dash(op.stroke.dash);
      }
      if (op.fill) content.fillColor(hexToRgb(op.fill));
      if (op.fill && op.stroke) content.fillAndStroke();
      else if (op.fill) content.fill();
      else if (op.stroke) content.stroke();
      else content.endPath();
    }
    content.restore();
  }
  content.restore();

  const resources = new PdfDict();
  if (states.size) resources.set('ExtGState', new PdfDict([...states.values()].map((st): [string, PdfDict] => [st.name, st.dict])));
  if (xobjects.size) resources.set('XObject', new PdfDict([...xobjects]));
  if (fonts.size) {
    const fontDict = new PdfDict();
    for (const [resource, font] of fonts) fontDict.set(resource, standardFontDict(font));
    resources.set('Font', fontDict);
  }
  const dict = new PdfDict({
    Type: PdfName.of('XObject'),
    Subtype: PdfName.of('Form'),
    BBox: bbox,
    Resources: resources,
  });
  return new PdfStream(dict, content.toBytes());
}

/** An empty appearance, for thread annotations (replies, review states) that must not paint. */
export function emptyAppearance(): PdfStream {
  return new PdfStream(new PdfDict({ Type: PdfName.of('XObject'), Subtype: PdfName.of('Form'), BBox: [0, 0, 1, 1] }), new Uint8Array());
}

/** A standard Type 1 font dictionary with WinAnsiEncoding. */
export function standardFontDict(font: StandardFont): PdfDict {
  return new PdfDict({
    Type: PdfName.of('Font'),
    Subtype: PdfName.of('Type1'),
    BaseFont: PdfName.of(font),
    Encoding: PdfName.of('WinAnsiEncoding'),
  });
}

/** The ExtGState resource name for an op's opacity / blend mode, created on first use (keyed by both). */
function graphicsState(op: DrawOp, states: Map<string, { name: string; dict: PdfDict }>): string | null {
  const blend = op.kind === 'path' ? op.blend : undefined;
  if (op.opacity >= 1 && !blend) return null;
  const key = `${fmt(op.opacity)}|${blend ?? ''}`;
  let state = states.get(key);
  if (!state) {
    const dict = new PdfDict({ Type: PdfName.of('ExtGState'), CA: op.opacity, ca: op.opacity });
    if (blend) dict.set('BM', PdfName.of('Multiply'));
    state = { name: `GS${states.size}`, dict };
    states.set(key, state);
  }
  return state.name;
}

function appendPath(content: ContentBuilder, segs: readonly PathSeg[], up: (y: number) => number): void {
  for (const s of segs) {
    if (s[0] === 'M') content.moveTo(s[1], up(s[2]));
    else if (s[0] === 'L') content.lineTo(s[1], up(s[2]));
    else if (s[0] === 'C') content.curveTo(s[1], up(s[2]), s[3], up(s[4]), s[5], up(s[6]));
    else content.closePath();
  }
}

function fmt(n: number): string {
  return String(Math.round(n * 10000) / 10000);
}
