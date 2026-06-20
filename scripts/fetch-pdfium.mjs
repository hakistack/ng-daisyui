#!/usr/bin/env node
/**
 * Vendor the PDFium WASM engine for `hk-pdf-viewer`.
 *
 * Downloads paulocoutinhox/pdfium-lib's `wasm.tgz` release and extracts the
 * **ES6-module** build — `release/node/pdfium.esm.js` (`-sMODULARIZE
 * -sEXPORT_ES6 -sEXPORT_NAME=PDFiumModule`, `ALLOW_MEMORY_GROWTH`) + its
 * `pdfium.esm.wasm` — into `engine/pdfium/` as `pdfium.js` + `pdfium.wasm`.
 *
 * Why a script (not "drop a file in"): the exact variant we need (ES6 module,
 * growable heap, web/worker-capable) isn't an npm package — it's a release
 * asset. This pins the version + verifies the module shape so we never wire up
 * a wrong (e.g. non-modularize) build again.
 *
 * Placed under engine/pdfium/ — NOT src/lib/wasm/ — because `npm run
 * engine:build` rm -rf's the whole wasm/ tree. See PDFIUM_ENGINE.md §11.
 *
 * Usage:  npm run pdfium:fetch            (skips if already present)
 *         npm run pdfium:fetch -- --force (re-download)
 *         PDFIUM_VERSION=7442 npm run pdfium:fetch
 *
 * The release tag is a Chromium/PDFium version. PDFium's C API is additive, so a
 * build >= the `pdfium-render` crate's target works. If runtime init fails with
 * an API/function-table error, try a different tag via PDFIUM_VERSION.
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const VERSION = process.env.PDFIUM_VERSION || '7623';
const force = process.argv.includes('--force');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dest = join(root, 'projects/hakistack/ng-daisyui/src/lib/components/pdf-viewer/engine/pdfium');
const jsOut = join(dest, 'pdfium.js');
const wasmOut = join(dest, 'pdfium.wasm');

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

if (!force && existsSync(jsOut) && existsSync(wasmOut)) {
  console.log(`✓ pdfium already vendored (${dest.replace(root + '/', '')}). Use --force to re-download.`);
  process.exit(0);
}

const url = `https://github.com/paulocoutinhox/pdfium-lib/releases/download/${VERSION}/wasm.tgz`;
const work = join(tmpdir(), `pdfium-fetch-${VERSION}`);
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
const tgz = join(work, 'wasm.tgz');

console.log(`▶ Downloading PDFium ${VERSION} … (${url})`);
execSync(`curl -fSL "${url}" -o "${tgz}"`, { stdio: ['ignore', 'ignore', 'inherit'] });

// Extract only the two ES6-module artifacts.
const esmJs = 'release/node/pdfium.esm.js';
const esmWasm = 'release/node/pdfium.esm.wasm';
execSync(`tar xzf "${tgz}" -C "${work}" "${esmJs}" "${esmWasm}"`, { stdio: 'inherit' });

const extractedJs = join(work, esmJs);
const extractedWasm = join(work, esmWasm);

// Verify the module shape so we never ship a non-modularize build again.
const head = readFileSync(extractedJs, 'utf8').slice(0, 4096);
if (!/export\s+default\s+\w+/.test(readFileSync(extractedJs, 'utf8'))) {
  console.error('✗ pdfium.esm.js is not an ES module (no `export default`). Aborting — wrong build variant.');
  process.exit(1);
}
if (!/EXPORT_NAME|PDFiumModule|MODULARIZE/.test(head) && !/var PDFiumModule/.test(readFileSync(extractedJs, 'utf8'))) {
  console.warn('⚠ could not confirm MODULARIZE factory name; continuing (export default present).');
}

mkdirSync(dest, { recursive: true });
cpSync(extractedJs, jsOut);
cpSync(extractedWasm, wasmOut);
rmSync(work, { recursive: true, force: true });

console.log(`✓ Vendored pdfium.js (${mb(statSync(jsOut).size)}) + pdfium.wasm (${mb(statSync(wasmOut).size)}) → ${dest.replace(root + '/', '')}`);
console.log('  Next: `npm run engine:build` then `npm run build` (watch for "✓ Bundled PDFium worker").');
