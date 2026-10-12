import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  LucideAlignCenter,
  LucideAlignLeft,
  LucideAlignRight,
  LucideArrowDown,
  LucideArrowDownToLine,
  LucideArrowUp,
  LucideArrowUpToLine,
  LucideCopy,
  LucideLock,
  LucideLockOpen,
  LucideMessageSquareText,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { HkAnnotation, HkAnnotationType, PdfLineEnding } from '../core/annotations/annotation.types';
import { measureLabel, measurementOf } from '../core/annotations/measure';
import { isSafeLinkUri } from '../pdf-viewer.helpers';
import { AnnotationArrange } from '../services/pdf-annotations.service';
import type { StandardFont } from '../core/pdf-writer/standard-fonts';
import { PdfAnnotationTool } from '../pdf-viewer.types';
import { AnnotationToolStyle, PdfAnnotationsService } from '../services/pdf-annotations.service';
import { PdfAnnotationToolsService } from '../services/pdf-annotation-tools.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { LINE_ENDINGS, annotationTypeLabel } from './pdf-annotation-labels';

/** A style field the panel edits (the names of {@link AnnotationToolStyle}). */
type Field = keyof AnnotationToolStyle;

/** Swatches offered for colours (the colour input covers the rest). */
const SWATCHES = ['#ffeb3b', '#fb923c', '#dc2626', '#db2777', '#9333ea', '#2563eb', '#16a34a', '#111827'] as const;
const FONTS: readonly StandardFont[] = ['Helvetica', 'Helvetica-Bold', 'Times-Roman', 'Courier'];
const NOTE_ICONS = ['Comment', 'Note', 'Key', 'Help', 'NewParagraph', 'Paragraph', 'Insert'] as const;

/** The annotation type a tool creates. */
const TOOL_TYPE: Record<Exclude<PdfAnnotationTool, 'none' | 'eraser'>, HkAnnotationType> = {
  highlight: 'highlight',
  underline: 'underline',
  strikeout: 'strikeout',
  squiggly: 'squiggly',
  rect: 'rect',
  ellipse: 'ellipse',
  line: 'line',
  arrow: 'line',
  polygon: 'polygon',
  polyline: 'polyline',
  cloud: 'polygon',
  ink: 'ink',
  freetext: 'freetext',
  note: 'note',
  stamp: 'stamp',
  link: 'link',
  distance: 'line',
  perimeter: 'polyline',
  area: 'polygon',
  volume: 'polygon',
  radius: 'ellipse',
};

/** Which fields apply to which annotation type. */
const FIELDS: Record<HkAnnotationType, readonly Field[]> = {
  highlight: ['color', 'opacity'],
  underline: ['color', 'opacity'],
  strikeout: ['color', 'opacity'],
  squiggly: ['color', 'opacity'],
  rect: ['color', 'fill', 'opacity', 'strokeWidth', 'dashed', 'cloudy'],
  ellipse: ['color', 'fill', 'opacity', 'strokeWidth', 'dashed', 'cloudy'],
  polygon: ['color', 'fill', 'opacity', 'strokeWidth', 'dashed', 'cloudy'],
  line: ['color', 'fill', 'opacity', 'strokeWidth', 'dashed', 'startEnding', 'endEnding'],
  polyline: ['color', 'fill', 'opacity', 'strokeWidth', 'dashed', 'startEnding', 'endEnding'],
  ink: ['color', 'opacity', 'strokeWidth'],
  freetext: ['fontColor', 'font', 'fontSize', 'align', 'fill', 'color', 'strokeWidth', 'opacity'],
  note: ['color', 'icon', 'opacity'],
  stamp: ['opacity'],
  link: ['color', 'strokeWidth'],
};

/**
 * The floating properties panel: edits the selected annotation, or, while a
 * tool is active, the style new annotations of that tool get. Style edits to
 * an annotation are undoable; a slider drag is one undo step.
 */
