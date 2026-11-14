import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  PdfDisplayMode,
  PdfSidebarTab,
  PdfViewerComponent,
  PdfViewerController,
  PdfViewerLayout,
  PdfZoom,
  createPdfViewer,
} from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { PDF_VIEWER_PLAYGROUND, PDF_VIEWER_SAMPLE_SRC, PdfViewerPgState } from '../specs/pdf-viewer';
import type { PlaygroundState } from '../playground.types';

@Component({
  selector: 'app-pdf-viewer-playground',
  imports: [PlaygroundComponent, PdfViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        <!-- Bounded height: the viewer fills its parent. -->
        <div class="h-[32rem]">
          <hk-pdf-viewer
            [src]="src"
            [config]="viewerFor(raw).config()"
            (loaded)="log('loaded', $event)"
            (pageChange)="log('pageChange', $event)"
            (viewerError)="log('viewerError', $event)"
          />
        </div>
      </ng-template>
    </app-playground>
  `,
})
export class PdfViewerPlaygroundComponent {
  protected readonly spec = PDF_VIEWER_PLAYGROUND;
  /** Local sample shipped with the docs app — no external URL. */
  protected readonly src = PDF_VIEWER_SAMPLE_SRC;
  private cached: { key: string; viewer: PdfViewerController } | null = null;

  /** One real `createPdfViewer()` controller per playground state (memoized for change detection). */
  protected viewerFor(raw: PlaygroundState): PdfViewerController {
    const key = JSON.stringify(raw);
    if (this.cached?.key === key) return this.cached.viewer;
    const s = raw as PdfViewerPgState;
    const viewer = createPdfViewer({
      layout: s.layout as PdfViewerLayout,
      mode: s.mode as PdfDisplayMode,
      zoom: s.zoom as PdfZoom,
      page: s.page,
      showToolbar: s.showToolbar,
      showSidebar: s.showSidebar,
      defaultSidebarTab: s.defaultSidebarTab as PdfSidebarTab,
      annotationMode: s.annotationMode as 'edit' | 'review' | 'view',
    });
    this.cached = { key, viewer };
    return viewer;
  }
}
