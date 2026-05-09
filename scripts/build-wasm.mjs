#!/usr/bin/env node
/**
 * Build hakistack-engine and place its output where the Angular library can lazy-load it.
 *
 *   1. `wasm-pack build crates/engine-wasm --target web --out-dir ../../pkg`
 *   2. copy hakistack-engine/pkg → projects/hakistack/ng-daisyui/src/lib/wasm
 *
 * Requires `wasm-pack` on PATH:  `cargo install wasm-pack`
 */

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE   = dirname(fileURLToPath(import.meta.url));
const ROOT   = resolve(HERE, '..');
const ENGINE = resolve(ROOT, 'hakistack-engine');
const PKG    = resolve(ENGINE, 'pkg');

// Where the WASM bundle gets copied. Order matters: lib/wasm holds the
// canonical copy that ships in the published package; demo/public are dev
// conveniences so `ng serve` can find /engine_wasm.js.
const COPY_TARGETS = [
  resolve(ROOT, 'projects/hakistack/ng-daisyui/src/lib/wasm'),
  resolve(ROOT, 'projects/demo/public'),
  resolve(ROOT, 'projects/demo-v4/public'),
];

const profile = process.argv.includes('--dev') ? '--dev' : '--release';

try {
  execSync('wasm-pack --version', { stdio: 'ignore' });
} catch {
  console.error(
    'wasm-pack not found.\n' +
    '  Install with:  cargo install wasm-pack\n' +
    '  or:            curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh',
  );
  process.exit(1);
}

// Release builds drop `console_error_panic_hook` (saves ~5 KB) — wasm-pack
// understands `--no-default-features` to mean "skip the `default` feature
// set," which for engine-wasm is just the `debug-panics` feature.
const featureFlags = profile === '--release' ? '--no-default-features' : '';

console.log(`▶ wasm-pack build  (${profile}${featureFlags ? ` ${featureFlags}` : ''})`);
execSync(
  `wasm-pack build crates/engine-wasm --target web --out-dir ../../pkg ${profile} ${featureFlags}`.trim(),
  { stdio: 'inherit', cwd: ENGINE },
);

// Lib copy: replace the whole folder so stale files don't linger.
const libTarget = COPY_TARGETS[0];
if (existsSync(libTarget)) rmSync(libTarget, { recursive: true, force: true });
mkdirSync(libTarget, { recursive: true });
cpSync(PKG, libTarget, { recursive: true });
console.log(`✓ ${libTarget.replace(ROOT + '/', '')}`);

// Demo copies: only the .js + .wasm files. Don't overwrite an entire shared
// assets/ folder since other files live there.
const wasmFiles = ['engine_wasm.js', 'engine_wasm_bg.wasm'];
for (const target of COPY_TARGETS.slice(1)) {
  if (!existsSync(target)) {
    // Demo project not present in this checkout — skip silently.
    continue;
  }
  for (const f of wasmFiles) {
    cpSync(resolve(PKG, f), resolve(target, f));
  }
  console.log(`✓ ${target.replace(ROOT + '/', '')} (engine_wasm.{js,wasm})`);
}
