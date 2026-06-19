import { inject, Injectable, isDevMode } from '@angular/core';
import { TranslocoMissingHandler, TranslocoMissingHandlerData } from '@jsverse/transloco';

import { I18N_RUNTIME_CONFIG } from './tokens';

/**
 * Missing-key handler that surfaces failures in dev mode.
 *
 * Default Transloco behavior returns `''` for missing keys, making typos
 * invisible in the UI. With `missingKeyInDev: 'show'` (the default) this returns
 * `[scope.key]` in dev so missing-key bugs jump out immediately. In production,
 * behavior is always `''`.
 *
 * The build-time validator remains the source of truth for *static* keys; this
 * handler catches dynamic / `selectTranslate(varKey)` / typo cases.
 */
@Injectable()
export class TranslocoVisibleMissingHandler implements TranslocoMissingHandler {
  private readonly config = inject(I18N_RUNTIME_CONFIG);

  handle(key: string, _data: TranslocoMissingHandlerData): string {
    if (isDevMode() && this.config.missingKeyInDev === 'show') {
      return `[${key}]`;
    }
    return '';
  }
}
