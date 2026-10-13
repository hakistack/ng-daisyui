import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideBadgeCheck, LucideCircleAlert, LucideCircleHelp, LucideCircleX, LucideDownload, LucideLocateFixed } from '@lucide/angular';
import type { PdfSignatureInfo } from '../core/signatures/pdf-signature';
import { PdfDocumentService } from '../services/pdf-document.service';
import { PdfSignaturesService } from '../services/pdf-signatures.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PdfViewportService } from '../services/pdf-viewport.service';

/**
 * The sidebar's Signatures panel: each digital signature with its status
 * (valid, invalid, can't be verified), signer, time, reason and location,
 * changes made after it, its certificate, and actions (show it on the page,
 * download the signed revision).
 */
@Component({
  selector: 'hk-pdf-signatures-panel',
  imports: [LucideBadgeCheck, LucideCircleAlert, LucideCircleX, LucideCircleHelp, LucideLocateFixed, LucideDownload],
  templateUrl: './pdf-signatures-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfSignaturesPanelComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly signatures = inject(PdfSignaturesService);
  private readonly viewport = inject(PdfViewportService);
  private readonly document = inject(PdfDocumentService);

  private readonly dateFormat = computed(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }));
  private readonly dayFormat = computed(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }));

  protected signedBy(s: PdfSignatureInfo): string {
    return this.store.labels().sigSignedBy.replace('{name}', s.signer ?? this.store.labels().sigUnknownSigner);
  }

  protected when(d: Date | null): string {
    return d && !isNaN(d.getTime()) ? this.dateFormat().format(d) : '';
  }

  protected validity(s: PdfSignatureInfo): string {
    const c = s.certificate;
    if (!c) return '';
    return this.store
      .labels()
      .sigValidity.replace('{from}', this.dayFormat().format(c.notBefore))
      .replace('{to}', this.dayFormat().format(c.notAfter));
  }

  protected statusLabel(s: PdfSignatureInfo): string {
    const l = this.store.labels();
    return s.status === 'valid' ? l.sigValid : s.status === 'invalid' ? l.sigInvalid : l.sigUnknown;
  }

  protected certifiedLabel(s: PdfSignatureInfo): string {
    const l = this.store.labels();
    const level = s.certified === 1 ? l.certifyLevel1 : s.certified === 2 ? l.certifyLevel2 : l.certifyLevel3;
    return `${l.sigCertified}: ${level}`;
  }

  protected show(s: PdfSignatureInfo): void {
    if (s.page !== null) this.viewport.goToPage(s.page + 1);
  }

  protected downloadRevision(s: PdfSignatureInfo): void {
    this.document.downloadSignedRevision(s.revisionLength);
  }
}
