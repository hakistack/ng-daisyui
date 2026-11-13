import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  LucideCircle,
  LucideCloud,
  LucideEraser,
  LucideHighlighter,
  LucideMousePointer2,
  LucideMoveUpRight,
  LucidePenLine,
  LucidePentagon,
  LucideRedo2,
  LucideSlash,
  LucideSpline,
  LucideSquare,
  LucideStickyNote,
  LucideStrikethrough,
  LucideType,
  LucideUnderline,
  LucideUndo2,
  LucideWaves,
  LucideX,
  LucideStamp,
  LucideLink,
  LucideRuler,
  LucideFileUp,
  LucideFileDown,
  LucideImageUp,
} from '@lucide/angular';
import { ResolvedPdfViewerLabels } from '../pdf-viewer.labels';
import { PdfAnnotationTool } from '../pdf-viewer.types';
import { PdfAnnotationDialogsService } from '../services/pdf-annotation-dialogs.service';
import { PdfAnnotationToolsService } from '../services/pdf-annotation-tools.service';
import { PdfDocumentService } from '../services/pdf-document.service';
import { DYNAMIC_STAMPS, SIGN_HERE_STAMPS, STANDARD_STAMPS, StampPreset, imageStampFromFile, presetStamp } from './pdf-stamps';
import { PdfAnnotationsService } from '../services/pdf-annotations.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PDF_CHROME } from './pdf-chrome';

type ToolIcon =
  | 'select'
  | 'highlight'
  | 'underline'
  | 'strikeout'
  | 'squiggly'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'polygon'
  | 'polyline'
  | 'cloud'
  | 'ink'
  | 'eraser'
  | 'freetext'
  | 'note';

interface ToolButton {
  readonly tool: PdfAnnotationTool;
  readonly icon: ToolIcon;
  readonly label: keyof ResolvedPdfViewerLabels;
}

/** Tool groups, separated by dividers. */
const GROUPS: readonly (readonly ToolButton[])[] = [
  [{ tool: 'none', icon: 'select', label: 'selectTool' }],
  [
    { tool: 'highlight', icon: 'highlight', label: 'highlight' },
    { tool: 'underline', icon: 'underline', label: 'underline' },
    { tool: 'strikeout', icon: 'strikeout', label: 'strikeout' },
    { tool: 'squiggly', icon: 'squiggly', label: 'squiggly' },
  ],
  [
    { tool: 'rect', icon: 'rect', label: 'rectangle' },
    { tool: 'ellipse', icon: 'ellipse', label: 'ellipse' },
    { tool: 'line', icon: 'line', label: 'line' },
    { tool: 'arrow', icon: 'arrow', label: 'arrow' },
    { tool: 'polygon', icon: 'polygon', label: 'polygon' },
    { tool: 'polyline', icon: 'polyline', label: 'polyline' },
    { tool: 'cloud', icon: 'cloud', label: 'cloud' },
  ],
  [
    { tool: 'ink', icon: 'ink', label: 'ink' },
    { tool: 'eraser', icon: 'eraser', label: 'eraser' },
  ],
  [
    { tool: 'freetext', icon: 'freetext', label: 'textBox' },
    { tool: 'note', icon: 'note', label: 'stickyNote' },
  ],
];

/**
 * The annotation toolbar row, opened from the main toolbar's Annotate
 * button: the tools (toggle buttons), stamps, links, measurement, the active
 * tool's colour, import / export, undo / redo, and close. Wraps when the
 * viewer is narrow (a scrolling row would clip its menus).
 */
