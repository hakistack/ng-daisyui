/**
 * i18n Module Scan — static discovery (TypeScript AST, see `discover.ts`) + codegen.
 *
 * Discovers every exported `defineTranslations('scope', …)` under `srcRoot`
 * and emits into `<definitionsDir>/`:
 *   - `index.generated.ts` — imports, re-exports, and the `ALL_TRANSLATIONS` tuple.
 *   - `keys.generated.ts`  — the `TK` literal (each module's `.keys` placed at
 *     its scope path, shared branches combined with `mergeKeys`).
 *   - `<directive>.directive.ts` — the typed `app-translate` wrapper that pins
 *     the directive context to `typeof TK`.
 *   - `i18n-locales.generated.d.ts` — the `I18nLocales` augmentation for the
 *     configured `locales` (the config is the single place locales are declared).
 *
 * Nothing is executed, so it stays fast and is safe to run on every file change
 * in the watcher, even while a module is mid-edit. Errors (duplicate export
 * names, key conflicts) are reported with file:line and nothing is written.
 */

import * as path from 'path';

import { conflictsFromLeaves } from '../engine/define-translations';
import { I18nCliConfig } from './config';
import { DiscoveredModule, discover, DiscoveryIssue, formatLocation, keyLocations } from './discover';
import { syncOutputs } from './output';
import { describeConflict } from './report';

function findDuplicateExportNames(modules: DiscoveredModule[]): [string, DiscoveredModule[]][] {
  const byName = new Map<string, DiscoveredModule[]>();
  for (const mod of modules) byName.set(mod.exportName, [...(byName.get(mod.exportName) ?? []), mod]);
  return [...byName].filter(([, mods]) => mods.length > 1);
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
    LOCALES_REFERENCE,
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
  /** Full key when this node is a translation read statically from source. */
  leaf: string | null;
  /** Its interpolation params (typed on the key with `I18nKey`). */
  params: string[];
  /** Modules that could not be read statically: their `.keys` are referenced here. */
  refs: string[];
  children: Map<string, TKNode>;
}

function newNode(): TKNode {
  return { leaf: null, params: [], refs: [], children: new Map() };
}

/**
 * Build the TK tree. Modules read completely from source contribute literal
 * key strings, so `keys.generated.ts` does not import them and an app using
 * `TK` without the registry (lazy or HTTP loading) bundles no translations.
 * Modules with spreads / references are referenced through `NAME.keys`.
 */
function buildTKTree(modules: DiscoveredModule[]): { tree: TKNode; refs: string[]; duplicateScopes: Map<string, string[]> } {
  const root = newNode();
  const refs: string[] = [];
  const byScope = new Map<string, string[]>();
  const descend = (parts: string[]) =>
    parts.reduce((node, part) => {
      if (!node.children.has(part)) node.children.set(part, newNode());
      return node.children.get(part)!;
    }, root);

  for (const mod of modules) {
    if (!mod.scope) continue;
    (byScope.get(mod.scope) ?? byScope.set(mod.scope, []).get(mod.scope)!).push(mod.exportName);
    const scopeParts = mod.scope.split('.');
    if (mod.partial) {
      descend(scopeParts).refs.push(mod.exportName);
      refs.push(mod.exportName);
    } else {
      descend(scopeParts); // an empty module still yields its (empty) branch
      for (const key of mod.keys) Object.assign(descend([...scopeParts, ...key.path]), { leaf: key.key, params: key.params });
    }
  }
  const duplicateScopes = new Map([...byScope].filter(([, names]) => names.length > 1));
  return { tree: root, refs: [...new Set(refs)].sort(), duplicateScopes };
}

const IDENTIFIER_RE = /^[A-Za-z_$][\w$]*$/;

/** Object-literal property name: bare when it is a valid identifier, quoted otherwise (`'my-feature'`). */
function propertyName(key: string): string {
  return IDENTIFIER_RE.test(key) ? key : quote(key);
}

/** Single-quoted TS string literal. */
function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/**
 * Serialize one TK branch: a key string for a translation, an object literal
 * for a group. Where modules that could not be read statically contribute,
 * their `NAME.keys` are combined with the literal through `mergeKeys(...)` —
 * the same deep merge the runtime `buildKeysTree` uses, so compile-time `TK`
 * and runtime keys always agree.
 */
