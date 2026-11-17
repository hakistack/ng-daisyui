#!/usr/bin/env node
/**
 * Bump ONE package's version, commit, tag and build it. Packages are versioned independently:
 * releasing @hakistack/ng-daisyui never touches @hakistack/i18n and vice versa.
 *
 * Usage:  npm run release -- <ui|i18n> <patch|minor|major> [--dry-run]
 *
 *   1. refuses to run on a dirty working tree (commit or stash first)
 *   2. bumps `version` in the package's source package.json
 *   3. commits `chore(release): <name>@<version>` and creates the annotated tag `<name>@<version>`
 *      (e.g. `@hakistack/ng-daisyui@0.4.0`; tags before 0.3.1 used the unscoped `vX.Y.Z` form)
 *   4. builds that package (`npm run build:<id>`) and validates the artifact
 *
 * It does NOT push and does NOT publish: `git push --follow-tags`, then `npm run publish:<id>`
 * (or the "Release" GitHub workflow). Move the CHANGELOG "Unreleased" section under the new
 * version heading before running it — the script does not write changelogs.
 *
 * Runs from the repo root because `npm version` inside a sub-folder does not find `.git`
 * (it silently skipped the commit + tag).
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPackage } from './workspace/products.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [id, bump] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dryRun = process.argv.includes('--dry-run');

if (!id || !['patch', 'minor', 'major'].includes(bump)) {
  console.error('Usage: npm run release -- <ui|i18n> <patch|minor|major> [--dry-run]');
  process.exit(1);
}

const pkg = getPackage(id);
const manifestRel = `${pkg.root}/package.json`;
const manifestPath = join(ROOT, manifestRel);
const sh = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
const git = (cmd) =>
  execSync(`git ${cmd}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] })
    .toString()
    .trim();

const dirty = git('status --porcelain');
if (dirty && !dryRun) {
  console.error('Working tree not clean. Commit or stash before releasing:\n' + dirty);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
const [major, minor, patch] = manifest.version.split('.').map(Number);
const next = bump === 'major' ? `${major + 1}.0.0` : bump === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
const tag = `${pkg.name}@${next}`;

if (git(`tag --list "${tag}"`)) {
  console.error(`Tag ${tag} already exists.`);
  process.exit(1);
}

if (dryRun) {
  console.log(`[dry-run] ${pkg.name}: ${manifest.version} → ${next}`);
  console.log(`[dry-run] would commit ${manifestRel}, tag ${tag}, then run build:${pkg.id} and validate:${pkg.id}`);
  if (dirty) console.log('[dry-run] note: the working tree is dirty — a real run would refuse');
  process.exit(0);
}

manifest.version = next;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
sh(`git add "${manifestRel}"`);
sh(`git commit -m "chore(release): ${tag}"`);
sh(`git tag -a "${tag}" -m "${tag}"`);
console.log(`✓ ${pkg.name} bumped to ${next}, committed and tagged ${tag}`);

sh(`npm run build:${pkg.id}`);
sh(`node scripts/workspace/validate-package.mjs ${pkg.id}`);
console.log(`\nNext: git push --follow-tags && npm run publish:${pkg.id}`);
