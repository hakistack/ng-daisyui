import { ChangeDetectionStrategy, Component, computed, Directive, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';

import { defineTranslations, t } from '../../../engine/define-translations';
import type { I18nKey } from '../../../engine/key-types';
import { provideI18n } from './provide-i18n';
import { TranslateContext, TranslateDirectiveBase } from './translate.directive';
import { translateSignal } from './translate-signal';

const HOME = defineTranslations('home', {
  welcome: t('Welcome, {{ username }}!', { es: '¡Bienvenido, {{username}}!' }),
  plain: t('Hello', { es: 'Hola' }),
});
/** What `hakistack-i18n scan` emits for HOME: params read from the t() source text. */
const TK = {
  home: {
    welcome: 'home.welcome' as I18nKey<'home.welcome', 'username'>,
    plain: 'home.plain',
  },
} as const;

@Directive({ selector: '[hkT]' })
class TypedTranslateDirective extends TranslateDirectiveBase {
  readonly hkTPrefix = input<string | undefined>(undefined);
  protected override prefix(): string | undefined {
    return this.hkTPrefix();
  }
  static ngTemplateContextGuard(_dir: TypedTranslateDirective, ctx: unknown): ctx is TranslateContext<typeof TK> {
    return true;
  }
}

@Component({
  imports: [TypedTranslateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Strict templates type-check `t.home.welcome(...)` against the key's params.
  template: `<span id="tpl" *hkT="let t">{{ t.home.welcome({ username: 'Ana' }) }} {{ t.home.plain() }}</span>
    <span id="sig">{{ welcome() }}</span
    ><span id="reactive">{{ reactive() }}</span>`,
})
class TypedHostComponent {
  readonly name = signal('Ana');
  readonly welcome = translateSignal(TK.home.welcome, { username: 'Ana' });
  readonly reactive = translateSignal(
    TK.home.welcome,
    computed(() => ({ username: this.name() })),
  );
  readonly plain = translateSignal(TK.home.plain);
}

/** Compile-time checks only (never called): each line must fail to type-check. */
export function typedParamsCompileErrors(): void {
  // @ts-expect-error — the key has a {{username}} placeholder: params are required
  translateSignal(TK.home.welcome);
  // @ts-expect-error — unknown param name
  translateSignal(TK.home.welcome, { user: 'x' });
  // @ts-expect-error — a key without placeholders still accepts params, but not a non-object
  translateSignal(TK.home.plain, 42);
  translateSignal('dynamic.key', { anything: 1 }); // plain string keys stay untyped
}

const text = (fixture: ComponentFixture<unknown>, id: string) =>
  (fixture.nativeElement as HTMLElement).querySelector(`#${id}`)?.textContent?.trim();

describe('typed key params', () => {
  it('types the key with its placeholders and still translates through Transloco', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideI18n({
          registry: [HOME],
          languages: [
            { id: 'en', label: 'English' },
            { id: 'es', label: 'Español' },
          ],
        }),
      ],
    });
    const fixture = TestBed.createComponent(TypedHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text(fixture, 'tpl')).toBe('Welcome, Ana! Hello');
    expect(text(fixture, 'sig')).toBe('Welcome, Ana!');

    fixture.componentInstance.name.set('Luis');
    TestBed.inject(TranslocoService).setActiveLang('es');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text(fixture, 'reactive')).toBe('¡Bienvenido, Luis!');
    expect(text(fixture, 'tpl')).toBe('¡Bienvenido, Ana! Hola');
  });
});
