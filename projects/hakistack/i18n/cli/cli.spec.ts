import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadConfig } from './config';
import { discoverFile, DiscoveryIssue, loadTypeScript } from './discover';
import { runFindUnused } from './find-unused';
import { runGenerate } from './generate';
import { runScan } from './scan';
import { extractPlaceholders, runValidate } from './validate';

/** Absolute import of the engine source, so temp-project modules load without an installed package. */
const ENGINE = path.resolve(__dirname, '../engine/define-translations').split(path.sep).join('/');
const header = `import { defineTranslations, t } from '${ENGINE}';\n`;

/** Run a CLI step with console output silenced; returns the exit code it set and everything it printed. */
async function runQuiet(fn: () => unknown): Promise<{ exitCode: number; output: string }> {
  const lines: string[] = [];
  const capture = (...args: unknown[]) => void lines.push(args.join(' '));
  const spies = [vi.spyOn(console, 'log'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')].map((s) => s.mockImplementation(capture));
  const previous = process.exitCode;
  process.exitCode = 0;
  try {
    await fn();
    return { exitCode: Number(process.exitCode ?? 0), output: lines.join('\n') };
  } finally {
    process.exitCode = previous;
    spies.forEach((s) => s.mockRestore());
  }
}

const tmpDirs: string[] = [];
function tmpProject(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hk-i18n-'));
  tmpDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}
afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const read = (dir: string, rel: string) => fs.readFileSync(path.join(dir, rel), 'utf-8');

describe('cli: loadConfig', () => {
  it('always includes en in locales', async () => {
    const dir = tmpProject({ 'i18n.config.json': JSON.stringify({ locales: ['es', 'fr'] }) });
    const config = await loadConfig(dir);
    expect(config.locales).toEqual(['en', 'es', 'fr']);
    expect(config.sourceLang).toBe('en');
  });

  it('rejects a non-en sourceLang instead of silently validating every key as missing', async () => {
    const dir = tmpProject({ 'i18n.config.json': JSON.stringify({ locales: ['es', 'en'], sourceLang: 'es' }) });
    await expect(loadConfig(dir)).rejects.toThrow(/sourceLang.*not configurable/);
  });

  it('tolerates the legacy sourceLang: "en"', async () => {
    const dir = tmpProject({ 'i18n.config.json': JSON.stringify({ locales: ['en'], sourceLang: 'en' }) });
    await expect(loadConfig(dir)).resolves.toBeTruthy();
  });
});

describe('cli: scan', () => {
  it('emits literal keys for statically readable modules, merged across shared and nested scopes', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en'] }),
      'src/a/a.i18n.ts': `export const COMMON_A = defineTranslations('common', { buttons: { save: 'Save' } });`,
      'src/b/b.i18n.ts': `export const COMMON_B = defineTranslations('common', { buttons: { cancel: 'Cancel' } });`,
      'src/c/c.i18n.ts': `export const ADMIN = defineTranslations('admin', { t: 'T' });\nexport const ADMIN_USERS = defineTranslations('admin.users', { t: 'U' });`,
    });
    const config = await loadConfig(dir);
    const result = runScan(config, { quiet: true });
    expect(result.moduleCount).toBe(4);

    const keys = read(dir, 'src/i18n/definitions/keys.generated.ts');
    // No module import: an app using TK alone bundles no translations.
    expect(keys).not.toContain('import');
    expect(keys).toContain(`buttons: {\n      cancel: 'common.buttons.cancel',\n      save: 'common.buttons.save',\n    },`);
    expect(keys).toContain(`admin: {\n    t: 'admin.t',\n    users: {\n      t: 'admin.users.t',\n    },\n  },`);
  });

  it('references NAME.keys (merged with mergeKeys) for modules it cannot read statically', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en'] }),
      'src/a.i18n.ts': `export const COMMON_A = defineTranslations('common', { save: 'Save' });`,
      'src/b.i18n.ts': `const shared = { cancel: 'Cancel' };\nexport const COMMON_B = defineTranslations('common', { ...shared });`,
    });
    runScan(await loadConfig(dir), { quiet: true });
    const keys = read(dir, 'src/i18n/definitions/keys.generated.ts');
    expect(keys).toContain(`import { mergeKeys } from '@hakistack/i18n/engine';`);
    expect(keys).toContain(`import { COMMON_B } from './index.generated';`);
    expect(keys).toMatch(/common: mergeKeys\(COMMON_B\.keys, \{\s*save: 'common\.save',\s*\}\)/);
  });

  it('types keys with {{placeholders}} in their t() source text as I18nKey<key, params>', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en'] }),
      'src/a.i18n.ts': `export const HOME = defineTranslations('home', {\n  welcome: t('Hi {{ name }}, {{user.kind}} {{name}}'),\n  plain: t('Hello'),\n  bare: 'No {{typing}} for shorthand',\n});`,
    });
    runScan(await loadConfig(dir), { quiet: true });
    const keys = read(dir, 'src/i18n/definitions/keys.generated.ts');
    expect(keys).toContain(`import type { I18nKey } from '@hakistack/i18n/engine';`);
    expect(keys).toContain(`welcome: 'home.welcome' as I18nKey<'home.welcome', 'name' | 'user'>,`);
    expect(keys).toContain(`plain: 'home.plain',`);
    expect(keys).toContain(`bare: 'home.bare',`);
  });

  it('declares the configured locales once, as an I18nLocales augmentation', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en', 'es', 'es-PR'] }),
      'src/app.i18n.ts': `export const APP = defineTranslations('app', { a: 'A' });`,
    });
    runScan(await loadConfig(dir), { quiet: true });
    const locales = read(dir, 'src/i18n/definitions/i18n-locales.generated.d.ts');
    expect(locales).toContain(`declare module '@hakistack/i18n/engine' {`);
    expect(locales).toContain(`    en: string;\n    es: string;\n    'es-PR': string;`);
  });

  it('emits the <selector>Prefix input on the generated directive', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en'], directiveSelector: 'hkTranslate', directiveClassName: 'HkTranslateDirective' }),
      'src/app/app.i18n.ts': `export const APP = defineTranslations('app', { title: 'T' });`,
    });
    runScan(await loadConfig(dir), { quiet: true });
    const directive = read(dir, 'src/i18n/definitions/hkTranslate.directive.ts');
    expect(directive).toContain(`@Directive({ selector: '[hkTranslate]' })`);
    expect(directive).toContain('export class HkTranslateDirective extends TranslateDirectiveBase');
    expect(directive).toContain('readonly hkTranslatePrefix = input<string | undefined>(undefined);');
    expect(directive).toContain('protected override prefix(): string | undefined {');
    expect(directive).toContain('return this.hkTranslatePrefix();');
  });
});

