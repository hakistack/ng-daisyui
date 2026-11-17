import { negotiateLanguage, parseAcceptLanguage, textDirection } from './locale';

describe('locale helpers', () => {
  it('derives text direction from the locale script', () => {
    for (const rtl of ['ar', 'ar-EG', 'he', 'fa', 'ur', 'ckb', 'yi', 'dv', 'pa-Arab']) expect(textDirection(rtl)).toBe('rtl');
    for (const ltr of ['en', 'es-PR', 'ku', 'pa', 'zh-Hant', 'ja']) expect(textDirection(ltr)).toBe('ltr');
    expect(textDirection('not a tag!')).toBe('ltr');
  });

  it('orders Accept-Language by quality and drops q=0 and *', () => {
    expect(parseAcceptLanguage('fr-CA,fr;q=0.9, en;q=0.8, de;q=0, *;q=0.1')).toEqual(['fr-CA', 'fr', 'en']);
    expect(parseAcceptLanguage('es;q=0.5,en')).toEqual(['en', 'es']);
    expect(parseAcceptLanguage(null)).toEqual([]);
  });

  it('negotiates an exact tag first, then the same base language', () => {
    expect(negotiateLanguage(['fr-CA', 'es'], ['en', 'es', 'fr'])).toBe('fr');
    expect(negotiateLanguage(['es-MX'], ['en', 'es-MX', 'es'])).toBe('es-MX');
    expect(negotiateLanguage(['es'], ['en', 'es-PR'])).toBe('es-PR');
    expect(negotiateLanguage(['de'], ['en', 'es'])).toBeNull();
  });
});
