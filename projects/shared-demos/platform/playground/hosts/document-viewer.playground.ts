import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  DocumentEditorController,
  DocumentEditorMode,
  DocumentSource,
  DocumentViewerComponent,
  DocumentViewerConfig,
  createDocumentEditor,
} from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { DOCUMENT_VIEWER_PLAYGROUND, DOCUMENT_VIEWER_SAMPLES, DocumentViewerPgState } from '../specs/document-viewer';
import type { PlaygroundState } from '../playground.types';

type Log = (name: string, payload: unknown) => void;

interface DocumentViewerView {
  readonly src: DocumentSource;
  readonly config: DocumentViewerConfig;
  readonly mode: DocumentEditorMode;
  readonly editor: DocumentEditorController | null;
}

@Component({
  selector: 'app-document-viewer-playground',
  imports: [PlaygroundComponent, DocumentViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        @let v = view(raw, log);
        <!-- Bounded height: renderers such as PDF fill their parent. -->
        <div class="h-[28rem] overflow-auto">
          <hk-document-viewer class="h-full" [src]="v.src" [config]="v.config" [mode]="v.mode" [editor]="v.editor" />
        </div>
      </ng-template>
    </app-playground>
  `,
})
export class DocumentViewerPlaygroundComponent {
  protected readonly spec = DOCUMENT_VIEWER_PLAYGROUND;
  private cached: { key: string; view: DocumentViewerView } | null = null;

  /** Sources, hints and editor for the current state (memoized so the viewer does not reload on change detection). */
  protected view(raw: PlaygroundState, log: Log): DocumentViewerView {
    const key = JSON.stringify(raw);
    if (this.cached?.key === key) return this.cached.view;
    const s = raw as DocumentViewerPgState;
    const sample = DOCUMENT_VIEWER_SAMPLES[s.src];
    const edit = s.mode === 'edit';
    const view: DocumentViewerView = {
      src: sample ? new File([sample.content], s.src, { type: sample.type }) : s.src,
      config: { ...(s.filename ? { filename: s.filename } : {}), ...(s.mimeType ? { mimeType: s.mimeType } : {}) },
      mode: s.mode as DocumentEditorMode,
      editor: edit
        ? createDocumentEditor({
            onDirtyChange: (dirty) => log('onDirtyChange', dirty),
            onSave: (bytes) => log('onSave', `${bytes.byteLength} bytes`),
          })
        : null,
    };
    this.cached = { key, view };
    return view;
  }
}
