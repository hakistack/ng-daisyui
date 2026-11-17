import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component, Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { defineTranslations, t } from '../../../engine/define-translations';
import { mergeKeys } from '../../../engine/merge';
import { provideI18n } from './provide-i18n';
import { TranslateContext, TranslateDirectiveBase } from './translate.directive';

const USERS = defineTranslations('users', { title: t('Plain users', { es: 'Usuarios' }) });
const ADMIN_USERS = defineTranslations('admin.users', { title: t('Admin users') });
// Two modules sharing a scope, each with a nested group of the same name.
const COMMON_A = defineTranslations('common', { buttons: { save: t('Save', { es: 'Guardar' }) } });
const COMMON_B = defineTranslations('common', { buttons: { cancel: t('Cancel', { es: 'Cancelar' }) } });
const REGISTRY = [USERS, ADMIN_USERS, COMMON_A, COMMON_B] as const;

/** Mirrors the `TK` literal `hakistack-i18n scan` emits for these modules. */
const TK = {
  admin: { users: ADMIN_USERS.keys },
  common: mergeKeys(COMMON_A.keys, COMMON_B.keys),
  users: USERS.keys,
} as const;

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
];

/** Mirrors what `hakistack-i18n scan` emits for `directiveSelector: 'hkTranslate'`. */
@Directive({ selector: '[hkTranslate]' })
class HkTranslateDirective extends TranslateDirectiveBase {
  readonly hkTranslatePrefix = input<string | undefined>(undefined);

  protected override prefix(): string | undefined {
    return this.hkTranslatePrefix();
  }

  static ngTemplateContextGuard(_dir: HkTranslateDirective, ctx: unknown): ctx is TranslateContext<typeof TK> {
    return true;
  }
}

@Component({
  imports: [HkTranslateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span id="plain" *hkTranslate="let t">{{ t.users.title() }}</span>
    <span id="prefixed" *hkTranslate="let t; prefix: 'admin'">{{ t.users.title() }}</span>
    <span id="escape" *hkTranslate="let t; let tr = translate; prefix: 'admin'">{{ tr('users.title') }}</span>
  `,
})
class HostComponent {}

@Component({
  imports: [HkTranslateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span id="title" *hkTranslate="let t">{{ t.users.title() }}</span>
    <span id="buttons" *hkTranslate="let t">{{ t.common.buttons.save() }} / {{ t.common.buttons.cancel() }}</span>`,
})
class OnlyDirectiveComponent {}

const text = (fixture: ComponentFixture<unknown>, id: string) =>
  (fixture.nativeElement as HTMLElement).querySelector(`#${id}`)?.textContent?.trim();

describe('TranslateDirectiveBase with a generated wrapper', () => {
  it('binds the <selector>Prefix input through the prefix() hook', async () => {
    TestBed.configureTestingModule({
      providers: [provideI18n({ registry: REGISTRY, languages: [{ id: 'en', label: 'English' }] })],
    });
    const transloco = TestBed.inject(TranslocoService);
    await firstValueFrom(transloco.load('en'));
    transloco.setActiveLang('en');

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const text = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`#${id}`)?.textContent?.trim();

    expect(text('plain')).toBe('Plain users');
    expect(text('prefixed')).toBe('Admin users');
    expect(text('escape')).toBe('Admin users');
  });
});

describe('TranslateDirectiveBase loading (regressions)', () => {
  // The directive used to rely on something else (the persistLanguage app
  // initializer) having loaded the language, and rendered `[key]` forever.
  it('loads the active language itself and re-renders after a switch', async () => {
    TestBed.configureTestingModule({ providers: [provideI18n({ registry: REGISTRY, languages: LANGUAGES })] });
    const fixture = TestBed.createComponent(OnlyDirectiveComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(text(fixture, 'title')).toBe('Plain users');

    TestBed.inject(TranslocoService).setActiveLang('es');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text(fixture, 'title')).toBe('Usuarios');
  });

  // TK used to be a shallow spread that dropped `save` (type) / `cancel` (runtime).
  it('exposes every key of modules sharing a scope', async () => {
    TestBed.configureTestingModule({ providers: [provideI18n({ registry: REGISTRY, languages: LANGUAGES, defaultLang: 'es' })] });
    const fixture = TestBed.createComponent(OnlyDirectiveComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(text(fixture, 'buttons')).toBe('Guardar / Cancelar');
  });

  it('waits for an asynchronous (HTTP) load before rendering', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideI18n({ registry: REGISTRY, languages: LANGUAGES, loader: 'http' }),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(OnlyDirectiveComponent);
    fixture.detectChanges();
    expect(text(fixture, 'title')).toBeUndefined();

    http.expectOne('/assets/i18n/en.json').flush({ users: { title: 'Plain users' } });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text(fixture, 'title')).toBe('Plain users');
    http.verify();
  });
});

describe('TranslateDirectiveBase with the lazy loader', () => {
  const lazy = { en: vi.fn(), es: vi.fn() };
  const TRANSLATIONS = {
    root: {
      en: () => (
        lazy.en(),
        Promise.resolve({ default: { users: { title: 'Plain users' }, common: { buttons: { save: 'Save', cancel: 'Cancel' } } } })
      ),
      es: () => (
        lazy.es(),
        Promise.resolve({ default: { users: { title: 'Usuarios' }, common: { buttons: { save: 'Guardar', cancel: 'Cancelar' } } } })
      ),
    },
  };

  it('renders from TK + per-language loaders, without the registry, importing only the active language', async () => {
    TestBed.configureTestingModule({ providers: [provideI18n({ keys: TK, translations: TRANSLATIONS, languages: LANGUAGES })] });
    const fixture = TestBed.createComponent(OnlyDirectiveComponent);
    fixture.detectChanges();
    await fixture.whenStable(); // the import is a pending task: stability (and SSR) waits for it
    fixture.detectChanges();
    expect(text(fixture, 'buttons')).toBe('Save / Cancel');
    expect(lazy.en).toHaveBeenCalledTimes(1);
    expect(lazy.es).not.toHaveBeenCalled();

    TestBed.inject(TranslocoService).setActiveLang('es');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text(fixture, 'title')).toBe('Usuarios');
  });

  // Fallbacks are baked into every generated tree: Transloco used to load the fallback language too.
  it('loads only the active language, not the fallback one', async () => {
    lazy.en.mockClear();
    lazy.es.mockClear();
    TestBed.configureTestingModule({
      providers: [provideI18n({ keys: TK, translations: TRANSLATIONS, languages: LANGUAGES, defaultLang: 'es', fallbackLang: 'en' })],
    });
    const fixture = TestBed.createComponent(OnlyDirectiveComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text(fixture, 'title')).toBe('Usuarios');
    expect(lazy.es).toHaveBeenCalledTimes(1);
    expect(lazy.en).not.toHaveBeenCalled();
  });

  it('explains a missing registry / keys / translations', () => {
    expect(() => provideI18n({ languages: LANGUAGES })).toThrow(/pass `keys`/);
    expect(() => provideI18n({ keys: TK, languages: LANGUAGES })).toThrow(/'registry' loader needs `registry`/);
    expect(() => provideI18n({ keys: TK, languages: LANGUAGES, loader: 'lazy' })).toThrow(/'lazy' loader needs `translations`/);
  });
});
