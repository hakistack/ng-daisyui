/**
 * `hakistack-i18n` CLI entry.
 *
 * Subcommands:
 *   scan          Discover *.i18n.ts and emit the barrel, TK literal, directive.
 *   generate      Write JSON translation files.
 *   validate      Gate on missing/placeholder-mismatched translations.
 *   find-unused   Report defined keys with no references.
 *   watch         Re-run scan on *.i18n.ts changes (for `ng serve`).
 *
 * Flags (all optional — override i18n.config.* / defaults):
 *   --config <path>        Explicit config file.
 *   --src-root <dir>       Directory scanned for *.i18n.ts.
 *   --definitions-dir <d>  Where generated files land.
 *   --output-dir <dir>     JSON output directory.
 *   --locales <a,b,c>      Comma-separated locale ids.
 *   --source-lang <id>     Source locale (default: en).
 *   --list                 (scan) list modules without emitting.
 *   --strict               (find-unused) exit 1 if unused keys exist.
 *   --verbose              (find-unused) print reference locations.
 */

import * as path from 'path';

import { I18nUserConfig, loadConfig } from './config';
import { runFindUnused } from './find-unused';
import { runGenerate } from './generate';
import { runScan } from './scan';
import { runValidate } from './validate';
import { runWatch } from './watch';

interface ParsedArgs {
  command: string;
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[0] ?? 'help';
  const flags: Record<string, string | boolean> = {};
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return { command, flags };
}

function configOverrides(flags: Record<string, string | boolean>): Partial<I18nUserConfig> {
  const o: Partial<I18nUserConfig> = {};
  if (typeof flags['src-root'] === 'string') o.srcRoot = flags['src-root'];
  if (typeof flags['definitions-dir'] === 'string') o.definitionsDir = flags['definitions-dir'];
  if (typeof flags['output-dir'] === 'string') o.outputDir = flags['output-dir'];
  if (typeof flags['source-lang'] === 'string') o.sourceLang = flags['source-lang'];
  if (typeof flags['locales'] === 'string')
    o.locales = flags['locales']
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return o;
}

const HELP = `hakistack-i18n — type-safe i18n codegen

Usage: hakistack-i18n <command> [flags]

Commands:
  scan          Discover *.i18n.ts and emit barrel + TK literal + typed directive
  generate      Write JSON translation files
  validate      Gate on missing / placeholder-mismatched translations
  find-unused   Report defined keys with no references
  watch         Re-run scan on *.i18n.ts changes

Flags:
  --config <path>        Explicit config file
  --src-root <dir>       Directory scanned for *.i18n.ts
  --definitions-dir <d>  Where generated files land
  --output-dir <dir>     JSON output directory
  --locales <a,b,c>      Comma-separated locale ids
  --source-lang <id>     Source locale (default: en)
  --list                 (scan) list modules without emitting
  --strict               (find-unused) exit 1 if unused keys exist
  --verbose              (find-unused) print reference locations
`;

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2));

  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }

  const cwd = process.cwd();
  const overrides = configOverrides(flags);
  if (typeof flags['config'] === 'string') {
    // An explicit --config path takes precedence over discovery by changing cwd.
    process.chdir(path.dirname(path.resolve(cwd, flags['config'])));
  }
  const config = await loadConfig(process.cwd(), overrides);

  switch (command) {
    case 'scan':
      runScan(config, { listOnly: flags['list'] === true });
      break;
    case 'generate':
      await runGenerate(config);
      break;
    case 'validate':
      await runValidate(config);
      break;
    case 'find-unused':
      await runFindUnused(config, { strict: flags['strict'] === true, verbose: flags['verbose'] === true });
      break;
    case 'watch':
      await runWatch(config);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
