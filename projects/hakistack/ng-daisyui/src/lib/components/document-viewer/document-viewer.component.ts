import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

import { DocumentEditorShellComponent } from '../document-editor/document-editor-shell.component';
import { DocumentEditorController, DocumentEditorMode } from '../document-editor/document-editor.types';
import { guessFilename, resolveFormat } from './document-viewer.helpers';
import { resolveRenderer } from './document-viewer.registry';
import { BUILT_IN_RENDERERS } from './document-viewer.builtins';
import { DocumentUnsupportedRenderer } from './renderers/unsupported.renderer';
import { DocumentSource, DocumentViewerConfig } from './document-viewer.types';

/**
 * Universal document viewer. Dispatches to format-specific renderers
 * (PDF, spreadsheet, text, image, …) based on the resolved source format.
 *
 * Quick start:
 *
 * ```html
 * <hk-document-viewer [src]="pdfUrl" />
 * <hk-document-viewer [src]="xlsxBlob" [config]="{ filename: 'report.xlsx' }" />
 * ```
 *
 * The format is detected from (in order): explicit `config.mimeType`,
 * `config.filename`, the URL extension, or `Blob.type`. Pass an explicit
 * hint when you've fetched the file with a `Content-Disposition` header
 * the viewer can't see.
 *
 * Custom renderers — for example a `.docx` renderer pulled from your own
 * package — go in `config.renderers`. Custom registrations win over the
 * built-ins so apps can replace any default without forking the library.
 */
@Component({
  selector: 'hk-document-viewer',
  imports: [CommonModule, DocumentUnsupportedRenderer, DocumentEditorShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (effectiveMode() === 'edit' && editor(); as ed) {
      <hk-document-editor-shell
        [controller]="ed"
        [source]="src()"
        [format]="resolvedFormat()"
        [filename]="filename()"
        (requestView)="modeOverride.set('view')"
      />
    } @else {
      @if (editor()) {
        <div class="mb-2 flex justify-end">
          <button type="button" class="btn btn-primary btn-sm" (click)="modeOverride.set('edit')">Edit</button>
        </div>
      }
      @if (renderer(); as r) {
        <ng-container
          *ngComponentOutlet="
            r;
            inputs: {
              source: src(),
              format: resolvedFormat(),
              filename: filename(),
            }
          "
        />
      } @else {
        <hk-document-unsupported-renderer [source]="src()" [format]="resolvedFormat()" [filename]="filename()" />
      }
    }
  `,
  host: { class: 'block w-full' },
})
export class DocumentViewerComponent {
  /** The document to render. URL, raw bytes, or a Blob/File. */
  readonly src = input.required<DocumentSource>();

  /** Optional configuration — overrides, hints, custom renderers. */
  readonly config = input<DocumentViewerConfig>({});

  /**
   * View vs edit. `'edit'` requires an `[editor]` controller; without one the
   * viewer stays read-only. The read-only render path is byte-identical to
   * before this input existed.
   */
  readonly mode = input<DocumentEditorMode>('view');

  /** Editor controller from `createDocumentEditor`. Drives edit mode. */
  readonly editor = input<DocumentEditorController | null>(null);

  /** Live view↔edit toggle, seeded from `mode`; reset whenever `mode` changes. */
  readonly modeOverride = signal<DocumentEditorMode | null>(null);
  readonly effectiveMode = computed<DocumentEditorMode>(() => this.modeOverride() ?? this.mode());

  /** Resolved format (built lazily from `src` + hints). */
  readonly resolvedFormat = computed(() => {
    const cfg = this.config();
    return resolveFormat(this.src(), cfg.mimeType, cfg.filename);
  });

  /** Best-effort filename — explicit hint wins, otherwise derived from URL/File. */
  readonly filename = computed(() => this.config().filename ?? guessFilename(this.src()));

  /** Renderer component class for the resolved format, or `null` if unsupported. */
  readonly renderer = computed(() => resolveRenderer(this.resolvedFormat().format, this.config().renderers, BUILT_IN_RENDERERS));

  constructor() {
    // A host-driven `mode` change wins over a stale local toggle.
    effect(() => {
      this.mode();
      this.modeOverride.set(null);
    });
  }
}
