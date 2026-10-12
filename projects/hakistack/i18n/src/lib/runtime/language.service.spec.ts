import { TestBed } from '@angular/core/testing';

import { defineTranslations, t } from '../../../engine/define-translations';
import { LanguageService } from './language.service';
import { provideI18n } from './provide-i18n';

const APP = defineTranslations('app', { hi: t('Hi', { es: 'Hola' }) });
const STORAGE_KEY = 'hakistack_i18n_lang';

function setup(): LanguageService {
  TestBed.configureTestingModule({
    providers: [
      provideI18n({
        registry: [APP],
        languages: [
          { id: 'en', label: 'English' },
          { id: 'es', label: 'Español' },
        ],
        defaultLang: 'en',
      }),
    ],
  });
  return TestBed.inject(LanguageService);
}

describe('LanguageService', () => {
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('restores a stored language that is still available', () => {
    localStorage.setItem(STORAGE_KEY, 'es');
    expect(setup().language()).toBe('es');
  });

  it('ignores a stale stored language that is no longer available', () => {
    localStorage.setItem(STORAGE_KEY, 'xx');
    expect(setup().language()).toBe('en');
  });

  it('persists and applies a language change', async () => {
    const service = setup();
    await service.setLanguage('es');
    expect(service.language()).toBe('es');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('es');
    expect(document.documentElement.getAttribute('lang')).toBe('es');
  });
});
