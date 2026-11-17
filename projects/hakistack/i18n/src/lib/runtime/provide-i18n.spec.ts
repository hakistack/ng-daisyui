import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { defineTranslations, t } from '../../../engine/define-translations';
import { stripCommentKeys } from './comment-interceptor';
import { provideI18n } from './provide-i18n';
import { I18N_KEYS } from './tokens';

const APP = defineTranslations('app', {
  welcome: t('Welcome', { es: 'Bienvenido' }),
  enOnly: t('Only English'),
  greeting: t('Hi', { es: 'Hola' }, { comment: 'greeting context for translators' }),
  nested: {
    deep: t('Deep', { es: 'Profundo' }),
  },
  // A real key whose last segment is `comment` — must survive comment stripping.
  post: {
    comment: t('Comment', { es: 'Comentario' }),
  },
});

const REGISTRY = [APP] as const;

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideI18n({
        registry: REGISTRY,
        languages: [
          { id: 'en', label: 'English' },
          { id: 'es', label: 'Español' },
        ],
        defaultLang: 'en',
        fallbackLang: 'en',
      }),
    ],
  });
  return TestBed.inject(TranslocoService);
}

async function activate(transloco: TranslocoService, lang: string): Promise<void> {
  await firstValueFrom(transloco.load(lang));
  transloco.setActiveLang(lang);
}

describe('provideI18n runtime wiring', () => {
  it('serves source-language translations from the registry (no HTTP)', async () => {
    const transloco = setup();
    await activate(transloco, 'en');
    expect(transloco.translate('app.welcome')).toBe('Welcome');
    expect(transloco.translate('app.nested.deep')).toBe('Deep');
  });

  it('serves other-locale translations and switches reactively', async () => {
    const transloco = setup();
    await activate(transloco, 'es');
    expect(transloco.translate('app.welcome')).toBe('Bienvenido');
    expect(transloco.translate('app.nested.deep')).toBe('Profundo');
  });

  it('falls back to the source locale for untranslated keys', async () => {
    const transloco = setup();
    await activate(transloco, 'es');
    expect(transloco.translate('app.enOnly')).toBe('Only English');
  });

  it('strips translator-comment siblings before they reach the store', async () => {
    const transloco = setup();
    await activate(transloco, 'en');
    // The real key resolves…
    expect(transloco.translate('app.greeting')).toBe('Hi');
    // …but the `.comment` sibling must never be retrievable.
    const comment = transloco.translate('app.greeting.comment');
    expect(comment).not.toBe('greeting context for translators');
  });

  // Regression: the interceptor dropped every flattened key ending in `.comment`.
  it('keeps real keys named `comment`', async () => {
    const transloco = setup();
    await activate(transloco, 'es');
    expect(transloco.translate('app.post.comment')).toBe('Comentario');
  });

  it('strips only comment siblings from flattened JSON (the HTTP loader path)', () => {
    expect(
      stripCommentKeys({
        'app.greeting': 'Hi',
        'app.greeting.comment': 'for translators',
        'app.post.comment': 'Comment',
      }),
    ).toEqual({ 'app.greeting': 'Hi', 'app.post.comment': 'Comment' });
  });

  // Regression: providing a missing handler replaced Transloco's default one,
  // so missing keys were never logged.
  it('warns once per missing key in dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const transloco = setup();
    transloco.translate('app.nope');
    transloco.translate('app.nope');
    expect(warn.mock.calls.filter(([msg]) => String(msg).includes(`'app.nope'`))).toHaveLength(1);
    warn.mockRestore();
  });

  it('surfaces missing keys via the visible missing handler in dev', () => {
    const transloco = setup();
    const result = transloco.translate('app.does.not.exist');
    // dev → `[key]`, prod → ''. Either way it must not be a real translation.
    expect(['', '[app.does.not.exist]']).toContain(result);
  });

  it('exposes the merged keys tree (TK) via the I18N_KEYS token', () => {
    setup();
    const keys = TestBed.inject(I18N_KEYS) as { app: { welcome: string; nested: { deep: string } } };
    expect(keys.app.welcome).toBe('app.welcome');
    expect(keys.app.nested.deep).toBe('app.nested.deep');
  });
});
