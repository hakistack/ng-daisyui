import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { AvailableLangs, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

/**
 * App-level active-language wrapper around `TranslocoService` with localStorage
 * persistence and `<html lang>` syncing.
 *
 * Wired automatically when `provideI18n({ persistLanguage: true })` is set
 * (an APP_INITIALIZER restores the stored language on bootstrap). It's also
 * exported for direct use — inject it to build a language switcher:
 *
 * ```ts
 * private readonly i18nLang = inject(LanguageService);
 * switch(lang: string) { this.i18nLang.setLanguage(lang); }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly STORAGE_KEY = 'hakistack_i18n_lang';
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);

  private readonly defaultLanguage = this.transloco.getDefaultLang();

  /** Available languages from Transloco config. */
  readonly availableLanguages: AvailableLangs = this.transloco.getAvailableLangs();

  /** Current active language (reactive signal). */
  readonly language = signal<string>(this.getStoredLanguage());

  async initializeLanguage(): Promise<void> {
    await this.setLanguage(this.getStoredLanguage());
  }

  async setLanguage(lang: string): Promise<void> {
    try {
      await firstValueFrom(this.transloco.load(lang));
      this.transloco.setActiveLang(lang);
      this.saveLanguage(lang);
      this.language.set(lang);
      this.document.documentElement.setAttribute('lang', lang);
    } catch (error) {
      console.warn(`Failed to load language '${lang}', falling back to default`, error);
      if (lang !== this.defaultLanguage) {
        await this.setLanguage(this.defaultLanguage);
      }
    }
  }

  /** Is `lang` one of the configured available languages? */
  isAvailable(lang: string): boolean {
    return this.availableLanguages.some((l) => (typeof l === 'string' ? l : l.id) === lang);
  }

  /**
   * Stored language, or the default when nothing is stored, storage is
   * unavailable (SSR), or the stored value is no longer an available language
   * (stale/garbage localStorage must never become the active `<html lang>`).
   */
  private getStoredLanguage(): string {
    const storage = this.storage();
    if (!storage) return this.defaultLanguage;
    try {
      const stored = storage.getItem(this.STORAGE_KEY);
      return stored && this.isAvailable(stored) ? stored : this.defaultLanguage;
    } catch (error) {
      console.warn('Failed to read language from localStorage:', error);
      return this.defaultLanguage;
    }
  }

  private saveLanguage(lang: string): void {
    const storage = this.storage();
    if (!storage) return;
    try {
      storage.setItem(this.STORAGE_KEY, lang);
    } catch (error) {
      console.warn('Failed to save language to localStorage:', error);
    }
  }

  /** `localStorage` when it exists (browser); `null` on the server. */
  private storage(): Storage | null {
    return typeof localStorage === 'undefined' ? null : localStorage;
  }
}
