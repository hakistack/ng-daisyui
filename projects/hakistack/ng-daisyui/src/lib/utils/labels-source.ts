import {
  EnvironmentProviders,
  InjectionToken,
  Signal,
  computed,
  inject,
  isSignal,
  makeEnvironmentProviders,
  signal,
  untracked,
} from '@angular/core';

/**
 * What an app-wide `provide*Labels()` function accepts, in one of three forms:
 *
 * - **A labels object.** Fixed text (the original form).
 * - **A `Signal` of labels.** Components follow it: when the signal changes (for
 *   example on a language switch) they re-render, OnPush included.
 * - **A function.** Called once, the first time a component needs the labels, in an
 *   injection context and outside any reactive context, so it may call `inject()`,
 *   `toSignal()` or a translation library's `translateSignal()`. Return a `Signal`
 *   (usually a `computed()` over translation signals) to follow language switches, or
 *   a plain object for text that is fixed but needs something injected.
 *
 * Works with any i18n library, or none: components only read signals.
 *
 * @example
 * // Follows Transloco / @hakistack/i18n language switches
 * provideHkDataGridLabels(() => {
 *   const empty = translateSignal('grid.empty');
 *   const search = translateSignal('grid.search');
 *   return computed(() => ({ empty: empty(), searchPlaceholder: search() }));
 * });
 */
export type HkLabelsSource<T> = T | Signal<T> | (() => T | Signal<T>);

/**
 * Turns an {@link HkLabelsSource} into a `Signal`. A function source is called here,
 * untracked, so call this from an injection context.
 */
export function toLabelsSignal<T>(source: HkLabelsSource<T>): Signal<T> {
  if (isSignal(source)) return source;
  if (typeof source === 'function') {
    const result = untracked(source as () => T | Signal<T>);
    return isSignal(result) ? result : signal(result).asReadonly();
  }
  return signal(source).asReadonly();
}

/**
 * Environment providers that register a labels source under `token`. A function source
 * runs once, in the environment injector, when the token is first injected; every
 * component instance then shares the same signal.
 */
export function provideLabelsSource<T>(token: InjectionToken<HkLabelsSource<T>>, source: HkLabelsSource<T>): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: token, useFactory: () => toLabelsSignal(source) }]);
}

/**
 * Injects an optional labels token as a `Signal` (`null` when nothing is provided). Read
 * it inside a `computed()` so a signal source re-renders the component. Also accepts a
 * value registered directly with `{ provide: TOKEN, useValue }`, in any of the three
 * forms. Call from an injection context, such as a field initializer.
 */
export function injectLabels<T>(token: InjectionToken<HkLabelsSource<T>>): Signal<T | null> {
  const source = inject(token, { optional: true });
  return source == null ? computed(() => null) : toLabelsSignal(source);
}
