/**
 * i18n validation — build-time gate.
 *
 * Errors (exit 1):
 *   - Missing/empty English (source) translation.
 *   - Placeholder parity broken across locales for a `{{…}}` string.
 *   - Empty non-source translation value.
 * Warnings: missing non-source translation (will fall back).
 * Stubs (report only): English-only leaves — discoverable, never blocking.
 */

import { isTranslationValue, TranslationModule } from '../engine/define-translations';
import { I18nCliConfig } from './config';
import { loadRegistry } from './load-registry';

interface ValidationError {
  module: string;
  key: string;
  language: string;
  issue: string;
  severity: 'error' | 'warning';
}
interface Stub {
  module: string;
  key: string;
}

function extractPlaceholders(text: string): string[] {
  return (text.match(/\{\{[^}]+}}/g) || []).sort();
}
function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function validateNode(
  obj: Record<string, unknown>,
  moduleName: string,
  locales: string[],
  defaultLang: string,
  errors: ValidationError[],
  stubs: Stub[],
  keyPath: string[] = [],
): void {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = [...keyPath, key];
    const fullKey = currentPath.join('.');

    if (isTranslationValue(value)) {
      const byLang = value as Record<string, string | undefined>;
      const source = byLang[defaultLang];

      if (!source || source.trim() === '') {
        errors.push({
          module: moduleName,
          key: fullKey,
          language: defaultLang,
          issue: `Missing or empty required ${defaultLang} translation`,
          severity: 'error',
        });
        continue;
      }

      const srcPlaceholders = extractPlaceholders(source);
      const srcHasPlaceholders = srcPlaceholders.length > 0;
      let hasAnyOtherLocale = false;

      for (const lang of locales) {
        if (lang === defaultLang) continue;
        const translation = byLang[lang];

        if (!translation) {
          errors.push({
            module: moduleName,
            key: fullKey,
            language: lang,
            issue: srcHasPlaceholders
              ? `Missing translation for placeholder string. Strings containing {{…}} require parity in every locale.`
              : 'Missing translation (will fallback)',
            severity: srcHasPlaceholders ? 'error' : 'warning',
          });
          continue;
        }
        hasAnyOtherLocale = true;

        if (translation.trim() === '') {
          errors.push({ module: moduleName, key: fullKey, language: lang, issue: 'Empty translation value', severity: 'error' });
          continue;
        }

        const langPlaceholders = extractPlaceholders(translation);
        if (!arraysEqual(srcPlaceholders, langPlaceholders)) {
          errors.push({
            module: moduleName,
            key: fullKey,
            language: lang,
            issue: `Placeholder mismatch. ${defaultLang.toUpperCase()}: [${srcPlaceholders.join(', ')}] | ${lang.toUpperCase()}: [${langPlaceholders.join(', ')}]`,
            severity: 'error',
          });
        }
      }

      if (!hasAnyOtherLocale && locales.length > 1) {
        stubs.push({ module: moduleName, key: fullKey });
      }
    } else if (typeof value === 'object' && value !== null) {
      validateNode(value as Record<string, unknown>, moduleName, locales, defaultLang, errors, stubs, currentPath);
    }
  }
}

export async function runValidate(config: I18nCliConfig): Promise<void> {
  console.log('\n🔍 i18n validation\n' + '='.repeat(50));
  const registry = await loadRegistry(config);

  const errors: ValidationError[] = [];
  const stubs: Stub[] = [];
  for (const mod of registry as readonly TranslationModule[]) {
    validateNode(mod.translations as Record<string, unknown>, mod.scope, config.locales, config.sourceLang, errors, stubs);
  }

  const actualErrors = errors.filter((e) => e.severity === 'error');
  const warnings = errors.filter((e) => e.severity === 'warning');

  if (actualErrors.length === 0 && warnings.length === 0 && stubs.length === 0) {
    console.log('\n✓ All translations are valid!\n');
    return;
  }

  if (actualErrors.length) {
    console.log(`\n❌ ${actualErrors.length} error(s):\n`);
    for (const e of actualErrors) {
      console.log(`  [${e.module}] ${e.key} (${e.language.toUpperCase()})\n    → ${e.issue}`);
    }
  }

  if (warnings.length) {
    console.log(`\n⚠️  ${warnings.length} warning(s):\n`);
    const byLang: Record<string, ValidationError[]> = {};
    for (const w of warnings) (byLang[w.language] ??= []).push(w);
    for (const [lang, list] of Object.entries(byLang)) {
      console.log(`  ${lang.toUpperCase()}: ${list.length} missing`);
      for (const w of list.slice(0, 5)) console.log(`    - ${w.key}`);
      if (list.length > 5) console.log(`    … and ${list.length - 5} more`);
    }
  }

  if (stubs.length) {
    console.log(`\n📝 Stub report — ${stubs.length} source-only ${stubs.length === 1 ? 'leaf' : 'leaves'}:\n`);
    const byModule: Record<string, string[]> = {};
    for (const s of stubs) (byModule[s.module] ??= []).push(s.key);
    for (const [moduleName, keys] of Object.entries(byModule)) {
      console.log(`  ${moduleName}: ${keys.length}`);
      for (const k of keys.slice(0, 5)) console.log(`    - ${k}`);
      if (keys.length > 5) console.log(`    … and ${keys.length - 5} more`);
    }
  }

  console.log('\n📊 Summary\n' + `  Errors: ${actualErrors.length}  Warnings: ${warnings.length}  Stubs: ${stubs.length}`);
  if (actualErrors.length) {
    console.log('\n❌ Validation failed!\n');
    process.exitCode = 1;
  } else {
    console.log('\n✓ Validation passed.\n');
  }
}
