#!/usr/bin/env node
/**
 * Dependency-boundary check for the Hakistack monorepo (`npm run lint:boundaries`).
 *
 * Path aliases in tsconfig.json make every package importable from everywhere, so the TypeScript
 * build alone cannot tell whether a published package would still work outside this repo. This
 * script reads the imports of every shipped source file (TypeScript's own pre-processor, so
 * comments and strings are ignored) and enforces:
 *
 *   Packages (projects/hakistack/*):
 *     1. Relative imports stay inside the package root (no reaching into another package or app).
 *     2. Every bare import is declared in the package's own package.json (dependencies,
 *        peerDependencies or optionalDependencies) — the monorepo's root node_modules hides
 *        missing declarations, a consumer's install does not.
 *     3. Node built-ins only in Node-run areas (cli/, schematics/), never in browser code.
 *     4. Never import from dist/, from a demo/docs app (`@shared-demos/*`) or through `projects/`.
 *   Apps (projects/demo, projects/demo-v4, projects/shared-demos):
 *     5. Use a package only through its public entry (`@hakistack/<pkg>`), never by relative path
 *        into its sources or through `@hakistack/<pkg>/src/...`.
 *
 * Spec files are skipped (test-only dependencies come from the workspace on purpose).
 * Exit code 1 when a rule is broken; the report lists file:line and the rule.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { packages } from './products.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE_EXT = /\.(ts|mts|cts|js|mjs|cjs)$/;
const SKIP_FILE = /\.(spec|test)\.[cm]?[jt]s$|\.d\.ts$/;
const SKIP_DIR = new Set(['node_modules', 'dist', 'out-tsc', '.angular']);
const NODE_AREAS = new Set(['cli', 'schematics']);
const BUILTINS = new Set(builtinModules.flatMap((m) => [m, `node:${m}`]));
const APPS = ['projects/demo/src', 'projects/demo-v4/src', 'projects/shared-demos'];
/**
 * Vendored, generated third-party code that is bundled by its own step, not by ng-packagr:
 * the emscripten PDFium module keeps runtime-guarded Node branches; esbuild inlines it into the
 * PDFium worker (scripts/build-pdfium-worker.mjs).
 */
const VENDORED = ['projects/hakistack/ng-daisyui/src/lib/components/pdf-viewer/engine/pdfium/'];
/** Apps may read a package's text files (the docs site renders the CHANGELOG); code goes through the entry point. */
const ASSET_IMPORT = /\.(md|txt)$/;

const rel = (p) => relative(ROOT, p).split(sep).join('/');

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIR.has(name)) yield* walk(full);
    } else if (SOURCE_EXT.test(name) && !SKIP_FILE.test(name)) {
      yield full;
    }
  }
}

/** Imports of a file with their 1-based line, via TypeScript's pre-processor (ignores comments). */
function importsOf(file) {
  const text = readFileSync(file, 'utf8');
  const info = ts.preProcessFile(text, true, true);
  return info.importedFiles.map((f) => ({
    spec: f.fileName,
    line: text.slice(0, f.pos).split('\n').length,
  }));
}

/** `@scope/name/sub/path` → `@scope/name`; `name/sub` → `name`. */
function packageNameOf(spec) {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

const violations = [];
const report = (file, line, rule, detail) => violations.push({ where: `${rel(file)}:${line}`, rule, detail });

/** Real dependency map, printed with --graph: package → declared deps actually imported. */
const graph = new Map();

for (const pkg of packages) {
  const root = join(ROOT, pkg.root);
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const declared = new Set(
    [manifest.dependencies, manifest.peerDependencies, manifest.optionalDependencies].flatMap((d) => Object.keys(d ?? {})),
  );
  const used = new Set();
  graph.set(pkg.name, used);

  for (const area of pkg.sourceDirs) {
    const hostProvided = new Set(pkg.hostProvided[area] ?? []);
    for (const file of walk(join(root, area))) {
      if (VENDORED.some((v) => rel(file).startsWith(v))) continue;
      for (const { spec, line } of importsOf(file)) {
        if (spec.includes('${')) continue; // an import inside a template literal the code generates (i18n codegen)
        if (spec.startsWith('.')) {
          const target = resolve(dirname(file), spec);
          if (target !== root && !target.startsWith(root + sep)) {
            report(file, line, 'relative-escape', `"${spec}" resolves outside ${pkg.root} (${rel(target)})`);
          }
          continue;
        }
        if (/(^|\/)dist\//.test(spec) || spec.includes('projects/') || spec.startsWith('@shared-demos')) {
          report(file, line, 'forbidden-source', `"${spec}" points at build output, an app or a repo path`);
          continue;
        }
        if (BUILTINS.has(spec) || BUILTINS.has(packageNameOf(spec))) {
          if (!NODE_AREAS.has(area)) report(file, line, 'node-builtin-in-browser-code', `"${spec}" in ${area}/`);
          continue;
        }
        const name = packageNameOf(spec);
        if (name === pkg.name) continue; // secondary entry points import each other by package name
        used.add(name);
        if (!declared.has(name) && !hostProvided.has(name)) {
          report(file, line, 'undeclared-dependency', `"${name}" is not in ${pkg.root}/package.json`);
        }
      }
    }
  }
}

const packageRoots = packages.map((p) => ({ ...p, abs: join(ROOT, p.root) }));
for (const app of APPS) {
  for (const file of walk(join(ROOT, app))) {
    for (const { spec, line } of importsOf(file)) {
      if (spec.startsWith('.')) {
        if (ASSET_IMPORT.test(spec)) continue;
        const target = resolve(dirname(file), spec);
        const hit = packageRoots.find((p) => target === p.abs || target.startsWith(p.abs + sep));
        if (hit) report(file, line, 'app-deep-import', `"${spec}" reaches into ${hit.root}; import from "${hit.name}"`);
        continue;
      }
      const hit = packages.find((p) => spec.startsWith(p.name + '/src') || spec.startsWith(p.name + '/lib'));
      if (hit) report(file, line, 'app-deep-import', `"${spec}" is not a public entry point of ${hit.name}`);
    }
  }
}

if (process.argv.includes('--graph')) {
  for (const [name, used] of graph) console.log(`${name}\n  imports: ${[...used].sort().join(', ') || '(nothing)'}`);
}

if (violations.length) {
  console.error(`✗ ${violations.length} dependency-boundary violation(s):\n`);
  for (const v of violations) console.error(`  ${v.where}  [${v.rule}] ${v.detail}`);
  process.exit(1);
}
console.log(`✓ Dependency boundaries hold for ${packages.map((p) => p.name).join(', ')} and the docs apps`);
