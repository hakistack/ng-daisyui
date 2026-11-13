import { DrawOp, FREE_TEXT_PADDING, PathSeg, ellipseSegs, rectSegs } from '../annotations/shapes';
import { textWidth, wrapText } from '../pdf-writer/standard-fonts';
import { formatValue } from './af';
import { FormField, FormTextStyle, FormValue, FormWidget } from './form-model';

/** Auto-sized text (`/DA` size 0) never exceeds this, in points. */
const AUTO_MAX_SIZE = 12;
const AUTO_MIN_SIZE = 4;

/** The font size a widget's text is drawn at (auto-size fits single lines to the box). */
export function widgetFontSize(field: FormField, widget: FormWidget, text: string): number {
  const style = widget.appearance;
  if (style.fontSize > 0) return style.fontSize;
  if (field.multiline || field.kind === 'list') return AUTO_MAX_SIZE;
  const inner = innerBox(widget);
  const byHeight = inner.h * 0.78;
  const at1 = textWidth(text || 'M', style.font, 1);
  const byWidth = at1 > 0 && !field.comb ? inner.w / at1 : byHeight;
  return Math.max(AUTO_MIN_SIZE, Math.min(AUTO_MAX_SIZE, byHeight, byWidth));
}

/** What a field shows for a value: formatted text, masked passwords, option labels. */
export function displayText(field: FormField, value: FormValue): string {
  if (Array.isArray(value)) return value.join(', ');
  const v = value as string;
  if (field.password) return '*'.repeat(v.length);
  if (field.kind === 'combo') return field.options.find((o) => o.value === v)?.label ?? formatValue(field.format, v).text;
  return formatValue(field.format, v).text;
}

/**
 * The display list of a widget showing `value`: background and border from
 * `/MK`, then the content: text (single line, multiline, comb), the list's
 * visible options with the selection, or a check mark / radio dot when on.
 */
export function widgetOps(field: FormField, widget: FormWidget, value: FormValue): DrawOp[] {
  const r = widget.rect;
  const ops: DrawOp[] = [];
  const round = field.kind === 'radio';
  const frame = round ? ellipseSegs(inset(r, widget.borderWidth / 2)) : rectSegs(inset(r, widget.borderWidth / 2));
  if (widget.background) ops.push({ kind: 'path', segs: frame, fill: widget.background, opacity: 1 });
  if (widget.borderColor && widget.borderWidth > 0) {
    ops.push({
      kind: 'path',
      segs: frame,
      stroke: { color: widget.borderColor, width: widget.borderWidth, cap: 'butt', join: 'miter' },
      opacity: 1,
    });
  }
  const style = widget.appearance;

  if (field.kind === 'checkbox' || field.kind === 'radio') {
    if (value !== widget.onState) return ops;
    const box = inset(r, widget.borderWidth + Math.min(r.w, r.h) * 0.18);
    if (round || widget.caption === 'l') {
      const d = Math.min(box.w, box.h);
      ops.push({
        kind: 'path',
        segs: ellipseSegs({ x: box.x + (box.w - d) / 2, y: box.y + (box.h - d) / 2, w: d, h: d }),
        fill: style.color,
        opacity: 1,
      });
    } else {
      ops.push({
        kind: 'path',
        segs: markSegs(box, widget.caption),
        stroke: { color: style.color, width: Math.max(1, box.h * 0.14), cap: 'round', join: 'round' },
        opacity: 1,
      });
    }
    return ops;
  }

  const inner = innerBox(widget);
  if (field.kind === 'list') {
    const size = widgetFontSize(field, widget, '');
    const lineH = size * 1.15;
    const selected = new Set(Array.isArray(value) ? value : [value]);
    field.options.forEach((o, i) => {
      const y = inner.y + i * lineH;
      if (y > inner.y + inner.h) return;
      const on = selected.has(o.value);
      if (on) ops.push({ kind: 'path', segs: rectSegs({ x: inner.x - 1, y, w: inner.w + 2, h: lineH }), fill: '#99c1f1', opacity: 1 });
      ops.push(textOp([{ text: o.label, x: inner.x, y: y + size * 0.85 }], style, size, inner));
    });
    return ops;
  }

  const text = displayText(field, value);
  if (!text) return ops;
  const size = widgetFontSize(field, widget, text);
  if (field.comb && field.maxLength) {
    const cell = inner.w / field.maxLength;
    const baseline = inner.y + (inner.h + size * 0.7) / 2;
    const lines = [...text]
      .slice(0, field.maxLength)
      .map((ch, i) => ({ text: ch, x: inner.x + i * cell + (cell - textWidth(ch, style.font, size)) / 2, y: baseline }));
    ops.push(textOp(lines, style, size, r));
    return ops;
  }
  if (field.multiline) {
    const lineH = size * 1.15;
    const lines = wrapText(text, style.font, size, inner.w).map((t, i) => ({
      text: t,
      x: alignX(t, style, size, inner),
      y: inner.y + size * 0.85 + i * lineH,
    }));
    ops.push(textOp(lines, style, size, r));
    return ops;
  }
  const baseline = inner.y + (inner.h + size * 0.7) / 2;
  ops.push(textOp([{ text, x: alignX(text, style, size, inner), y: baseline }], style, size, r));
  return ops;
}

function textOp(
  lines: { text: string; x: number; y: number }[],
  style: FormTextStyle,
  size: number,
  clip: { x: number; y: number; w: number; h: number },
): DrawOp {
  return { kind: 'text', lines, font: style.font, fontSize: size, color: style.color, opacity: 1, clip };
}

function alignX(text: string, style: FormTextStyle, size: number, inner: { x: number; w: number }): number {
  const w = textWidth(text, style.font, size);
  return style.align === 'center' ? inner.x + (inner.w - w) / 2 : style.align === 'right' ? inner.x + inner.w - w : inner.x;
}

/** The box text goes in: inside the border, with Acrobat's padding. */
export function innerBox(widget: FormWidget): { x: number; y: number; w: number; h: number } {
  const pad = widget.borderWidth + FREE_TEXT_PADDING;
  const r = widget.rect;
  return { x: r.x + pad, y: r.y + pad, w: Math.max(1, r.w - 2 * pad), h: Math.max(1, r.h - 2 * pad) };
}

function inset(r: { x: number; y: number; w: number; h: number }, by: number) {
  return { x: r.x + by, y: r.y + by, w: Math.max(0, r.w - 2 * by), h: Math.max(0, r.h - 2 * by) };
}

/** A check mark, or a cross for the ZapfDingbats cross captions. */
function markSegs(b: { x: number; y: number; w: number; h: number }, caption: string | undefined): PathSeg[] {
  if (caption === '8' || caption === 'u') {
    return [
      ['M', b.x, b.y],
      ['L', b.x + b.w, b.y + b.h],
      ['M', b.x + b.w, b.y],
      ['L', b.x, b.y + b.h],
    ];
  }
  return [
    ['M', b.x, b.y + b.h * 0.55],
    ['L', b.x + b.w * 0.38, b.y + b.h * 0.9],
    ['L', b.x + b.w, b.y + b.h * 0.1],
  ];
}
