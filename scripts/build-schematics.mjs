#!/usr/bin/env node
/**
 * Post-build script that compiles the ng-add schematics and ships them in
 * the published package.
 *
 * Steps:
 *   1. Run `tsc` on projects/hakistack/ng-daisyui/schematics/tsconfig.json.
 *      Output lands in dist/hakistack/ng-daisyui/schematics/.
 *   2. Copy collection.json + every schema.json across — tsc doesn't copy JSON.
 *   3. Patch dist/package.json to declare `schematics` + `ng-add` entries.
 *
 * The schematic is invoked by the Angular CLI when a consumer runs
 * `ng add @hakistack/ng-daisyui`.
 */
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const schematicsSrc = join(repoRoot, 'projects/hakistack/ng-daisyui/schematics');
const distRoot = join(repoRoot, 'dist/hakistack/ng-daisyui');
const schematicsDist = join(distRoot, 'schematics');
const EXCLUDED_JSON = new Set(['tsconfig.json']);

execSync(`npx --no-install tsc -p "${join(schematicsSrc, 'tsconfig.json')}"`, {
  stdio: 'inherit',
  cwd: repoRoot,
});

for (const file of walkJsonFiles(schematicsSrc)) {
  const rel = relative(schematicsSrc, file);
  const dest = join(schematicsDist, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(file, dest);
}

const pkgPath = join(distRoot, 'package.json');
const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
pkgJson.schematics = './schematics/collection.json';
pkgJson['ng-add'] = { save: 'dependencies' };
writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n');

console.log('✓ Built schematics → dist/hakistack/ng-daisyui/schematics/');

function* walkJsonFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walkJsonFiles(full);
    } else if (entry.endsWith('.json') && !EXCLUDED_JSON.has(entry)) {
      yield full;
    }
  }
}
