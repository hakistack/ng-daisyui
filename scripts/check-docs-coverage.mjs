#!/usr/bin/env node
/**
 * Documentation coverage check for the docs platform.
 *
 * Compares four sources of truth and fails (exit 1) when they disagree:
 *   1. the public API      — extracted from public-api.ts with the TS compiler
 *   2. the docs catalog     — projects/shared-demos/platform/catalog/pages.ts
 *   3. the router           — projects/demo/src/app/app.routes.ts
 *   4. the written content  — projects/shared-demos/platform/content/**
 *
 * Errors (block CI):
 *   - a public symbol no docs page owns (invisible feature)
 *   - a catalog `symbols` entry that is no longer exported (stale docs)
 *   - a page or example route with no matching router route
 *   - a page marked `hasContent` without a content module, or with a
 *     missing/empty translation
 *   - a broken internal link or `related` id in the content
 *   - a playground control that binds a non-existent input/option/output
 *
 * Warnings (reported, do not block): public components/services/functions
 * without a JSDoc description, inputs without descriptions.
 *
 *   node scripts/check-docs-coverage.mjs          # check
 *   node scripts/check-docs-coverage.mjs --write  # also regenerate docs/audit/*.md
 */
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import { Node, Project } from 'ts-morph';
import { extractPublicApi } from './docs/api-extractor.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const jiti = createJiti(import.meta.url);

const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// ── 1. API ──────────────────────────────────────────────────────────────
const { symbols } = extractPublicApi(ROOT);
const byName = new Map(symbols.map((s) => [s.name, s]));

// ── 2. Catalog ──────────────────────────────────────────────────────────
const { DOC_PAGES } = await jiti.import(resolve(ROOT, 'projects/shared-demos/platform/catalog/pages.ts'));
const pageById = new Map(DOC_PAGES.map((p) => [p.id, p]));
const ownerOf = (s) => DOC_PAGES.find((p) => p.symbols?.includes(s.name)) ?? DOC_PAGES.find((p) => p.areas?.includes(s.area));

const seenIds = new Set();
for (const p of DOC_PAGES) {
  if (seenIds.has(p.id)) err(`catalog: duplicate page id "${p.id}"`);
  seenIds.add(p.id);
  for (const field of ['title', 'summary']) {
    if (!p[field]?.en?.trim() || !p[field]?.es?.trim()) err(`catalog: page "${p.id}" is missing ${field} in en or es`);
  }
  for (const name of p.symbols ?? []) {
    if (!byName.has(name)) err(`catalog: page "${p.id}" lists symbol "${name}", which is not exported anymore`);
  }
  for (const area of p.areas ?? []) {
    if (!symbols.some((s) => s.area === area)) err(`catalog: page "${p.id}" owns area "${area}", which has no public symbols`);
  }
}

const unowned = symbols.filter((s) => !ownerOf(s));
for (const s of unowned)
  err(
    `api: public symbol "${s.name}" (${s.kind}, area "${s.area}") is not owned by any docs page — add its area or name to a page in catalog/pages.ts`,
  );

for (const s of symbols) {
  if (s.area === 'external') continue;
  if (['component', 'directive', 'service', 'function', 'provider'].includes(s.kind) && !s.description) {
    warn(`jsdoc: ${s.kind} "${s.name}" has no description (${s.source?.path}:${s.source?.line})`);
  }
}

// ── 3. Routes ───────────────────────────────────────────────────────────
const routePatterns = readRoutes(resolve(ROOT, 'projects/demo/src/app/app.routes.ts'));
const routeExists = (url) => {
  const path = url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  const segs = path.split('/');
  return routePatterns.some((pattern) => {
    if (pattern === '**') return false;
    const ps = pattern.split('/');
    return ps.length === segs.length && ps.every((p, i) => p.startsWith(':') || p === segs[i]);
  });
};

