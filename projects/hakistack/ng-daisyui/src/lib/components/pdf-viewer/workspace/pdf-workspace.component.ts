import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked, viewChild } from '@angular/core';
import { MesaLayoutComponent, MesaLayoutLabels } from '../../mesa/mesa-layout.component';
import { PDF_VIEWER_PROVIDERS, PdfViewerHostBase } from '../pdf-viewer-host';
import { PdfSidebarTab } from '../pdf-viewer.types';
import { MESA_PDF_CHROME, PDF_CHROME } from '../ui/pdf-chrome';
import { PdfAnnotationDialogsComponent } from '../ui/pdf-annotation-dialogs.component';
import { PdfAnnotationToolbarComponent } from '../ui/pdf-annotation-toolbar.component';
import { PdfDigitalSignDialogComponent } from '../ui/pdf-digital-sign-dialog.component';
import { PdfFindBarComponent } from '../ui/pdf-find-bar.component';
import { PdfFormDesignToolbarComponent } from '../ui/pdf-form-design-toolbar.component';
import { PdfPageOrganizerComponent } from '../ui/pdf-page-organizer.component';
import { PdfPagesComponent } from '../ui/pdf-pages.component';
import { PdfSignatureDialogComponent } from '../ui/pdf-signature-dialog.component';
import { PdfTextEditorComponent } from '../ui/pdf-text-editor.component';
import { PdfWorkspaceInspectorComponent } from './pdf-workspace-inspector.component';
import { PdfWorkspaceRailComponent } from './pdf-workspace-rail.component';
import { PdfWorkspaceToolbarComponent } from './pdf-workspace-toolbar.component';
import { PdfWorkspaceState } from './pdf-workspace.state';

/**
 * The PDF viewer as a workspace: the same document, features and API as
 * `hk-pdf-viewer` (same `[src]`, `[config]` from `createPdfViewer()`,
 * `[(formValues)]` and outputs — swap the tag to switch), laid out as a Mesa
 * work block (docs/design/mesa-style-guide.md):
 *
 * - **Rail** — page thumbnails, the outline, the attachments.
 * - **Main column** — a toolbar (the document, the save state, paging, zoom,
 *   the view, the tools), the annotation / form design / find bars, and the
 *   pages; or, in the Grid view, every page as a thumbnail to organize
 *   (each edit applies at once and undoes with the document).
 * - **Inspector** — the selected annotation or field, the document's
 *   properties, its digital signatures and the comments.
 *
 * Side panes hide behind their divider and fold into disclosures on narrow
 * containers. `controller.toggleSidebar()` toggles the rail and
 * `controller.organizePages()` opens the Grid view.
 *
 * @example
 * viewer = createPdfViewer({ zoom: 'fit-width' });
 * // <hk-pdf-workspace class="h-[80vh]" [src]="pdfUrl()" [config]="viewer.config()" />
 */
@Component({
  selector: 'hk-pdf-workspace',
  imports: [
    MesaLayoutComponent,
    PdfWorkspaceToolbarComponent,
    PdfWorkspaceRailComponent,
    PdfWorkspaceInspectorComponent,
    PdfAnnotationToolbarComponent,
    PdfFormDesignToolbarComponent,
    PdfFindBarComponent,
    PdfPagesComponent,
    PdfPageOrganizerComponent,
    PdfTextEditorComponent,
    PdfAnnotationDialogsComponent,
    PdfSignatureDialogComponent,
    PdfDigitalSignDialogComponent,
  ],
  templateUrl: './pdf-workspace.component.html',
  // The page, text, annotation and form layers are styled by the viewer's stylesheet (scoped to this host too).
  styleUrl: '../pdf-viewer.component.css',
  // The pages fill the main column here (the classic viewer caps them at 75vh).
  styles: `
    :host ::ng-deep .hk-pdf-viewport {
      max-height: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [...PDF_VIEWER_PROVIDERS, PdfWorkspaceState, { provide: PDF_CHROME, useValue: MESA_PDF_CHROME }],
  host: { class: 'block h-full min-h-0 outline-none' },
})
export class PdfWorkspaceComponent extends PdfViewerHostBase {
  protected readonly ws = inject(PdfWorkspaceState);

  /** `localStorage` key for which side panes are hidden; `null` doesn't remember them. */
  readonly storageKey = input<string | null>('hk-pdf-workspace');

  private readonly layout = viewChild(MesaLayoutComponent);

  protected readonly layoutLabels = computed<MesaLayoutLabels>(() => {
    const l = this.store.labels();
    return {
      rail: l.workspaceRail,
      inspector: l.workspaceInspector,
      showRail: l.showRail,
      hideRail: l.hideRail,
      showInspector: l.showInspector,
      hideInspector: l.hideInspector,
      skipToRail: l.skipToPages,
    };
  });

  constructor() {
    super();
    effect(() => this.ws.layout.set(this.layout() ?? null));

    // Panels on screen: the rail's mode (outline and attachments load with the rail, so its
    // modes know whether the document has them), and the inspector's comments and signatures.
    effect(() => {
      const layout = this.layout();
      const shown = new Set<PdfSidebarTab>();
      if (layout?.railVisible()) {
        shown.add('bookmarks');
        shown.add('attachments');
        if (this.ws.railMode() === 'thumbnails') shown.add('thumbnails');
      }
      if (layout?.inspectorVisible()) {
        shown.add('annotations');
        shown.add('signatures');
      }
      this.store.shownPanels.set(shown);
    });

    this.store.revealHandler = (panel) => {
      if (panel === 'annotations') this.ws.revealSection('comments');
      else if (panel === 'signatures') this.ws.revealSection('signatures');
      else {
        this.ws.railMode.set(panel);
        this.layout()?.showRail();
      }
    };

    // Form design and the grid are exclusive: designing goes back to the pages.
    effect(() => {
      if (this.designer.active()) untracked(() => this.ws.view.set('sheet'));
    });
  }

  protected override toggleSidebar(): void {
    this.layout()?.toggleRail();
  }

  protected override organizePages(): void {
    if (this.pages.canOrganize()) this.ws.view.set('grid');
  }
}
