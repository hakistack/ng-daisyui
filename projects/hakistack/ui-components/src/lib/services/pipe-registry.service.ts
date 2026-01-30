import { inject, Injectable, InjectionToken, Injector, PipeTransform, Type } from '@angular/core';

import { PipeFormatter, BUILTIN_PIPE_REGISTRY, BuiltinPipeName, BuiltinPipesWithOptions, PipeRegistry } from '../types/base-pipes.type';

/**
 * Injection token for extending the pipe registry with custom pipes.
 *
 * @example
 * // In app.config.ts or a module:
 * providers: [
 *   {
 *     provide: CUSTOM_PIPES,
 *     useValue: {
 *       beautifyRoles: BeautifyRolesPipe,
 *       myCustomPipe: MyCustomPipe,
 *     }
 *   }
 * ]
 */
export const CUSTOM_PIPES = new InjectionToken<PipeRegistry>('CUSTOM_PIPES');

/**
 * Service for applying Angular pipes programmatically.
 * Supports both built-in Angular pipes and custom pipes registered via CUSTOM_PIPES token.
 *
 * @example
 * // In a component or service:
 * private pipeRegistry = inject(PipeRegistryService);
 *
 * // Apply a formatter tuple
 * const formatted = this.pipeRegistry.apply('2026-01-15', ['date', { format: 'medium' }]);
 *
 * // With helper
 * import { builtinFmt } from '..';
 * const formatted = this.pipeRegistry.apply('hello', builtinFmt.uppercase());
 *
 * // Direct transform
 * const result = this.pipeRegistry.transform('date', new Date(), { format: 'short' });
 */
@Injectable({
  providedIn: 'root',
})
export class PipeRegistryService {
  private readonly injector = inject(Injector);
  private readonly customPipes = inject(CUSTOM_PIPES, { optional: true });
  private readonly pipeCache = new Map<string, PipeTransform>();

  /** Combined registry of built-in and custom pipes */
  private readonly registry: PipeRegistry;

  constructor() {
    this.registry = {
      ...BUILTIN_PIPE_REGISTRY,
      ...(this.customPipes ?? {}),
    };
  }

  /**
   * Gets a pipe instance, creating and caching it if necessary.
   * Uses inject() to properly resolve pipe dependencies (like LOCALE_ID for CurrencyPipe).
   */
  private getPipe(name: string): PipeTransform {
    let pipe = this.pipeCache.get(name);

    if (!pipe) {
      const PipeClass = this.registry[name] as Type<PipeTransform> | undefined;

      if (!PipeClass) {
        throw new Error(`Pipe "${name}" is not registered. Register it via CUSTOM_PIPES provider.`);
      }

      // Use inject() to properly resolve pipe dependencies via Angular's DI
      pipe = this.injector.get(PipeClass);
      this.pipeCache.set(name, pipe);
    }

    return pipe;
  }

  /**
   * Transforms a value using a named pipe with options.
   *
   * @param pipeName - The pipe to use
   * @param value - The value to transform
   * @param options - Pipe-specific options (optional)
   * @returns The transformed value
   *
   * @example
   * this.pipeRegistry.transform('date', new Date(), { format: 'medium' });
   * this.pipeRegistry.transform('currency', 1234.56, { currencyCode: 'USD' });
   * this.pipeRegistry.transform('uppercase', 'hello');
   */
  transform<K extends BuiltinPipeName>(pipeName: K, value: unknown, options?: K extends keyof BuiltinPipesWithOptions ? BuiltinPipesWithOptions[K] : never): string;
  transform(pipeName: string, value: unknown, options?: Record<string, unknown>): string;
  transform(pipeName: string, value: unknown, options?: Record<string, unknown>): string {
    // Handle null/undefined/empty values gracefully
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const pipe = this.getPipe(pipeName);
    const args = this.optionsToArgs(pipeName, options);

    try {
      return pipe.transform(value, ...args) ?? '';
    } catch {
      // If pipe fails (e.g., invalid value for currency), return empty string
      return '';
    }
  }

  /**
   * Applies a formatter tuple to a value.
   * Useful when formatters are configured elsewhere (e.g., table columns).
   *
   * @param value - The value to transform
   * @param formatter - Formatter tuple [pipeName, options?]
   * @returns The transformed value
   *
   * @example
   * import { builtinFmt } from '..';
   *
   * this.pipeRegistry.apply(new Date(), ['date', { format: 'medium' }]);
   * this.pipeRegistry.apply('hello', builtinFmt.uppercase());
   */
  apply(value: unknown, formatter: PipeFormatter | readonly [string, ...unknown[]]): string {
    // Handle null/undefined/empty values gracefully
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const pipeName = formatter[0] as string;
    const options = formatter.length > 1 ? formatter[1] : undefined;
    const pipe = this.getPipe(pipeName);
    const args = this.optionsToArgs(pipeName, options as Record<string, unknown> | undefined);

    try {
      return pipe.transform(value, ...args) ?? '';
    } catch {
      // If pipe fails (e.g., invalid value for currency), return empty string
      return '';
    }
  }

  /**
   * Converts options object to positional arguments for Angular pipes.
   * Filters out trailing undefined values to let pipes use their defaults.
   */
  private optionsToArgs(pipeName: string, options?: Record<string, unknown>): unknown[] {
    if (!options) {
      return [];
    }

    let args: unknown[];

    switch (pipeName) {
      case 'date':
        args = [options['format'], options['timezone'], options['locale']];
        break;

      case 'currency':
        args = [options['currencyCode'], options['display'], options['digitsInfo'], options['locale']];
        break;

      case 'number':
      case 'percent':
        args = [options['digitsInfo'], options['locale']];
        break;

      case 'json':
        args = [options['space']];
        break;

      case 'keyvalue':
        args = [options['compareFn']];
        break;

      default:
        // For custom pipes, pass all option values as positional args
        return Object.values(options);
    }

    // Remove trailing undefined values to let pipes use their defaults
    while (args.length > 0 && args[args.length - 1] === undefined) {
      args.pop();
    }

    return args;
  }

  /**
   * Checks if a pipe is registered.
   */
  has(pipeName: string): boolean {
    return pipeName in this.registry;
  }

  /**
   * Gets all registered pipe names.
   */
  getRegisteredPipes(): string[] {
    return Object.keys(this.registry);
  }

  /**
   * Gets only built-in pipe names.
   */
  getBuiltinPipes(): BuiltinPipeName[] {
    return Object.keys(BUILTIN_PIPE_REGISTRY) as BuiltinPipeName[];
  }

  /**
   * Gets only custom pipe names.
   */
  getCustomPipes(): string[] {
    return Object.keys(this.customPipes ?? {});
  }
}
