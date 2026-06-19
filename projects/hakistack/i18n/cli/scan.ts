/**
 * i18n Module Scan — pure-regex discovery + codegen.
 *
 * Walks `<srcRoot>/**\/*.i18n.ts`, discovers every
 * `export const NAME = defineTranslations('scope', …)`, and emits into
 * `<definitionsDir>/`:
 *   - `index.generated.ts` — imports, re-exports, and the `ALL_TRANSLATIONS` tuple.
 *   - `keys.generated.ts`  — the flat camelCase `TK` literal (each module's
 *     `.keys` placed at its scope path). No SCREAMING_CASE, no aliases.
 *   - `<directive>.directive.ts` — the typed `app-translate` wrapper that pins
 *     the directive context to `typeof TK`.
 *
 * Pure-regex (no TS execution) so it stays fast and resilient — safe to run on
 * every file change in the watcher even while a module is mid-edit.
 */

import * as fs from 'fs';
import * as path from 'path';

import { I18nCliConfig } from './config';

interface DiscoveredModule {
  exportName: string; // e.g. 'COMMON', 'ADMIN_USERS'
  scope: string | null; // first string arg to defineTranslations, if statically capturable
  importPath: string; // relative to definitionsDir, posix, no extension
  sourceFile: string; // absolute, for diagnostics
}

const SUFFIX = '.i18n.ts';

function collectI18nFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectI18nFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith(SUFFIX)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Extract `export const NAME = defineTranslations('scope', …)` declarations.
 * Captures the uppercase export name and the first string-literal argument
 * (the scope). If the scope isn't a literal, `scope` is null and the module is
 * excluded from the `TK` literal (with a warning).
 */
