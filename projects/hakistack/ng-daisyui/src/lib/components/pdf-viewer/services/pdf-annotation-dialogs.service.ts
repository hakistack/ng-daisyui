import { Injectable, signal } from '@angular/core';
import { PdfLinkTarget } from '../core/annotations/annotation.types';

/** A dialog the annotation tools ask for. */
export type AnnotationDialog =
  | { readonly kind: 'link'; readonly initial: PdfLinkTarget | null }
  | { readonly kind: 'calibrate' }
  | { readonly kind: 'stamp' };

/**
 * Opens the annotation dialogs (link target, scale calibration, custom
 * stamp) rendered by `hk-pdf-annotation-dialogs`, and hands their result
 * back to whoever asked.
 */
@Injectable()
export class PdfAnnotationDialogsService {
  readonly open = signal<AnnotationDialog | null>(null);
  private resolveLink: ((target: PdfLinkTarget | null) => void) | null = null;

  /** Ask where a link goes; resolves `null` when cancelled. */
  askLink(initial: PdfLinkTarget | null = null): Promise<PdfLinkTarget | null> {
    this.resolveLink?.(null);
    this.open.set({ kind: 'link', initial });
    return new Promise((resolve) => (this.resolveLink = resolve));
  }

  openCalibrate(): void {
    this.open.set({ kind: 'calibrate' });
  }

  openStampDesigner(): void {
    this.open.set({ kind: 'stamp' });
  }

  /** Close the open dialog, with the link target when it was the link dialog. */
  close(link: PdfLinkTarget | null = null): void {
    const resolve = this.resolveLink;
    this.resolveLink = null;
    this.open.set(null);
    resolve?.(link);
  }
}
