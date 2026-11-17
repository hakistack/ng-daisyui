#!/usr/bin/env node
/**
 * Publish ONE built package from its dist/ folder (`npm run publish:<id> [-- --dry-run] [-- --tag next]`).
 *
 * Guards — it refuses to publish unless:
 *   - the artifact validates (scripts/workspace/validate-package.mjs)
 *   - HEAD carries the release tag `<name>@<version>` created by `npm run release` (skipped with --dry-run)
 *   - that exact version is not on the registry yet
 *
 * In GitHub Actions (`CI` + `GITHUB_ACTIONS`) it adds `--provenance`, which needs `id-token: write`.
 * Nothing else in the repo calls `npm publish`; publishing one package never builds or publishes another.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPackage } from './products.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const tagIdx = args.indexOf('--tag');
const distTag = tagIdx >= 0 ? args[tagIdx + 1] : null;

if (!id) {
  console.error('Usage: npm run publish:<ui|i18n> [-- --dry-run] [-- --tag <dist-tag>]');
  process.exit(1);
}
const pkg = getPackage(id);
const dist = join(ROOT, pkg.dist);
const run = (cmd, opts = {}) => execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
const out = (cmd) => execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

run(`node scripts/workspace/validate-package.mjs ${pkg.id}`);
const { version } = JSON.parse(readFileSync(join(dist, 'package.json'), 'utf8'));
const releaseTag = `${pkg.name}@${version}`;

const tagsAtHead = out('git tag --points-at HEAD').split('\n');
if (!tagsAtHead.includes(releaseTag)) {
  const msg = `HEAD is not tagged ${releaseTag} — run \`npm run release -- ${pkg.id} <bump>\` first`;
  if (!dryRun) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
  console.warn(`⚠ ${msg} (ignored for --dry-run)`);
}

let published = false;
try {
  published = out(`npm view "${pkg.name}@${version}" version`) === version;
} catch {
  published = false; // 404: not published yet
}
if (published) {
  console.error(`✗ ${pkg.name}@${version} is already on the registry`);
  process.exit(1);
}

const flags = ['--access public'];
if (dryRun) flags.push('--dry-run');
if (distTag) flags.push(`--tag ${distTag}`);
if (process.env.CI && process.env.GITHUB_ACTIONS) flags.push('--provenance');

console.log(`▶ npm publish ${flags.join(' ')}  (${pkg.dist})`);
run(`npm publish ${flags.join(' ')}`, { cwd: dist });
console.log(dryRun ? `✓ dry run for ${releaseTag} finished — nothing was published` : `✓ published ${releaseTag}`);
