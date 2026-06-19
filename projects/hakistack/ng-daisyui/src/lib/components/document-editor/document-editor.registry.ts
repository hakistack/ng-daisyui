import { Type } from '@angular/core';

import { DocumentFormat } from '../document-viewer/document-viewer.types';
import { DocumentEditorRegistration, DocumentSerialize, DocumentSerializerRegistration } from './document-editor.types';

/**
 * Resolve the editor component for a format. User registrations win over
 * built-ins, first match in declaration order — identical contract to
 * `resolveRenderer`, so consumers reason about editors and renderers the
 * same way.
 */
export function resolveEditor(
  format: DocumentFormat,
  userRegistrations: readonly DocumentEditorRegistration[] | undefined,
  builtIns: readonly DocumentEditorRegistration[],
): Type<unknown> | null {
  if (userRegistrations) {
    for (const entry of userRegistrations) {
      if (entry.formats.includes(format)) return entry.component;
    }
  }
  for (const entry of builtIns) {
    if (entry.formats.includes(format)) return entry.component;
  }
  return null;
}

/**
 * Resolve the serializer for a format. Same user-before-built-in, first-match
 * lookup as {@link resolveEditor}. Returns `null` when no serializer claims the
 * format — the controller turns that into a clear "cannot save this format yet".
 */
export function resolveSerializer(
  format: DocumentFormat,
  userRegistrations: readonly DocumentSerializerRegistration[] | undefined,
  builtIns: readonly DocumentSerializerRegistration[],
): DocumentSerialize | null {
  if (userRegistrations) {
    for (const entry of userRegistrations) {
      if (entry.formats.includes(format)) return entry.serialize;
    }
  }
  for (const entry of builtIns) {
    if (entry.formats.includes(format)) return entry.serialize;
  }
  return null;
}
