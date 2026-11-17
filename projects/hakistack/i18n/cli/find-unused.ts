/**
 * Unused-key detector (informational; never edits anything).
 *
 * Classifies every defined key by the strongest reference found in `srcRoot`:
 *
 *  - **used** — a confirmed reference in production code:
 *      `TK.home.welcome` (also through `import { TK as K }` and `const h = TK.home; h.welcome`),
 *      the exact key as a string literal (`translate('home.welcome')`),
 *      or template proxy access `t.home.welcome()` under `*appTranslate="let t"`
 *      (with its `prefix: 'admin'` applied).
 *  - **possibly used** — a dynamic reference that may reach the key, so it is
 *      never reported as unused: a whole TK group used as a value (`TK.home`,
 *      `TK.home[name]`), a key prefix in a string (`'home.' + name`,
 *      `` `home.${name}` ``) or a template proxy group access (`t.home[name]()`).
 *  - **test-only** — referenced only from `*.spec.ts`.
 *  - **claimed** — matched by a `/* i18n-used: home.dynamic.* *\/` marker.
 *  - **unused** — none of the above. `--strict` exits 1 only for these.
 *
 * TypeScript is read with the compiler API (comments never count); templates
 * (`.html` files and inline `template:` strings) with patterns, HTML comments removed.
 */

import * as fs from 'fs';
import * as path from 'path';
import type * as TS from 'typescript';

import { TranslationModule } from '../engine/define-translations';
import { I18nCliConfig } from './config';
import { loadTypeScript } from './discover';
import { loadKeys, loadRegistry } from './load-registry';

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'out-tsc', '.angular', '.cache']);
const TEST_FILE_RE = /\.spec\.ts$/;
const SKIPPED_FILE_RE = /\.i18n\.ts$|\.generated\.ts$|\.d\.ts$/;
const SCANNABLE_RE = /\.(ts|html)$/;
// Lazy up to the closing `*/`: the pattern itself may contain `*` wildcards.
const MARKER_RE = /\/\*\s*i18n-used:\s*([\s\S]+?)\s*\*\//g;

export type KeyUsage = 'used' | 'possibly-used' | 'test-only' | 'claimed' | 'unused';

interface Reference {
  file: string;
  line: number;
}
interface KeyStatus {
  key: string;
  confirmed: Reference[];
  potential: Reference[];
  test: Reference[];
  claimed: boolean;
}

export interface FindUnusedResult {
  /** Usage per key. */
  usage: Map<string, KeyUsage>;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function* walkSourceFiles(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkSourceFiles(full);
    else if (entry.isFile() && SCANNABLE_RE.test(entry.name) && !SKIPPED_FILE_RE.test(entry.name)) yield full;
  }
}

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function patternToRegex(claimed: string): RegExp {
  return new RegExp('^' + claimed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
}

/** Walks the loaded TK tree. */
function resolveTK(tk: unknown, segments: readonly string[]): unknown {
  let node = tk;
  for (const s of segments) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[s];
  }
  return node;
}

function leavesOf(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node);
  else if (node && typeof node === 'object') for (const v of Object.values(node)) leavesOf(v, out);
  return out;
}

