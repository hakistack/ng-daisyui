#!/usr/bin/env node
/**
 * Compile the @hakistack/i18n schematics and ship them in the published package.
 *
 * Steps:
 *   1. tsc the schematics (→ dist/hakistack/i18n/schematics/).
 *   2. Copy collection.json + every schema.json (tsc doesn't copy JSON).
 *   3. Patch dist/package.json to declare `schematics` + `ng-add`.
 *
 * Invoked by the CLI when a consumer runs `ng add @hakistack/i18n` or
 * `ng generate @hakistack/i18n:setup`.
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const schematicsSrc = join(repoRoot, 'projects/hakistack/i18n/schematics');
const distRoot = join(repoRoot, 'dist/hakistack/i18n');
const schematicsDist = join(distRoot, 'schematics');
const EXCLUDED_JSON = new Set(['tsconfig.json']);

console.log('• Compiling i18n schematics…');
execSync(`npx --no-install tsc -p "${join(schematicsSrc, 'tsconfig.json')}"`, { stdio: 'inherit', cwd: repoRoot });

// The dist package.json is `"type": "module"` (ng-packagr), so a CommonJS `.js`
// factory would be misparsed as ESM by the schematics loader. Rename the factory
// to `.cjs` (collection.json references it with the explicit extension). The
// `Schema` import is type-only, so the factory file is self-contained at runtime.
const factoryJs = join(schematicsDist, 'ng-add/index.js');
const factoryCjs = join(schematicsDist, 'ng-add/index.cjs');
if (existsSync(factoryJs)) {
  renameSync(factoryJs, factoryCjs);
  if (existsSync(`${factoryJs}.map`)) renameSync(`${factoryJs}.map`, `${factoryCjs}.map`);
}

for (const file of walkJsonFiles(schematicsSrc)) {
  const rel = relative(schematicsSrc, file);
  const dest = join(schematicsDist, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(file, dest);
}

const pkgPath = join(distRoot, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
pkg.schematics = './schematics/collection.json';
pkg['ng-add'] = { save: 'dependencies' };
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log('✓ Built schematics → dist/hakistack/i18n/schematics/');

function* walkJsonFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walkJsonFiles(full);
    else if (entry.endsWith('.json') && !EXCLUDED_JSON.has(entry)) yield full;
  }
}
