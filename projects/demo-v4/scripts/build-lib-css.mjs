#!/usr/bin/env node
/**
 * Compila Tailwind 3 + daisyUI 4 escaneando el FESM de la lib y emite un único
 * CSS con EXACTAMENTE las clases que la lib usa (componentes daisyUI + utils de
 * color en las opacidades reales + utils core de Tailwind).
 *
 * Equivalente estático de `@source` (Tailwind v4, ya usado en el path v5): el
 * consumidor v4 hace `@import "@hakistack/ng-daisyui/styles-v4.css"` y tiene el
 * 100% de las clases de la lib, sin depender de su content-scan ni de un
 * safelist. Reemplaza al preset/plugin .cjs frágil.
 *
 * Corre desde `projects/demo-v4` (único lugar con TW3 + daisyUI4 + autoprefixer).
 *
 * Uso:
 *   node scripts/build-lib-css.mjs                       # usa los globs del config
 *   node scripts/build-lib-css.mjs "ruta/**\/*.mjs" ...  # override de globs por CLI
 */
import { globSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import daisyui from 'daisyui';

import config from './lib-css.config.mjs';

// root = projects/demo-v4 (carpeta padre de scripts/).
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

// Globs: lo que venga por CLI gana; si no, los del config. Se resuelven a rutas
// absolutas (evita los problemas de `..` en patrones de glob y de cwd).
const cliGlobs = process.argv.slice(2);
const contentGlobs = cliGlobs.length ? cliGlobs : config.content;

const files = [...new Set(contentGlobs.flatMap((g) => globSync(resolve(root, g))))];

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
  // No reseteamos al consumidor (es su app, no la lib). Ver `includeBase`.
  corePlugins: { preflight: false },
  plugins: [daisyui],
  daisyui: config.daisyui,
  safelist: config.safelist ?? [],
};

// Sin `@tailwind base` por defecto: solo componentes daisyUI usados + utilidades
// de Tailwind usadas. Las variables de tema (`--p`, `--b1`…) las aporta el
// consumidor con su propio daisyUI, así este CSS no pisa ni duplica su tema.
const input = (config.includeBase ? '@tailwind base;\n' : '') + '@tailwind components;\n@tailwind utilities;\n';

const result = await postcss([tailwindcss(tailwindConfig), autoprefixer]).process(input, { from: undefined });

// CSS antepuesto tal cual (el bridge --hk-*), para que el output sea un único
// archivo autocontenido que el consumidor importa de una sola línea.
const prepended = await Promise.all(
  (config.prepend ?? []).map(async (p) => `/* prepended: ${p} */\n${await readFile(resolve(root, p), 'utf8')}`),
);

const css = [...prepended, result.css].join('\n');

const outPath = resolve(root, config.output);
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, css, 'utf8');

const kib = (Buffer.byteLength(css) / 1024).toFixed(1);
console.log(`✓ ${files.length} archivo(s) del FESM escaneados`);
console.log(`✓ ${kib} kB → ${relative(resolve(root, '../..'), outPath)}`);
