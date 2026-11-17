import { computed, DOCUMENT, inject, Injectable, isDevMode, REQUEST, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AvailableLangs, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { I18nLanguageOption, I18nLanguagePersistence } from './config';
import { negotiateLanguage, parseAcceptLanguage, textDirection } from './locale';
import { I18N_RUNTIME_CONFIG } from './tokens';

/** Name of the localStorage entry and of the cookie that remember the chosen language. */
const STORAGE_KEY = 'hakistack_i18n_lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * App-level active-language service on top of `TranslocoService`:
 *
 *  - `language()` — the translation language; `locale()` — its BCP 47
 *    formatting locale (`es` + `locale: 'es-PR'`); `dir()` — `'ltr' | 'rtl'`.
 *    All follow Transloco's active language however it changes.
 *  - `<html lang>` (the locale) and `<html dir>` are kept in sync, on the
 *    server too.
 *  - {@link setLanguage} loads, activates and remembers a language
 *    (`localStorage`, or a cookie that SSR can read — `persistLanguage`).
 *  - On bootstrap ({@link initializeLanguage}, wired by `provideI18n` when
 *    `persistLanguage` or `detectLanguage` is set): the remembered language,
 *    else the best match for `Accept-Language` / `navigator.languages`
 *    (`detectLanguage`), else `defaultLang`.
 *
 * One instance per application (per request during SSR): no state is shared
 * between users.
 *
 * ```ts
 * private readonly i18nLang = inject(LanguageService);
 * switch(lang: string) { this.i18nLang.setLanguage(lang); }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly config = inject(I18N_RUNTIME_CONFIG, { optional: true });

  private readonly defaultLanguage = this.transloco.getDefaultLang();
  private readonly persistence: I18nLanguagePersistence = this.config?.persistence ?? 'local-storage';

  /** Available languages from Transloco config. */
  readonly availableLanguages: AvailableLangs = this.transloco.getAvailableLangs();

  /** Current active translation language (kept in sync with Transloco). */
  readonly language = signal<string>(this.transloco.getActiveLang());

  /** Formatting locale of the active language (its `locale` option, else its id) — for `Intl.*` and locale pipes. */
  readonly locale = computed(() => this.option(this.language())?.locale ?? this.language());

  /** Text direction of the active language (its `dir` option, else derived from the locale). */
  readonly dir = computed(() => this.option(this.language())?.dir ?? textDirection(this.locale()));

  constructor() {
    this.transloco.langChanges$.pipe(takeUntilDestroyed()).subscribe((lang) => {
      this.language.set(lang);
      const html = this.document.documentElement;
      html.setAttribute('lang', this.locale());
      html.setAttribute('dir', this.dir());
    });
  }

  /**
   * Bootstrap: the remembered language, else (with `detectLanguage`) the user's
   * preference, else the default. Nothing is written: only an explicit
   * {@link setLanguage} choice is remembered, so detection keeps following the
   * user's preferences until they pick a language.
   */
  async initializeLanguage(): Promise<void> {
    const remembered = this.rememberedLanguage();
    const detected = remembered ?? (this.config?.detectLanguage ? this.preferredLanguage() : null);
    await this.setLanguage(detected ?? this.defaultLanguage, { remember: false });
  }

  /**
   * Load and activate `lang`, then remember it. Languages that are not in the
   * configured `languages` list are ignored (with a dev-mode warning) so they
   * can never become the active or stored language.
   */
  async setLanguage(lang: string, options: { remember?: boolean } = {}): Promise<void> {
    if (!this.isAvailable(lang)) {
      if (isDevMode()) console.warn(`[@hakistack/i18n] setLanguage('${lang}') ignored — not one of the configured languages.`);
      return;
    }
    try {
      await firstValueFrom(this.transloco.load(lang));
      this.transloco.setActiveLang(lang);
      if (options.remember ?? true) this.remember(lang);
    } catch (error) {
      console.warn(`Failed to load language '${lang}', falling back to default`, error);
      if (lang !== this.defaultLanguage) {
        await this.setLanguage(this.defaultLanguage);
      }
    }
  }

  /** Is `lang` one of the configured available languages? */
  isAvailable(lang: string): boolean {
    return this.languageIds().includes(lang);
  }

  private languageIds(): string[] {
    return this.availableLanguages.map((l) => (typeof l === 'string' ? l : l.id));
  }

  private option(lang: string): I18nLanguageOption | undefined {
    return this.config?.languages.find((l) => l.id === lang);
  }

  /**
   * The remembered language when it is still available — never a stale or
   * garbage value. `null` when nothing (usable) is stored.
   */
  private rememberedLanguage(): string | null {
    const stored = this.persistence === 'cookie' ? this.readCookie() : this.readLocalStorage();
    return stored && this.isAvailable(stored) ? stored : null;
  }

  /** Best configured language for the request's `Accept-Language` (SSR) or `navigator.languages` (browser). */
  private preferredLanguage(): string | null {
    const preferred = this.request
      ? parseAcceptLanguage(this.request.headers.get('accept-language'))
      : typeof navigator !== 'undefined'
        ? [...(navigator.languages ?? [navigator.language])].filter(Boolean)
        : [];
    return negotiateLanguage(preferred, this.languageIds());
  }

  private remember(lang: string): void {
    if (this.persistence === 'cookie') this.writeCookie(lang);
    else this.writeLocalStorage(lang);
  }

  /** The request's `Cookie` header during SSR, `document.cookie` in the browser. */
  private readCookie(): string | null {
    const header = this.request ? this.request.headers.get('cookie') : this.document.cookie;
    for (const part of (header ?? '').split(';')) {
      const [name, ...value] = part.trim().split('=');
      if (name === STORAGE_KEY) return decodeURIComponent(value.join('='));
    }
    return null;
  }

  private writeCookie(lang: string): void {
    if (this.request) return; // server: the browser keeps the cookie it sent
    const secure = this.document.location?.protocol === 'https:' ? '; Secure' : '';
    this.document.cookie = `${STORAGE_KEY}=${encodeURIComponent(lang)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  }

  private readLocalStorage(): string | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to read language from localStorage:', error);
      return null;
    }
  }

  private writeLocalStorage(lang: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      console.warn('Failed to save language to localStorage:', error);
    }
  }
}
