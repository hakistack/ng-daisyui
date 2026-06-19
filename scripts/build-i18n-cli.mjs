#!/usr/bin/env node
/**
 * Build the @hakistack/i18n CLI binary.
 *
 * Steps:
 *   1. Type-check the CLI sources (`tsc --noEmit -p cli/tsconfig.json`).
 *   2. Bundle `cli/bin.ts` (engine source included) into a single CommonJS
 *      `dist/hakistack/i18n/cli/bin.js` via esbuild. `jiti` and `chokidar` are
 *      kept external (resolved from the consumer's node_modules at runtime).
 *   3. Make bin.js executable and ensure the published package.json declares
 *      the `bin` + `schematics` entries.
 *
 * The CLI is invoked as `hakistack-i18n <command>` from a consumer's npm scripts.
 */
import { build } from 'esbuild';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const projectRoot = join(repoRoot, 'projects/hakistack/i18n');
const cliSrc = join(projectRoot, 'cli');
const distRoot = join(repoRoot, 'dist/hakistack/i18n');
// Output as .cjs: ng-packagr marks the dist package.json `"type": "module"`,
// so a plain .js CommonJS bundle would be misparsed as ESM. `.cjs` is always CJS.
const outFile = join(distRoot, 'cli/bin.cjs');

if (!existsSync(distRoot)) {
  console.error('✗ dist/hakistack/i18n not found — run `ng build @hakistack/i18n` first.');
  process.exit(1);
}

console.log('• Type-checking CLI…');
execSync(`npx --no-install tsc --noEmit -p "${join(cliSrc, 'tsconfig.json')}"`, { stdio: 'inherit', cwd: repoRoot });

console.log('• Bundling CLI with esbuild…');
await build({
  entryPoints: [join(cliSrc, 'bin.ts')],
  outfile: outFile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: ['jiti', 'chokidar'],
  banner: { js: '#!/usr/bin/env node' },
  logLevel: 'info',
});

chmodSync(outFile, 0o755);

// Ensure dist package.json keeps the bin + schematics declarations (ng-packagr
// rewrites package.json from the source, so re-assert them defensively).
const pkgPath = join(distRoot, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
pkg.bin = { 'hakistack-i18n': './cli/bin.cjs' };
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log('✓ Built CLI → dist/hakistack/i18n/cli/bin.js');
