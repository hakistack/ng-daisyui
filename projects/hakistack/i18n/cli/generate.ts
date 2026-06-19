/**
 * i18n JSON generation.
 *
 * Reads the registry (via jiti), extracts a per-language tree, and writes
 * `<outputDir>/<lang>.json` (full tree) plus per-scope `<scope>/<lang>.json`
 * files for scoped modules. These JSON files are translator-facing build
 * artifacts — the runtime uses the registry loader by default.
 */

import * as fs from 'fs';
import * as path from 'path';

import { isTranslationValue } from '../engine/define-translations';
import { buildLanguageTree, buildScopedTree, LanguageTree, scopeToFilesystemPath } from '../engine/build-tree';
import { I18nCliConfig } from './config';
import { loadRegistry } from './load-registry';

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

export async function runGenerate(config: I18nCliConfig): Promise<void> {
  console.log('\n🌐 i18n JSON generation\n' + '='.repeat(50));
  const registry = await loadRegistry(config);

  fs.mkdirSync(config.outputDir, { recursive: true });

  let totalKeys = 0;
  const translatedByLang: Record<string, number> = {};
  const missingByLang: Record<string, string[]> = {};
  for (const lang of config.locales) {
    translatedByLang[lang] = 0;
    missingByLang[lang] = [];
    for (const mod of registry) {
      const a = analyze(mod.translations as Record<string, unknown>, lang, config.sourceLang, mod.scope);
      if (lang === config.sourceLang) totalKeys += a.total;
      translatedByLang[lang] += a.translated;
      missingByLang[lang].push(...a.missing);
    }
  }

  const scopedModules = registry.filter((m) => m.scoped);

  for (const lang of config.locales) {
    const rootTree: LanguageTree = buildLanguageTree(registry, lang, config.sourceLang);
    const rootPath = path.join(config.outputDir, `${lang}.json`);
    fs.writeFileSync(rootPath, JSON.stringify(rootTree, null, 2) + '\n');
    console.log(`✓ ${path.relative(config.cwd, rootPath)}`);

    for (const mod of scopedModules) {
      const scopedTree = buildScopedTree(registry, lang, config.sourceLang, mod.scope);
      if (!scopedTree) continue;
      const scopeDir = path.join(config.outputDir, scopeToFilesystemPath(mod.scope));
      fs.mkdirSync(scopeDir, { recursive: true });
      const scopePath = path.join(scopeDir, `${lang}.json`);
      fs.writeFileSync(scopePath, JSON.stringify(scopedTree, null, 2) + '\n');
      console.log(`✓ ${path.relative(config.cwd, scopePath)}`);
    }
  }

  console.log('\n📊 Coverage\n' + `Total keys: ${totalKeys}`);
  for (const lang of config.locales) {
    const translated = translatedByLang[lang];
    const pct = totalKeys > 0 ? Math.round((translated / totalKeys) * 100) : 100;
    console.log(`${pct === 100 ? '✓' : '⚠'} ${lang.toUpperCase()}: ${translated}/${totalKeys} (${pct}%)`);
    const missing = missingByLang[lang];
    if (missing.length && lang !== config.sourceLang) {
      console.log(
        `  Missing ${missing.length}: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? `, … +${missing.length - 3}` : ''}`,
      );
    }
  }
  console.log('\n✓ Generation complete.\n');
}