describe('cli: scan edge cases (regressions)', () => {
  it('quotes scope segments that are not identifiers and discovers non-uppercase export names', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en'] }),
      'src/a.i18n.ts': `export const featureTranslations = defineTranslations('my-feature', { a: 'A' });`,
      'src/b.i18n.ts': `export const Home = defineTranslations('home', { a: 'A' });`,
    });
    const { exitCode } = await runQuiet(async () => runScan(await loadConfig(dir), { quiet: true }));
    expect(exitCode).toBe(0);
    const keys = read(dir, 'src/i18n/definitions/keys.generated.ts');
    expect(keys).toContain(`'my-feature': {\n    a: 'my-feature.a',\n  },`);
    expect(keys).toContain(`home: {\n    a: 'home.a',\n  },`);
    expect(keys).not.toContain('mergeKeys');
  });

  it('refuses duplicate export names across files instead of emitting a barrel that cannot compile', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en'] }),
      'src/x/a.i18n.ts': `export const DUP = defineTranslations('x', { a: 'A' });`,
      'src/y/a.i18n.ts': `export const DUP = defineTranslations('y', { a: 'A' });`,
    });
    const { exitCode, output } = await runQuiet(async () => runScan(await loadConfig(dir), { quiet: true }));
    expect(exitCode).toBe(1);
    expect(output).toContain('DUP: src/x/a.i18n.ts:1, src/y/a.i18n.ts:1');
    expect(fs.existsSync(path.join(dir, 'src/i18n/definitions/index.generated.ts'))).toBe(false);
  });
});

