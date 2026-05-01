#!/usr/bin/env node
/**
 * Post-build script to bundle PDF.js's web worker into the published package.
 *
 * The PDF viewer component lazy-loads `pdfjs-dist` at runtime, which then
 * needs a separate worker file (`pdf.worker.min.mjs`) to parse PDFs off the
 * main thread. We bundle the worker as a static asset so consumers don't
 * have to configure a CDN URL or copy the worker themselves.
 *
 * The component sets `GlobalWorkerOptions.workerSrc` to the asset path at
 * runtime. Consumers picking up the asset via Angular's `angular.json`
 * `assets` config get it for free.
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const sourceWorker = join(projectRoot, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const destDir = join(projectRoot, 'dist/hakistack/ng-daisyui/assets/pdfjs');
const destWorker = join(destDir, 'pdf.worker.min.mjs');

if (!existsSync(sourceWorker)) {
  console.error(`✖ PDF worker not found at ${sourceWorker}`);
  console.error('  Did you run `npm install`? Is `pdfjs-dist` listed in dependencies?');
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(sourceWorker, destWorker);

console.log('✓ Copied pdf.worker.min.mjs → dist/hakistack/ng-daisyui/assets/pdfjs/');
