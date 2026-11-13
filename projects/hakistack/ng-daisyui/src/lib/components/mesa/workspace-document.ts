/**
 * One document of a workspace list (`hk-document-workspace`: any format the
 * document viewer renders; `hk-pdf-workspace`: PDFs).
 */
export interface WorkspaceDocument {
  /** Stable id (what `[(active)]` holds). */
  readonly id: string;
  /** File name: the row's title, and the format hint (its extension). */
  readonly name: string;
  /** URL, bytes or a Blob / File. */
  readonly src: string | Uint8Array | Blob;
  /** MIME type, when the name and source don't tell the format. */
  readonly mimeType?: string;
  /** A secondary line under the name (a category, a date…). */
  readonly description?: string;
  /** Page count, when known ahead (shown in the row). */
  readonly pages?: number;
  /** A preview image URL for the row; images use their own source, other formats an icon. */
  readonly thumbnail?: string;
}
