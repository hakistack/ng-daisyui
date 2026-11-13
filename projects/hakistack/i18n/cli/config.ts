/**
 * CLI configuration loading.
 *
 * The codegen is config-driven (no `__dirname`-relative path assumptions baked
 * into the scripts). A consumer drops an `i18n.config.{ts,js,mjs,cjs,json}` at
 * their repo root; the CLI resolves all paths relative to that file (or CWD).
 */

import * as fs from 'fs';
import * as path from 'path';
import { createJiti } from 'jiti';

import { SOURCE_LANG } from '../engine/define-translations';

/** User-authored config shape (all fields optional — defaults applied). */
export interface I18nUserConfig {
  /** Directory scanned recursively for `*.i18n.ts`. Default: `src`. */
  srcRoot?: string;
  /** Directory the generated barrel/keys/directive land in. Default: `src/i18n/definitions`. */
  definitionsDir?: string;
  /** Directory the JSON translation files are written to. Default: `src/assets/i18n`. */
  outputDir?: string;
  /**
   * Every locale id the project supports, e.g. `['en', 'es']`. The source locale
   * `en` is always included (it is what `t()`'s first argument fills, and what
   * every other locale falls back to). Default: `['en']`.
   */
  locales?: string[];
  /** Import specifier for the library. Default: `@hakistack/i18n`. */
  packageName?: string;
  /** Selector for the generated typed directive. Default: `appTranslate`. */
  directiveSelector?: string;
  /** Class name for the generated typed directive. Default: `AppTranslateDirective`. */
  directiveClassName?: string;
}

/** Fully-resolved config (defaults applied, paths absolute). */
export interface I18nCliConfig {
  cwd: string;
  srcRoot: string;
  definitionsDir: string;
  outputDir: string;
  locales: string[];
  /** The source locale — always `'en'`, fixed by the engine's types. */
  sourceLang: typeof SOURCE_LANG;
  packageName: string;
  directiveSelector: string;
  directiveClassName: string;
}

const CONFIG_BASENAMES = [
  'i18n.config.ts',
  'i18n.config.mts',
  'i18n.config.cts',
  'i18n.config.js',
  'i18n.config.mjs',
  'i18n.config.cjs',
  'i18n.config.json',
];

const DEFAULTS = {
  srcRoot: 'src',
  definitionsDir: 'src/i18n/definitions',
  outputDir: 'src/assets/i18n',
  locales: ['en'],
  packageName: '@hakistack/i18n',
  directiveSelector: 'appTranslate',
  directiveClassName: 'AppTranslateDirective',
};

/** Find the config file in `cwd`, returning its absolute path or null. */
export function findConfigFile(cwd: string): string | null {
  for (const basename of CONFIG_BASENAMES) {
    const candidate = path.join(cwd, basename);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Load and resolve the CLI config. `overrides` win over both file and defaults. */
export async function loadConfig(cwd: string, overrides: Partial<I18nUserConfig> = {}): Promise<I18nCliConfig> {
  let fileConfig: I18nUserConfig = {};
  const configPath = findConfigFile(cwd);

  if (configPath) {
    if (configPath.endsWith('.json')) {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as I18nUserConfig;
    } else {
      const jiti = createJiti(__filename);
      const mod = (await jiti.import(configPath)) as { default?: I18nUserConfig } & I18nUserConfig;
      fileConfig = mod.default ?? mod;
    }
  }

  // `sourceLang` used to be accepted here, but the engine fixes the source
  // locale to `en` (`t()` stores its first argument under `en`). Reject anything
  // else loudly instead of validating every key as "missing".
  const legacySourceLang = (fileConfig as { sourceLang?: unknown }).sourceLang;
  if (legacySourceLang !== undefined && legacySourceLang !== SOURCE_LANG) {
    throw new Error(
      `i18n: 'sourceLang' is not configurable — the source locale is always '${SOURCE_LANG}' ` +
        `(t()'s first argument). Remove 'sourceLang' from ${configPath ?? 'the config'}.`,
    );
  }

  const merged = { ...DEFAULTS, ...stripUndefined(fileConfig), ...stripUndefined(overrides) };
  const requested = merged.locales && merged.locales.length > 0 ? merged.locales : DEFAULTS.locales;
  const locales = requested.includes(SOURCE_LANG) ? requested : [SOURCE_LANG, ...requested];

  return {
    cwd,
    srcRoot: path.resolve(cwd, merged.srcRoot),
    definitionsDir: path.resolve(cwd, merged.definitionsDir),
    outputDir: path.resolve(cwd, merged.outputDir),
    locales,
    sourceLang: SOURCE_LANG,
    packageName: merged.packageName,
    directiveSelector: merged.directiveSelector,
    directiveClassName: merged.directiveClassName,
  };
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
