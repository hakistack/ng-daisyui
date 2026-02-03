#!/usr/bin/env node
/**
 * Post-build script to fix package.json exports for dual Angular/Tailwind usage.
 *
 * Solution: Use `browser` condition for bundlers (Vite runs in browser context),
 * while `default` falls through to the Tailwind plugin for jiti (Node context).
 *
 * - Vite checks `browser` for browser builds → gets Angular code
 * - Angular tooling checks `esm2022` → gets Angular code
 * - Tailwind's jiti (Node) doesn't use `browser`, falls to `default` → gets plugin
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
  esm2022: './esm2022/hakistack-ng-daisyui.mjs',
  esm: './esm2022/hakistack-ng-daisyui.mjs',
  style: './styles.css',
  default: './fesm2022/hakistack-ng-daisyui.mjs',
};

// Add explicit CSS export for @import
packageJson.exports['./styles'] = {
  style: './styles.css',
  default: './styles.css',
};

writeFileSync(distPackageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✓ Fixed package.json exports for dual Angular/Tailwind support');
