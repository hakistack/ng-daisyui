import { AnnotationBaseline, applyAnnotationChanges } from '../annotations/annotation-io';
import type { HkAnnotation } from '../annotations/annotation.types';
import { PdfPageLayoutChanges, applyPageLayout, applyPageRotations } from '../pages/page-writer';
import { PdfDoc } from '../pdf-writer/document';
import { FontEmbedder } from '../pdf-writer/font-embed';
import { saveIncremental } from '../pdf-writer/incremental';
import { FormValue } from './form-model';
import { FormDesign, applyFormDesign } from './form-design';
import { applyFormValues } from './form-writer';

/** Everything the viewer edits in the file itself, applied in one incremental update. */
export interface DocumentChanges {
  /** Pages reordered, deleted, duplicated, inserted, imported or rotated. */
  readonly pages?: PdfPageLayoutChanges;
  readonly formValues?: ReadonlyMap<string, FormValue>;
  /** Fields created, changed or deleted in the designer. */
  readonly formDesign?: FormDesign;
  readonly annotations?: { readonly baseline: AnnotationBaseline; readonly current: readonly HkAnnotation[] };
  /** The password an encrypted document was opened with (the update is encrypted with its key). */
  readonly password?: string;
}

/**
 * Apply page, annotation and form changes to `bytes` as one incremental
 * update (the bytes as they are when nothing changes). The page layout goes
 * first, so the rest addresses pages by their new positions; the rotations
 * the user added go last, so annotations are placed in the space the viewer
 * showed them in.
 */
export async function writeDocumentChanges(bytes: Uint8Array, changes: DocumentChanges, now = new Date()): Promise<Uint8Array> {
  const doc = await PdfDoc.load(bytes, changes.password);
  const fonts = new FontEmbedder(doc); // one subset per font across the whole update
  if (changes.pages) await applyPageLayout(doc, changes.pages);
  // Annotations first: they address /Annots by index, which the form design may change.
  if (changes.annotations) await applyAnnotationChanges(doc, changes.annotations.baseline, changes.annotations.current, now, fonts);
  if (changes.formDesign) await applyFormDesign(doc, changes.formDesign, fonts);
  if (changes.formValues) await applyFormValues(doc, changes.formValues, fonts);
  if (changes.pages)
    await applyPageRotations(
      doc,
      changes.pages.pages.map((p) => p.rotation),
    );
  await fonts.finish();
  return doc.modified ? saveIncremental(doc) : bytes;
}
