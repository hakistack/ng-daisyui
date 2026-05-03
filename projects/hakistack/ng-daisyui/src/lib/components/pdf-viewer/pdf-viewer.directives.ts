import { Directive, TemplateRef, inject } from '@angular/core';
import { ResolvedPdfViewerLabels } from './pdf-viewer.labels';
import { PdfViewerState } from './pdf-viewer.types';

/**
 * Context object passed to a custom toolbar template. Consumers destructure
 * what they need via `let-state="state" let-labels="labels"`. The controller
 * itself is intentionally NOT in the context — consumers already hold a
 * reference to the controller they created via `createPdfViewer()`, and
 * closing over it from the surrounding component keeps the binding ergonomic.
 */
export interface HkPdfToolbarContext {
  /** Current runtime state — page, numPages, zoom, mode, loaded, error, etc. May be `null` while bootstrapping. */
  readonly state: PdfViewerState | null;
  /** Resolved i18n labels — i18n-able toolbar text consumers can reuse for consistency. */
  readonly labels: ResolvedPdfViewerLabels;
}

/**
 * Slot directive for replacing the default PDF viewer toolbar.
 *
 * Drop an `<ng-template hkPdfToolbar>` inside `<hk-pdf-viewer>` and the
 * component will render your template instead of the built-in toolbar. You
 * keep full control over markup (use any daisyUI components, your own icons,
 * a custom layout) while the viewer still owns rendering, page tracking,
 * zoom, and download/print plumbing.
 *
 * @example
 * @Component({
 *   imports: [PdfViewerComponent, HkPdfToolbarDirective],
 *   template: `
 *     <hk-pdf-viewer [src]="pdfUrl()" [config]="viewer.config()">
 *       <ng-template hkPdfToolbar let-state="state">
 *         <div class="flex items-center gap-2 p-2">
 *           <button class="btn btn-sm" (click)="viewer.previousPage()">Back</button>
 *           <span>{{ state.page }} / {{ state.numPages }}</span>
 *           <button class="btn btn-sm" (click)="viewer.nextPage()">Forward</button>
 *         </div>
 *       </ng-template>
 *     </hk-pdf-viewer>
 *   `,
 * })
 * export class MyComponent {
 *   pdfUrl = signal('https://...');
 *   viewer = createPdfViewer({ ... });
 * }
 */
@Directive({
  selector: 'ng-template[hkPdfToolbar]',
})
export class HkPdfToolbarDirective {
  readonly templateRef = inject(TemplateRef<HkPdfToolbarContext>);

  /**
   * Type-narrows the template context so consumers get IDE completion on
   * `let-state` / `let-labels`. Without this, Angular's strict template
   * mode treats the context as `unknown`.
   */
  static ngTemplateContextGuard(_dir: HkPdfToolbarDirective, ctx: unknown): ctx is HkPdfToolbarContext {
    return true;
  }
}