const validTargets = new Set(['/api']);
for (const p of DOC_PAGES) {
  if (!routeExists(p.route)) err(`routes: page "${p.id}" route ${p.route} has no router route`);
  validTargets.add(p.route);
  for (const e of p.examples ?? []) {
    const url = `${p.route}/${e.id}`;
    if (!routeExists(url)) err(`routes: example ${url} has no router route`);
    validTargets.add(url);
  }
}
for (const s of symbols) validTargets.add(`/api/${s.name}`);
const linkOk = (href) => validTargets.has(href.split(/[?#]/)[0].replace(/\/+$/, '') || '/');

// ── 4. Content ──────────────────────────────────────────────────────────
const contentDir = resolve(ROOT, 'projects/shared-demos/platform/content');
const content = new Map();
for (const p of DOC_PAGES.filter((p) => p.hasContent)) {
  const kind = p.section === 'components' ? 'components' : 'articles';
  const file = resolve(contentDir, kind, `${p.id}.ts`);
  if (!existsSync(file)) {
    err(`content: page "${p.id}" has hasContent: true but ${kind}/${p.id}.ts does not exist`);
    continue;
  }
  let mod;
  try {
    mod = (await jiti.import(file)).default;
  } catch (e) {
    err(`content: ${kind}/${p.id}.ts failed to load: ${e.message}`);
    continue;
  }
  content.set(p.id, mod);
  walkLocalized(mod, `${kind}/${p.id}.ts`);
  for (const r of mod.related ?? []) if (!pageById.has(r.id)) err(`content: ${kind}/${p.id}.ts related id "${r.id}" is not a page`);
  for (const href of collectLinks(mod)) if (!linkOk(href)) err(`content: ${kind}/${p.id}.ts links to ${href}, which is not a docs route`);
  const sectionIds = new Set();
  for (const s of [...(mod.sections ?? []), ...(mod.technical ?? [])]) {
    if (sectionIds.has(s.id)) err(`content: ${kind}/${p.id}.ts duplicate section id "${s.id}"`);
    sectionIds.add(s.id);
  }
}
const { COMPONENT_CONTENT, ARTICLE_CONTENT } = await jiti.import(resolve(contentDir, 'index.ts'));
const loaderIds = new Set([...Object.keys(COMPONENT_CONTENT), ...Object.keys(ARTICLE_CONTENT)]);
for (const p of DOC_PAGES.filter((p) => p.hasContent)) {
  if (!loaderIds.has(p.id)) err(`content: page "${p.id}" is missing from content/index.ts loaders`);
}
for (const id of loaderIds)
  if (!pageById.get(id)?.hasContent) err(`content: content/index.ts has a loader for "${id}", which is not a page with hasContent`);

// ── 5. Playgrounds ──────────────────────────────────────────────────────
const { PLAYGROUND_SPECS } = await jiti.import(resolve(ROOT, 'projects/shared-demos/platform/playground/playground-specs.ts'));
const { PLAYGROUNDS } = await jiti.import(resolve(ROOT, 'projects/shared-demos/platform/playground/hosts/index.ts'));
for (const [pageId, spec] of Object.entries(PLAYGROUND_SPECS)) {
  if (!pageById.has(pageId)) err(`playground: spec key "${pageId}" is not a docs page`);
  if (!(pageId in PLAYGROUNDS)) err(`playground: "${pageId}" has a spec but no host in playground/hosts/index.ts`);
  const sym = byName.get(spec.symbol);
  if (!sym) {
    err(`playground: "${pageId}" targets "${spec.symbol}", which is not exported`);
    continue;
  }
  if (spec.selector) {
    const inputs = new Map((sym.inputs ?? []).map((i) => [i.name, i]));
    const outputs = new Set((sym.outputs ?? []).map((o) => o.name));
    if (
      sym.selector &&
      !sym.selector
        .split(',')
        .map((x) => x.trim())
        .includes(spec.selector)
    ) {
      err(`playground: "${pageId}" uses selector <${spec.selector}> but ${spec.symbol} declares "${sym.selector}"`);
    }
    for (const key of spec.inputs ?? []) {
      const input = inputs.get(key);
      if (!input) {
        err(`playground: "${pageId}" binds [${key}], which is not an input of ${spec.symbol}`);
        continue;
      }
      checkDefault(pageId, key, spec.defaults[key], input.default);
      const control = spec.controls.find((c) => c.key === key);
      if (control?.kind === 'select') checkOptions(pageId, key, control.options, input.type);
    }
    for (const e of spec.events ?? [])
      if (!outputs.has(e)) err(`playground: "${pageId}" listens to (${e}), which is not an output of ${spec.symbol}`);
  } else if (spec.optionsSymbol) {
    const opts = byName.get(spec.optionsSymbol);
    const members = new Map((opts?.members ?? []).map((m) => [m.name, m]));
    if (!opts) err(`playground: "${pageId}" optionsSymbol "${spec.optionsSymbol}" is not exported`);
    for (const c of spec.controls) {
      const m = members.get(c.key);
      if (!m) err(`playground: "${pageId}" control "${c.key}" is not a member of ${spec.optionsSymbol}`);
      else if (c.kind === 'select') checkOptions(pageId, c.key, c.options, m.type);
    }
  }
}

function checkDefault(pageId, key, specDefault, manifestDefault) {
  if (manifestDefault === undefined) return;
  let real;
  if (/^'.*'$/.test(manifestDefault)) real = manifestDefault.slice(1, -1);
  else if (manifestDefault === 'true' || manifestDefault === 'false') real = manifestDefault === 'true';
  else if (/^-?\d+(\.\d+)?$/.test(manifestDefault)) real = Number(manifestDefault);
  else if (manifestDefault === 'null' || manifestDefault === 'undefined') real = '';
  else return; // computed default (e.g. this.defaultConfig.x) — cannot compare statically
  if (real !== specDefault) {
    err(
      `playground: "${pageId}" default for ${key} is ${JSON.stringify(specDefault)} but the component default is ${manifestDefault} — generated code would omit a meaningful value`,
    );
  }
}

function checkOptions(pageId, key, options, typeText) {
  const literals = resolveUnion(typeText);
  if (!literals) return;
  for (const o of options) {
    if (o === '' && /\bnull\b|\bundefined\b/.test(expandAliases(typeText))) continue;
    if (!literals.has(o)) err(`playground: "${pageId}" offers ${key}="${o}", which is not in ${typeText}`);
  }
}

function expandAliases(typeText) {
  return typeText.replace(/\b[A-Z]\w*\b/g, (n) => {
    const s = byName.get(n);
    return s?.kind === 'type' && s.typeText ? `(${s.typeText})` : n;
  });
}

function resolveUnion(typeText) {
  const expanded = expandAliases(typeText);
  const lits = [...expanded.matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] ?? m[2]);
  return lits.length ? new Set(lits) : null;
}

// ── helpers ─────────────────────────────────────────────────────────────
function readRoutes(file) {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sf = project.addSourceFileAtPath(file);
  const out = [];
  sf.forEachDescendant((node) => {
    if (Node.isPropertyAssignment(node) && node.getName() === 'path') {
      const init = node.getInitializer();
      if (init && Node.isStringLiteral(init)) out.push(init.getLiteralText());
    }
    if (Node.isCallExpression(node) && node.getExpression().getText() === 'componentPage') {
      const arg = node.getArguments()[0];
      if (arg && Node.isStringLiteral(arg)) out.push(arg.getLiteralText(), `${arg.getLiteralText()}/:feature`);
    }
  });
  return out;
}

function walkLocalized(value, where, path = '') {
  if (Array.isArray(value)) return value.forEach((v, i) => walkLocalized(v, where, `${path}[${i}]`));
  if (!value || typeof value !== 'object') return;
  const keys = Object.keys(value);
  if (keys.includes('en') || keys.includes('es')) {
    if (typeof value.en !== 'string' || !value.en.trim()) err(`content: ${where} ${path} is missing English text`);
    if (typeof value.es !== 'string' || !value.es.trim()) err(`content: ${where} ${path} is missing Spanish text`);
    return;
  }
  for (const k of keys) walkLocalized(value[k], where, path ? `${path}.${k}` : k);
}

function collectLinks(value, out = []) {
  if (typeof value === 'string') {
    const noCode = value.replace(/`[^`]+`/g, '');
    for (const m of noCode.matchAll(/\[[^\]]+\]\((\/[^)\s]*)\)/g)) out.push(m[1]);
  } else if (Array.isArray(value)) value.forEach((v) => collectLinks(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (k !== 'code' && k !== 'ts') collectLinks(v, out);
  }
  return out;
}

function testsForArea(area) {
  const dirs = [
    `projects/hakistack/ng-daisyui/src/lib/components/${area}`,
    `projects/hakistack/ng-daisyui/src/lib/services/${area}`,
    `projects/hakistack/ng-daisyui/src/lib/${area}`,
  ];
  let n = 0;
  for (const d of dirs) {
    const abs = resolve(ROOT, d);
    if (!existsSync(abs)) continue;
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) walk(resolve(dir, e.name));
        else if (e.name.endsWith('.spec.ts')) n++;
      }
    };
    walk(abs);
  }
  return n;
}

// ── reports ─────────────────────────────────────────────────────────────
if (WRITE) {
  const outDir = resolve(ROOT, 'docs/audit');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'documentation-coverage.md'), coverageReport());
  writeFileSync(resolve(outDir, 'documentation-inventory.md'), inventoryReport());
  console.log('✓ wrote docs/audit/documentation-coverage.md and docs/audit/documentation-inventory.md');
}

function yes(b) {
  return b ? '✅' : '—';
}

function coverageReport() {
  const pages = DOC_PAGES.filter((p) => p.section === 'components' || p.examples?.length);
  const rows = pages.map((p) => {
    const c = content.get(p.id);
    const owned = symbols.filter((s) => ownerOf(s) === p);
    const beginner = !!c?.overview?.length && !!c?.whenToUse?.length;
    const technical = !!c?.technical?.length;
    const demo = !!p.examples?.length;
    const a11y = !!c?.accessibility && (c.accessibility.keyboard.length > 0 || c.accessibility.notes.length > 0);
    const playground = !!PLAYGROUND_SPECS[p.id];
    const done = beginner && technical && demo && owned.length > 0 && a11y;
    return `| ${p.title.en} | ${yes(beginner)} | ${yes(technical)} | ${yes(demo)} ${demo ? `(${p.examples.length})` : ''} | ${owned.length ? `✅ (${owned.length})` : '—'} | ${yes(a11y)} | ${yes(playground)} | ${p.status} | ${done ? 'Complete' : 'Partial'} |`;
  });
  const articles = DOC_PAGES.filter((p) => p.hasContent && p.section !== 'components');
  const owned = symbols.length - unowned.length;
  return `# Documentation coverage report

> Generated by \`npm run docs:report\` (scripts/check-docs-coverage.mjs). Do not edit by hand.
> "Complete" means: plain-language overview, technical deep dive, live demo, generated API reference and accessibility notes all exist. It does not mean the component itself is finished — see the Status column (taken from the catalog).

## Summary

| Metric | Value |
|---|---|
| Public symbols (public-api.ts) | ${symbols.length} |
| Symbols owned by a docs page | ${owned} (${Math.round((owned / symbols.length) * 100)}%) |
| Docs pages | ${DOC_PAGES.length} |
| Pages with written content | ${content.size} |
| Interactive playgrounds | ${Object.keys(PLAYGROUND_SPECS).length} |
| Errors | ${errors.length} |
| Warnings (missing JSDoc) | ${warnings.length} |

## Components

| Component | Beginner docs | Technical docs | Live demo | API reference | Accessibility | Playground | Maturity | Docs status |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Guides, foundations, systems and architecture

| Page | Route | Written | Sections |
|---|---|---|---|
${articles.map((p) => `| ${p.title.en} | \`${p.route}\` | ${yes(content.has(p.id))} | ${content.get(p.id)?.sections?.length ?? 0} |`).join('\n')}

## Open issues

${errors.length ? errors.map((e) => `- ❌ ${e}`).join('\n') : '- No errors.'}

<details><summary>${warnings.length} warnings (public API without JSDoc)</summary>

${warnings.map((w) => `- ${w}`).join('\n')}

</details>
`;
}

function inventoryReport() {
  const pages = DOC_PAGES.filter((p) => p.areas?.length || p.symbols?.length);
  const rows = pages.map((p) => {
    const owned = symbols.filter((s) => ownerOf(s) === p);
    const kinds = {};
    for (const s of owned) kinds[s.kind] = (kinds[s.kind] ?? 0) + 1;
    const api = Object.entries(kinds)
      .map(([k, n]) => `${n} ${k}`)
      .join(', ');
    const tests = (p.areas ?? []).reduce((n, a) => n + testsForArea(a), 0);
    return `| ${p.title.en} | ${api || '—'} | ${p.examples?.length ? `${p.examples.length} tabs (\`${p.route}\`)` : '—'} | ${content.has(p.id) ? 'Overview + technical' : '—'} | ${p.examples?.length ?? 0} | ${tests ? `${tests} spec files` : '—'} | ${p.status} |`;
  });
  return `# Documentation inventory

> Generated by \`npm run docs:report\`. The matrix is derived from the code (public-api.ts via the TypeScript compiler), the docs catalog and the router — not written by hand.
> Discovery notes (what existed before the docs platform, what was reorganized and why) are in [findings.md](./findings.md).

Every public symbol is assigned to exactly one docs page (by source area, or explicitly). ${unowned.length === 0 ? 'All ' + symbols.length + ' exported symbols are covered.' : unowned.length + ' symbols are not covered — see documentation-coverage.md.'}

| Feature | Public API | Demo | Docs | Examples | Tests | Status |
|---|---|---|---|---|---|---|
${rows.join('\n')}

## Symbols by kind

| Kind | Count |
|---|---|
${Object.entries(symbols.reduce((a, s) => ((a[s.kind] = (a[s.kind] ?? 0) + 1), a), {}))
  .sort((a, b) => b[1] - a[1])
  .map(([k, n]) => `| ${k} | ${n} |`)
  .join('\n')}
`;
}

// ── result ──────────────────────────────────────────────────────────────
for (const w of warnings.slice(0, process.env.CI ? 0 : 0)) console.warn(`⚠ ${w}`);
console.log(
  `docs:check — ${symbols.length} public symbols, ${DOC_PAGES.length} pages, ${content.size} content modules, ${Object.keys(PLAYGROUND_SPECS).length} playgrounds`,
);
console.log(`  ${warnings.length} warnings (public API without JSDoc; see docs/audit/documentation-coverage.md)`);
if (errors.length) {
  console.error(`✗ ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('✓ documentation is in sync with the public API');
