/**
 * Static discovery of translation modules with the TypeScript compiler API.
 *
 * Parses every `<srcRoot>/**\/*.i18n.ts` (syntax only — no type checking, no
 * execution, so it stays fast and works on a file that is mid-edit) and finds
 * each exported `defineTranslations(...)` call, its scope and, when the
 * translations are an object literal, every key with its line. The keys feed
 * the scanner's conflict check and the file:line locations printed by
 * `validate` / `generate`.
 *
 * Supported shapes: `export const X = defineTranslations(…)`, a local const
 * re-exported with `export { X }` / `export { X as Y }`, an aliased import
 * (`import { defineTranslations as dt }`) and a namespace import
 * (`i18n.defineTranslations(…)`). Comments and strings never produce matches.
 */

import * as fs from 'fs';
import { createRequire } from 'module';
import * as path from 'path';
import type * as TS from 'typescript';

import { I18nCliConfig } from './config';

export const I18N_SUFFIX = '.i18n.ts';
const DEFINE = 'defineTranslations';
const LEAF = 't';

export interface SourceLocation {
  /** Absolute path. */
  file: string;
  /** 1-based line. */
  line: number;
}

export interface DiscoveredKey {
  /** Full dotted key (`scope.path.to.key`). */
  key: string;
  /** Property names from the scope down (a quoted `'a.b'` name stays one segment). */
  path: string[];
  line: number;
  /** Interpolation params of a `t('…')` source text, sorted (`[]` for bare strings or non-literal text). */
  params: string[];
}

export interface DiscoveredModule {
  exportName: string;
  /** First argument when it is a string literal; `null` otherwise. */
  scope: string | null;
  /** Relative to `definitionsDir`, posix, no extension. */
  importPath: string;
  sourceFile: string;
  line: number;
  /** Keys read statically from the translations object literal (empty without a scope). */
  keys: DiscoveredKey[];
  /** Part of the translations could not be read statically (spread, computed name, reference…). */
  partial: boolean;
}

export interface DiscoveryIssue extends SourceLocation {
  severity: 'error' | 'warning';
  message: string;
}

export interface Discovery {
  modules: DiscoveredModule[];
  issues: DiscoveryIssue[];
}

let cachedTs: typeof TS | null = null;

/**
 * Load the consumer's `typescript` (every Angular project has it), falling back
 * to one resolvable from the CLI itself. It is an optional peer dependency: only
 * the codegen needs it, never the runtime.
 */
export function loadTypeScript(cwd: string): typeof TS {
  if (cachedTs) return cachedTs;
  for (const from of [path.join(cwd, 'package.json'), __filename]) {
    try {
      cachedTs = createRequire(from)('typescript') as typeof TS;
      return cachedTs;
    } catch {
      // try the next location
    }
  }
  throw new Error('i18n: the codegen needs the "typescript" package. Install it with:\n  npm i -D typescript');
}

/** Every `*.i18n.ts` under `dir`, sorted (deterministic across platforms). */
export function collectI18nFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectI18nFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith(I18N_SUFFIX)) out.push(full);
  }
  return out;
}

function toImportPath(sourceFile: string, definitionsDir: string): string {
  const posix = path.relative(definitionsDir, sourceFile).replace(/\.ts$/, '').split(path.sep).join('/');
  return posix.startsWith('.') ? posix : './' + posix;
}

export function discover(config: I18nCliConfig): Discovery {
  const ts = loadTypeScript(config.cwd);
  const modules: DiscoveredModule[] = [];
  const issues: DiscoveryIssue[] = [];
  for (const file of collectI18nFiles(config.srcRoot)) {
    const found = discoverFile(ts, file, fs.readFileSync(file, 'utf-8'), issues);
    const importPath = toImportPath(file, config.definitionsDir);
    for (const mod of found) modules.push({ ...mod, importPath });
  }
  modules.sort((a, b) => a.exportName.localeCompare(b.exportName) || a.sourceFile.localeCompare(b.sourceFile));
  return { modules, issues };
}

