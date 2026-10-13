import { AnnotationBaseline, applyAnnotationChanges } from '../annotations/annotation-io';
import type { HkAnnotation } from '../annotations/annotation.types';
import { PdfDoc } from '../pdf-writer/document';
import { FontEmbedder } from '../pdf-writer/font-embed';
import { saveIncremental } from '../pdf-writer/incremental';
import { FormValue } from './form-model';
import { FormDesign, applyFormDesign } from './form-design';
import { applyFormValues } from './form-writer';

/** Everything the viewer edits in the file itself, applied in one incremental update. */
export interface DocumentChanges {
  readonly formValues?: ReadonlyMap<string, FormValue>;
  /** Fields created, changed or deleted in the designer. */
  readonly formDesign?: FormDesign;
  readonly annotations?: { readonly baseline: AnnotationBaseline; readonly current: readonly HkAnnotation[] };
  /** The password an encrypted document was opened with (the update is encrypted with its key). */
  readonly password?: string;
}

/** Apply form values and annotation changes to `bytes` as one incremental update (the bytes as they are when nothing changes). */
export async function writeDocumentChanges(bytes: Uint8Array, changes: DocumentChanges, now = new Date()): Promise<Uint8Array> {
  const doc = await PdfDoc.load(bytes, changes.password);
  const fonts = new FontEmbedder(doc); // one subset per font across the whole update
  // Annotations first: they address /Annots by index, which the form design may change.
  if (changes.annotations) await applyAnnotationChanges(doc, changes.annotations.baseline, changes.annotations.current, now, fonts);
  if (changes.formDesign) await applyFormDesign(doc, changes.formDesign, fonts);
  if (changes.formValues) await applyFormValues(doc, changes.formValues, fonts);
  await fonts.finish();
  return doc.modified ? saveIncremental(doc) : bytes;
}
