import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';

import { buildLanguageTree, buildScopedTree } from '@hakistack/i18n/engine';
import { I18N_RUNTIME_CONFIG } from './tokens';

/**
 * Translation loader backed by the in-memory module registry.
 *
 * Reads directly from the registry passed to {@link provideI18n} and assembles
 * a per-language tree on demand. No HTTP request, no `assets/i18n/<lang>.json`
 * fetch at runtime — those JSON files are translator-facing build artifacts only.
 *
 * Wins:
 *   - Synchronous-after-import. No race between bootstrap and translation load.
 *   - Single source of truth at runtime — the "JSON drifted from TS" failure
 *     mode becomes structurally impossible.
 *   - Works offline; no service-worker config needed for i18n.
 *   - SSR-safe: no absolute-URL gotchas.
 */
@Injectable()
export class TranslocoRegistryLoader implements TranslocoLoader {
  private readonly config = inject(I18N_RUNTIME_CONFIG);

  getTranslation(input: string) {
    // Transloco constructs scoped requests as `<scope>/<lang>` (e.g. `'home/en'`).
    // Plain `'en'` is the unscoped root request.
    const slashIdx = input.lastIndexOf('/');

    if (slashIdx === -1) {
      // No scope provider in play — return the full tree (eager + every scoped
      // module merged at its scope path).
      return of(buildLanguageTree(this.config.registry, input, this.config.fallbackLang) as Translation);
    }

    // Scoped request — return ONLY that scope's data, unwrapped (Transloco
    // namespaces it back under the scope key in its internal store).
    const scope = input.substring(0, slashIdx);
    const lang = input.substring(slashIdx + 1);
    const tree = buildScopedTree(this.config.registry, lang, this.config.fallbackLang, scope);
    return of((tree ?? {}) as Translation);
  }
}
