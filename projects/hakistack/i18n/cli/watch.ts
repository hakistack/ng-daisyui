/**
 * Watcher — re-runs the scan whenever a `*.i18n.ts` file is added, removed, or
 * edited, keeping the generated barrel/keys/directive current during `ng serve`.
 *
 * The scan is content-aware (writes only on change), so an unchanged export set
 * doesn't trigger an extra HMR cycle. Uses chokidar (an optional dependency);
 * if it isn't installed, prints guidance and exits cleanly.
 */

import * as path from 'path';
import { createJiti } from 'jiti';

import { I18nCliConfig } from './config';
import { runScan } from './scan';

const SUFFIX = '.i18n.ts';

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

  // Initial scan so generated files exist before the first compile.
  runScan(config, { quiet: true });
  console.log(`[i18n-watch] watching ${path.relative(config.cwd, config.srcRoot)}/**/*${SUFFIX}`);

  let running = false;
  let pending = false;
  const trigger = (label: string) => {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    console.log(`[i18n-watch] ${label} — scanning`);
    try {
      runScan(config, { quiet: true });
    } finally {
      running = false;
      if (pending) {
        pending = false;
        trigger('coalesced');
      }
    }
  };

  const watcher = chokidar.watch(config.srcRoot, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 30 },
    ignored: (p: string, stats?: { isFile(): boolean }) => {
      const base = path.basename(p);
      if (base === 'node_modules' || base.startsWith('.')) return true;
      if (stats?.isFile()) return !p.endsWith(SUFFIX);
      return false;
    },
  });

  watcher
    .on('add', (p: string) => trigger(`add ${path.relative(config.cwd, p)}`))
    .on('unlink', (p: string) => trigger(`remove ${path.relative(config.cwd, p)}`))
    .on('change', (p: string) => trigger(`change ${path.relative(config.cwd, p)}`));

  const shutdown = () => watcher.close().then(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
