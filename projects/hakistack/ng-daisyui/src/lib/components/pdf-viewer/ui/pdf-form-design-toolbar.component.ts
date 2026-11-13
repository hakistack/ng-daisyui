import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  LucideAlignJustify,
  LucideCalendarDays,
  LucideCaseSensitive,
  LucideCheck,
  LucideChevronDown,
  LucideCircleDot,
  LucideHash,
  LucideKeyRound,
  LucideList,
  LucideRedo2,
  LucideSignature,
  LucideSquareCheck,
  LucideTextCursorInput,
  LucideUndo2,
} from '@lucide/angular';
import { ResolvedPdfViewerLabels } from '../pdf-viewer.labels';
import { FormDesignTool, PdfFormDesignerService } from '../services/pdf-form-designer.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PDF_CHROME } from './pdf-chrome';

const TOOLS: readonly { tool: FormDesignTool; label: keyof ResolvedPdfViewerLabels }[] = [
  { tool: 'text', label: 'fieldText' },
  { tool: 'multiline', label: 'fieldMultiline' },
  { tool: 'password', label: 'fieldPassword' },
  { tool: 'number', label: 'fieldNumber' },
  { tool: 'date', label: 'fieldDate' },
  { tool: 'checkbox', label: 'fieldCheckbox' },
  { tool: 'radio', label: 'fieldRadio' },
  { tool: 'combo', label: 'fieldCombo' },
  { tool: 'list', label: 'fieldList' },
  { tool: 'signature', label: 'fieldSignature' },
  { tool: 'initials', label: 'fieldInitials' },
];

/** The "Prepare form" toolbar row: field tools (toggle buttons), undo / redo, and Done. */
@Component({
  selector: 'hk-pdf-form-design-toolbar',
  imports: [
    LucideTextCursorInput,
    LucideAlignJustify,
    LucideKeyRound,
    LucideHash,
    LucideCalendarDays,
    LucideSquareCheck,
    LucideCircleDot,
    LucideChevronDown,
    LucideList,
    LucideSignature,
    LucideCaseSensitive,
    LucideUndo2,
    LucideRedo2,
    LucideCheck,
  ],
  templateUrl: './pdf-form-design-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfFormDesignToolbarComponent {
  protected readonly ui = inject(PDF_CHROME);
  protected readonly store = inject(PdfViewerStore);
  protected readonly designer = inject(PdfFormDesignerService);
  protected readonly tools = TOOLS;

  protected toggle(tool: FormDesignTool): void {
    this.designer.tool.update((t) => (t === tool ? null : tool));
  }
}