describe('cli: validate and generate', () => {
  it('treats {{ name }} and {{name}} as the same placeholder', () => {
    expect(extractPlaceholders('Hi {{ name }}, {{count}}')).toEqual(extractPlaceholders('Hola {{name}}, {{ count }}'));
  });

  it('passes a registry whose locales only differ in placeholder spacing', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en', 'es'] }),
      'src/a.i18n.ts':
        header + `export const APP = defineTranslations('app', { hi: t('Hi {{name}}', { es: 'Hola {{ name }}' } as never) });`,
    });
    const config = await loadConfig(dir);
    await runQuiet(() => runScan(config, { quiet: true }));
    const { exitCode, output } = await runQuiet(() => runValidate(config));
    expect(output).not.toMatch(/Placeholder mismatch/);
    expect(exitCode).toBe(0);
  });

  it('fails scan on key conflicts readable from source, with file:line of each definition', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en'] }),
      'src/a.i18n.ts': header + `export const COMMON_A = defineTranslations('common', { save: t('Save') });`,
      'src/b.i18n.ts': header + `export const COMMON_B = defineTranslations('common', {\n  other: 'x',\n  save: t('Save!'),\n});`,
    });
    const { exitCode, output } = await runQuiet(async () => runScan(await loadConfig(dir), { quiet: true }));
    expect(exitCode).toBe(1);
    expect(output).toContain(`common.save — defined 2 times (scope 'common')`);
    expect(output).toContain('at src/a.i18n.ts:2');
    expect(output).toContain('at src/b.i18n.ts:4');
    expect(fs.existsSync(path.join(dir, 'src/i18n/definitions/index.generated.ts'))).toBe(false);
  });

  it('fails validate and generate on conflicts only visible once executed (spreads)', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en'] }),
      'src/a.i18n.ts': header + `export const COMMON_A = defineTranslations('common', { save: t('Save') });`,
      'src/b.i18n.ts':
        header + `const shared = { save: t('Save!') };\nexport const COMMON_B = defineTranslations('common', { ...shared });`,
    });
    const config = await loadConfig(dir);
    expect((await runQuiet(() => runScan(config, { quiet: true }))).exitCode).toBe(0);

    const validate = await runQuiet(() => runValidate(config));
    expect(validate.exitCode).toBe(1);
    expect(validate.output).toContain(`common.save — defined 2 times (scope 'common')`);
    expect(validate.output).toContain('at src/a.i18n.ts:2'); // the statically readable definition

    const generate = await runQuiet(() => runGenerate(config));
    expect(generate.exitCode).toBe(1);
    expect(fs.existsSync(path.join(dir, 'src/assets/i18n/en.json'))).toBe(false);
  });

  it('generates merged JSON for modules sharing a scope', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en'] }),
      'src/a.i18n.ts': header + `export const COMMON_A = defineTranslations('common', { buttons: { save: t('Save') } });`,
      'src/b.i18n.ts': header + `export const COMMON_B = defineTranslations('common', { buttons: { cancel: t('Cancel') } });`,
    });
    const config = await loadConfig(dir);
    await runQuiet(() => runScan(config, { quiet: true }));
    const { exitCode } = await runQuiet(() => runGenerate(config));
    expect(exitCode).toBe(0);
    expect(JSON.parse(read(dir, 'src/assets/i18n/en.json'))).toEqual({ common: { buttons: { save: 'Save', cancel: 'Cancel' } } });
  });
});

