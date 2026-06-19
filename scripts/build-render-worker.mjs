#!/usr/bin/env node
/**
 * Post-build step: bundle the PDF render worker into a standalone ESM asset.
 *
 * ng-packagr does NOT bundle Web Workers, so the off-thread rasterization
 * worker (`pdf-render.worker.ts`) is compiled here with esbuild — pdf.js
 * inlined — into `dist/hakistack/ng-daisyui/workers/pdf-render.worker.mjs`.
 * Consumers point the viewer's `renderWorkerSrc` at this asset; it's only
 * fetched when off-thread rendering is enabled (`renderPoolSize > 0`).
 */
import { build } from 'esbuild';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distRoot = join(root, 'dist/hakistack/ng-daisyui');
const entry = join(root, 'projects/hakistack/ng-daisyui/src/lib/components/pdf-viewer/pdf-render.worker.ts');
const outfile = join(distRoot, 'workers/pdf-render.worker.mjs');

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  // pdf.js is inlined so the worker is self-contained; it still spawns its own
  // nested pdf.worker for parsing when `workerSrc` is provided.
});

console.log(`✓ Bundled render worker → ${outfile.replace(root + '/', '')}`);

// Expose the asset in the package `exports` map so consumers can resolve
// `new URL('@hakistack/ng-daisyui/workers/pdf-render.worker.mjs', import.meta.url)`.
const pkgPath = join(distRoot, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.exports ??= {};
pkg.exports['./workers/pdf-render.worker.mjs'] = './workers/pdf-render.worker.mjs';
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('✓ Added ./workers/pdf-render.worker.mjs to package exports');

// Mirror into the demo's static assets so the demo (which imports library
// source, not dist) can serve the worker and A/B the off-thread render pool.
const demoPublic = join(root, 'projects/demo/public/pdf-render.worker.mjs');
if (existsSync(dirname(demoPublic))) {
  copyFileSync(outfile, demoPublic);
  console.log('✓ Copied render worker → projects/demo/public/');
}
