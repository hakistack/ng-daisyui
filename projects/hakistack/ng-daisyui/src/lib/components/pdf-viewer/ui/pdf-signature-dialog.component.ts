import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { LucideTrash2 } from '@lucide/angular';
import type { PdfStampContent } from '../core/annotations/annotation.types';
import { bytesToBase64, strokeOutlineSegs, svgPath } from '../core/annotations/shapes';
import { cleanSignatureImage, normalizeInk } from '../core/signatures/capture';
import { HK_THEME } from '../../../theme/theme.config';
import { PdfSignaturesService } from '../services/pdf-signatures.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { SavedPdfSignature } from '../services/pdf-signature-store';

type Tab = 'draw' | 'type' | 'upload';

/** Handwriting-style families for typed signatures (the first one installed wins); `signatureFonts` adds more. */
const DEFAULT_SIGNATURE_FONTS = [
  "'Segoe Script', 'Snell Roundhand', 'Brush Script MT', cursive",
  "'Lucida Handwriting', 'Apple Chancery', cursive",
  "'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive",
];
const INKS = ['#111827', '#1d4ed8'] as const;
/** Pen width on the pad, in CSS px. */
const PEN_PX = 3;
let nextId = 0;

/**
 * The signature dialog: draw (pressure-sensitive pad), type (rendered in a
 * handwriting font) or upload (background removed, cropped) a signature
 * or initials, or reuse a saved one. A drawn signature stays vector ink; a
 * typed or uploaded one becomes a transparent PNG.
 */