describe('cli: AST discovery', () => {
  const discoverText = (text: string) => {
    const issues: DiscoveryIssue[] = [];
    const modules = discoverFile(loadTypeScript(process.cwd()), '/x/a.i18n.ts', text, issues);
    return { modules, issues };
  };

  it('ignores commented-out and string occurrences (the regex scanner imported them)', () => {
    const { modules } = discoverText(
      [
        `// export const OLD = defineTranslations('old', { a: 'A' });`,
        `/* export const BLOCK = defineTranslations('block', {}); */`,
        `const doc = "export const STR = defineTranslations('str', {})";`,
        `export const NEW = defineTranslations('new', { a: 'A' });`,
      ].join('\n'),
    );
    expect(modules.map((m) => m.exportName)).toEqual(['NEW']);
  });

  it('follows export lists, aliases and namespace imports', () => {
    const { modules } = discoverText(
      [
        `import { defineTranslations as dt, t } from '@hakistack/i18n/engine';`,
        `import * as i18n from '@hakistack/i18n/engine';`,
        `const LOCAL = dt('local', { a: t('A') });`,
        `export const NS = i18n.defineTranslations('ns', { b: 'B' });`,
        `const HIDDEN = dt('hidden', { c: 'C' });`,
        `export { LOCAL as PUBLIC };`,
      ].join('\n'),
    );
    expect(modules.map((m) => [m.exportName, m.scope])).toEqual([
      ['PUBLIC', 'local'],
      ['NS', 'ns'],
    ]);
  });

  it('reads keys with lines and flags what it cannot read statically', () => {
    const { modules } = discoverText(
      [
        `export const A = defineTranslations('a', {`,
        `  title: t('T'),`,
        `  'my-key': 'K',`,
        `  nested: { deep: t('D') as never },`,
        `  ...extra,`,
        `});`,
      ].join('\n'),
    );
    expect(modules[0].keys).toEqual([
      { key: 'a.title', path: ['title'], line: 2, params: [] },
      { key: 'a.my-key', path: ['my-key'], line: 3, params: [] },
      { key: 'a.nested.deep', path: ['nested', 'deep'], line: 4, params: [] },
    ]);
    expect(modules[0].partial).toBe(true);
  });

  it('reports non-literal scopes and default exports with their line', () => {
    const { modules, issues } = discoverText(
      [`export const DYN = defineTranslations(SCOPE, {});`, `export default defineTranslations('d', {});`].join('\n'),
    );
    expect(modules).toEqual([expect.objectContaining({ exportName: 'DYN', scope: null })]);
    expect(issues.map((i) => [i.line, i.severity])).toEqual([
      [1, 'warning'],
      [2, 'warning'],
    ]);
  });
});

describe('cli: incremental outputs', () => {
  it('does not rewrite unchanged files and removes outputs that are no longer produced', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en', 'es'] }),
      'node_modules/.keep': '',
      'src/a.i18n.ts': header + `export const FEAT = defineTranslations('feat', { a: t('A') }, { scoped: true });`,
    });
    const config = await loadConfig(dir);
    await runQuiet(() => runScan(config, { quiet: true }));
    await runQuiet(() => runGenerate(config));
    const scoped = path.join(dir, 'src/assets/i18n/feat/es.json');
    const root = path.join(dir, 'src/assets/i18n/en.json');
    expect(fs.existsSync(scoped)).toBe(true);

    const before = fs.statSync(root).mtimeMs;
    const second = await runQuiet(() => runGenerate(config));
    expect(second.output).toContain('9 file(s) unchanged'); // 4 JSON + 4 language modules + translations.generated.ts
    expect(fs.statSync(root).mtimeMs).toBe(before);

    // The module stops being scoped and Spanish is dropped: its per-scope files and es.json go away.
    fs.writeFileSync(path.join(dir, 'src/a.i18n.ts'), header + `export const FEAT = defineTranslations('feat', { a: t('A') });`);
    fs.writeFileSync(path.join(dir, 'i18n.config.json'), JSON.stringify({ locales: ['en'] }));
    const next = await loadConfig(dir);
    await runQuiet(() => runScan(next, { quiet: true }));
    await runQuiet(() => runGenerate(next));
    expect(fs.existsSync(path.join(dir, 'src/assets/i18n/feat'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'src/assets/i18n/es.json'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'src/i18n/definitions/translations/feat'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'src/i18n/definitions/translations/es.generated.ts'))).toBe(false);
    expect(fs.existsSync(root)).toBe(true);
  });

  it('removes the previous directive when the selector is renamed, and never touches files it did not write', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en'] }),
      'node_modules/.keep': '',
      'src/app/app.i18n.ts': `export const APP = defineTranslations('app', { title: 'T' });`,
      'src/i18n/definitions/hand-written.ts': 'export const KEEP = 1;',
    });
    await runQuiet(async () => runScan(await loadConfig(dir), { quiet: true }));
    fs.writeFileSync(
      path.join(dir, 'i18n.config.json'),
      JSON.stringify({ locales: ['en'], directiveSelector: 'hkT', directiveClassName: 'HkT' }),
    );
    await runQuiet(async () => runScan(await loadConfig(dir), { quiet: true }));
    const files = fs.readdirSync(path.join(dir, 'src/i18n/definitions')).sort();
    expect(files).toEqual([
      'hand-written.ts',
      'hkT.directive.ts',
      'i18n-locales.generated.d.ts',
      'index.generated.ts',
      'keys.generated.ts',
    ]);
  });
});

