import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { DocumentRendererInputs } from '../document-viewer.types';

/**
 * Fallback shown when the registry can't resolve a renderer for the
 * detected format. Renders the basics (filename, extension, MIME) and
 * the source's type so the user has enough context to download or
 * report it. No deps — used as a last-resort terminal state.
 */
@Component({
  selector: 'hk-document-unsupported-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div class="text-base-content/60 text-sm">Unsupported document format</div>
      @if (filename()) {
        <div class="font-mono text-xs">{{ filename() }}</div>
      }
      @if (format().mimeType || format().extension) {
        <div class="text-base-content/50 text-xs">
          {{ format().mimeType ?? '' }}
          @if (format().extension) {
            <span>· {{ format().extension }}</span>
          }
        </div>
      }
    </div>
  `,
  host: { class: 'block w-full' },
})
export class DocumentUnsupportedRenderer {
  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();
}