export async function runFindUnused(
  config: I18nCliConfig,
  opts: { strict?: boolean; verbose?: boolean; quiet?: boolean } = {},
): Promise<FindUnusedResult> {
  const registry = await loadRegistry(config);
  const tk = await loadKeys(config);
  const ts = loadTypeScript(config.cwd);
  const print = opts.quiet ? () => undefined : (m: string) => console.log(m);

  const status = new Map<string, KeyStatus>();
  for (const mod of registry as readonly TranslationModule[]) {
    for (const key of leavesOf(mod.keys)) status.set(key, { key, confirmed: [], potential: [], test: [], claimed: false });
  }
  const sortedKeys = [...status.keys()].sort();

  for (const file of walkSourceFiles(config.srcRoot)) {
    const text = fs.readFileSync(file, 'utf-8');
    const ref = (index: number): Reference => ({ file: path.relative(config.cwd, file), line: lineAt(text, index) });
    const isTest = TEST_FILE_RE.test(file);
    const confirm = (key: string, at: Reference) => {
      const st = status.get(key);
      if (st) (isTest ? st.test : st.confirmed).push(at);
    };
    const maybe = (keys: Iterable<string>, at: Reference) => {
      for (const key of keys) {
        const st = status.get(key);
        if (st) (isTest ? st.test : st.potential).push(at);
      }
    };
    const underPrefix = (prefix: string) => sortedKeys.filter((k) => k.startsWith(prefix));
    /**
     * A string: the exact key confirms it; a key prefix (`'home.'`) or a dotted
     * group (`'admin.users'`) makes its keys possible. A single-segment group
     * name (`'home'`) only counts as an argument of a `translate*` call
     * (`translateObject('home')`) — elsewhere it is usually a route or a CSS name.
     */
    const literal = (value: string, at: Reference, translateArg = false) => {
      if (status.has(value)) confirm(value, at);
      else if (value.length > 1 && value.endsWith('.')) maybe(underPrefix(value), at);
      else if (/^[\w$-]+(\.[\w$-]+)*$/.test(value) && (value.includes('.') || translateArg)) maybe(underPrefix(`${value}.`), at);
    };

    for (const m of text.matchAll(MARKER_RE)) {
      const pattern = patternToRegex(m[1].trim());
      for (const st of status.values()) if (pattern.test(st.key)) st.claimed = true;
    }

    if (file.endsWith('.html')) {
      scanTemplate(text, 0, config.directiveSelector, { tk, ref, confirm, maybe, literal, underPrefix });
      continue;
    }
    scanTypeScript(ts, file, text, { tk, ref, confirm, maybe, literal, underPrefix, directiveSelector: config.directiveSelector });
  }

  const usage = new Map<string, KeyUsage>();
  for (const st of status.values()) {
    usage.set(
      st.key,
      st.claimed
        ? 'claimed'
        : st.confirmed.length
          ? 'used'
          : st.potential.length
            ? 'possibly-used'
            : st.test.length
              ? 'test-only'
              : 'unused',
    );
  }
  report(status, usage, print, opts);
  if (opts.strict && [...usage.values()].includes('unused')) {
    print('❌ --strict: failing because unused keys were found.\n');
    process.exitCode = 1;
  }
  return { usage };
}

interface ScanContext {
  tk: unknown;
  ref: (index: number) => Reference;
  confirm: (key: string, at: Reference) => void;
  maybe: (keys: Iterable<string>, at: Reference) => void;
  literal: (value: string, at: Reference, translateArg?: boolean) => void;
  underPrefix: (prefix: string) => string[];
}

/** TK accessor: a leaf confirms its key; a group (used as a value or indexed dynamically) makes its keys possible. */
function touchTK(ctx: ScanContext, segments: string[], dynamicTail: boolean, at: Reference): void {
  const node = resolveTK(ctx.tk, segments);
  if (typeof node === 'string' && !dynamicTail) ctx.confirm(node, at);
  else if (node && typeof node === 'object') ctx.maybe(leavesOf(node), at);
}

function scanTypeScript(ts: typeof TS, file: string, text: string, ctx: ScanContext & { directiveSelector: string }): void {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const roots = new Map<string, string[]>([['TK', []]]); // local name → TK path it stands for

  for (const stmt of sf.statements) {
    const bindings = ts.isImportDeclaration(stmt) ? stmt.importClause?.namedBindings : undefined;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) if ((el.propertyName ?? el.name).text === 'TK') roots.set(el.name.text, []);
    }
  }

  /** `TK.a.b` / `TK['a'].b` / `alias.b` → [rootPath + segments, dynamic tail?] or null. */
  const chainOf = (node: TS.Expression): { segments: string[]; dynamicTail: boolean } | null => {
    const segments: string[] = [];
    let dynamicTail = false;
    let current: TS.Expression = node;
    for (;;) {
      if (ts.isPropertyAccessExpression(current)) {
        segments.unshift(current.name.text);
        current = current.expression;
      } else if (ts.isElementAccessExpression(current)) {
        const arg = current.argumentExpression;
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) segments.unshift(arg.text);
        else {
          segments.length = 0; // dynamic index: only the part before it is known
          dynamicTail = true;
        }
        current = current.expression;
      } else if (ts.isNonNullExpression(current) || ts.isParenthesizedExpression(current)) {
        current = current.expression;
      } else break;
    }
    if (!ts.isIdentifier(current) || !roots.has(current.text)) return null;
    return { segments: [...roots.get(current.text)!, ...segments], dynamicTail };
  };

  const visit = (node: TS.Node): void => {
    const at = () => ctx.ref(node.getStart(sf));
    // `const h = TK.home` → `h.welcome` is TK.home.welcome.
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const chain = chainOf(node.initializer);
      if (chain && !chain.dynamicTail) roots.set(node.name.text, chain.segments);
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) || ts.isIdentifier(node)) {
      const parent = node.parent;
      const isOutermost = !(
        parent &&
        (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) &&
        parent.expression === node
      );
      const isDeclarationName = parent && (ts.isVariableDeclaration(parent) || ts.isImportSpecifier(parent)) && parent.name === node;
      if (isOutermost && !isDeclarationName) {
        // Includes a bare alias (`h` after `const h = TK.home`): a group used as a value.
        const chain = chainOf(node as TS.Expression);
        if (chain && (chain.segments.length > 0 || chain.dynamicTail)) touchTK(ctx, chain.segments, chain.dynamicTail, at());
      }
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const call = node.parent;
      const translateArg = !!call && ts.isCallExpression(call) && /translate/i.test(call.expression.getText(sf));
      ctx.literal(node.text, at(), translateArg);
      if (isInlineTemplate(ts, node)) scanTemplate(node.text, node.getStart(sf) + 1, ctx.directiveSelector, ctx);
    }
    if (ts.isTemplateExpression(node)) {
      const head = node.head.text;
      if (head.length > 1 && head.endsWith('.')) ctx.maybe(ctx.underPrefix(head), at());
      if (isInlineTemplate(ts, node)) scanTemplate(node.getText(sf).slice(1, -1), node.getStart(sf) + 1, ctx.directiveSelector, ctx);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

/** `template: '…'` inside a decorator object literal. */
function isInlineTemplate(ts: typeof TS, node: TS.Node): boolean {
  const parent = node.parent;
  return !!parent && ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name) && parent.name.text === 'template';
}

