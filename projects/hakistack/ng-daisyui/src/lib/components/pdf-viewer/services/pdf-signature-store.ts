import { InjectionToken, Provider } from '@angular/core';
import type { PdfStampContent } from '../core/annotations/annotation.types';

/** A signature or initials the user kept for later. */
export interface SavedPdfSignature {
  readonly id: string;
  readonly kind: 'signature' | 'initials';
  /** Drawn (vector ink), or typed / uploaded (an image). */
  readonly stamp: PdfStampContent;
  readonly color: string;
  /** ISO 8601. */
  readonly created: string;
}

/**
 * Where saved signatures live. The default keeps them in this browser's
 * `localStorage`; provide your own (a server, an encrypted store…) with
 * {@link providePdfSignatureStore}.
 */
export interface PdfSignatureStore {
  list(): Promise<readonly SavedPdfSignature[]>;
  save(signature: SavedPdfSignature): Promise<void>;
  remove(id: string): Promise<void>;
}

/**
 * `localStorage`, newest first, at most `limit` per kind. Storage failures
 * (private mode, quota, blocked site data) degrade to an empty list.
 */
export class LocalStoragePdfSignatureStore implements PdfSignatureStore {
  constructor(
    private readonly key = 'hk-pdf-signatures',
    private readonly limit = 6,
  ) {}

  async list(): Promise<readonly SavedPdfSignature[]> {
    try {
      const raw = globalThis.localStorage?.getItem(this.key);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(parsed) ? (parsed as SavedPdfSignature[]).filter((s) => s && typeof s.id === 'string' && s.stamp) : [];
    } catch {
      return [];
    }
  }

  async save(signature: SavedPdfSignature): Promise<void> {
    const list = [signature, ...(await this.list()).filter((s) => s.id !== signature.id)];
    const kept = [
      ...list.filter((s) => s.kind === 'signature').slice(0, this.limit),
      ...list.filter((s) => s.kind === 'initials').slice(0, this.limit),
    ];
    this.write(kept.sort((a, b) => b.created.localeCompare(a.created)));
  }

  async remove(id: string): Promise<void> {
    this.write((await this.list()).filter((s) => s.id !== id));
  }

  private write(list: readonly SavedPdfSignature[]): void {
    try {
      globalThis.localStorage?.setItem(this.key, JSON.stringify(list));
    } catch {
      /* storage unavailable or full: signatures just aren't kept */
    }
  }
}

export const PDF_SIGNATURE_STORE = new InjectionToken<PdfSignatureStore>('PDF_SIGNATURE_STORE', {
  providedIn: 'root',
  factory: () => new LocalStoragePdfSignatureStore(),
});

/** Use your own signature store (or `new LocalStoragePdfSignatureStore(key, limit)` with other settings). */
export function providePdfSignatureStore(store: PdfSignatureStore): Provider {
  return { provide: PDF_SIGNATURE_STORE, useValue: store };
}
