#!/usr/bin/env node
/**
 * Compila Tailwind 3 + daisyUI 4 escaneando el FESM de la lib y emite un único
 * CSS autocontenido (`dist/.../styles-v4.css`) con EXACTAMENTE las clases que la
 * lib usa + el bridge `--hk-*` antepuesto. Equivalente estático de `@source`
 * (Tailwind v4, ya usado en el path v5). El consumidor v4 hace:
 *
 *   @import "@hakistack/ng-daisyui/styles-v4.css";
 *
 * y tiene el 100% de las clases de la lib, sin content-scan ni safelist de su lado.
 *
 * NOTA DE RESOLUCIÓN: el stack v4 (tailwindcss@3 + daisyui@4 + autoprefixer) NO
 * puede vivir en el node_modules del root — ahí está Tailwind 4 + daisyUI 5 para
 * el build v5, y no se pueden instalar dos majors del mismo paquete a la vez.
 * Por eso este script vive en `scripts/` (junto al resto) pero resuelve esas deps
 * desde `projects/demo-v4/node_modules`, el único lugar donde existe el stack v4.
 *
 * Uso:
 *   node scripts/build-lib-css.mjs                       # usa los globs del config
 *   node scripts/build-lib-css.mjs "ruta/**\/*.mjs" ...  # override de globs por CLI
 */
import { globSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import config from './lib-css.config.mjs';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Resolvemos el stack v4 desde projects/demo-v4/node_modules (ver nota arriba).
const v4Require = createRequire(resolve(workspaceRoot, 'projects/demo-v4/package.json'));
const postcss = v4Require('postcss');
const tailwindcss = v4Require('tailwindcss');
const autoprefixer = v4Require('autoprefixer');
const daisyui = v4Require('daisyui');

// Globs: CLI gana; si no, los del config. Se resuelven a rutas absolutas.
const cliGlobs = process.argv.slice(2);
const contentGlobs = cliGlobs.length ? cliGlobs : config.content;
const files = [...new Set(contentGlobs.flatMap((g) => globSync(resolve(workspaceRoot, g))))];

if (files.length === 0) {
  console.error(
    '✗ No se encontró ningún archivo para escanear.\n' +
      `  Globs: ${contentGlobs.join(', ')}\n` +
      '  ¿Compilaste la lib (ng build @hakistack/ng-daisyui) antes de correr esto?',
  );
  process.exit(1);
}

/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
  content: { files },
  theme: { extend: {} },
  corePlugins: { preflight: false },
  plugins: [daisyui],
  daisyui: config.daisyui,
  safelist: config.safelist ?? [],
};

// Sin `@tailwind base` por defecto: solo componentes daisyUI usados + utilidades
// usadas. Las variables de tema (`--p`…) las aporta el consumidor.
const input = (config.includeBase ? '@tailwind base;\n' : '') + '@tailwind components;\n@tailwind utilities;\n';

const result = await postcss([tailwindcss(tailwindConfig), autoprefixer]).process(input, { from: undefined });

// CSS antepuesto tal cual (el bridge --hk-*) → output autocontenido de un import.
const prepended = await Promise.all(
  (config.prepend ?? []).map(async (p) => `/* prepended: ${p} */\n${await readFile(resolve(workspaceRoot, p), 'utf8')}`),
);

const css = [...prepended, result.css].join('\n');

const outPath = resolve(workspaceRoot, config.output);
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, css, 'utf8');

const kib = (Buffer.byteLength(css) / 1024).toFixed(1);
console.log(`✓ ${files.length} archivo(s) del FESM escaneados`);
console.log(`✓ ${kib} kB → ${relative(workspaceRoot, outPath)}`);
