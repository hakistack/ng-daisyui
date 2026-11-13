#!/usr/bin/env node
/**
 * Compile every code example the docs present as "copy and run":
 *   - each component page's `quickStart.ts` (content/components/*.ts)
 *   - the code the playgrounds generate, for the default state and for a
 *     state with every control changed
 *
 * The snippets are written as real files under out-tsc/doc-snippets and
 * compiled with the Angular compiler (`ngc`) in strict-template mode against
 * the library source (`@hakistack/ng-daisyui` → public-api.ts). A snippet
 * that uses a removed input, a wrong type or a missing import fails here.
 *
 *   npm run docs:snippets
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'out-tsc/doc-snippets');
const jiti = createJiti(import.meta.url);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(resolve(OUT, 'src'), { recursive: true });

const files = [];
const add = (name, code) => {
  const file = resolve(OUT, 'src', `${name}.ts`);
  writeFileSync(file, code);
  files.push(file);
};

// 1. quickStarts
const contentDir = resolve(ROOT, 'projects/shared-demos/platform/content/components');
for (const f of readdirSync(contentDir).filter((f) => f.endsWith('.ts'))) {
  const mod = (await jiti.import(resolve(contentDir, f))).default;
  if (mod.quickStart?.ts) add(`quickstart-${f.replace(/\.ts$/, '')}`, mod.quickStart.ts);
}

// 2. playground output
const { PLAYGROUND_SPECS } = await jiti.import(resolve(ROOT, 'projects/shared-demos/platform/playground/playground-specs.ts'));
const { generatePlaygroundCode } = await jiti.import(resolve(ROOT, 'projects/shared-demos/platform/playground/playground-codegen.ts'));
for (const [id, spec] of Object.entries(PLAYGROUND_SPECS)) {
  add(`playground-${id}-default`, generatePlaygroundCode(spec, spec.defaults));
  const changed = { ...spec.defaults };
  for (const c of spec.controls) {
    if (c.kind === 'boolean') changed[c.key] = !spec.defaults[c.key];
    else if (c.kind === 'select') changed[c.key] = c.options.find((o) => o && o !== spec.defaults[c.key]) ?? spec.defaults[c.key];
    else if (c.kind === 'number') changed[c.key] = c.max ?? Number(spec.defaults[c.key]) + 1;
    else changed[c.key] = `${spec.defaults[c.key] || 'Text'} "quoted" it's`;
  }
  add(`playground-${id}-changed`, generatePlaygroundCode(spec, changed));
}

writeFileSync(
  resolve(OUT, 'tsconfig.json'),
  JSON.stringify(
    {
      extends: '../../tsconfig.json',
      compilerOptions: { outDir: './dist', noEmit: false, declaration: false, sourceMap: false, types: [], skipLibCheck: true },
      files: files.map((f) => `./src/${f.split('/').pop()}`),
      angularCompilerOptions: { strictTemplates: true, strictInjectionParameters: true, strictInputAccessModifiers: true },
    },
    null,
    2,
  ),
);

console.log(`Compiling ${files.length} doc snippets with ngc (strict templates)…`);
try {
  execFileSync(resolve(ROOT, 'node_modules/.bin/ngc'), ['-p', resolve(OUT, 'tsconfig.json')], { stdio: 'inherit', cwd: ROOT });
  console.log(`✓ all ${files.length} snippets compile`);
} catch {
  console.error(`✗ some snippets do not compile — sources are in ${OUT}/src`);
  process.exit(1);
}
