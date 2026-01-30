import { CurrencyPipe, DatePipe, DecimalPipe, JsonPipe, KeyValue, KeyValuePipe, LowerCasePipe, PercentPipe, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { PipeTransform, Type } from '@angular/core';

import { CurrencyCode } from './currency-codes.types';

// ============================================================================
// Built-in Pipe Registry - Angular's common pipes
// ============================================================================

/**
 * Registry of Angular's built-in pipes from @angular/common.
 * This is the base registry that can be extended by applications.
 */
export const BUILTIN_PIPE_REGISTRY = {
  date: DatePipe,
  uppercase: UpperCasePipe,
  lowercase: LowerCasePipe,
  titlecase: TitleCasePipe,
  currency: CurrencyPipe,
  number: DecimalPipe,
  percent: PercentPipe,
  json: JsonPipe,
  keyvalue: KeyValuePipe,
} as const;

/** Names of built-in pipes */
export type BuiltinPipeName = keyof typeof BUILTIN_PIPE_REGISTRY;

// ============================================================================
// Pipe Options - Named parameters for better DX
// ============================================================================

/** Date format string shorthand */
export type DateFormatString =
  | 'short'
  | 'medium'
  | 'long'
  | 'full'
  | 'shortDate'
  | 'mediumDate'
  | 'longDate'
  | 'fullDate'
  | 'shortTime'
  | 'mediumTime'
  | 'longTime'
  | 'fullTime'
  | (string & {});

/** Date pipe formatting options - accepts string shorthand or object */
export type DatePipeOptions =
  | DateFormatString
  | {
      format?: DateFormatString;
      timezone?: string;
      locale?: string;
    };

/** Currency pipe formatting options - accepts currency code string or object */
export type CurrencyPipeOptions =
  | CurrencyCode
  | {
      currencyCode?: CurrencyCode;
      display?: 'code' | 'symbol' | 'symbol-narrow';
      digitsInfo?: string;
      locale?: string;
    };

/** Number/Decimal pipe formatting options */
export interface NumberPipeOptions {
  digitsInfo?: string;
  locale?: string;
}

/** Percent pipe formatting options */
export interface PercentPipeOptions {
  digitsInfo?: string;
  locale?: string;
}

/** JSON pipe formatting options */
export interface JsonPipeOptions {
  space?: number | string;
}

/** KeyValue pipe formatting options */
export interface KeyValuePipeOptions<T = unknown> {
  compareFn?: (a: KeyValue<string, T>, b: KeyValue<string, T>) => number;
}

// ============================================================================
// Built-in Pipe Options Map
// ============================================================================

/** Built-in pipes that have configuration options */
export interface BuiltinPipesWithOptions {
  date: DatePipeOptions;
  currency: CurrencyPipeOptions;
  number: NumberPipeOptions;
  percent: PercentPipeOptions;
  json: JsonPipeOptions;
  keyvalue: KeyValuePipeOptions;
  [key: string]: unknown;
};

/** Built-in pipes that have no configuration options */
export type BuiltinPipesWithoutOptions = 'uppercase' | 'lowercase' | 'titlecase';

// ============================================================================
// Formatter Types - For configuring table columns, etc.
// ============================================================================

/**
 * A formatter configuration for a built-in pipe.
 */
export type BuiltinFormatter<K extends BuiltinPipeName = BuiltinPipeName> = K extends BuiltinPipesWithoutOptions
  ? readonly [K]
  : K extends keyof BuiltinPipesWithOptions
    ? readonly [K] | readonly [K, BuiltinPipesWithOptions[K]]
    : never;

/**
 * Union of all built-in formatter configurations.
 * A tuple like ['currency', { currencyCode: 'USD' }] or ['uppercase'].
 */
export type PipeFormatter = BuiltinFormatter<BuiltinPipeName>;

// ============================================================================
// Helper Functions for Built-in Pipes
// ============================================================================

/**
 * Type-safe formatter factory functions for built-in pipes.
 *
 * @example
 * import { fmt } from '..';
 *
 * formatters: {
 *   createdAt: fmt.date({ format: 'medium' }),
 *   price: fmt.currency({ currencyCode: 'USD' }),
 * }
 */
export const fmt = {
  date: (options?: DatePipeOptions): BuiltinFormatter<'date'> => (options ? ['date', options] : ['date']),
  uppercase: (): BuiltinFormatter<'uppercase'> => ['uppercase'],
  lowercase: (): BuiltinFormatter<'lowercase'> => ['lowercase'],
  titlecase: (): BuiltinFormatter<'titlecase'> => ['titlecase'],
  currency: (options?: CurrencyPipeOptions): BuiltinFormatter<'currency'> => (options ? ['currency', options] : ['currency']),
  number: (options?: NumberPipeOptions): BuiltinFormatter<'number'> => (options ? ['number', options] : ['number']),
  percent: (options?: PercentPipeOptions): BuiltinFormatter<'percent'> => (options ? ['percent', options] : ['percent']),
  json: (options?: JsonPipeOptions): BuiltinFormatter<'json'> => (options ? ['json', options] : ['json']),
  keyvalue: (options?: KeyValuePipeOptions): BuiltinFormatter<'keyvalue'> => (options ? ['keyvalue', options] : ['keyvalue']),
} as const;

// ============================================================================
// Extensible Types - For apps to extend with custom pipes
// ============================================================================

/**
 * Base type for a pipe registry. Apps can extend this with custom pipes.
 *
 * @example
 * // In your app:
 * export const APP_PIPE_REGISTRY = {
 *   ...BUILTIN_PIPE_REGISTRY,
 *   beautifyRoles: BeautifyRolesPipe,
 *   customFormat: MyCustomPipe,
 * } as const;
 */
export type PipeRegistry = Record<string, Type<PipeTransform>>;

/**
 * Creates a formatter type for a custom pipe registry.
 *
 * @example
 * type AppFormatter = CreateFormatter<typeof APP_PIPE_REGISTRY, AppPipesWithOptions, AppPipesWithoutOptions>;
 */
export type CreateFormatter<TRegistry extends PipeRegistry, TWithOptions extends Record<string, unknown>, TWithoutOptions extends string> = {
  [K in keyof TRegistry]: K extends TWithoutOptions ? readonly [K] : K extends keyof TWithOptions ? readonly [K] | readonly [K, TWithOptions[K]] : readonly [K];
}[keyof TRegistry];

// ============================================================================
// Utility Types
// ============================================================================

/** Generic options type for any pipe */
export type PipeOptions = Record<string, unknown>;

/** Convert options object to positional args */
export type OptionsToArgs<T extends PipeOptions> = T[keyof T][];

