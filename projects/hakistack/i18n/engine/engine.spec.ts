import { describe, expect, it } from 'vitest';

import { buildLanguageTree, buildScopedTree, normalizeScope } from './build-tree';
import { buildKeysTree, defineTranslations, findKeyConflicts, isTranslationValue, t, TRANSLATION_BRAND } from './define-translations';
import { mergeKeys } from './merge';

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

// Regression: modules sharing a scope used to be merged shallowly, with a
// different winner in each tree (runtime keys kept the first module's group,
// the TK literal and the JSON kept the last one's).
describe('engine: one deep merge for keys, TK and language trees', () => {
  const A = defineTranslations('common', { buttons: { save: t('Save', { es: 'Guardar' }) } });
  const B = defineTranslations('common', { buttons: { cancel: t('Cancel', { es: 'Cancelar' }) } });
  const expectedKeys = { common: { buttons: { save: 'common.buttons.save', cancel: 'common.buttons.cancel' } } };

  it('keeps every key of every module in all three trees', () => {
    expect(buildKeysTree([A, B])).toEqual(expectedKeys);
    expect({ common: mergeKeys(A.keys, B.keys) }).toEqual(expectedKeys);
    expect(buildLanguageTree([A, B], 'es', 'en')).toEqual({ common: { buttons: { save: 'Guardar', cancel: 'Cancelar' } } });
  });

  it('does not mutate the modules it merges', () => {
    mergeKeys(A.keys, B.keys);
    buildKeysTree([A, B]);
    expect(A.keys).toEqual({ buttons: { save: 'common.buttons.save' } });
  });

  it('throws on a key defined twice', () => {
    const C = defineTranslations('common', { buttons: { save: t('Save again') } });
    expect(() => buildKeysTree([A, C])).toThrow(/duplicate translation key 'common\.buttons\.save'/);
    expect(() => mergeKeys(A.keys, C.keys)).toThrow(/duplicate translation key 'common\.buttons\.save'/);
    expect(() => buildLanguageTree([A, C], 'en', 'en')).toThrow(/duplicate translation key 'common\.buttons\.save'/);
  });

  it('throws on a translation colliding with a nested scope, whatever the module order', () => {
    const PARENT = defineTranslations('a', { b: t('leaf b') });
    const CHILD = defineTranslations('a.b', { c: t('child c') });
    for (const order of [
      [PARENT, CHILD],
      [CHILD, PARENT],
    ]) {
      expect(() => buildLanguageTree(order, 'en', 'en')).toThrow(/'a\.b' is both a translation and a group/);
      expect(() => buildKeysTree(order)).toThrow(/'a\.b' is both a translation and a group/);
    }
  });
});

describe('engine: findKeyConflicts', () => {
  it('reports duplicates, translation/group clashes and dotted names colliding with nesting', () => {
    const A = defineTranslations('common', { save: t('Save') });
    const B = defineTranslations('common', { save: t('Save') });
    const PARENT = defineTranslations('a', { b: t('leaf') });
    const CHILD = defineTranslations('a.b', { c: t('child') });
    const DOTTED = defineTranslations('m', { 'x.y': t('dotted'), x: { y: t('nested') } });
    expect(findKeyConflicts([A, B, PARENT, CHILD, DOTTED])).toEqual([
      { key: 'a.b', kind: 'translation-and-group', scopes: ['a', 'a.b'] },
      { key: 'common.save', kind: 'duplicate', scopes: ['common', 'common'] },
      { key: 'm.x.y', kind: 'duplicate', scopes: ['m', 'm'] },
    ]);
  });

  it('returns nothing for a clean registry', () => {
    const A = defineTranslations('common', { buttons: { save: 'Save' } });
    const B = defineTranslations('common', { buttons: { cancel: 'Cancel' } });
    const ADMIN = defineTranslations('admin', { title: 'Admin' });
    const USERS = defineTranslations('admin.users', { title: 'Users' });
    expect(findKeyConflicts([A, B, ADMIN, USERS])).toEqual([]);
  });
});

describe('engine: scoped trees and comments', () => {
  it('merges every scoped module that declares the scope (the second used to be dropped)', () => {
    const X = defineTranslations('feat', { x: t('X') }, { scoped: true });
    const Y = defineTranslations('feat', { y: t('Y') }, { scoped: true });
    expect(buildScopedTree([X, Y], 'en', 'en', 'feat')).toEqual({ x: 'X', y: 'Y' });
  });

  it('emits translator comments for the JSON only when asked', () => {
    const M = defineTranslations('m', { hi: t('Hi', {}, { comment: 'greeting' }) });
    expect(buildLanguageTree([M], 'en', 'en')).toEqual({ m: { hi: 'Hi', 'hi.comment': 'greeting' } });
    expect(buildLanguageTree([M], 'en', 'en', { comments: false })).toEqual({ m: { hi: 'Hi' } });
  });
});

// Regression (types): keys used to be typed without their scope
// (`'buttons.save'`) while the runtime value was `'common.buttons.save'`.
describe('engine: key literal types include the scope', () => {
  it('types each key as its full runtime string', () => {
    const COMMON = defineTranslations('common', { buttons: { save: t('Save') } });
    const USERS = defineTranslations('admin.users', { title: 'Users' });
    const save: 'common.buttons.save' = COMMON.keys.buttons.save;
    const title: 'admin.users.title' = USERS.keys.title;
    const merged: 'admin.users.title' = mergeKeys(USERS.keys, COMMON.keys).title;
    expect([save, title, merged]).toEqual(['common.buttons.save', 'admin.users.title', 'admin.users.title']);
  });
});
