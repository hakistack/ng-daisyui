#!/usr/bin/env node
/**
 * Bump version, commit, and tag the lib release.
 *
 * Replaces `npm version <bump>` inside projects/hakistack/ng-daisyui/.
 * npm version's git detection looks for `.git` in the package's own
 * directory, and the lib is a subfolder of the workspace — so it
 * always logged "Not tagging: not in a git repo or no git cmd" and
 * silently skipped the commit + tag. This script runs from the
 * repo root where git lives, so the commit + tag are reliable.
 *
 * Usage: node scripts/release.mjs <patch|minor|major>
 *
 * Refuses to run if the working tree has unstaged changes outside
 * the lib's package.json — commit your fixes first.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PKG_PATH = resolve(ROOT, 'projects/hakistack/ng-daisyui/package.json');

const bump = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error(`Usage: node scripts/release.mjs <patch|minor|major> — got "${bump}"`);
  process.exit(1);
}

const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT, stdio: ['inherit', 'pipe', 'inherit'] }).toString().trim();

const dirty = git('status --porcelain');
if (dirty) {
  console.error('Working tree not clean. Commit or stash before releasing:\n' + dirty);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
const next =
  bump === 'major' ? `${major + 1}.0.0` : bump === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;

pkg.version = next;
writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');

const tag = `v${next}`;
execSync('git add projects/hakistack/ng-daisyui/package.json', { cwd: ROOT, stdio: 'inherit' });
execSync(`git commit -m "chore(release): ${tag}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`git tag ${tag}`, { cwd: ROOT, stdio: 'inherit' });

console.log(`✓ Bumped to ${next}, committed, and tagged ${tag}`);
