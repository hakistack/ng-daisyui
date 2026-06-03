import { Type } from '@angular/core';

import { DocumentFormat, DocumentRendererRegistration } from './document-viewer.types';

/**
 * Resolve a `format` to a concrete renderer component.
 *
 * Search order:
 *   1. Consumer-supplied registrations (in declaration order). Lets apps
 *      override built-in renderers without forking the library.
 *   2. Built-in registrations from this module.
 *
 * Returns `null` if no registration claims the format — the facade
 * component then shows its "unsupported format" placeholder.
 */
export function resolveRenderer(
  format: DocumentFormat,
  userRegistrations: readonly DocumentRendererRegistration[] | undefined,
  builtIns: readonly DocumentRendererRegistration[],
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
