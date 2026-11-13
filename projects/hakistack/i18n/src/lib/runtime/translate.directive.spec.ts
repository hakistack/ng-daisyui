import { ChangeDetectionStrategy, Component, Directive, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { defineTranslations, t } from '../../../engine/define-translations';
import { provideI18n } from './provide-i18n';
import { TranslateContext, TranslateDirectiveBase } from './translate.directive';

const USERS = defineTranslations('users', { title: t('Plain users') });
const ADMIN_USERS = defineTranslations('admin.users', { title: t('Admin users') });
const REGISTRY = [USERS, ADMIN_USERS] as const;

/** Mirrors the `TK` literal `hakistack-i18n scan` emits for these modules. */
const TK = {
  admin: { users: ADMIN_USERS.keys },
  users: USERS.keys,
} as const;

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
