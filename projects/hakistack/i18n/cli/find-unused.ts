/**
 * Unused-key detector (informational; never edits anything).
 *
 * Finds keys defined in `*.i18n.ts` with no references in source. References:
 *   - Literal string: `'home.welcome'` (quoted, in *.ts/*.html).
 *   - Accessor path: `TK.home.welcome` (camelCase — equals the key string).
 *   - Marker comment: `/* i18n-used: home.dynamic.* *\/` (claims matching keys).
 *
 * Exit code 0 unless `--strict`.
 */

import * as fs from 'fs';
import * as path from 'path';

import { TranslationModule } from '../engine/define-translations';
import { I18nCliConfig } from './config';
import { loadKeys, loadRegistry } from './load-registry';

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'out-tsc', '.angular', '.cache']);
const TEST_FILE_RE = /\.spec\.ts$/;
const I18N_FILE_RE = /\.i18n\.ts$/;
const GENERATED_RE = /\.generated\.ts$/;
const SCANNABLE_RE = /\.(ts|html)$/;
const LITERAL_RE = /['"`]([a-z][a-zA-Z0-9_.]*?)['"`]/g;
const ACCESSOR_RE = /\bTK(?:\.[a-zA-Z][a-zA-Z0-9_]*)+\b/g;
const MARKER_RE = /\/\*\s*i18n-used:\s*([^*]+?)\s*\*\//g;
// Context vars bound by the translate directive, e.g. `*appTranslate="let t"`.
const CONTEXT_VAR_RE = /\*?appTranslate\s*=\s*["'][^"']*?let\s+([a-zA-Z_$][\w$]*)/g;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function contextVars(content: string): string[] {
  const vars = new Set<string>();
  for (const m of content.matchAll(CONTEXT_VAR_RE)) vars.add(m[1]);
  return [...vars];
}

interface Reference {
  file: string;
  line: number;
}
interface KeyStatus {
  key: string;
  accessors: string[];
  prodRefs: Reference[];
  testRefs: Reference[];
  claimedByMarker: boolean;
}

function walkLeafStrings(node: unknown, out: Set<string>): void {
  if (typeof node === 'string') {
    out.add(node);
    return;
  }
  if (node && typeof node === 'object') for (const v of Object.values(node)) walkLeafStrings(v, out);
}

function walkTKAccessors(node: unknown, accessor: string[], out: Map<string, string>): void {
  if (typeof node === 'string') {
    out.set(accessor.join('.'), node);
    return;
  }
  if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walkTKAccessors(v, [...accessor, k], out);
}

function* walkSourceFiles(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkSourceFiles(full);
    else if (entry.isFile() && SCANNABLE_RE.test(entry.name)) yield full;
  }
}

function lineOf(content: string, charIndex: number): number {
  let line = 1;
  for (let i = 0; i < charIndex; i++) if (content.charCodeAt(i) === 10) line++;
  return line;
}

function patternToRegex(claimed: string): RegExp {
  const escaped = claimed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + escaped + '$');
}

export async function runFindUnused(config: I18nCliConfig, opts: { strict?: boolean; verbose?: boolean } = {}): Promise<void> {
  const registry = await loadRegistry(config);
  const tk = await loadKeys(config);

  const allKeys = new Set<string>();
  for (const mod of registry as readonly TranslationModule[]) walkLeafStrings(mod.keys, allKeys);

  const accessorMap = new Map<string, string>();
  walkTKAccessors(tk, ['TK'], accessorMap);

  const keyToAccessors = new Map<string, string[]>();
  for (const [acc, key] of accessorMap) {
    const list = keyToAccessors.get(key) ?? [];
    list.push(acc);
    keyToAccessors.set(key, list);
  }

  const status = new Map<string, KeyStatus>();
  for (const key of allKeys) {
    status.set(key, { key, accessors: keyToAccessors.get(key) ?? [], prodRefs: [], testRefs: [], claimedByMarker: false });
  }

  for (const file of walkSourceFiles(config.srcRoot)) {
    if (I18N_FILE_RE.test(file) || GENERATED_RE.test(file)) continue;
    const isTest = TEST_FILE_RE.test(file);
    const relFile = path.relative(config.cwd, file);
    const content = fs.readFileSync(file, 'utf-8');

    for (const m of content.matchAll(MARKER_RE)) {
      const pattern = patternToRegex(m[1].trim());
      for (const [key, st] of status) if (pattern.test(key)) st.claimedByMarker = true;
    }
    for (const m of content.matchAll(LITERAL_RE)) {
      const st = status.get(m[1]);
      if (!st) continue;
      (isTest ? st.testRefs : st.prodRefs).push({ file: relFile, line: lineOf(content, m.index ?? 0) });
    }
    for (const m of content.matchAll(ACCESSOR_RE)) {
      const key = accessorMap.get(m[0]);
      if (!key) continue;
      const st = status.get(key);
      if (!st) continue;
      (isTest ? st.testRefs : st.prodRefs).push({ file: relFile, line: lineOf(content, m.index ?? 0) });
    }
    // Template proxy access: `*appTranslate="let t"` then `t.home.welcome()`.
    // The dotted path after the context var IS the key string (TK is flat
    // camelCase), so count any access whose path is a known key.
    for (const varName of contextVars(content)) {
      const re = new RegExp(`\\b${escapeRegex(varName)}((?:\\.[a-zA-Z_$][\\w$]*)+)`, 'g');
      for (const m of content.matchAll(re)) {
        const st = status.get(m[1].slice(1));
        if (!st) continue;
        (isTest ? st.testRefs : st.prodRefs).push({ file: relFile, line: lineOf(content, m.index ?? 0) });
      }
    }
  }

  const unused: KeyStatus[] = [];
  const testOnly: KeyStatus[] = [];
  const claimed: KeyStatus[] = [];
  const used: KeyStatus[] = [];
  for (const st of status.values()) {
    if (st.claimedByMarker) claimed.push(st);
    else if (st.prodRefs.length) used.push(st);
    else if (st.testRefs.length) testOnly.push(st);
    else unused.push(st);
  }
  for (const bucket of [unused, testOnly]) bucket.sort((a, b) => a.key.localeCompare(b.key));

  console.log('\n🔍 i18n unused-key detector\n' + '='.repeat(50));
  if (!unused.length && !testOnly.length) {
    console.log(`\n✓ All ${allKeys.size} keys are referenced.`);
    if (claimed.length) console.log(`  (${claimed.length} claimed via /* i18n-used */ markers)`);
    console.log('');
    return;
  }
  if (unused.length) {
    console.log(`\n❌ Unused (${unused.length}):\n`);
    for (const st of unused) console.log(`  ${st.key}`);
  }
  if (testOnly.length) {
    console.log(`\n⚠️  Test-only (${testOnly.length}) — referenced ONLY in *.spec.ts:\n`);
    for (const st of testOnly) {
      console.log(`  ${st.key}`);
      if (opts.verbose) for (const ref of st.testRefs.slice(0, 3)) console.log(`    ${ref.file}:${ref.line}`);
    }
  }
  console.log(
    '\n📊 Summary\n' +
      `  Total: ${allKeys.size}  Used: ${used.length}  Test-only: ${testOnly.length}  Claimed: ${claimed.length}  Unused: ${unused.length}\n`,
  );

  if (opts.strict && unused.length) {
    console.log('❌ --strict: failing because unused keys were found.\n');
    process.exitCode = 1;
  }
}