@Component({
  selector: 'hk-pdf-annotation-panel',
  imports: [
    NgTemplateOutlet,
    LucideCopy,
    LucideArrowUpToLine,
    LucideArrowUp,
    LucideArrowDown,
    LucideArrowDownToLine,
    LucideX,
    LucideTrash2,
    LucideLock,
    LucideLockOpen,
    LucideMessageSquareText,
    LucideAlignLeft,
    LucideAlignCenter,
    LucideAlignRight,
  ],
  templateUrl: './pdf-annotation-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfAnnotationPanelComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly annotations = inject(PdfAnnotationsService);
  private readonly tools = inject(PdfAnnotationToolsService);

  protected readonly swatches = SWATCHES;
  protected readonly fonts = FONTS;
  protected readonly noteIcons = NOTE_ICONS;
  protected readonly endings = LINE_ENDINGS;

  /** What the panel edits: the selection, else the active tool's style. */
  protected readonly target = computed(() => {
    const a = this.annotations.selected();
    if (a && !this.annotations.textEdit()) return { annotation: a, tool: null, type: a.type, style: styleOf(a) };
    const tool = this.store.annotationTool();
    if (tool === 'none' || tool === 'eraser') return null;
    return { annotation: null, tool, type: TOOL_TYPE[tool], style: this.annotations.toolStyle(tool) };
  });

  protected readonly title = computed(() => {
    const t = this.target();
    if (!t) return '';
    const labels = this.store.labels();
    return t.annotation
      ? annotationTypeLabel(t.annotation, labels)
      : annotationTypeLabel({ type: t.type, endEnding: t.style.endEnding, cloudy: t.style.cloudy }, labels);
  });

  protected readonly locked = computed(() => {
    const a = this.target()?.annotation;
    return !!a && !this.annotations.canEdit(a);
  });
  /** Whether the lock can be toggled (the user may modify it). */
  protected readonly canLock = computed(() => {
    const a = this.target()?.annotation;
    return !!a && this.annotations.canModify(a);
  });

  /** A measurement's value and scale, for the read-out. */
  protected readonly measurement = computed(() => {
    const a = this.target()?.annotation;
    const m = a ? measurementOf(a) : null;
    return a && m ? { value: measureLabel(a) ?? '', scale: m.scale.label, kind: m.kind, depth: m.depth ?? 1 } : null;
  });

  /** The selected link's target, for its editor. */
  protected readonly link = computed(() => {
    const a = this.target()?.annotation;
    return a?.type === 'link' ? a.target : null;
  });
  protected readonly linkError = signal(false);

  protected readonly arrangeActions: readonly {
    where: AnnotationArrange;
    label: 'bringToFront' | 'bringForward' | 'sendBackward' | 'sendToBack';
  }[] = [
    { where: 'front', label: 'bringToFront' },
    { where: 'forward', label: 'bringForward' },
    { where: 'backward', label: 'sendBackward' },
    { where: 'back', label: 'sendToBack' },
  ];

  protected arrange(where: AnnotationArrange): void {
    const a = this.target()?.annotation;
    if (a) void this.annotations.arrange(a.id, where);
  }

  protected duplicate(): void {
    const a = this.target()?.annotation;
    if (a) void this.annotations.duplicate(a.id);
  }

  protected setDepth(ev: Event): void {
    const a = this.target()?.annotation;
    const depth = Number((ev.target as HTMLInputElement).value);
    if (!a || !(depth > 0)) return;
    void this.annotations.update(
      a.id,
      (cur) => ('measure' in cur && cur.measure ? ({ ...cur, measure: { ...cur.measure, depth } } as HkAnnotation) : cur),
      { label: 'Change depth', mergeKey: 'measure:depth' },
    );
  }

  /** Link target edits: a web address (validated) or a page number. */
  protected setLinkKind(kind: 'uri' | 'page'): void {
    const a = this.target()?.annotation;
    if (a?.type !== 'link' || a.target.kind === kind) return;
    this.linkError.set(false);
    const target =
      kind === 'page' ? ({ kind, page: Math.max(0, (this.store.state()?.page ?? 1) - 1) } as const) : ({ kind, uri: 'https://' } as const);
    void this.annotations.update(a.id, { target }, { label: 'Edit link' });
  }

  protected setLinkUri(value: string): void {
    const a = this.target()?.annotation;
    const uri = value.trim();
    if (a?.type !== 'link') return;
    if (!isSafeLinkUri(uri)) {
      this.linkError.set(true);
      return;
    }
    this.linkError.set(false);
    void this.annotations.update(a.id, { target: { kind: 'uri', uri } }, { label: 'Edit link' });
  }

  protected setLinkPage(value: string): void {
    const a = this.target()?.annotation;
    const page = this.store.pageFromInput(value);
    const total = this.store.state()?.numPages ?? 0;
    if (a?.type !== 'link' || page === null || page < 1 || page > total) return;
    void this.annotations.update(a.id, { target: { kind: 'page', page: page - 1 } }, { label: 'Edit link' });
  }

  protected has(field: Field): boolean {
    const t = this.target();
    return !!t && FIELDS[t.type].includes(field);
  }

  /** Set a style field on the selection (undoable, merged per field) or on the tool. */
  protected set<F extends Field>(field: F, value: AnnotationToolStyle[F]): void {
    const t = this.target();
    if (!t) return;
    if (t.tool) {
      this.annotations.setToolStyle(t.tool, { [field]: value });
      return;
    }
    const a = t.annotation!;
    void this.annotations.update(a.id, (cur) => applyStyle(cur, field, value), { label: 'Change style', mergeKey: `style:${field}` });
  }

  protected setNumber(field: 'opacity' | 'strokeWidth' | 'fontSize', ev: Event, scale = 1): void {
    const n = Number((ev.target as HTMLInputElement).value);
    if (Number.isFinite(n)) this.set(field, n / scale);
  }

  protected setText<F extends 'font' | 'icon' | 'startEnding' | 'endEnding'>(field: F, ev: Event): void {
    this.set(field, (ev.target as HTMLSelectElement).value as AnnotationToolStyle[F]);
  }

  protected setColorInput(field: 'color' | 'fill' | 'fontColor', ev: Event): void {
    this.set(field, (ev.target as HTMLInputElement).value);
  }

  protected toggleLock(): void {
    const a = this.target()?.annotation;
    if (a) void this.annotations.update(a.id, { locked: !a.locked || undefined }, { label: a.locked ? 'Unlock' : 'Lock' });
  }

  protected remove(): void {
    const a = this.target()?.annotation;
    if (a) void this.annotations.remove(a.id);
  }

  protected openComments(): void {
    const a = this.target()?.annotation;
    if (a) this.annotations.openComments(a.id);
  }

  protected close(): void {
    if (this.target()?.annotation) this.annotations.select(null);
    else this.tools.setTool('none');
  }

  protected swatchLabel(color: string): string {
    return `${this.store.labels().color} ${color}`;
  }
}

/** The style fields of an annotation, for the panel's controls. */
function styleOf(a: HkAnnotation): AnnotationToolStyle {
  return {
    color: a.color,
    opacity: a.opacity,
    strokeWidth: 'strokeWidth' in a ? a.strokeWidth : 0,
    fill: 'fill' in a ? a.fill : null,
    dashed: 'dash' in a && !!a.dash?.length,
    cloudy: 'cloudy' in a && !!a.cloudy,
    startEnding: ('startEnding' in a && a.startEnding) || 'None',
    endEnding: ('endEnding' in a && a.endEnding) || 'None',
    font: a.type === 'freetext' ? a.font : 'Helvetica',
    fontSize: a.type === 'freetext' ? a.fontSize : 12,
    fontColor: a.type === 'freetext' ? a.fontColor : '#000000',
    align: a.type === 'freetext' ? a.align : 'left',
    icon: a.type === 'note' ? a.icon : 'Comment',
  };
}

/** Apply one style field to an annotation (fields it doesn't have are ignored). */
function applyStyle<F extends Field>(a: HkAnnotation, field: F, value: AnnotationToolStyle[F]): HkAnnotation {
  switch (field) {
    case 'dashed':
      return 'strokeWidth' in a ? ({ ...a, dash: value ? [4, 3] : undefined } as HkAnnotation) : a;
    case 'cloudy':
      return a.type === 'rect' || a.type === 'ellipse' || a.type === 'polygon' ? { ...a, cloudy: (value as boolean) || undefined } : a;
    case 'startEnding':
    case 'endEnding':
      return a.type === 'line' || a.type === 'polyline' ? ({ ...a, [field]: value as PdfLineEnding } as HkAnnotation) : a;
    case 'color':
    case 'opacity':
      return { ...a, [field]: value } as HkAnnotation;
    default:
      return field in a ? ({ ...a, [field]: value } as HkAnnotation) : a;
  }
}
