import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, untracked } from '@angular/core';
import { PdfAnnotationsService } from '../services/pdf-annotations.service';
import { PdfDocumentService } from '../services/pdf-document.service';
import { PdfFormDesignerService } from '../services/pdf-form-designer.service';
import { PdfFormsService } from '../services/pdf-forms.service';
import { PdfSignaturesService } from '../services/pdf-signatures.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PdfAnnotationPanelComponent } from '../ui/pdf-annotation-panel.component';
import { PdfCommentsComponent } from '../ui/pdf-comments.component';
import { PdfFormFieldPanelComponent } from '../ui/pdf-form-field-panel.component';
import { PdfSignaturesPanelComponent } from '../ui/pdf-signatures-panel.component';
import { formatBytes } from '../../../utils/format-bytes';
import { PdfWorkspaceState } from './pdf-workspace.state';

/**
 * The workspace inspector: sections on hairlines — the selected annotation
 * or form field (the properties panels, docked), the document's properties,
 * its digital signatures, and the comments.
 */
@Component({
  selector: 'hk-pdf-workspace-inspector',
  imports: [PdfAnnotationPanelComponent, PdfFormFieldPanelComponent, PdfSignaturesPanelComponent, PdfCommentsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div data-section="selection">
      @if (designer.active()) {
        <hk-pdf-form-field-panel />
      } @else {
        <hk-pdf-annotation-panel />
      }
    </div>

    <section data-section="document" class="border-base-300 border-b px-4 py-3.5" [attr.aria-labelledby]="'hk-pdf-ws-doc-' + uid">
      <h2 [id]="'hk-pdf-ws-doc-' + uid" class="mb-2.5 text-sm font-semibold">{{ store.labels().documentSection }}</h2>
      <dl class="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3.5 gap-y-1.5 text-sm">
        <dt class="text-base-content/70">{{ store.labels().docFileName }}</dt>
        <dd class="m-0 truncate" [title]="fileName()">{{ fileName() }}</dd>
        @if (info()?.title; as title) {
          <dt class="text-base-content/70">{{ store.labels().docTitle }}</dt>
          <dd class="m-0 break-words">{{ title }}</dd>
        }
        <dt class="text-base-content/70">{{ store.labels().docPages }}</dt>
        <dd class="m-0 font-mono tabular-nums">{{ store.pageNumbers().length || '—' }}</dd>
        @if (size(); as size) {
          <dt class="text-base-content/70">{{ store.labels().docFileSize }}</dt>
          <dd class="m-0 font-mono tabular-nums">{{ size }}</dd>
        }
        <dt class="text-base-content/70">{{ store.labels().docForm }}</dt>
        <dd class="m-0">{{ formText() }}</dd>
      </dl>
    </section>

    @if (showSignatures()) {
      <section data-section="signatures" class="border-base-300 border-b px-2 pt-3.5 pb-2" [attr.aria-labelledby]="'hk-pdf-ws-sig-' + uid">
        <h2 [id]="'hk-pdf-ws-sig-' + uid" class="mb-1 px-2 text-sm font-semibold">{{ store.labels().signaturesTab }}</h2>
        <hk-pdf-signatures-panel />
      </section>
    }

    <section data-section="comments" class="px-2 pt-3.5 pb-2" [attr.aria-labelledby]="'hk-pdf-ws-com-' + uid">
      <h2 [id]="'hk-pdf-ws-com-' + uid" class="mb-1 px-2 text-sm font-semibold">{{ store.labels().commentsSection }}</h2>
      <hk-pdf-comments />
    </section>
  `,
})
export class PdfWorkspaceInspectorComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly designer = inject(PdfFormDesignerService);
  private readonly document = inject(PdfDocumentService);
  private readonly forms = inject(PdfFormsService);
  private readonly signatures = inject(PdfSignaturesService);
  private readonly annotations = inject(PdfAnnotationsService);
  private readonly ws = inject(PdfWorkspaceState);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private static nextId = 0;
  protected readonly uid = ++PdfWorkspaceInspectorComponent.nextId;

  protected readonly info = this.store.loadedInfo;
  protected readonly fileName = computed(() => this.document.fileName());
  protected readonly size = computed(() => {
    const bytes = this.info()?.fileSize;
    return bytes ? formatBytes(bytes) : '';
  });
  protected readonly formText = computed(() => {
    const fields = this.forms.model()?.fields.length ?? 0;
    const l = this.store.labels();
    return fields ? l.docFormFields.replace('{count}', String(fields)) : l.docNoForm;
  });
  protected readonly showSignatures = computed(() => (this.signatures.digital()?.length ?? 0) > 0 || this.signatures.canSignDigitally());

  constructor() {
    // "Open comments" and "show signatures" scroll their section into view.
    effect(() => {
      const focus = this.ws.focusSection();
      if (!focus) return;
      untracked(() =>
        requestAnimationFrame(() =>
          this.host.querySelector(`[data-section="${focus.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
        ),
      );
    });
    // A new selection shows its properties (the section is at the top).
    effect(() => {
      if (this.annotations.selectedId() || this.designer.selection()) untracked(() => this.ws.revealSection('selection'));
    });
  }
}
