/**
 * i18n JSON generation.
 *
 * Reads the registry (via jiti), extracts a per-language tree, and writes
 * `<outputDir>/<lang>.json` (full tree) plus per-scope `<scope>/<lang>.json`
 * files for scoped modules. These JSON files are translator-facing build
 * artifacts — the runtime uses the registry loader by default.
 */

import * as path from 'path';

import { findKeyConflicts, isTranslationValue, SOURCE_LANG, TranslationModule } from '../engine/define-translations';
import { buildLanguageTree, buildScopedTree, scopeToFilesystemPath } from '../engine/build-tree';
import { I18nCliConfig } from './config';
import { loadRegistry } from './load-registry';
import { syncOutputs } from './output';
import { createKeyLocator, describeConflict } from './report';

function analyze(
  translations: Record<string, unknown>,
  lang: string,
  defaultLang: string,
  prefix = '',
): { total: number; translated: number; missing: string[] } {
  let total = 0;
  let translated = 0;
  const missing: string[] = [];
  for (const [key, value] of Object.entries(translations)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    if (isTranslationValue(value)) {
      total++;
      if ((value as Record<string, string | undefined>)[lang]) {
        translated++;
      } else if (lang !== defaultLang) {
        missing.push(currentPath);
      }
    } else if (typeof value === 'object' && value !== null) {
      const nested = analyze(value as Record<string, unknown>, lang, defaultLang, currentPath);
      total += nested.total;
      translated += nested.translated;
      missing.push(...nested.missing);
    }
  }
  return { total, translated, missing };
}

/** Write the JSON files. Returns `true` on success. `quiet` prints changes and errors only. */
export async function runGenerate(config: I18nCliConfig, opts: { quiet?: boolean } = {}): Promise<boolean> {
  const info = opts.quiet ? () => undefined : (m: string) => console.log(m);
  info('\n🌐 i18n JSON generation\n' + '='.repeat(50));
  const registry = await loadRegistry(config);

  const conflicts = findKeyConflicts(registry);
  if (conflicts.length) {
    const locate = createKeyLocator(config);
    const lines = conflicts.map((c) => `  ${describeConflict(c, locate(c.key))}`).join('\n');
    console.error(`\n❌ ${conflicts.length} key conflict(s) — nothing was written:\n${lines}\n`);
    process.exitCode = 1;
    return false;
  }

  let totalKeys = 0;
  const translatedByLang: Record<string, number> = {};
  const missingByLang: Record<string, string[]> = {};
  for (const lang of config.locales) {
    translatedByLang[lang] = 0;
    missingByLang[lang] = [];
    for (const mod of registry) {
      const a = analyze(mod.translations as Record<string, unknown>, lang, SOURCE_LANG, mod.scope);
      if (lang === SOURCE_LANG) totalKeys += a.total;
      translatedByLang[lang] += a.translated;
      missingByLang[lang].push(...a.missing);
    }
  }

  // Deterministic set of outputs: root tree per locale + one tree per scoped scope.
  const scopes = [...new Set(registry.filter((m) => m.scoped).map((m) => m.scope))].sort();
  const outputs: { file: string; content: string }[] = [];
  const json = (tree: unknown) => JSON.stringify(tree, null, 2) + '\n';
  for (const lang of config.locales) {
    outputs.push({ file: path.join(config.outputDir, `${lang}.json`), content: json(buildLanguageTree(registry, lang, SOURCE_LANG)) });
    for (const scope of scopes) {
      outputs.push({
        file: path.join(config.outputDir, scopeToFilesystemPath(scope), `${lang}.json`),
        content: json(buildScopedTree(registry, lang, SOURCE_LANG, scope)),
      });
    }
  }

  const results = [
    syncOutputs(config.cwd, `json:${config.outputDir}`, config.outputDir, outputs),
    syncOutputs(config.cwd, `translations:${config.definitionsDir}`, config.definitionsDir, translationModules(config, registry, scopes)),
  ];
  const rel = (f: string) => path.relative(config.cwd, f);
  for (const f of results.flatMap((r) => r.written)) console.log(`✓ ${rel(f)}`);
  for (const f of results.flatMap((r) => r.removed)) console.log(`✗ ${rel(f)} (stale — removed)`);
  const unchanged = results.reduce((n, r) => n + r.unchanged.length, 0);
  if (unchanged) info(`= ${unchanged} file(s) unchanged`);

  info('\n📊 Coverage\n' + `Total keys: ${totalKeys}`);
  for (const lang of config.locales) {
    const translated = translatedByLang[lang];
    const pct = totalKeys > 0 ? Math.round((translated / totalKeys) * 100) : 100;
    info(`${pct === 100 ? '✓' : '⚠'} ${lang.toUpperCase()}: ${translated}/${totalKeys} (${pct}%)`);
    const missing = missingByLang[lang];
    if (missing.length && lang !== SOURCE_LANG) {
      info(`  Missing ${missing.length}: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? `, … +${missing.length - 3}` : ''}`);
    }
  }
  info('\n✓ Generation complete.\n');
  return true;
}

