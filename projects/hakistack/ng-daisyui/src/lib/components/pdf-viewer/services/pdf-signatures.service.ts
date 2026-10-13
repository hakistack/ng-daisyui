import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import type { PdfRect, PdfStampContent } from '../core/annotations/annotation.types';
import { newAnnotationId } from '../core/annotations/annotation.types';
import { fitSignature } from '../core/signatures/capture';
import { PdfAnnotationToolsService } from './pdf-annotation-tools.service';
import { PdfAnnotationsService } from './pdf-annotations.service';
import { PdfFormsService } from './pdf-forms.service';
import { PDF_SIGNATURE_STORE, SavedPdfSignature } from './pdf-signature-store';

/** Where a signature goes: anywhere (placed with the next click), or into a signature field's box. */
export interface SignatureTarget {
  readonly page: number;
  readonly rect: PdfRect;
  readonly field?: string;
}

/**
 * Visible signatures: the signature dialog's state, saved signatures, and
 * placing a signature (a vector or image stamp named `Signature` or
 * `Initials`, optionally flattened into the page on save), freely or in a
 * signature field.
 */
@Injectable()
export class PdfSignaturesService {
  private readonly annotations = inject(PdfAnnotationsService);
  private readonly tools = inject(PdfAnnotationToolsService);
  private readonly store = inject(PDF_SIGNATURE_STORE);

  /** The open dialog (null when closed); `target` is the field it signs, if any. */
  readonly dialog = signal<{ readonly target: SignatureTarget | null } | null>(null);
  readonly saved = signal<readonly SavedPdfSignature[]>([]);

  constructor() {
    // A signature field's "Sign" button asks for the dialog.
    const forms = inject(PdfFormsService);
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

  async forget(id: string): Promise<void> {
    await this.store.remove(id);
    this.saved.set(await this.store.list());
  }
}
