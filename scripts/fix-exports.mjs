#!/usr/bin/env node
/**
 * Post-build script: adds the non-JS export conditions ng-packagr does not generate.
 *
 * - `style` on "." lets Tailwind v4 resolve `@import "@hakistack/ng-daisyui";` to styles.css.
 * - `browser` / `default` both point at the FESM (Angular CLI / Vite resolve the JS entry).
 * - `./styles`, `./styles-v4(.css)` expose the precompiled stylesheets.
 *
 * Only reference files that ng-packagr actually emits: Angular 21 no longer produces an
 * `esm2022/` folder, so the old `esm2022` / `esm` conditions pointed at nothing.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPackageJsonPath = join(__dirname, '../dist/hakistack/ng-daisyui/package.json');

const packageJson = JSON.parse(readFileSync(distPackageJsonPath, 'utf-8'));

// Fix the root export to support both Angular and Tailwind
packageJson.exports['.'] = {
  types: './types/hakistack-ng-daisyui.d.ts',
  browser: './fesm2022/hakistack-ng-daisyui.mjs',
  style: './styles.css',
  default: './fesm2022/hakistack-ng-daisyui.mjs',
};

// Add explicit CSS export for @import
packageJson.exports['./styles'] = {
  style: './styles.css',
  default: './styles.css',
};

// Precompiled DaisyUI v4 / Tailwind 3 stylesheet. Generated from the FESM by
// projects/demo-v4/scripts/build-lib-css.mjs (run during `npm run build`). Lets
// v4 consumers `@import "@hakistack/ng-daisyui/styles-v4.css"` and get every
// class the lib uses — no fragile content-scan / safelist on their side.
packageJson.exports['./styles-v4.css'] = './styles-v4.css';
packageJson.exports['./styles-v4'] = {
  style: './styles-v4.css',
  default: './styles-v4.css',
};

writeFileSync(distPackageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✓ Fixed package.json exports for dual Angular/Tailwind support');
