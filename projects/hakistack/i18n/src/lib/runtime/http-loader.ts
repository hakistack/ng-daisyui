import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';

import { I18N_RUNTIME_CONFIG } from './tokens';

/**
 * HTTP-based translation loader — fetches `<assetsPath>/<lang>.json` over HTTP.
 *
 * Selected via `provideI18n({ loader: 'http' })`. Consumes the same JSON files
 * the generator emits, so switching loaders requires no other change.
 *
 * **Prefer the registry loader unless ANY of these are true:**
 *   - Translation payload exceeds ~50KB per language (JS bundle bloat matters).
 *   - The translation team needs to push updates without a code deploy.
 *   - 5+ locales where CDN-cached per-locale loading matters.
 *   - `provideTranslocoScope` lazy loading is adopted per route.
 *
 * **Costs:** reintroduces the runtime HTTP fetch (network race, offline issues),
 * SSR needs absolute URLs, and the "JSON drifted from TS" mode returns unless
 * the generator runs in the deploy pipeline.
 */
@Injectable()
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);
  private readonly config = inject(I18N_RUNTIME_CONFIG);

  getTranslation(lang: string) {
    // Transloco passes scoped requests as `<scope>/<lang>`; our generator emits
    // dotted scopes as nested dirs (`administration.users` → `administration/users/<lang>.json`),
    // so map dots to slashes. Lang codes never contain dots, so this is safe.
    const path = lang.replace(/\./g, '/');
    return this.http.get<Translation>(`${this.config.assetsPath}/${path}.json`);
  }
}
