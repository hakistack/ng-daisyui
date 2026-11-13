import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { loadConfig } from './config';
import { runScan } from './scan';

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
  it('merges modules that share a scope into one TK entry (matches runtime buildKeysTree)', async () => {
    const dir = tmpProject({
      'i18n.config.json': JSON.stringify({ locales: ['en'] }),
      'src/a/a.i18n.ts': `export const COMMON_A = defineTranslations('common', { a: 'A' });`,
      'src/b/b.i18n.ts': `export const COMMON_B = defineTranslations('common', { b: 'B' });`,
      'src/c/c.i18n.ts': `export const ADMIN = defineTranslations('admin', { t: 'T' });\nexport const ADMIN_USERS = defineTranslations('admin.users', { t: 'U' });`,
    });
    const config = await loadConfig(dir);
    const result = runScan(config, { quiet: true });
    expect(result.moduleCount).toBe(4);

    const keys = read(dir, 'src/i18n/definitions/keys.generated.ts');
    expect(keys).toContain('...COMMON_A.keys,');
    expect(keys).toContain('...COMMON_B.keys,');
    expect(keys).toMatch(/admin: \{\s*\.\.\.ADMIN\.keys,\s*users: ADMIN_USERS\.keys,\s*\}/);
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
