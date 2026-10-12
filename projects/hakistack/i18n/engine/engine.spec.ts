import { describe, expect, it } from 'vitest';

import { buildLanguageTree, buildScopedTree, normalizeScope } from './build-tree';
import { buildKeysTree, defineTranslations, isTranslationValue, t, TRANSLATION_BRAND } from './define-translations';

describe('engine: translation values', () => {
  it('brands values created by t() and by bare-string normalization', () => {
    const mod = defineTranslations('x', { a: t('A'), b: 'B' });
    expect(isTranslationValue(mod.translations['a'])).toBe(true);
    expect(isTranslationValue(mod.translations['b'])).toBe(true);
    // Brand is non-enumerable: JSON / Object.entries never see it.
    expect(JSON.stringify(mod.translations['a'])).toBe('{"en":"A"}');
    expect(Object.keys(mod.translations['a'] as object)).toEqual(['en']);
  });

  it('uses the global symbol registry so a second engine copy recognizes the brand', () => {
    expect(TRANSLATION_BRAND).toBe(Symbol.for('@hakistack/i18n:translation-value'));
  });

  it('treats a hand-written { en, es } object as a group, not a leaf', () => {
    const picker = defineTranslations('picker', { languages: { en: 'English', es: 'Español' } });
    expect(isTranslationValue({ en: 'English', es: 'Español' })).toBe(false);
    expect(picker.keys.languages).toEqual({ en: 'picker.languages.en', es: 'picker.languages.es' });
    expect(buildLanguageTree([picker], 'en', 'en')).toEqual({ picker: { languages: { en: 'English', es: 'Español' } } });
    expect(buildLanguageTree([picker], 'es', 'en')).toEqual({ picker: { languages: { en: 'English', es: 'Español' } } });
  });
});

describe('engine: scoped modules', () => {
  const USERS = defineTranslations('administration.users', { title: t('Users', { es: 'Usuarios' }) }, { scoped: true });

  it('normalizes slash and dotted scopes to the same key', () => {
    expect(normalizeScope('administration/users')).toBe('administration.users');
    expect(normalizeScope('administration.users')).toBe('administration.users');
  });

  it('resolves a nested scoped module from the slash form Transloco hands a loader', () => {
    expect(buildScopedTree([USERS], 'es', 'en', 'administration/users')).toEqual({ title: 'Usuarios' });
    expect(buildScopedTree([USERS], 'en', 'en', 'administration.users')).toEqual({ title: 'Users' });
  });

  it('returns null for unknown or eager scopes', () => {
    const EAGER = defineTranslations('home', { a: 'A' });
    expect(buildScopedTree([USERS, EAGER], 'en', 'en', 'home')).toBeNull();
    expect(buildScopedTree([USERS], 'en', 'en', 'nope')).toBeNull();
  });
});

describe('engine: buildKeysTree', () => {
  it('merges modules that share a scope', () => {
    const A = defineTranslations('common', { a: 'A' });
    const B = defineTranslations('common', { b: 'B' });
    expect(buildKeysTree([A, B])).toEqual({ common: { a: 'common.a', b: 'common.b' } });
  });

  it('nests a deeper scope under its parent module keys', () => {
    const ADMIN = defineTranslations('admin', { title: 'Admin' });
    const USERS = defineTranslations('admin.users', { title: 'Users' });
    expect(buildKeysTree([USERS, ADMIN])).toEqual({ admin: { title: 'admin.title', users: { title: 'admin.users.title' } } });
  });
});