/**
 * Template references: `*sel="let t; prefix: 'x'"` then `t.a.b(…)`, plus quoted
 * key strings. `offset` maps positions back to the containing file.
 */
function scanTemplate(template: string, offset: number, selector: string, ctx: ScanContext): void {
  const html = template.replace(/<!--[\s\S]*?-->/g, (c) => ' '.repeat(c.length));
  const at = (index: number) => ctx.ref(offset + index);
  const directiveRe = new RegExp(`\\*${escapeRegex(selector)}\\s*=\\s*"([^"]*)"`, 'g');
  const contexts = new Map<string, string[]>(); // var → prefix segments
  for (const m of html.matchAll(directiveRe)) {
    const micro = m[1];
    const variable = /\blet\s+([A-Za-z_$][\w$]*)(?!\s*=)/.exec(micro)?.[1];
    const prefix = /\bprefix\s*:\s*'([^']*)'/.exec(micro)?.[1];
    if (variable) contexts.set(variable, prefix ? prefix.split('.') : []);
  }
  for (const [variable, prefix] of contexts) {
    const re = new RegExp(`(?<![\\w$.])${escapeRegex(variable)}((?:\\.[A-Za-z_$][\\w$]*)+)(\\s*\\[)?`, 'g');
    for (const m of html.matchAll(re)) {
      touchTK(ctx, [...prefix, ...m[1].slice(1).split('.')], !!m[2], at(m.index ?? 0));
    }
  }
  // Quoted strings (`translate('home.welcome')`, `[prefix]="'admin.users'"`).
  for (const m of html.matchAll(/'([^'\s<>{}]+)'|"([^"\s<>{}]+)"/g)) ctx.literal(m[1] ?? m[2], at(m.index ?? 0));
}

function report(
  status: Map<string, KeyStatus>,
  usage: Map<string, KeyUsage>,
  print: (m: string) => void,
  opts: { verbose?: boolean },
): void {
  const by = (u: KeyUsage) =>
    [...usage]
      .filter(([, v]) => v === u)
      .map(([k]) => k)
      .sort();
  const unused = by('unused');
  const possibly = by('possibly-used');
  const testOnly = by('test-only');
  const show = (title: string, keys: string[], refs: (st: KeyStatus) => Reference[]) => {
    if (!keys.length) return;
    print(`\n${title} (${keys.length}):\n`);
    for (const key of keys) {
      print(`  ${key}`);
      if (opts.verbose) for (const r of refs(status.get(key)!).slice(0, 3)) print(`    ${r.file}:${r.line}`);
    }
  };

  print('\n🔍 i18n unused-key detector\n' + '='.repeat(50));
  show('❌ Unused', unused, () => []);
  show('❔ Possibly used — only dynamic references (group values, key prefixes); never reported as unused', possibly, (st) => st.potential);
  show('⚠️  Test-only — referenced ONLY in *.spec.ts', testOnly, (st) => st.test);
  print(
    '\n📊 Summary\n' +
      `  Total: ${usage.size}  Used: ${by('used').length}  Possibly used: ${possibly.length}  Test-only: ${testOnly.length}  ` +
      `Claimed: ${by('claimed').length}  Unused: ${unused.length}\n`,
  );
}
