import { Directive, EmbeddedViewRef, inject, TemplateRef, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, map, of, switchMap } from 'rxjs';

import type { KeyParams } from '@hakistack/i18n/engine';

import { I18N_KEYS } from './tokens';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * A translation key turned into a callable translate function. Keys whose
 * source text has `{{…}}` placeholders (`P`) require exactly those params.
 */
export type TranslateFn<P extends string = never> = ([P] extends [never]
  ? {
      /** Get the translated string. */
      (): string;
      /** Get the translated string with interpolation params. */
      (params: Record<string, unknown>): string;
    }
  : (params: { [N in P]: unknown }) => string) & {
  /** The raw translation key (dev only, for debugging). */
  readonly key: string;
};

/**
 * Recursively transforms a keys object (`TK`) shape:
 *   - string leaves become {@link TranslateFn} (typed with the key's params)
 *   - nested objects remain nested with transformed children
 */
export type TranslatedKeys<T> = {
  readonly [K in keyof T]: T[K] extends string
    ? TranslateFn<KeyParams<T[K]>>
    : T[K] extends Record<string, unknown>
      ? TranslatedKeys<T[K]>
      : never;
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
 * Consumers don't use this directly. The codegen emits a small wrapper that
 * extends this base, declares the `<selector>Prefix` input (Angular's
 * microsyntax binds `*appTranslate="let t; prefix: 'x'"` to `appTranslatePrefix`,
 * so the input's name must follow the configured selector), and pins the
 * template context type to *their* `typeof TK`:
 *
 * ```ts
 * import { TK } from './definitions';
 * @Directive({ selector: '[appTranslate]' })
 * export class AppTranslateDirective extends TranslateDirectiveBase {
 *   readonly appTranslatePrefix = input<string | undefined>(undefined);
 *   protected override prefix(): string | undefined {
 *     return this.appTranslatePrefix();
 *   }
 *   static ngTemplateContextGuard(_d: AppTranslateDirective, ctx: unknown): ctx is TranslateContext<typeof TK> {
 *     return true;
 *   }
 * }
 * ```
 *
 * **Loading:** the directive loads the active language itself (like
 * Transloco's own `*transloco`), creates its view once that load settles, and
 * re-renders after every language switch has loaded — no app initializer or
 * other translation consumer is required.
 *
 * **Optimizations:**
 * - JS Proxy for lazy property access (no upfront tree building).
 * - Proxy objects cached via WeakMap; translate fns cached per key via Map.
 * - One `markForCheck` per language change; no work in between.
 */
@Directive()
export class TranslateDirectiveBase {
  private readonly transloco = inject(TranslocoService);
  private readonly keys = inject(I18N_KEYS);
  private readonly templateRef = inject(TemplateRef<TranslateContext>);
  private readonly viewContainer = inject(ViewContainerRef);

  private viewRef: EmbeddedViewRef<TranslateContext> | null = null;

  private readonly proxyCache = new WeakMap<object, unknown>();
  private readonly translateFnCache = new Map<string, TranslateFn>();

  private readonly isDev = typeof ngDevMode !== 'undefined' && !!ngDevMode;

  /**
   * Optional prefix prepended to every key (for scoped translations).
   *
   * The base has no input of its own: the microsyntax binding name depends on
   * the selector, so the generated wrapper declares `<selector>Prefix` and
   * overrides this hook to return it. Read lazily (never during construction).
   */
  protected prefix(): string | undefined {
    return undefined;
  }

  private withPrefix(key: string): string {
    const prefix = this.prefix();
    return prefix ? `${prefix}.${key}` : key;
  }

  constructor() {
    this.transloco.langChanges$
      .pipe(
        // A failed load still renders: Transloco's fallback / missing handler take over.
        switchMap((lang) =>
          this.transloco.load(lang).pipe(
            map(() => lang),
            catchError(() => of(lang)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((lang) => this.render(lang));
  }

  private createLazyTranslationProxy(keysObject: Record<string, unknown>): TranslatedKeys<unknown> {
    const createProxy = (obj: Record<string, unknown>): unknown => {
      const cached = this.proxyCache.get(obj);
      if (cached) return cached;

      const proxy = new Proxy(obj, {
        get: (target, prop: string) => {
          const value = target[prop];

          if (typeof value === 'string') {
            const fullKey = this.withPrefix(value);

            const cachedFn = this.translateFnCache.get(fullKey);
            if (cachedFn) return cachedFn;

            // Missing keys are reported by the missing handler (dev warning + `[key]`).
            const translateFn = ((params?: Record<string, unknown>) => this.transloco.translate(fullKey, params)) as unknown as TranslateFn;

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

  private render(lang: string): void {
    if (this.viewRef) {
      this.viewRef.context.lang = lang;
      this.viewRef.markForCheck();
      return;
    }
    const context: TranslateContext = {
      $implicit: this.createLazyTranslationProxy(this.keys) as TranslatedKeys<Record<string, unknown>>,
      lang,
      translate: (key: string, params?: Record<string, unknown>) => this.transloco.translate(this.withPrefix(key), params),
    };
    this.viewRef = this.viewContainer.createEmbeddedView(this.templateRef, context);
  }
}