/** Parse one file. Exported for tests. */
export function discoverFile(ts: typeof TS, file: string, text: string, issues: DiscoveryIssue[]): Omit<DiscoveredModule, 'importPath'>[] {
  const fileIssues: DiscoveryIssue[] = [];
  const found = scanSourceFile(ts, file, text, fileIssues);
  issues.push(...fileIssues.sort((a, b) => a.line - b.line));
  return found;
}

function scanSourceFile(ts: typeof TS, file: string, text: string, issues: DiscoveryIssue[]): Omit<DiscoveredModule, 'importPath'>[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const lineOf = (node: TS.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const issue = (node: TS.Node, severity: DiscoveryIssue['severity'], message: string) =>
    issues.push({ file, line: lineOf(node), severity, message });

  // Local names bound to defineTranslations (aliases) and namespace imports.
  const defineNames = new Set([DEFINE]);
  const leafNames = new Set([LEAF]);
  const namespaces = new Set<string>();
  for (const stmt of sf.statements) {
    const bindings = ts.isImportDeclaration(stmt) ? stmt.importClause?.namedBindings : undefined;
    if (!bindings) continue;
    if (ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
    else
      for (const el of bindings.elements) {
        const imported = (el.propertyName ?? el.name).text;
        if (imported === DEFINE) defineNames.add(el.name.text);
        if (imported === LEAF) leafNames.add(el.name.text);
      }
  }

  const unwrap = (node: TS.Expression): TS.Expression =>
    ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)
      ? unwrap(node.expression)
      : node;
  const defineCall = (init: TS.Expression | undefined): TS.CallExpression | null => {
    if (!init) return null;
    const call = unwrap(init);
    if (!ts.isCallExpression(call)) return null;
    const callee = call.expression;
    if (ts.isIdentifier(callee) && defineNames.has(callee.text)) return call;
    if (ts.isPropertyAccessExpression(callee) && callee.name.text === DEFINE && ts.isIdentifier(callee.expression)) {
      return namespaces.has(callee.expression.text) ? call : null;
    }
    return null;
  };

  // Top-level `const NAME = defineTranslations(…)`, exported inline or later via `export { … }`.
  const declared = new Map<string, { call: TS.CallExpression; node: TS.Node; exported: boolean }>();
  const reExported = new Map<string, string[]>(); // local name → exported names
  for (const stmt of sf.statements) {
    if (ts.isVariableStatement(stmt)) {
      const exported = !!stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      for (const decl of stmt.declarationList.declarations) {
        const call = defineCall(decl.initializer);
        if (call && ts.isIdentifier(decl.name)) declared.set(decl.name.text, { call, node: decl, exported });
      }
    } else if (ts.isExportDeclaration(stmt) && !stmt.moduleSpecifier && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      for (const el of stmt.exportClause.elements) {
        const local = (el.propertyName ?? el.name).text;
        reExported.set(local, [...(reExported.get(local) ?? []), el.name.text]);
      }
    } else if (ts.isExportAssignment(stmt) && defineCall(stmt.expression)) {
      issue(
        stmt,
        'warning',
        'default-exported translation module is ignored — use a named export (export const NAME = defineTranslations(…)).',
      );
    }
  }

  const found: Omit<DiscoveredModule, 'importPath'>[] = [];
  for (const [local, { call, node, exported }] of declared) {
    const names = [...(exported ? [local] : []), ...(reExported.get(local) ?? [])];
    if (names.length === 0) continue; // not exported: a building block, not a module
    const scopeArg = call.arguments[0] ? unwrap(call.arguments[0]) : undefined;
    const scope = scopeArg && (ts.isStringLiteral(scopeArg) || ts.isNoSubstitutionTemplateLiteral(scopeArg)) ? scopeArg.text : null;
    if (scope === null) {
      issue(call, 'warning', `cannot read the scope of '${local}' statically — use a string literal: defineTranslations('scope', { … }).`);
    }
    const keys: DiscoveredKey[] = [];
    let partial = false;
    const treeArg = call.arguments[1] ? unwrap(call.arguments[1]) : undefined;
    if (treeArg && ts.isObjectLiteralExpression(treeArg) && scope !== null) {
      const isLeafCall = (call: TS.CallExpression) =>
        (ts.isIdentifier(call.expression) && leafNames.has(call.expression.text)) ||
        (ts.isPropertyAccessExpression(call.expression) &&
          call.expression.name.text === LEAF &&
          ts.isIdentifier(call.expression.expression) &&
          namespaces.has(call.expression.expression.text));
      partial = !collectKeys(ts, treeArg, scope, [], keys, { lineOf, isLeafCall });
    } else {
      partial = true;
    }
    // One module per declaration: extra aliases of the same object would register it twice.
    found.push({ exportName: names[0], scope, sourceFile: file, line: lineOf(node), keys, partial });
  }
  return found;
}

/** Walk a translations object literal. Returns `false` when something could not be read statically. */
function collectKeys(
  ts: typeof TS,
  obj: TS.ObjectLiteralExpression,
  scope: string,
  parents: string[],
  out: DiscoveredKey[],
  ctx: { lineOf: (node: TS.Node) => number; isLeafCall: (call: TS.CallExpression) => boolean },
): boolean {
  let complete = true;
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) {
      complete = false; // spread, shorthand or method
      continue;
    }
    const name = propertyName(ts, prop.name);
    if (name === null) {
      complete = false;
      continue;
    }
    const path = [...parents, name];
    const key = `${scope}.${path.join('.')}`;
    let value: TS.Expression = prop.initializer;
    while (ts.isParenthesizedExpression(value) || ts.isAsExpression(value) || ts.isSatisfiesExpression(value)) value = value.expression;
    if (ts.isObjectLiteralExpression(value)) {
      complete = collectKeys(ts, value, scope, path, out, ctx) && complete;
    } else if (ts.isCallExpression(value) && ctx.isLeafCall(value)) {
      const source = value.arguments[0];
      const text = source && (ts.isStringLiteral(source) || ts.isNoSubstitutionTemplateLiteral(source)) ? source.text : '';
      out.push({ key, path, line: ctx.lineOf(prop), params: placeholderNames(text) });
    } else if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
      out.push({ key, path, line: ctx.lineOf(prop), params: [] }); // bare-string shorthand: params are not typed
    } else {
      complete = false; // a reference or another call could be a group or a leaf
    }
  }
  return complete;
}

