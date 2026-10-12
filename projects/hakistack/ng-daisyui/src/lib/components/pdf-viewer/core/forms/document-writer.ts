import { AnnotationBaseline, applyAnnotationChanges } from '../annotations/annotation-io';
import type { HkAnnotation } from '../annotations/annotation.types';
import { PdfDoc } from '../pdf-writer/document';
import { saveIncremental } from '../pdf-writer/incremental';
import { FormValue } from './form-model';
import { applyFormValues } from './form-writer';

/** Everything the viewer edits in the file itself, applied in one incremental update. */
export interface DocumentChanges {
  readonly formValues?: ReadonlyMap<string, FormValue>;
  readonly annotations?: { readonly baseline: AnnotationBaseline; readonly current: readonly HkAnnotation[] };
}

/** Apply form values and annotation changes to `bytes` as one incremental update (the bytes as they are when nothing changes). */
export async function writeDocumentChanges(bytes: Uint8Array, changes: DocumentChanges, now = new Date()): Promise<Uint8Array> {
  const doc = await PdfDoc.load(bytes);
  if (changes.formValues) await applyFormValues(doc, changes.formValues);
  if (changes.annotations) await applyAnnotationChanges(doc, changes.annotations.baseline, changes.annotations.current, now);
  return doc.modified ? saveIncremental(doc) : bytes;
}
