/**
 * Watcher — re-runs `check` (scan + validate + generate) whenever a `*.i18n.ts`
 * file is added, removed, or edited, keeping the generated barrel/keys/directive
 * and the JSON files current during `ng serve`.
 *
 * Every output is written only when its content changes, so an edit that
 * doesn't change the result doesn't trigger an extra HMR cycle. Uses chokidar (an optional dependency);
 * if it isn't installed, prints guidance and exits cleanly.
 */

import * as path from 'path';
import { createJiti } from 'jiti';

import { I18nCliConfig } from './config';
import { runCheck } from './check';
import { I18N_SUFFIX } from './discover';

interface ChokidarModule {
  watch(paths: string, options: unknown): ChokidarWatcher;
}
interface ChokidarWatcher {
  on(event: string, cb: (p: string) => void): ChokidarWatcher;
  close(): Promise<void>;
}

export async function runWatch(config: I18nCliConfig): Promise<void> {
  let chokidar: ChokidarModule;
  try {
    // jiti loads chokidar uniformly whether it ships ESM or CJS.
    const mod = (await createJiti(__filename).import('chokidar')) as { default?: ChokidarModule } & ChokidarModule;
    chokidar = mod.default ?? mod;
  } catch {
    console.error('i18n watch requires the optional dependency "chokidar". Install it with:\n  npm i -D chokidar');
    process.exitCode = 1;
    return;
  }

  // Full cycle up front so generated files exist before the first compile.
  await runCycle(config);
  console.log(`[i18n-watch] watching ${path.relative(config.cwd, config.srcRoot)}/**/*${I18N_SUFFIX}`);

  let running = false;
  let pending = false;
  const trigger = async (label: string): Promise<void> => {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    console.log(`[i18n-watch] ${label}`);
    try {
      await runCycle(config);
    } finally {
      running = false;
      if (pending) {
        pending = false;
        void trigger('more changes');
      }
    }
  };

  const watcher = chokidar.watch(config.srcRoot, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 30 },
    ignored: (p: string, stats?: { isFile(): boolean }) => {
      const base = path.basename(p);
      if (base === 'node_modules' || base.startsWith('.')) return true;
      if (stats?.isFile()) return !p.endsWith(I18N_SUFFIX);
      return false;
    },
  });

  watcher
    .on('add', (p: string) => void trigger(`add ${path.relative(config.cwd, p)}`))
    .on('unlink', (p: string) => void trigger(`remove ${path.relative(config.cwd, p)}`))
    .on('change', (p: string) => void trigger(`change ${path.relative(config.cwd, p)}`));

  const shutdown = () => watcher.close().then(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

/**
 * One scan + validate + generate pass. Errors are printed and the watcher keeps
 * running (a module is often invalid mid-edit); the exit code is reset so a
 * fixed error doesn't leave the process failing.
 */
async function runCycle(config: I18nCliConfig): Promise<void> {
  try {
    const ok = await runCheck(config, { quiet: true });
    if (ok) console.log('[i18n-watch] ✓ up to date');
  } catch (err) {
    console.error(`[i18n-watch] ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    process.exitCode = 0;
  }
}
