import { CdkTrapFocus } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PdfAnnotationToolsService } from '../services/pdf-annotation-tools.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';

let nextId = 0;

/**
 * Modal popover that collects annotation text (replaces `prompt()`). Focus is
 * trapped while open, starts in the textarea, and returns to the previously
 * focused element on close. Esc or the scrim cancels; Ctrl/⌘+Enter saves.
 */
@Component({
  selector: 'hk-pdf-text-editor',
  imports: [CdkTrapFocus],
  templateUrl: './pdf-text-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfTextEditorComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly tools = inject(PdfAnnotationToolsService);

  private readonly id = nextId++;
  protected readonly labelId = `hk-pdf-text-editor-label-${this.id}`;
  protected readonly inputId = `hk-pdf-text-editor-input-${this.id}`;

  protected onDraftInput(event: Event): void {
    this.store.textEditorDraft.set((event.target as HTMLTextAreaElement).value);
  }
}