function serializeTKNode(node: TKNode, indent: string, usage: { mergeKeys: boolean; keyType: boolean }): string {
  if (node.leaf !== null && node.children.size === 0 && node.refs.length === 0) {
    if (node.params.length === 0) return quote(node.leaf);
    usage.keyType = true;
    return `${quote(node.leaf)} as I18nKey<${quote(node.leaf)}, ${node.params.map(quote).join(' | ')}>`;
  }
  const childIndent = indent + '  ';
  const childEntries = [...node.children.entries()].sort(([a], [b]) => a.localeCompare(b));

  const parts = node.refs.map((ref) => `${ref}.keys`);
  if (childEntries.length || parts.length === 0) {
    const lines = ['{'];
    for (const [key, child] of childEntries) {
      lines.push(`${childIndent}${propertyName(key)}: ${serializeTKNode(child, childIndent, usage)},`);
    }
    lines.push(`${indent}}`);
    parts.push(childEntries.length ? lines.join('\n') : '{}');
  }
  if (parts.length === 1) return parts[0];
  usage.mergeKeys = true;
  return `mergeKeys(${parts.join(', ')})`;
}

function emitKeys(modules: DiscoveredModule[], packageName: string): string {
  const { tree, refs } = buildTKTree(modules);
  const importLine = refs.length ? `import { ${refs.join(', ')} } from './index.generated';` : '';

  const usage = { mergeKeys: false, keyType: false };
  const topEntries = [...tree.children.entries()].sort(([a], [b]) => a.localeCompare(b));
  const body = topEntries.map(([key, child]) => `  ${propertyName(key)}: ${serializeTKNode(child, '  ', usage)},`).join('\n');
  const imports = [
    usage.keyType ? `import type { I18nKey } from '${packageName}/engine';` : '',
    usage.mergeKeys ? `import { mergeKeys } from '${packageName}/engine';` : '',
    importLine,
  ].filter(Boolean);

  return [
    GENERATED_HEADER('keys.generated.ts'),
    LOCALES_REFERENCE,
    '',
    ...imports,
    '',
    '/**',
    ' * Unified translation keys (TK) — one mental model.',
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

// =============================================================================
// i18n-locales.generated.d.ts — the locale set, declared once in the config
// =============================================================================

/**
 * Pulls the locale augmentation into any program that imports TK or the
 * registry, even when the tsconfig lists its files explicitly (`"files"`)
 * instead of including `src/**\/*.d.ts`.
 */
const LOCALES_REFERENCE = '/// <reference path="./i18n-locales.generated.d.ts" />';

/** Augments `I18nLocales` from `i18n.config` `locales`, so `t()` autocompletes exactly those locales. */
function emitLocales(config: I18nCliConfig): string {
  const fields = config.locales.map((locale) => `    ${propertyName(locale)}: string;`);
  return [
    GENERATED_HEADER('i18n-locales.generated.d.ts'),
    '',
    `import '${config.packageName}/engine';`,
    '',
    `declare module '${config.packageName}/engine' {`,
    '  interface I18nLocales {',
    ...fields,
    '  }',
    '}',
    '',
  ].join('\n');
}

function emitDirective(config: I18nCliConfig): string {
  const sel = config.directiveSelector;
  return [
    GENERATED_HEADER(`${sel}.directive.ts`),
    '',
    `import { Directive, input } from '@angular/core';`,
    `import { TranslateContext, TranslateDirectiveBase } from '${config.packageName}';`,
    '',
    `import { TK } from './keys.generated';`,
    '',
    '/**',
    ' * Typed structural translate directive. Extends the library base and pins',
    " * the template context to this project's `typeof TK`, giving full",
    ' * autocomplete inside `*' + sel + '="let t"` templates.',
    ' */',
    `@Directive({ selector: '[${sel}]' })`,
    `export class ${config.directiveClassName} extends TranslateDirectiveBase {`,
    '  /**',
    '   * Optional prefix prepended to every key (for scoped translations).',
    `   * Microsyntax: \`*${sel}="let t; prefix: 'admin'"\` binds here.`,
    '   */',
    `  readonly ${sel}Prefix = input<string | undefined>(undefined);`,
    '',
    '  protected override prefix(): string | undefined {',
    `    return this.${sel}Prefix();`,
    '  }',
    '',
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

export interface ScanResult {
  /** `false` when the scan reported an error (nothing was written). */
  ok: boolean;
  moduleCount: number;
  changed: string[];
  missingScopes: string[];
}

/** Run the scan + codegen. Returns what changed (for the watcher's quiet mode). */
export function runScan(config: I18nCliConfig, opts: { listOnly?: boolean; quiet?: boolean } = {}): ScanResult {
  const { modules, issues } = discover(config);
  const log = opts.quiet ? () => {} : (m: string) => console.log(m);
  const at = (loc: { file: string; line: number }) => formatLocation(loc, config.cwd);
  const fail = (title: string, lines: string[]): ScanResult => {
    console.error(`\n❌ ${title}\n${lines.map((l) => `   ${l}`).join('\n')}\n   No files were written.`);
    process.exitCode = 1;
    return { ok: false, moduleCount: modules.length, changed: [], missingScopes: [] };
  };

  printIssues(issues, at);

  if (modules.length === 0) {
    console.error(`❌ No translation modules found under ${config.srcRoot} (expected at least one *.i18n.ts).`);
    if (!opts.listOnly) process.exitCode = 1;
    return { ok: !!opts.listOnly, moduleCount: 0, changed: [], missingScopes: [] };
  }

  log(`\n🔍 i18n scan — discovered ${modules.length} module${modules.length === 1 ? '' : 's'}:`);
  for (const mod of modules) {
    log(`  • ${mod.exportName}${mod.scope ? ` (${mod.scope})` : ''}  ←  ${at({ file: mod.sourceFile, line: mod.line })}`);
  }

  const duplicateNames = findDuplicateExportNames(modules);
  if (duplicateNames.length) {
    return fail(
      'Translation module names must be unique (they are imported side by side in the generated barrel). Rename one of the exports:',
      duplicateNames.map(([name, mods]) => `${name}: ${mods.map((m) => at({ file: m.sourceFile, line: m.line })).join(', ')}`),
    );
  }

  // Conflicts among keys readable from source. `validate` re-checks the executed registry.
  const conflicts = conflictsFromLeaves(modules.flatMap((m) => m.keys.map(({ key }) => ({ key, scope: m.scope ?? '' }))));
  if (conflicts.length) {
    const locations = keyLocations(modules);
    return fail(
      `${conflicts.length} key conflict(s):`,
      conflicts.map((c) => describeConflict(c, locations.get(c.key)?.map(at))),
    );
  }

  const missingScopes = modules.filter((m) => !m.scope).map((m) => m.exportName);
  const { duplicateScopes } = buildTKTree(modules);
  for (const [scope, names] of duplicateScopes) {
    log(`\nℹ︎  Scope '${scope}' is shared by ${names.join(', ')}; their keys are merged into TK${tkPath(scope)}.`);
  }

  if (opts.listOnly) {
    log('\n✓ Listing only (--list); no files emitted.\n');
    return { ok: true, moduleCount: modules.length, changed: [], missingScopes };
  }

  const result = syncOutputs(config.cwd, `scan:${config.definitionsDir}`, config.definitionsDir, [
    { file: path.join(config.definitionsDir, 'index.generated.ts'), content: emitBarrel(modules) },
    { file: path.join(config.definitionsDir, 'keys.generated.ts'), content: emitKeys(modules, config.packageName) },
    { file: path.join(config.definitionsDir, `${config.directiveSelector}.directive.ts`), content: emitDirective(config) },
    { file: path.join(config.definitionsDir, 'i18n-locales.generated.d.ts'), content: emitLocales(config) },
  ]);
  const rel = (f: string) => path.relative(config.cwd, f);
  const changed = [...result.written, ...result.removed].map(rel);

  if (result.written.length) log(`\n✓ Wrote:\n${result.written.map((f) => `  ${rel(f)}`).join('\n')}`);
  if (result.removed.length) log(`\n✓ Removed stale:\n${result.removed.map((f) => `  ${rel(f)}`).join('\n')}`);
  log(changed.length ? '' : '\n✓ Up to date — no changes.\n');
  return { ok: true, moduleCount: modules.length, changed, missingScopes };
}

function printIssues(issues: DiscoveryIssue[], at: (loc: { file: string; line: number }) => string): void {
  for (const issue of issues) {
    const line = `${issue.severity === 'error' ? '❌' : '⚠️ '} ${at(issue)} — ${issue.message}`;
    if (issue.severity === 'error') console.error(line);
    else console.warn(line);
  }
}

/** `TK.common` / `TK['my-feature'].x` — how a scope is accessed on TK. */
function tkPath(scope: string): string {
  return scope
    .split('.')
    .map((part) => (IDENTIFIER_RE.test(part) ? `.${part}` : `['${part}']`))
    .join('');
}
