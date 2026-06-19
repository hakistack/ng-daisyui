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

  /** Current active language (reactive signal). */
  readonly language = signal<string>(this.getStoredLanguage());

  /** Available languages from Transloco config. */
  readonly availableLanguages: AvailableLangs = this.transloco.getAvailableLangs();

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

  private getStoredLanguage(): string {
    try {
      return localStorage.getItem(this.STORAGE_KEY) ?? this.defaultLanguage;
    } catch (error) {
      console.warn('Failed to read language from localStorage:', error);
      return this.defaultLanguage;
    }
  }

  private saveLanguage(lang: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, lang);
    } catch (error) {
      console.warn('Failed to save language to localStorage:', error);
    }
  }
}
