import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DocumentEditorInputs } from '../document-editor.types';
import { DocumentCsvEditor } from './csv.editor';
import { DocumentMarkdownEditor } from './markdown.editor';
import { DocumentPlainTextEditor } from './plain-text.editor';

/**
 * Text-family editor dispatcher. `.txt`, `.md`, `.csv`, `.log`, `.json` all
 * resolve to a single `DocumentFormat: 'text'`, so the editor registry hands
 * every one of them here. Rather than widen the format union (which would
 * ripple into the read-only renderers), this thin component routes by
 * `ResolvedFormat.extension` to a focused sub-editor — each with a single
 * responsibility:
 *
 *  - `.md` / `.markdown` → split-preview Markdown editor
 *  - `.csv`             → editable `hk-table`
 *  - everything else    → plain textarea + line-number gutter
 *
 * All sub-editors share the same `DocumentEditorInputs` contract, so this is a
 * pure pass-through of `source` / `format` / `filename` / `bridge`.
 */
@Component({
  selector: 'hk-document-text-editor',
  imports: [DocumentPlainTextEditor, DocumentMarkdownEditor, DocumentCsvEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (kind()) {
      @case ('markdown') {
        <hk-document-markdown-editor [source]="source()" [format]="format()" [filename]="filename()" [bridge]="bridge()" />
      }
      @case ('csv') {
        <hk-document-csv-editor [source]="source()" [format]="format()" [filename]="filename()" [bridge]="bridge()" />
      }
      @default {
        <hk-document-plain-text-editor [source]="source()" [format]="format()" [filename]="filename()" [bridge]="bridge()" />
      }
    }
  `,
  host: { class: 'block w-full' },
})
export class DocumentTextEditor {
  readonly source = input.required<DocumentEditorInputs['source']>();
  readonly format = input.required<DocumentEditorInputs['format']>();
  readonly filename = input.required<DocumentEditorInputs['filename']>();
  readonly bridge = input.required<DocumentEditorInputs['bridge']>();

  /** Which sub-editor handles the current extension. */
  readonly kind = computed<'markdown' | 'csv' | 'plain'>(() => {
    const ext = this.format().extension;
    if (ext === '.md' || ext === '.markdown') return 'markdown';
    if (ext === '.csv') return 'csv';
    return 'plain';
  });
}
