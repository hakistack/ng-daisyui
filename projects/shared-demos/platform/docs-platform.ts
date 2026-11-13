import { InjectionToken, Provider } from '@angular/core';

/**
 * Turns shared demo pages into full documentation pages (overview, playground,
 * generated API, accessibility, technical tabs). Provided by the main (v5)
 * docs app; the v4 compatibility demo does not provide it and keeps the
 * classic Examples/API layout.
 */
export const DOCS_PLATFORM = new InjectionToken<boolean>('DOCS_PLATFORM');

export function provideDocsPlatform(): Provider[] {
  return [{ provide: DOCS_PLATFORM, useValue: true }];
}
