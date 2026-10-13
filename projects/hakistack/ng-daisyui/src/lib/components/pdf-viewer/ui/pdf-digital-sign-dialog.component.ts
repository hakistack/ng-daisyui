import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import type { DocMdpLevel } from '../core/forms/form-design';
import { PdfDocumentService } from '../services/pdf-document.service';
import { PdfSignaturesService } from '../services/pdf-signatures.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';

let nextId = 0;

/**
 * The digital signing dialog: which field (an empty signature field, or an
 * invisible signature), reason, location, contact, and whether to certify
 * the document. Signing uses the configured `signer`; the viewer then
 * reloads the signed document and shows the Signatures panel.
 */
@Component({
  selector: 'hk-pdf-digital-sign-dialog',
  templateUrl: './pdf-digital-sign-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfDigitalSignDialogComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly signatures = inject(PdfSignaturesService);
  private readonly document = inject(PdfDocumentService);

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly uid = `hk-pdf-dsig-${++nextId}`;
  protected readonly field = signal('');
  protected readonly reason = signal('');
  protected readonly location = signal('');
  protected readonly contact = signal('');
  protected readonly certify = signal<0 | DocMdpLevel>(0);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Only the first signature can certify. */
  protected readonly canCertify = computed(() => (this.signatures.digital() ?? []).length === 0);
  protected readonly levels: readonly DocMdpLevel[] = [1, 2, 3];

  constructor() {
    effect(() => {
      const open = this.signatures.digitalDialog();
      const el = this.dialog()?.nativeElement;
      if (!el) return;
      if (open && !el.open) {
        this.field.set(open.field ?? this.signatures.emptyFields()[0] ?? '');
        this.certify.set(0);
        this.error.set(null);
        el.showModal?.();
      } else if (!open && el.open) {
        el.close();
      }
    });
  }

  protected certifyLabel(level: DocMdpLevel): string {
    const l = this.store.labels();
    return level === 1 ? l.certifyLevel1 : level === 2 ? l.certifyLevel2 : l.certifyLevel3;
  }

  protected str(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected setCertify(e: Event): void {
    const n = Number(this.str(e));
    this.certify.set(n === 1 || n === 2 || n === 3 ? n : 0);
  }

  protected async sign(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.document.signDigitally({
        field: this.field() || undefined,
        reason: this.reason().trim() || undefined,
        location: this.location().trim() || undefined,
        contactInfo: this.contact().trim() || undefined,
        certify: this.certify() || undefined,
      });
      this.signatures.closeDigital();
      this.store.patchState((s) => ({ ...s, sidebarOpen: true, sidebarTab: 'signatures' }));
    } catch (err) {
      this.error.set(this.store.labels().signFailed.replace('{error}', (err as Error)?.message ?? String(err)));
    } finally {
      this.busy.set(false);
    }
  }

  protected cancel(): void {
    if (!this.busy()) this.signatures.closeDigital();
  }

  /** Esc / backdrop: keep the service in sync (or stay open while signing). */
  protected onNativeClose(): void {
    if (this.busy()) {
      this.dialog()?.nativeElement.showModal?.();
      return;
    }
    if (this.signatures.digitalDialog()) this.signatures.closeDigital();
  }
}
