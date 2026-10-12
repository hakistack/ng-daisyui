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
} from '@lucide/angular';
import { ResolvedPdfViewerLabels } from '../pdf-viewer.labels';
import { PdfAnnotationTool } from '../pdf-viewer.types';
import { PdfAnnotationToolsService } from '../services/pdf-annotation-tools.service';
import { PdfAnnotationsService } from '../services/pdf-annotations.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';

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
 * button: the tools (toggle buttons), the active tool's colour, undo / redo,
 * and close. Scrolls horizontally when the viewer is narrow.
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
  ],
  templateUrl: './pdf-annotation-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfAnnotationToolbarComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly annotations = inject(PdfAnnotationsService);
  protected readonly tools = inject(PdfAnnotationToolsService);

  protected readonly groups = GROUPS;

  /** Colour new annotations of the active tool get. */
  protected readonly color = computed(() => this.annotations.toolStyle(this.store.annotationTool()).color);
  protected readonly showsColor = computed(() => this.store.annotationTool() !== 'none' && this.store.annotationTool() !== 'eraser');
  protected readonly polyHint = computed(() => ['polygon', 'polyline', 'cloud'].includes(this.store.annotationTool()));

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