/**
 * Param names of `{{…}}` placeholders, mirroring the `Placeholders` type:
 * trimmed, nested `{{ user.name }}` reduced to its root `user`.
 */
export function placeholderNames(text: string): string[] {
  const names = [...text.matchAll(/\{\{([^}]*)}}/g)].map((m) => m[1].trim().split('.')[0]).filter(Boolean);
  return [...new Set(names)].sort();
}

function propertyName(ts: typeof TS, name: TS.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
    return name.text;
  }
  if (ts.isComputedPropertyName(name) && (ts.isStringLiteral(name.expression) || ts.isNoSubstitutionTemplateLiteral(name.expression))) {
    return name.expression.text;
  }
  return null;
}

/** `file:line` relative to the project, for messages (clickable in editors and CI logs). */
export function formatLocation(loc: SourceLocation, cwd: string): string {
  return `${path.relative(cwd, loc.file).split(path.sep).join('/')}:${loc.line}`;
}

/** Index static key definitions by full key, for locating runtime-detected problems. */
export function keyLocations(modules: readonly DiscoveredModule[]): Map<string, SourceLocation[]> {
  const index = new Map<string, SourceLocation[]>();
  for (const mod of modules) {
    for (const { key, line } of mod.keys) index.set(key, [...(index.get(key) ?? []), { file: mod.sourceFile, line }]);
  }
  return index;
}
