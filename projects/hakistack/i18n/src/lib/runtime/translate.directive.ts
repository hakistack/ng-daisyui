import { Directive, EmbeddedViewRef, effect, inject, input, TemplateRef, untracked, ViewContainerRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';

import { I18N_KEYS } from './tokens';

// =============================================================================
// Type Definitions
// =============================================================================

/** A translation key string transformed into a callable translate function. */
export interface TranslateFn {
  /** Get the translated string. */
  (): string;
  /** Get the translated string with interpolation params. */
  (params: Record<string, unknown>): string;
  /** The raw translation key (dev only, for debugging). */
  readonly key: string;
}

/**
 * Recursively transforms a keys object (`TK`) shape:
 *   - string leaves become {@link TranslateFn}
 *   - nested objects remain nested with transformed children
 */
export type TranslatedKeys<T> = {
  readonly [K in keyof T]: T[K] extends string ? TranslateFn : T[K] extends Record<string, unknown> ? TranslatedKeys<T[K]> : never;
};

/**
 * Context exposed to the template by the translate directive.
 *
 * Generic over the consumer's `TK` shape. The library ships the untyped base
 * (`TranslateContext<Record<string, unknown>>`); the scanner-generated consumer
 * wrapper pins `T = typeof TK` so templates get full autocomplete.
 */
export interface TranslateContext<T = Record<string, unknown>> {
  /**
   * Typed translation object with full autocomplete.
   *
   * @example
   * {{ t.common.buttons.save() }}
   * {{ t.common.validation.minLength({ min: 3 }) }}
   */
  $implicit: TranslatedKeys<T>;
  /** Current active language code. */
  lang: string;
  /** Raw translate function for dynamic keys (escape hatch). */
  translate: (key: string, params?: Record<string, unknown>) => string;
}

// =============================================================================
// Directive base
// =============================================================================

/**
 * Untyped/generic core of the structural translate directive.
 *
 * The library can't reference a consumer-generated `TK`, so this base injects
 * the keys object via the {@link I18N_KEYS} token (provided by `provideI18n`)
 * and builds its lazy proxy over it. Casing is irrelevant — it reads string
 * leaves and calls `transloco.translate(leaf)`.
 *
 * Consumers don't use this directly. The codegen emits a ~10-line wrapper that
 * extends this base and pins the template context type to *their* `typeof TK`:
 *
 * ```ts
 * import { TK } from './definitions';
 * @Directive({ selector: '[appTranslate]' })
 * export class AppTranslateDirective extends TranslateDirectiveBase {
 *   static ngTemplateContextGuard(_d: AppTranslateDirective, ctx: unknown): ctx is TranslateContext<typeof TK> {
 *     return true;
 *   }
 * }
 * ```
 *
 * **Optimizations** (carried over from the original directive):
 * - JS Proxy for lazy property access (no upfront tree building).
 * - Proxy objects cached via WeakMap; translate fns cached per key via Map.
 * - Signal-driven language reactivity (`toSignal` + `effect`), CD only on change.
 */
@Directive()
export class TranslateDirectiveBase {
  private readonly transloco = inject(TranslocoService);
  private readonly keys = inject(I18N_KEYS);
  private readonly templateRef = inject(TemplateRef<TranslateContext>);
  private readonly viewContainer = inject(ViewContainerRef);

  private viewRef: EmbeddedViewRef<TranslateContext> | null = null;

  /** Tracks the current language (auto-updates on language change). */
  private readonly currentLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  private readonly proxyCache = new WeakMap<object, unknown>();
  private readonly translateFnCache = new Map<string, TranslateFn>();

  private readonly isDev = typeof ngDevMode !== 'undefined' && !!ngDevMode;
  private readonly warnedKeys = this.isDev ? new Set<string>() : null;

  /**
   * Optional prefix prepended to every key (for scoped translations).
   * @example *appTranslate="let t; prefix: 'admin'"
   */
  readonly appTranslatePrefix = input<string | undefined>(undefined);

  constructor() {
    this.createView();
    this.setupLangChangeEffect();
  }

  private createLazyTranslationProxy(keysObject: Record<string, unknown>): TranslatedKeys<unknown> {
    const createProxy = (obj: Record<string, unknown>): unknown => {
      const cached = this.proxyCache.get(obj);
      if (cached) return cached;

      const proxy = new Proxy(obj, {
        get: (target, prop: string) => {
          const value = target[prop];

          if (typeof value === 'string') {
            const fullKey = this.appTranslatePrefix() ? `${this.appTranslatePrefix()}.${value}` : value;

            const cachedFn = this.translateFnCache.get(fullKey);
            if (cachedFn) return cachedFn;

            const translateFn = ((params?: Record<string, unknown>) => {
              const result = this.transloco.translate(fullKey, params);
              if (this.isDev && result === fullKey && !this.warnedKeys!.has(fullKey)) {
                console.warn(`[TranslateDirective] Missing translation: "${fullKey}"`);
                this.warnedKeys!.add(fullKey);
              }
              return result;
            }) as TranslateFn;

            if (this.isDev) {
              Object.defineProperty(translateFn, 'key', { value, writable: false, enumerable: false });
            }

            this.translateFnCache.set(fullKey, translateFn);
            return translateFn;
          }

          if (typeof value === 'object' && value !== null) {
            return createProxy(value as Record<string, unknown>);
          }

          if (this.isDev) {
            console.warn(`[TranslateDirective] Invalid property "${String(prop)}" on translation object`);
          }
          return undefined;
        },
      });

      this.proxyCache.set(obj, proxy);
      return proxy;
    };

    return createProxy(keysObject) as TranslatedKeys<unknown>;
  }

  private createView(): void {
    const translationsProxy = this.createLazyTranslationProxy(this.keys);

    const context: TranslateContext = {
      $implicit: translationsProxy as TranslatedKeys<Record<string, unknown>>,
      lang: this.currentLang(),
      translate: (key: string, params?: Record<string, unknown>) => {
        const fullKey = this.appTranslatePrefix() ? `${this.appTranslatePrefix()}.${key}` : key;
        return this.transloco.translate(fullKey, params);
      },
    };

    this.viewRef = this.viewContainer.createEmbeddedView(this.templateRef, context);
  }

  private setupLangChangeEffect(): void {
    effect(() => {
      const newLang = this.currentLang();
      untracked(() => {
        if (this.viewRef) {
          this.viewRef.context.lang = newLang;
          this.viewRef.markForCheck();
        }
      });
    });
  }
}