// =============================================================================
// translations.generated.ts — per-language modules for lazy loading
// =============================================================================

const NO_COMMENTS = { comments: false };
const HEADER = (file: string) =>
  `/**\n * AUTO-GENERATED — do not edit by hand (${file}).\n *\n * Produced by \`hakistack-i18n generate\`.\n */\n`;

/**
 * One TS module per language (and per scoped scope) plus `translations.generated.ts`,
 * which maps each to a dynamic `import()`. With
 * `provideI18n({ keys: TK, translations: TRANSLATIONS })` the bundler emits one
 * chunk per language and the app never imports the `*.i18n.ts` modules, so only
 * the active language is downloaded. Translator comments are left out.
 */
function translationModules(
  config: I18nCliConfig,
  registry: readonly TranslationModule[],
  scopes: string[],
): { file: string; content: string }[] {
  const dir = path.join(config.definitionsDir, 'translations');
  const files: { file: string; content: string }[] = [];
  const loader = (rel: string) => `() => import('./translations/${rel}.generated')`;
  const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

  const root: string[] = [];
  const scoped: string[] = [];
  for (const lang of config.locales) {
    files.push({
      file: path.join(dir, `${lang}.generated.ts`),
      content: dataModule(`${lang}.generated.ts`, buildLanguageTree(registry, lang, SOURCE_LANG, NO_COMMENTS)),
    });
    root.push(`    ${q(lang)}: ${loader(lang)},`);
  }
  for (const scope of scopes) {
    const scopePath = scopeToFilesystemPath(scope);
    scoped.push(`    ${q(scopePath)}: {`);
    for (const lang of config.locales) {
      const rel = `${scopePath}/${lang}`;
      files.push({
        file: path.join(dir, `${rel}.generated.ts`),
        content: dataModule(`${lang}.generated.ts`, buildScopedTree(registry, lang, SOURCE_LANG, scope, NO_COMMENTS)),
      });
      scoped.push(`      ${q(lang)}: ${loader(rel)},`);
    }
    scoped.push('    },');
  }

  const index = [
    HEADER('translations.generated.ts'),
    `import type { I18nTranslationLoaders } from '${config.packageName}';`,
    '',
    '/**',
    ' * Per-language translation loaders. Pass to `provideI18n({ keys: TK, translations: TRANSLATIONS })`',
    ' * so each language is its own lazily loaded chunk.',
    ' */',
    'export const TRANSLATIONS: I18nTranslationLoaders = {',
    '  root: {',
    ...root,
    '  },',
    ...(scoped.length ? ['  scopes: {', ...scoped, '  },'] : []),
    '};',
    '',
  ].join('\n');
  files.push({ file: path.join(config.definitionsDir, 'translations.generated.ts'), content: index });
  return files;
}

function dataModule(file: string, tree: unknown): string {
  return `${HEADER(file)}export default ${JSON.stringify(tree, null, 2)};\n`;
}
