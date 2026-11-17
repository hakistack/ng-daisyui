import { inject, Injectable, PendingTasks } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { from, Observable } from 'rxjs';

import { I18N_RUNTIME_CONFIG } from './tokens';

/**
 * Translation loader backed by the generated `TRANSLATIONS` loaders: each
 * language (and each scoped scope) is a separate chunk, dynamically imported
 * the first time it is needed.
 *
 * The import runs as an Angular pending task, so server rendering waits for it
 * and serializes translated HTML (no flash or hydration mismatch).
 */
@Injectable()
export class TranslocoLazyLoader implements TranslocoLoader {
  private readonly config = inject(I18N_RUNTIME_CONFIG);
  private readonly pendingTasks = inject(PendingTasks);

  getTranslation(input: string): Observable<Translation> {
    // Transloco requests scopes as `<scope>/<lang>` (e.g. `'admin/users/es'`); plain `'es'` is the root.
    const slash = input.lastIndexOf('/');
    const lang = slash === -1 ? input : input.slice(slash + 1);
    const translations = this.config.translations;
    const table = slash === -1 ? translations?.root : translations?.scopes?.[input.slice(0, slash)];
    const load = table?.[lang];
    if (!load) {
      // Rejecting lets Transloco fall back (fallback language / missing handler).
      return from(Promise.reject(new Error(`@hakistack/i18n: no translations generated for '${input}'.`)));
    }
    const done = this.pendingTasks.add();
    return from(
      load()
        .then((mod) => mod.default)
        .finally(done),
    );
  }
}
