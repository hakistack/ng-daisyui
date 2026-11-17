/**
 * Output handling shared by `scan` and `generate`.
 *
 *  - Writes are atomic (temp file + rename in the same directory): a dev server
 *    or a concurrent build never reads a half-written file.
 *  - Unchanged content is not rewritten, so mtimes stay put and watchers / HMR
 *    don't fire for nothing.
 *  - Files a previous run produced but this run did not (a removed scope or
 *    locale, a renamed directive) are deleted. Only files recorded in the
 *    manifest of the previous run are candidates, so nothing the CLI did not
 *    write itself is ever touched. The manifest lives in
 *    `node_modules/.cache/hakistack-i18n/`; without a `node_modules` folder,
 *    stale-file cleanup is skipped.
 */

import * as fs from 'fs';
import * as path from 'path';

/** Write `content` atomically. */
export function writeFileAtomic(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, content, 'utf-8');
  fs.renameSync(tmp, file);
}

/** Write only when the content differs. Returns whether the file was written. */
export function writeIfChanged(file: string, content: string): boolean {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf-8') === content) return false;
  writeFileAtomic(file, content);
  return true;
}

export interface OutputResult {
  written: string[];
  unchanged: string[];
  removed: string[];
}

type Manifest = Record<string, string[]>;

function manifestPath(cwd: string): string | null {
  for (let dir = cwd; ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'node_modules'))) return path.join(dir, 'node_modules', '.cache', 'hakistack-i18n', 'manifest.json');
    if (path.dirname(dir) === dir) return null;
  }
}

function readManifest(file: string): Manifest {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as Manifest;
  } catch {
    return {};
  }
}

/**
 * Write a complete set of outputs owned by one producer (`'scan:<dir>'`,
 * `'json:<dir>'`) under `root`, then delete what the previous run of the same
 * producer wrote and this one did not.
 */
export function syncOutputs(cwd: string, producer: string, root: string, outputs: { file: string; content: string }[]): OutputResult {
  const result: OutputResult = { written: [], unchanged: [], removed: [] };
  for (const { file, content } of outputs) (writeIfChanged(file, content) ? result.written : result.unchanged).push(file);

  const mPath = manifestPath(cwd);
  if (!mPath) return result;
  const manifest = readManifest(mPath);
  const current = new Set(outputs.map((o) => path.resolve(o.file)));
  const inside = (file: string) => !path.relative(root, file).startsWith('..') && !path.isAbsolute(path.relative(root, file));
  for (const previous of manifest[producer] ?? []) {
    if (current.has(previous) || !inside(previous) || !fs.existsSync(previous)) continue;
    fs.rmSync(previous);
    result.removed.push(previous);
    removeEmptyDirs(path.dirname(previous), root);
  }
  manifest[producer] = [...current].sort();
  writeIfChanged(mPath, JSON.stringify(manifest, null, 2) + '\n');
  return result;
}

function removeEmptyDirs(dir: string, root: string): void {
  for (let d = dir; d !== root && !path.relative(root, d).startsWith('..'); d = path.dirname(d)) {
    if (fs.readdirSync(d).length > 0) return;
    fs.rmdirSync(d);
  }
}
