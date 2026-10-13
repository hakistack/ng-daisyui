import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import type { PdfRect, PdfStampContent } from '../core/annotations/annotation.types';
import { newAnnotationId } from '../core/annotations/annotation.types';
import { fitSignature } from '../core/signatures/capture';
import { PdfSignatureInfo, readSignatures } from '../core/signatures/pdf-signature';
import { certificatesFrom } from '../core/signatures/x509';
import { PdfAnnotationToolsService } from './pdf-annotation-tools.service';
import { PdfAnnotationsService } from './pdf-annotations.service';
import { PdfFormsService } from './pdf-forms.service';
import { PDF_SIGNATURE_STORE, SavedPdfSignature } from './pdf-signature-store';
import { PdfViewerStore } from './pdf-viewer.store';

/** Where a signature goes: anywhere (placed with the next click), or into a signature field's box. */
export interface SignatureTarget {
  readonly page: number;
  readonly rect: PdfRect;
  readonly field?: string;
}

/**
 * Signatures. Visible ones: the signature dialog's state, saved signatures,
 * and placing a signature (a vector or image stamp named `Signature` or
 * `Initials`, optionally flattened into the page on save), freely or in a
 * signature field. Digital ones: the document's signatures, validated when
 * it loads, and the digital signing dialog's state (signing itself is
 * `PdfDocumentService.signDigitally`, which owns saving and reloading).
 */
@Injectable()
export class PdfSignaturesService {
  private readonly annotations = inject(PdfAnnotationsService);
  private readonly tools = inject(PdfAnnotationToolsService);
  private readonly store = inject(PDF_SIGNATURE_STORE);
  private readonly viewer = inject(PdfViewerStore);
  private readonly forms = inject(PdfFormsService);

  /** The open dialog (null when closed); `target` is the field it signs, if any. */
  readonly dialog = signal<{ readonly target: SignatureTarget | null } | null>(null);
  readonly saved = signal<readonly SavedPdfSignature[]>([]);

  /** The document's digital signatures, validated (null while they're being checked). */
  readonly digital = signal<readonly PdfSignatureInfo[] | null>([]);
  /** The open digital signing dialog (null when closed), with the field it signs, if any. */
  readonly digitalDialog = signal<{ readonly field?: string } | null>(null);
  /** Digital signing is configured. */
  readonly canSignDigitally = computed(() => !!this.viewer.config().signer);
  /** Unsigned signature fields, which a digital signature can go into. */
  readonly emptyFields = computed(() =>
    (this.forms.model()?.fields ?? [])
      .filter((f) => f.kind === 'signature' && !f.value && f.widgets.some((w) => w.rect.w > 0))
      .map((f) => f.name),
  );
  private validation = 0;

  constructor() {
    // A signature field's "Sign" button asks for the dialog.
    const forms = this.forms;
    effect(() => {
      const request = forms.signRequest();
      if (request) untracked(() => this.open({ page: request.page, rect: request.rect, field: request.field }));
    });
  }

  async open(target: SignatureTarget | null = null): Promise<void> {
    this.dialog.set({ target });
    this.saved.set(await this.store.list());
  }

  close(): void {
    this.dialog.set(null);
  }

  /**
   * Use a signature: into the target field's box, or as the pending stamp
   * the next click places. `keep` saves it for later.
   */
  async use(
    stamp: PdfStampContent,
    kind: 'signature' | 'initials',
    color: string,
    opts: { keep: boolean; flatten: boolean },
  ): Promise<void> {
    const target = this.dialog()?.target ?? null;
    this.close();
    if (opts.keep) {
      await this.store.save({ id: newAnnotationId(), kind, stamp, color, created: new Date().toISOString() });
    }
    const name = kind === 'initials' ? 'Initials' : 'Signature';
    if (target) {
      const aspect = stamp.kind === 'ink' ? stamp.aspect : stamp.kind === 'image' ? stamp.width / Math.max(1, stamp.height) : 3;
      const id = await this.annotations.add({
        type: 'stamp',
        page: target.page,
        rect: fitSignature(target.rect, aspect),
        color,
        opacity: 1,
        name,
        stamp,
        flatten: opts.flatten || undefined,
        contents: target.field,
      });
      this.annotations.select(id);
      return;
    }
    this.annotations.pendingStamp.set({ name, stamp, color, flatten: opts.flatten || undefined });
    this.tools.setTool('stamp');
  }

  /** Check the document's signatures (on load). */
  async validate(bytes: Uint8Array | null): Promise<void> {
    const run = ++this.validation;
    if (!bytes) {
      this.digital.set([]);
      return;
    }
    this.digital.set(null);
    let result: PdfSignatureInfo[] = [];
    try {
      const trustAnchors = (this.viewer.config().trustedCertificates ?? []).flatMap((c) => certificatesFrom(c));
      result = await readSignatures(bytes, { password: this.viewer.documentPassword, trustAnchors });
    } catch {
      result = []; // unreadable with hk-pdf-writer: nothing to show
    }
    if (run === this.validation) this.digital.set(result);
  }

  openDigital(field?: string): void {
    this.close();
    this.digitalDialog.set({ field });
  }

  closeDigital(): void {
    this.digitalDialog.set(null);
  }

  async forget(id: string): Promise<void> {
    await this.store.remove(id);
    this.saved.set(await this.store.list());
  }
}