@Component({
  selector: 'hk-pdf-annotation-toolbar',
  imports: [
    LucideMousePointer2,
    LucideHighlighter,
    LucideUnderline,
    LucideStrikethrough,
    LucideWaves,
    LucideSquare,
    LucideCircle,
    LucideSlash,
    LucideMoveUpRight,
    LucidePentagon,
    LucideSpline,
    LucideCloud,
    LucidePenLine,
    LucideEraser,
    LucideType,
    LucideStickyNote,
    LucideUndo2,
    LucideRedo2,
    LucideX,
    LucideStamp,
    LucideLink,
    LucideRuler,
    LucideFileUp,
    LucideFileDown,
    LucideImageUp,
  ],
  templateUrl: './pdf-annotation-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfAnnotationToolbarComponent {
  protected readonly ui = inject(PDF_CHROME);
  protected readonly store = inject(PdfViewerStore);
  protected readonly annotations = inject(PdfAnnotationsService);
  protected readonly tools = inject(PdfAnnotationToolsService);
  protected readonly dialogs = inject(PdfAnnotationDialogsService);
  private readonly document = inject(PdfDocumentService);

  protected readonly groups = GROUPS;
  protected readonly standardStamps = STANDARD_STAMPS;
  protected readonly dynamicStamps = DYNAMIC_STAMPS;
  protected readonly signHereStamps = SIGN_HERE_STAMPS;
  protected readonly measureTools: readonly { tool: PdfAnnotationTool; label: keyof ResolvedPdfViewerLabels }[] = [
    { tool: 'distance', label: 'distance' },
    { tool: 'perimeter', label: 'perimeter' },
    { tool: 'area', label: 'area' },
    { tool: 'radius', label: 'radius' },
    { tool: 'volume', label: 'volume' },
  ];
  protected readonly measuring = computed(() => this.measureTools.some((m) => m.tool === this.store.annotationTool()));

  /** Colour new annotations of the active tool get. */
  protected readonly color = computed(() => this.annotations.toolStyle(this.store.annotationTool()).color);
  protected readonly showsColor = computed(() => this.store.annotationTool() !== 'none' && this.store.annotationTool() !== 'eraser');
  protected readonly polyHint = computed(() => ['polygon', 'polyline', 'cloud'].includes(this.store.annotationTool()));

  /** Pick a stamp from the menu: the stamp tool then places it on the next click. */
  protected chooseStamp(preset: StampPreset, dynamic: boolean, menu: HTMLDetailsElement): void {
    menu.open = false;
    const stamp = presetStamp(preset, this.store.labels(), dynamic ? { author: this.annotations.author(), date: new Date() } : null);
    this.annotations.pendingStamp.set(stamp);
    this.tools.setTool('stamp');
  }

  protected openStampDesigner(menu: HTMLDetailsElement): void {
    menu.open = false;
    this.dialogs.openStampDesigner();
  }

  /** An uploaded image becomes the pending stamp. */
  protected async onStampImage(input: HTMLInputElement, menu: HTMLDetailsElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    menu.open = false;
    if (!file) return;
    try {
      const stamp = await imageStampFromFile(file);
      this.annotations.pendingStamp.set({ name: 'Image', stamp, color: '#000000' });
      this.tools.setTool('stamp');
    } catch (err) {
      this.store.reportOperationError({ code: 'unknown', message: this.store.labels().importFailed, recoverable: true, cause: err });
    }
  }

  protected chooseMeasure(tool: PdfAnnotationTool, menu: HTMLDetailsElement): void {
    menu.open = false;
    this.tools.setTool(tool);
  }

  protected openCalibrate(menu: HTMLDetailsElement): void {
    menu.open = false;
    this.dialogs.openCalibrate();
  }

  protected exportAs(format: 'xfdf' | 'json', menu: HTMLDetailsElement): void {
    menu.open = false;
    this.document.exportAnnotations(format);
  }

  protected async onImportFile(input: HTMLInputElement, menu: HTMLDetailsElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    menu.open = false;
    if (file) await this.document.importAnnotationsFile(file);
  }

  protected onColor(ev: Event): void {
    const value = (ev.target as HTMLInputElement | null)?.value;
    if (value) this.tools.setColor(value);
  }

  protected undoTitle(): string {
    const label = this.annotations.history().undoLabel;
    return label ? `${this.store.labels().undo}: ${label}` : this.store.labels().undo;
  }

  protected redoTitle(): string {
    const label = this.annotations.history().redoLabel;
    return label ? `${this.store.labels().redo}: ${label}` : this.store.labels().redo;
  }
}
