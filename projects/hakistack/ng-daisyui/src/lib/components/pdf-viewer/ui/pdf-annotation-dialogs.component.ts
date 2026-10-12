import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { PdfMeasureUnit, PdfStampAnnotation } from '../core/annotations/annotation.types';
import { DEFAULT_SCALE, MEASURE_UNITS, calibrate } from '../core/annotations/measure';
import { annotationOps, cssFontFamily, svgPath } from '../core/annotations/shapes';
import { isSafeLinkUri } from '../pdf-viewer.helpers';
import { PdfAnnotationDialogsService } from '../services/pdf-annotation-dialogs.service';
import { PdfAnnotationToolsService } from '../services/pdf-annotation-tools.service';
import { PdfAnnotationsService } from '../services/pdf-annotations.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { formatStampDate } from './pdf-stamps';

const STAMP_COLORS = ['#15803d', '#b91c1c', '#1d4ed8', '#7c3aed', '#ca8a04', '#111827'] as const;
let nextDialogId = 0;

/**
 * The annotation dialogs, as native modal `<dialog>`s (focus trap and Escape
 * from the browser) styled with daisyUI: where a link goes, the measurement
 * scale, and the custom stamp designer with a live preview.
 */
@Component({
  selector: 'hk-pdf-annotation-dialogs',
  templateUrl: './pdf-annotation-dialogs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfAnnotationDialogsComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly dialogs = inject(PdfAnnotationDialogsService);
  private readonly annotations = inject(PdfAnnotationsService);
  private readonly tools = inject(PdfAnnotationToolsService);

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly units = MEASURE_UNITS;
  protected readonly stampColors = STAMP_COLORS;
  /** Unique per viewer, for `aria-labelledby`. */
  protected readonly titleId = `hk-pdf-annot-dialog-${++nextDialogId}`;

  // Link dialog
  protected readonly linkKind = signal<'uri' | 'page'>('uri');
  protected readonly linkUri = signal('https://');
  protected readonly linkPage = signal('1');
  protected readonly linkError = signal(false);

  // Calibration
  protected readonly paper = signal(1);
  protected readonly paperUnit = signal<PdfMeasureUnit>('in');
  protected readonly real = signal(1);
  protected readonly realUnit = signal<PdfMeasureUnit>('in');
  protected readonly precision = signal(2);
  protected readonly depth = signal(1);

  // Stamp designer
  protected readonly stampText = signal('');
  protected readonly stampSub = signal<'none' | 'dynamic' | 'custom'>('none');
  protected readonly stampSubText = signal('');
  protected readonly stampShape = signal<'rounded' | 'rect' | 'arrow'>('rounded');
  protected readonly stampColor = signal<string>(STAMP_COLORS[2]);

  /** The designed stamp, previewed with the same display list the page uses. */
  protected readonly stampPreview = computed(() => {
    const text = this.stampText().trim() || '…';
    const sub = this.subtext();
    const a: PdfStampAnnotation = {
      id: 'preview',
      type: 'stamp',
      page: 0,
      rect: { x: 2, y: 2, w: 236, h: sub ? 56 : 44 },
      color: this.stampColor(),
      opacity: 1,
      name: 'Custom',
      stamp: { kind: 'text', text, subtext: sub, shape: this.stampShape() },
    };
    const ops = annotationOps(a);
    return {
      height: a.rect.h + 4,
      paths: ops.flatMap((op) =>
        op.kind === 'path'
          ? [
              {
                d: svgPath(op.segs),
                fill: op.fill ?? 'none',
                stroke: op.stroke?.color ?? 'none',
                width: op.stroke?.width ?? 0,
                opacity: op.opacity,
              },
            ]
          : [],
      ),
      texts: ops.flatMap((op) =>
        op.kind === 'text'
          ? op.lines.map((l) => ({
              ...l,
              family: cssFontFamily(op.font),
              weight: op.font === 'Helvetica-Bold' ? '700' : '400',
              size: op.fontSize,
              color: op.color,
            }))
          : [],
      ),
    };
  });

  constructor() {
    // Open the native dialog when a request arrives (and prime its fields).
    effect(() => {
      const request = this.dialogs.open();
      const el = this.dialog()?.nativeElement;
      if (!request || !el) return;
      if (request.kind === 'link') {
        const t = request.initial;
        this.linkKind.set(t?.kind ?? 'uri');
        this.linkUri.set(t?.kind === 'uri' ? t.uri : 'https://');
        this.linkPage.set(String(t?.kind === 'page' ? t.page + 1 : (this.store.state()?.page ?? 1)));
        this.linkError.set(false);
      } else if (request.kind === 'calibrate') {
        this.depth.set(this.annotations.depth());
        this.precision.set(this.annotations.scale().precision ?? 2);
      }
      if (!el.open) el.showModal?.();
    });
  }

  // ── Link ────────────────────────────────────────────────────────────────

  protected applyLink(): void {
    if (this.linkKind() === 'uri') {
      const uri = this.linkUri().trim();
      if (!isSafeLinkUri(uri)) {
        this.linkError.set(true);
        return;
      }
      this.finish(() => this.dialogs.close({ kind: 'uri', uri }));
      return;
    }
    const page = this.store.pageFromInput(this.linkPage());
    const total = this.store.state()?.numPages ?? 0;
    if (page === null || page < 1 || page > total) {
      this.linkError.set(true);
      return;
    }
    this.finish(() => this.dialogs.close({ kind: 'page', page: page - 1 }));
  }

  // ── Calibration ─────────────────────────────────────────────────────────

  protected applyCalibration(): void {
    this.annotations.scale.set(
      this.paper() > 0 && this.real() > 0
        ? calibrate(this.paper(), this.paperUnit(), this.real(), this.realUnit(), this.precision())
        : { ...DEFAULT_SCALE, precision: this.precision() },
    );
    if (this.depth() > 0) this.annotations.depth.set(this.depth());
    this.finish(() => this.dialogs.close());
  }

  protected currentScale(): string {
    return this.store.labels().currentScale.replace('{scale}', this.annotations.scale().label);
  }

  // ── Stamp designer ──────────────────────────────────────────────────────

  private subtext(): string | undefined {
    if (this.stampSub() === 'dynamic') {
      return this.store
        .labels()
        .dynamicStampSubtext.replace('{author}', this.annotations.author())
        .replace('{date}', formatStampDate(new Date()));
    }
    return this.stampSub() === 'custom' ? this.stampSubText().trim() || undefined : undefined;
  }

  protected applyStamp(): void {
    const text = this.stampText().trim();
    if (!text) return;
    this.annotations.pendingStamp.set({
      name: 'Custom',
      color: this.stampColor(),
      stamp: { kind: 'text', text, subtext: this.subtext(), shape: this.stampShape() },
    });
    this.finish(() => {
      this.dialogs.close();
      this.tools.setTool('stamp');
    });
  }

  // ── Shared ──────────────────────────────────────────────────────────────

  protected cancel(): void {
    this.finish(() => this.dialogs.close());
  }

  /** Native close (Escape): resolve as cancelled. */
  protected onNativeClose(): void {
    if (this.dialogs.open()) this.dialogs.close();
  }

  protected num(ev: Event): number {
    return Number((ev.target as HTMLInputElement).value);
  }

  protected str(ev: Event): string {
    return (ev.target as HTMLInputElement | HTMLSelectElement).value;
  }

  private finish(then: () => void): void {
    const el = this.dialog()?.nativeElement;
    then();
    if (el?.open) el.close();
  }
}
