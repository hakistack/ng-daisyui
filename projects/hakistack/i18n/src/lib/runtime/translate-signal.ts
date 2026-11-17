import { Signal } from '@angular/core';
import { translateSignal as translocoTranslateSignal } from '@jsverse/transloco';

import type { KeyParams, ParamsOf } from '@hakistack/i18n/engine';

type TranslocoArgs = Parameters<typeof translocoTranslateSignal>;
type Key = TranslocoArgs[0];
type Lang = TranslocoArgs[2];
type Injector = TranslocoArgs[3];
type UntypedParams = TranslocoArgs[1];

/** Params of a key with placeholders: every name required, as a value or as a signal of the whole object. */
type RequiredParams<K> = ParamsOf<K> | Signal<ParamsOf<K>>;

/** Remaining arguments: params are required (and checked) when the key declares placeholders. */
export type TranslateSignalArgs<K> = [KeyParams<K>] extends [never]
  ? [params?: UntypedParams, lang?: Lang, injector?: Injector]
  : [params: RequiredParams<K>, lang?: Lang, injector?: Injector];

type TranslateSignalRef<K> = K extends readonly unknown[] | Signal<string[]> ? Signal<string[]> : Signal<string>;

/**
 * Transloco's `translateSignal`, with interpolation params checked against the
 * key: for `TK.home.welcome` generated from `t('Welcome, {{username}}!')`,
 * `translateSignal(TK.home.welcome)` is a compile error and
 * `translateSignal(TK.home.welcome, { username })` is required. Plain keys,
 * key arrays and key signals keep Transloco's signature. Runtime behavior is
 * Transloco's (same arguments, same reactivity).
 */
export function translateSignal<K extends Key>(key: K, ...args: TranslateSignalArgs<K>): TranslateSignalRef<K> {
  const [params, lang, injector] = args as [UntypedParams?, Lang?, Injector?];
  return translocoTranslateSignal(key, params, lang, injector) as TranslateSignalRef<K>;
}
