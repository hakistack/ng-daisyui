import { REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';

import { I18nConfig } from './config';

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

  it('restores a stored language that is still available', async () => {
    localStorage.setItem(STORAGE_KEY, 'es');
    const service = setup();
    await service.initializeLanguage();
    expect(service.language()).toBe('es');
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('es');
  });

  it('ignores a stale stored language that is no longer available', async () => {
    localStorage.setItem(STORAGE_KEY, 'xx');
    const service = setup();
    await service.initializeLanguage();
    expect(service.language()).toBe('en');
  });

  // Regression: the signal used to report the stored language while Transloco
  // was still on another one, and ignored switches made through Transloco.
  it('follows the active language however it changes', () => {
    const service = setup();
    TestBed.inject(TranslocoService).setActiveLang('es');
    expect(service.language()).toBe('es');
    expect(document.documentElement.getAttribute('lang')).toBe('es');
  });

  // Regression: an unconfigured language used to become active and be persisted.
  it('ignores languages that are not configured', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const service = setup();
    await service.setLanguage('xx');
    expect(service.language()).toBe('en');
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    warn.mockRestore();
  });

  it('persists and applies a language change', async () => {
    const service = setup();
    await service.setLanguage('es');
    expect(service.language()).toBe('es');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('es');
    expect(document.documentElement.getAttribute('lang')).toBe('es');
  });
});

describe('LanguageService: language vs locale, direction', () => {
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('keeps the translation language and the formatting locale apart, and sets <html lang|dir>', () => {
    TestBed.configureTestingModule({
      providers: [
        provideI18n({
          registry: [APP],
          languages: [
            { id: 'en', label: 'English' },
            { id: 'es', label: 'Español (Puerto Rico)', locale: 'es-PR' },
            { id: 'ar', label: 'العربية' },
          ],
        }),
      ],
    });
    const service = TestBed.inject(LanguageService);
    const transloco = TestBed.inject(TranslocoService);
    const html = document.documentElement;

    transloco.setActiveLang('es');
    expect([service.language(), service.locale(), service.dir()]).toEqual(['es', 'es-PR', 'ltr']);
    expect([html.getAttribute('lang'), html.getAttribute('dir')]).toEqual(['es-PR', 'ltr']);

    transloco.setActiveLang('ar');
    expect([service.locale(), service.dir()]).toEqual(['ar', 'rtl']);
    expect(html.getAttribute('dir')).toBe('rtl');
    transloco.setActiveLang('en');
  });
});

describe('LanguageService: cookie persistence and detection (SSR)', () => {
  const LANGS: I18nConfig['languages'] = [
    { id: 'en', label: 'English' },
    { id: 'es', label: 'Español' },
  ];
  const clearCookie = () => (document.cookie = `${STORAGE_KEY}=; Path=/; Max-Age=0`);
  afterEach(clearCookie);

  function setupWith(config: Partial<I18nConfig>, request?: Request): LanguageService {
    TestBed.configureTestingModule({
      providers: [
        provideI18n({ registry: [APP], languages: LANGS, ...config }),
        ...(request ? [{ provide: REQUEST, useValue: request }] : []),
      ],
    });
    return TestBed.inject(LanguageService);
  }

  it('remembers the choice in a cookie and restores it in the browser', async () => {
    const service = setupWith({ persistLanguage: 'cookie' });
    await service.setLanguage('es');
    expect(document.cookie).toContain(`${STORAGE_KEY}=es`);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    TestBed.resetTestingModule();
    const restored = setupWith({ persistLanguage: 'cookie' });
    await restored.initializeLanguage();
    expect(restored.language()).toBe('es');
  });

  it('reads the cookie from the request during SSR (no localStorage, no document.cookie)', async () => {
    const request = new Request('http://localhost/', { headers: { cookie: `other=1; ${STORAGE_KEY}=es` } });
    const service = setupWith({ persistLanguage: 'cookie' }, request);
    await service.initializeLanguage();
    expect(service.language()).toBe('es');
    expect(document.documentElement.getAttribute('lang')).toBe('es');
    expect(document.cookie).not.toContain(STORAGE_KEY); // the server never writes the browser's cookie
  });

  it('detects the language from Accept-Language during SSR when nothing is remembered', async () => {
    const request = new Request('http://localhost/', { headers: { 'accept-language': 'fr-CA,fr;q=0.9,es-MX;q=0.8,en;q=0.5' } });
    const service = setupWith({ persistLanguage: 'cookie', detectLanguage: true }, request);
    await service.initializeLanguage();
    expect(service.language()).toBe('es');
  });

  it('detects from navigator.languages in the browser and does not remember a detected language', async () => {
    const languages = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-AR', 'en']);
    const service = setupWith({ detectLanguage: true });
    await service.initializeLanguage();
    expect(service.language()).toBe('es');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    languages.mockRestore();
  });

  it('prefers a remembered language over detection', async () => {
    const request = new Request('http://localhost/', { headers: { cookie: `${STORAGE_KEY}=en`, 'accept-language': 'es' } });
    const service = setupWith({ persistLanguage: 'cookie', detectLanguage: true }, request);
    await service.initializeLanguage();
    expect(service.language()).toBe('en');
  });
});