function extractExports(sourceFile: string): { name: string; scope: string | null }[] {
  const content = fs.readFileSync(sourceFile, 'utf-8');
  const pattern = /export\s+const\s+([A-Z][A-Z0-9_]*)\s*=\s*defineTranslations\s*(?:<[^>]*>)?\s*\(\s*(['"])([^'"]+)\2/g;
  const looser = /export\s+const\s+([A-Z][A-Z0-9_]*)\s*=\s*defineTranslations\s*[<(]/g;

  const withScope = new Map<string, string>();
  for (const m of content.matchAll(pattern)) {
    withScope.set(m[1], m[3]);
  }
  const all: { name: string; scope: string | null }[] = [];
  for (const m of content.matchAll(looser)) {
    const name = m[1];
    all.push({ name, scope: withScope.get(name) ?? null });
  }
  return all;
}

function toImportPath(sourceFile: string, definitionsDir: string): string {
  const relative = path.relative(definitionsDir, sourceFile).replace(/\.ts$/, '');
  const posix = relative.split(path.sep).join('/');
  return posix.startsWith('.') ? posix : './' + posix;
}

function discover(config: I18nCliConfig): DiscoveredModule[] {
  const files = collectI18nFiles(config.srcRoot);
  const modules: DiscoveredModule[] = [];
  for (const file of files) {
    const importPath = toImportPath(file, config.definitionsDir);
    for (const { name, scope } of extractExports(file)) {
      modules.push({ exportName: name, scope, importPath, sourceFile: file });
    }
  }
  modules.sort((a, b) => a.exportName.localeCompare(b.exportName));
  return modules;
}

// =============================================================================
// index.generated.ts
// =============================================================================

function emitBarrel(modules: DiscoveredModule[]): string {
  const byPath = new Map<string, string[]>();
  for (const mod of modules) {
    if (!byPath.has(mod.importPath)) byPath.set(mod.importPath, []);
    byPath.get(mod.importPath)!.push(mod.exportName);
  }
  const importEntries = [...byPath.entries()].sort(([a], [b]) => a.localeCompare(b));
  const importLines = importEntries.map(([imp, names]) => `import { ${[...names].sort().join(', ')} } from '${imp}';`);
  const reExportLines = importEntries.map(([imp, names]) => `export { ${[...names].sort().join(', ')} } from '${imp}';`);
  const tupleEntries = modules.map((m) => `  ${m.exportName}`).join(',\n');

  return [
    GENERATED_HEADER('index.generated.ts'),
    '',
    ...importLines,
    '',
    ...reExportLines,
    '',
    '/**',
    ' * Tuple of every translation module discovered by the scanner.',
    ' * Consumed by the JSON generator and the validator.',
    ' */',
    'export const ALL_TRANSLATIONS = [',
    tupleEntries + (tupleEntries ? ',' : ''),
    '] as const;',
    '',
  ].join('\n');
}

// =============================================================================
// keys.generated.ts — the flat camelCase TK literal
// =============================================================================

interface TKNode {
  ref?: string; // exportName whose `.keys` lives here
  children: Map<string, TKNode>;
}

function newNode(): TKNode {
  return { children: new Map() };
}

function buildTKTree(modules: DiscoveredModule[]): { tree: TKNode; usable: DiscoveredModule[] } {
  const root = newNode();
  const usable: DiscoveredModule[] = [];
  for (const mod of modules) {
    if (!mod.scope) continue;
    usable.push(mod);
    const parts = mod.scope.split('.');
    let node = root;
    for (const part of parts) {
      if (!node.children.has(part)) node.children.set(part, newNode());
      node = node.children.get(part)!;
    }
    node.ref = mod.exportName;
  }
  return { tree: root, usable };
}

function serializeTKNode(node: TKNode, indent: string): string {
  const childIndent = indent + '  ';
  const childEntries = [...node.children.entries()].sort(([a], [b]) => a.localeCompare(b));

  // Leaf: a ref with no children → `NAME.keys`.
  if (node.ref && childEntries.length === 0) {
    return `${node.ref}.keys`;
  }

  const lines: string[] = ['{'];
  if (node.ref) {
    lines.push(`${childIndent}...${node.ref}.keys,`);
  }
  for (const [key, child] of childEntries) {
    lines.push(`${childIndent}${key}: ${serializeTKNode(child, childIndent)},`);
  }
  lines.push(`${indent}}`);
  return lines.join('\n');
}

function emitKeys(modules: DiscoveredModule[]): string {
  const { tree, usable } = buildTKTree(modules);
  const importNames = [...new Set(usable.map((m) => m.exportName))].sort();
  const importLine = importNames.length ? `import { ${importNames.join(', ')} } from './index.generated';` : '';

  const topEntries = [...tree.children.entries()].sort(([a], [b]) => a.localeCompare(b));
  const body = topEntries.map(([key, child]) => `  ${key}: ${serializeTKNode(child, '  ')},`).join('\n');

  return [
    GENERATED_HEADER('keys.generated.ts'),
    '',
    importLine,
    '',
    '/**',
    ' * Unified translation keys (TK) — flat camelCase, one mental model.',
    " * `TK.home.welcome` equals the literal key string `'home.welcome'`.",
    ' *',
    ' * Use in components with `translateSignal(TK.home.welcome)` and in templates',
    ' * via the generated typed directive (`{{ t.home.welcome() }}`).',
    ' */',
    'export const TK = {',
    body,
    '} as const;',
    '',
    '/** Type of the TK object. */',
    'export type TranslationKeys = typeof TK;',
    '',
  ].join('\n');
}

// =============================================================================
// <directive>.directive.ts — typed wrapper
// =============================================================================

function emitDirective(config: I18nCliConfig): string {
  return [
    GENERATED_HEADER(`${config.directiveSelector}.directive.ts`),
    '',
    `import { Directive } from '@angular/core';`,
    `import { TranslateContext, TranslateDirectiveBase } from '${config.packageName}';`,
    '',
    `import { TK } from './keys.generated';`,
    '',
    '/**',
    ' * Typed structural translate directive. Extends the library base and pins',
    " * the template context to this project's `typeof TK`, giving full",
    ' * autocomplete inside `*' + config.directiveSelector + '="let t"` templates.',
    ' */',
    `@Directive({ selector: '[${config.directiveSelector}]' })`,
    `export class ${config.directiveClassName} extends TranslateDirectiveBase {`,
    `  static ngTemplateContextGuard(_dir: ${config.directiveClassName}, ctx: unknown): ctx is TranslateContext<typeof TK> {`,
    '    return true;',
    '  }',
    '}',
    '',
  ].join('\n');
}

// =============================================================================
// Shared
// =============================================================================

function GENERATED_HEADER(file: string): string {
  return [
    '/**',
    ` * AUTO-GENERATED — do not edit by hand (${file}).`,
    ' *',
    ' * Produced by `hakistack-i18n scan`. Re-run the scan after adding,',
    ' * removing, or renaming a `*.i18n.ts` module. Safe to gitignore or commit.',
    ' */',
  ].join('\n');
}

function writeIfChanged(file: string, content: string): boolean {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf-8') === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf-8');
  return true;
}

export interface ScanResult {
  moduleCount: number;
  changed: string[];
  missingScopes: string[];
}

/** Run the scan + codegen. Returns what changed (for the watcher's quiet mode). */
export function runScan(config: I18nCliConfig, opts: { listOnly?: boolean; quiet?: boolean } = {}): ScanResult {
  const modules = discover(config);
  const log = opts.quiet ? () => {} : (m: string) => console.log(m);

  if (modules.length === 0) {
    console.error(`❌ No translation modules found under ${config.srcRoot} (expected at least one *.i18n.ts).`);
    if (!opts.listOnly) process.exitCode = 1;
    return { moduleCount: 0, changed: [], missingScopes: [] };
  }

  log(`\n🔍 i18n scan — discovered ${modules.length} module${modules.length === 1 ? '' : 's'}:`);
  for (const mod of modules) {
    log(`  • ${mod.exportName}${mod.scope ? ` (${mod.scope})` : ''}  ←  ${mod.importPath}`);
  }

  const missingScopes = modules.filter((m) => !m.scope).map((m) => m.exportName);
  if (missingScopes.length) {
    console.warn(
      `\n⚠️  Could not statically read the scope for: ${missingScopes.join(', ')}.\n` +
        `   These are excluded from the TK literal. Use a string-literal scope:\n` +
        `   export const X = defineTranslations('scope', { … }).`,
    );
  }

  if (opts.listOnly) {
    log('\n✓ Listing only (--list); no files emitted.\n');
    return { moduleCount: modules.length, changed: [], missingScopes };
  }

  const outputs: { file: string; content: string }[] = [
    { file: path.join(config.definitionsDir, 'index.generated.ts'), content: emitBarrel(modules) },
    { file: path.join(config.definitionsDir, 'keys.generated.ts'), content: emitKeys(modules) },
    { file: path.join(config.definitionsDir, `${config.directiveSelector}.directive.ts`), content: emitDirective(config) },
  ];

  const changed: string[] = [];
  for (const { file, content } of outputs) {
    if (writeIfChanged(file, content)) changed.push(path.relative(config.cwd, file));
  }

  if (changed.length) {
    log(`\n✓ Wrote:\n${changed.map((f) => `  ${f}`).join('\n')}\n`);
  } else {
    log('\n✓ Up to date — no changes.\n');
  }
  return { moduleCount: modules.length, changed, missingScopes };
}