@Component({
  selector: 'hk-pdf-signature-dialog',
  imports: [LucideTrash2],
  templateUrl: './pdf-signature-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfSignatureDialogComponent {
  protected readonly store = inject(PdfViewerStore);
  /** daisyUI 4 and 5 spell the bordered tabs differently. */
  protected readonly tabsClass = `tabs ${inject(HK_THEME).classes.tabsBorder}`;
  protected readonly signatures = inject(PdfSignaturesService);

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly pad = viewChild<ElementRef<HTMLCanvasElement>>('pad');

  protected readonly uid = `hk-pdf-sig-${++nextId}`;
  protected readonly inks = INKS;
  protected readonly kind = signal<'signature' | 'initials'>('signature');
  protected readonly tab = signal<Tab>('draw');
  protected readonly ink = signal<string>(INKS[0]);
  protected readonly typed = signal('');
  protected readonly fontIndex = signal(0);
  protected readonly removeBackground = signal(true);
  protected readonly upload = signal<{ readonly stamp: PdfStampContent; readonly url: string } | null>(null);
  protected readonly keep = signal(true);
  protected readonly flatten = signal(false);
  protected readonly strokeCount = signal(0);

  protected readonly fonts = computed(() => [...(this.store.config().signatureFonts ?? []), ...DEFAULT_SIGNATURE_FONTS]);
  protected readonly savedOfKind = computed(() => this.signatures.saved().filter((s) => s.kind === this.kind()));
  protected readonly ready = computed(() =>
    this.tab() === 'draw' ? this.strokeCount() > 0 : this.tab() === 'type' ? this.typed().trim().length > 0 : !!this.upload(),
  );

  /** Strokes on the pad, in CSS px: flat `[x, y, pressure, …]`. */
  private strokes: number[][] = [];
  private drawing: number[] | null = null;

  constructor() {
    effect(() => {
      const open = this.signatures.dialog();
      const el = this.dialog()?.nativeElement;
      if (!el) return;
      if (open && !el.open) {
        this.reset();
        el.showModal?.();
        queueMicrotask(() => this.redraw());
      } else if (!open && el.open) {
        el.close();
      }
    });
  }

  // ── Draw ────────────────────────────────────────────────────────────────

  protected onPadDown(ev: PointerEvent): void {
    if (ev.button !== 0) return;
    ev.preventDefault();
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
    this.drawing = [...this.padPoint(ev)];
    this.strokes.push(this.drawing);
    this.redraw();
  }

  protected onPadMove(ev: PointerEvent): void {
    if (!this.drawing) return;
    const [x, y, p] = this.padPoint(ev);
    const n = this.drawing.length;
    if (Math.hypot(x - this.drawing[n - 3], y - this.drawing[n - 2]) < 1) return;
    this.drawing.push(x, y, p);
    this.redraw();
  }

  protected onPadUp(): void {
    if (!this.drawing) return;
    this.drawing = null;
    this.strokeCount.set(this.strokes.length);
  }

  protected clear(): void {
    this.strokes = [];
    this.strokeCount.set(0);
    this.redraw();
  }

  /** Pointer → pad px, with the pen's pressure (mice report 0.5 while pressed). */
  private padPoint(ev: PointerEvent): [number, number, number] {
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const pressure = ev.pressure > 0 && ev.pointerType === 'pen' ? ev.pressure : 0.5;
    return [ev.clientX - rect.left, ev.clientY - rect.top, pressure];
  }

  /** Paint the strokes with the same outline the PDF gets. */
  protected redraw(): void {
    const canvas = this.pad()?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || typeof Path2D === 'undefined') return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
    if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = this.ink();
    for (const s of this.strokes) ctx.fill(new Path2D(svgPath(strokeOutlineSegs(s, PEN_PX * 2))));
  }

  // ── Type & upload ───────────────────────────────────────────────────────

  /** The typed name rendered in the chosen font to a cropped, transparent PNG. */
  private async typedStamp(): Promise<PdfStampContent | null> {
    const text = this.typed().trim();
    const family = this.fonts()[this.fontIndex()];
    const size = 96;
    const font = `${size}px ${family}`;
    await document.fonts?.load?.(font).catch(() => undefined);
    const measure = document.createElement('canvas').getContext('2d')!;
    measure.font = font;
    const width = Math.ceil(measure.measureText(text).width + size);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.ceil(size * 1.8);
    const ctx = canvas.getContext('2d')!;
    ctx.font = font;
    ctx.fillStyle = this.ink();
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, canvas.height / 2);
    return this.toPng(ctx.getImageData(0, 0, canvas.width, canvas.height), false);
  }

  protected async onUpload(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const k = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      this.uploaded = ctx.getImageData(0, 0, canvas.width, canvas.height);
      await this.refreshUpload();
    } catch (err) {
      this.store.reportOperationError({ code: 'unknown', message: this.store.labels().importFailed, recoverable: true, cause: err });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private uploaded: ImageData | null = null;

  protected async refreshUpload(): Promise<void> {
    if (!this.uploaded) return;
    const stamp = await this.toPng(this.uploaded, this.removeBackground());
    this.upload.set(stamp && stamp.kind === 'image' ? { stamp, url: `data:image/png;base64,${stamp.data}` } : null);
  }

  /** Clean (background, crop) and encode as a PNG stamp. */
  private async toPng(pixels: ImageData, removeBackground: boolean): Promise<PdfStampContent | null> {
    const cleaned = cleanSignatureImage(pixels, removeBackground);
    if (!cleaned) return null;
    const canvas = document.createElement('canvas');
    canvas.width = cleaned.width;
    canvas.height = cleaned.height;
    canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(cleaned.data), cleaned.width, cleaned.height), 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    return {
      kind: 'image',
      data: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
      mime: 'image/png',
      width: cleaned.width,
      height: cleaned.height,
    };
  }

  // ── Use ─────────────────────────────────────────────────────────────────

  protected async use(): Promise<void> {
    let stamp: PdfStampContent | null = null;
    if (this.tab() === 'draw') {
      const ink = normalizeInk(this.strokes, PEN_PX * 2);
      stamp = ink ? { kind: 'ink', ...ink } : null;
    } else if (this.tab() === 'type') {
      stamp = await this.typedStamp();
    } else {
      stamp = this.upload()?.stamp ?? null;
    }
    if (!stamp) return;
    await this.signatures.use(stamp, this.kind(), this.ink(), { keep: this.keep(), flatten: this.flatten() });
  }

  protected useSaved(saved: SavedPdfSignature): void {
    void this.signatures.use(saved.stamp, saved.kind, saved.color, { keep: false, flatten: this.flatten() });
  }

  /** SVG path of a saved ink signature, in a 0–100 × 0–100/aspect box (for its thumbnail). */
  protected inkPreview(stamp: PdfStampContent): { d: string; viewBox: string } | null {
    if (stamp.kind !== 'ink') return null;
    const w = 100;
    const h = 100 / stamp.aspect;
    const segs = stamp.strokes.flatMap((s) => {
      const abs: number[] = [];
      for (let i = 0; i + 1 < s.length; i += 3) abs.push(s[i] * w, s[i + 1] * h, s[i + 2]);
      return strokeOutlineSegs(abs, stamp.width * h);
    });
    return { d: svgPath(segs), viewBox: `0 0 ${w} ${h}` };
  }

  protected imageUrl(stamp: PdfStampContent): string | null {
    return stamp.kind === 'image' ? `data:${stamp.mime};base64,${stamp.data}` : null;
  }

  protected cancel(): void {
    this.signatures.close();
  }

  /** Escape / backdrop: the native dialog closed itself. */
  protected onNativeClose(): void {
    if (this.signatures.dialog()) this.signatures.close();
  }

  protected setTab(tab: Tab): void {
    this.tab.set(tab);
    if (tab === 'draw') queueMicrotask(() => this.redraw());
  }

  /** Arrow keys move between tabs (the tablist pattern). */
  protected onTabKey(ev: KeyboardEvent): void {
    const order: Tab[] = ['draw', 'type', 'upload'];
    const i = order.indexOf(this.tab());
    const next = ev.key === 'ArrowRight' ? order[(i + 1) % 3] : ev.key === 'ArrowLeft' ? order[(i + 2) % 3] : null;
    if (!next) return;
    ev.preventDefault();
    this.setTab(next);
    queueMicrotask(() => document.getElementById(`${this.uid}-tab-${next}`)?.focus());
  }

  protected str(ev: Event): string {
    return (ev.target as HTMLInputElement).value;
  }

  private reset(): void {
    this.strokes = [];
    this.strokeCount.set(0);
    this.typed.set('');
    this.upload.set(null);
    this.uploaded = null;
    this.kind.set(
      this.signatures.dialog()?.target?.field && /initial/i.test(this.signatures.dialog()!.target!.field!) ? 'initials' : 'signature',
    );
  }
}
