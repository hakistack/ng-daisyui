/**
 * `check` — the everyday command: scan, then validate, then generate, stopping
 * at the first step that fails (exit code 1). What `prebuild` and CI run.
 */

import { I18nCliConfig } from './config';
import { runGenerate } from './generate';
import { runScan } from './scan';
import { runValidate } from './validate';

export async function runCheck(config: I18nCliConfig, opts: { quiet?: boolean } = {}): Promise<boolean> {
  if (!runScan(config, { quiet: opts.quiet }).ok) return false;
  if (!(await runValidate(config, opts))) return false;
  return runGenerate(config, opts);
}