describe('cli: lazy translation modules', () => {
  it('writes one module per language and scope plus the TRANSLATIONS loaders, without translator comments', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en', 'es'] }),
      'src/a.i18n.ts':
        header +
        `export const APP = defineTranslations('app', { hi: t('Hi', { es: 'Hola' } as never, { comment: 'greeting' }) });\n` +
        `export const USERS = defineTranslations('admin.users', { title: t('Users') }, { scoped: true });`,
    });
    const config = await loadConfig(dir);
    await runQuiet(() => runScan(config, { quiet: true }));
    expect((await runQuiet(() => runGenerate(config))).exitCode).toBe(0);

    const index = read(dir, 'src/i18n/definitions/translations.generated.ts');
    expect(index).toContain(`import type { I18nTranslationLoaders } from '@hakistack/i18n';`);
    expect(index).toContain(`'es': () => import('./translations/es.generated'),`);
    expect(index).toContain(`'admin/users': {\n      'en': () => import('./translations/admin/users/en.generated'),`);

    const es = read(dir, 'src/i18n/definitions/translations/es.generated.ts');
    expect(es).toContain('export default {');
    expect(es).toContain('"hi": "Hola"');
    expect(es).not.toContain('greeting');
    expect(read(dir, 'src/assets/i18n/en.json')).toContain('"hi.comment": "greeting"'); // the JSON keeps them for translators
    expect(read(dir, 'src/i18n/definitions/translations/admin/users/es.generated.ts')).toContain('"title": "Users"');
  });
});

describe('cli: find-unused', () => {
  it('separates confirmed, dynamic (possibly used), test-only, claimed and unused keys', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en'] }),
      'src/app.i18n.ts':
        header +
        `export const APP = defineTranslations('app', {\n` +
        `  home: { welcome: 'W', title: 'T' },\n` +
        `  admin: { users: 'U', title: 'A' },\n` +
        `  dyn: { a: 'a', b: 'b' },\n` +
        `  lit: { key: 'L' }, pre: { a: 'P' }, tpl: { a: 'T' },\n` +
        `  unused: { a: 'X' }, onlytest: { a: 'O' }, marked: { x: 'M' }, commented: { a: 'C' },\n` +
        `});`,
      'src/app/a.component.ts': [
        `import { TK as K } from '../i18n/definitions/keys.generated';`,
        `import { TK } from '../i18n/definitions/keys.generated';`,
        `const w = TK.app.home.welcome;`,
        `const t = K.app.home.title;`,
        `const admin = TK.app.admin;`,
        `const u = admin.users;`,
        `const d = (name: 'a' | 'b') => TK.app.dyn[name];`,
        `const l = translate('app.lit.key');`,
        `const p = (x: string) => 'app.pre.' + x;`,
        `const q = (x: string) => \`app.tpl.\${x}\`;`,
        `// TK.app.commented.a — comments never count`,
        `/* i18n-used: app.marked.* */`,
      ].join('\n'),
      'src/app/b.component.html': `<p *appTranslate="let t; prefix: 'app.admin'">{{ t.title() }}</p>\n<!-- {{ t.unused.a() }} -->`,
      'src/app/c.spec.ts': `import { TK } from '../i18n/definitions/keys.generated';\nexpect(TK.app.onlytest.a).toBeTruthy();`,
    });
    const config = await loadConfig(dir);
    await runQuiet(() => runScan(config, { quiet: true }));
    let usage = new Map<string, string>();
    const { exitCode } = await runQuiet(async () => {
      usage = (await runFindUnused(config, { strict: true, quiet: true })).usage;
    });

    expect(Object.fromEntries([...usage].sort())).toEqual({
      'app.admin.title': 'used', // template proxy with prefix
      'app.admin.users': 'used', // through `const admin = TK.app.admin`
      'app.commented.a': 'unused',
      'app.dyn.a': 'possibly-used',
      'app.dyn.b': 'possibly-used',
      'app.home.title': 'used', // through `import { TK as K }`
      'app.home.welcome': 'used',
      'app.lit.key': 'used',
      'app.marked.x': 'claimed',
      'app.onlytest.a': 'test-only',
      'app.pre.a': 'possibly-used',
      'app.tpl.a': 'possibly-used',
      'app.unused.a': 'unused', // only in an HTML comment
    });
    expect(exitCode).toBe(1); // --strict fails on unused keys only
  });
});
