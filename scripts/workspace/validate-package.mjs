#!/usr/bin/env node
/**
 * Validate a BUILT package before it is packed or published (`npm run validate:<id>`).
 *
 * Checks the artifact in dist/, not the sources, because that is what consumers install:
 *   - name/version match the source package.json, metadata (repository.directory, license) is present
 *   - every `exports` target, `typings`/`types`, `module` and `bin` file exists (wildcards: ≥1 match)
 *   - every `bin` starts with a shebang
 *   - every schematic in the collection loads with `require()` the way the Angular CLI loads it and
 *     exports its factory function (catches CJS-in-"type":"module" packaging mistakes)
 *   - README.md and LICENSE ship; peer ranges are not `*` and not open-ended `>=` (ADR-0010)
 *   - `npm pack --dry-run` succeeds and lists no source maps of TS sources or spec files
 *
 * Usage: node scripts/workspace/validate-package.mjs <ui|i18n|all>
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPackage, packages } from './products.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = process.argv[2] ?? 'all';
const targets = arg === 'all' ? packages : [getPackage(arg)];

let failures = 0;

for (const pkg of targets) {
  const errors = [];
  const warnings = [];
  const dist = join(ROOT, pkg.dist);
  const manifestPath = join(dist, 'package.json');
  if (!existsSync(manifestPath)) {
    console.error(`✗ ${pkg.name}: ${pkg.dist} not built — run \`npm run build:${pkg.id}\``);
    failures++;
    continue;
  }
  const built = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const source = JSON.parse(readFileSync(join(ROOT, pkg.root, 'package.json'), 'utf8'));

  if (built.name !== pkg.name) errors.push(`name is "${built.name}", expected "${pkg.name}"`);
  if (built.version !== source.version) errors.push(`dist version ${built.version} ≠ source ${source.version} (stale build?)`);
  if (built.repository?.directory !== pkg.root) errors.push(`repository.directory should be "${pkg.root}"`);
  if (!built.license) errors.push('license missing');
  for (const f of ['README.md', 'LICENSE']) if (!existsSync(join(dist, f))) errors.push(`${f} not in the package`);

  const exists = (rel) => {
    if (!rel.includes('*')) return existsSync(join(dist, rel));
    const [before, after] = rel.split('*');
    const dir = join(dist, dirname(before));
    if (!existsSync(dir)) return false;
    const prefix = before.slice(before.lastIndexOf('/') + 1);
    return readdirSync(dir).some((f) => f.startsWith(prefix) && f.endsWith(after.replace(/^.*\//, '')));
  };
  const targetsOf = (value) =>
    typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(targetsOf) : [];

  for (const [subpath, value] of Object.entries(built.exports ?? {})) {
    for (const target of targetsOf(value)) if (!exists(target)) errors.push(`exports["${subpath}"] → ${target} does not exist`);
  }
  for (const field of ['typings', 'types', 'module', 'main']) {
    if (typeof built[field] === 'string' && !exists(built[field])) errors.push(`"${field}": ${built[field]} does not exist`);
  }
  if (!built.typings && !built.types && !built.exports?.['.']?.types) errors.push('no type declarations entry');

  for (const [bin, rel] of Object.entries(built.bin ?? {})) {
    if (!exists(rel)) errors.push(`bin "${bin}" → ${rel} does not exist`);
    else if (!readFileSync(join(dist, rel), 'utf8').startsWith('#!')) errors.push(`bin "${bin}" has no shebang`);
  }

  if (built.schematics) {
    const collectionPath = join(dist, built.schematics);
    if (!existsSync(collectionPath)) errors.push(`schematics collection ${built.schematics} missing`);
    else {
      const collection = JSON.parse(readFileSync(collectionPath, 'utf8'));
      const req = createRequire(collectionPath);
      for (const [name, def] of Object.entries(collection.schematics ?? {})) {
        const [modulePath, exportName = 'default'] = def.factory.split('#');
        try {
          const factory = req(modulePath)[exportName];
          if (typeof factory !== 'function') errors.push(`schematic "${name}": ${def.factory} does not export a function`);
        } catch (err) {
          errors.push(`schematic "${name}": ${def.factory} fails to load (${err.message.split('\n')[0]})`);
        }
        if (def.schema && !existsSync(join(dirname(collectionPath), def.schema)))
          errors.push(`schematic "${name}": schema ${def.schema} missing`);
      }
    }
  }

  for (const [peer, range] of Object.entries(built.peerDependencies ?? {})) {
    if (range === '*' || range === '') errors.push(`peer ${peer} has no version range`);
    else if (/^>=/.test(range) && !/</.test(range))
      errors.push(`peer ${peer}@"${range}" is open-ended (claims every future major) — bound it to the tested majors`);
  }

  try {
    const [report] = JSON.parse(
      execSync('npm pack --dry-run --json --ignore-scripts', { cwd: dist, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
    );
    const leaked = report.files.map((f) => f.path).filter((p) => /\.spec\.|(^|\/)src\/.*\.ts$/.test(p));
    if (leaked.length) errors.push(`pack includes sources/specs: ${leaked.slice(0, 5).join(', ')}`);
    console.log(`• ${pkg.name}@${built.version}: ${report.entryCount} files, ${(report.size / 1024 / 1024).toFixed(2)} MB packed`);
  } catch (err) {
    errors.push(`npm pack --dry-run failed: ${err.message.split('\n')[0]}`);
  }

  for (const w of warnings) console.warn(`  ⚠ ${w}`);
  if (errors.length) {
    failures++;
    console.error(`✗ ${pkg.name}: ${errors.length} problem(s)`);
    for (const e of errors) console.error(`  - ${e}`);
  } else {
    console.log(`✓ ${pkg.name} artifact is valid`);
  }
}

process.exit(failures ? 1 : 0);
