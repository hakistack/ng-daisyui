/**
 * Runtime loading of the consumer's generated definitions.
 *
 * `generate`/`validate`/`find-unused` need the *values* produced by the
 * consumer's `*.i18n.ts` modules (the `t(...)` results), which only exist after
 * executing TypeScript. `jiti` loads the generated barrel transparently —
 * resolving the consumer's `@hakistack/i18n` import to the installed package —
 * with no build step or ts-node config required.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createJiti } from 'jiti';

import type { TranslationModule } from '../engine/define-translations';
import { I18nCliConfig } from './config';

/** Absolute path to the scanner-generated barrel (`index.generated.ts`). */
export function barrelPath(config: I18nCliConfig): string {
  return path.join(config.definitionsDir, 'index.generated.ts');
}

/** Absolute path to the scanner-generated keys literal (`keys.generated.ts`). */
export function keysPath(config: I18nCliConfig): string {
  return path.join(config.definitionsDir, 'keys.generated.ts');
}

function ensureExists(file: string, hint: string): void {
  if (!fs.existsSync(file)) {
    throw new Error(`i18n: expected generated file not found:\n  ${file}\n${hint}`);
  }
}

/** Load `ALL_TRANSLATIONS` from the generated barrel via jiti. */
export async function loadRegistry(config: I18nCliConfig): Promise<readonly TranslationModule[]> {
  const file = barrelPath(config);
  ensureExists(file, 'Run the `scan` command first (`hakistack-i18n scan`).');
  const jiti = createJiti(__filename);
  const mod = (await jiti.import(file)) as { ALL_TRANSLATIONS?: readonly TranslationModule[] };
  if (!mod.ALL_TRANSLATIONS) {
    throw new Error(`i18n: '${file}' does not export ALL_TRANSLATIONS. Re-run the scan.`);
  }
  return mod.ALL_TRANSLATIONS;
}

/** Load the generated `TK` keys literal via jiti. */
export async function loadKeys(config: I18nCliConfig): Promise<Record<string, unknown>> {
  const file = keysPath(config);
  ensureExists(file, 'Run the `scan` command first (`hakistack-i18n scan`).');
  const jiti = createJiti(__filename);
  const mod = (await jiti.import(file)) as { TK?: Record<string, unknown> };
  if (!mod.TK) {
    throw new Error(`i18n: '${file}' does not export TK. Re-run the scan.`);
  }
  return mod.TK;
}
