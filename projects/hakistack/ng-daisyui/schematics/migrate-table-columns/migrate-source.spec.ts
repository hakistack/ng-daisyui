// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { migrateTableColumnsSource } from './migrate-source';

/** Collapse whitespace so assertions describe structure, not the codemod's (prettier-fixed) indentation. */
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('migrateTableColumnsSource', () => {
  it('folds every parallel map into one columns entry, in `visible` order', () => {
    const result = migrateTableColumnsSource(`
const cfg = createTable<User>({
  visible: ['name', 'email', 'salary'],
  headers: { name: 'Full Name', salary: 'Salary' },
  formatters: { salary: (v) => \`$\${v}\`, email: 'lowercase' },
  fallbacks: { email: '—' },
  columnWidths: { name: 120 },
  footers: { salary: 'sum' },
});
`);

    expect(result.changed).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(norm(result.code)).toContain(
      norm(`columns: {
        name: { header: 'Full Name', width: 120 },
        email: { format: 'lowercase', fallback: '—' },
        salary: { header: 'Salary', format: (v) => \`$\${v}\`, footer: 'sum' },
      }`),
    );
    // consumed props are gone
    for (const prop of ['visible:', 'headers:', 'formatters:', 'fallbacks:', 'columnWidths:', 'footers:']) {
      expect(result.code).not.toContain(prop);
    }
  });

  it('preserves table-level options untouched', () => {
    const result = migrateTableColumnsSource(`
const cfg = createTable<User>({
  visible: ['name'],
  hidden: ['email'],
  hasSelection: true,
  pagination: { mode: 'offset', pageSize: 10 },
});
`);
    expect(result.code).toContain(`hidden: ['email']`);
    expect(result.code).toContain('hasSelection: true');
    expect(result.code).toContain(`pagination: { mode: 'offset', pageSize: 10 }`);
  });

  it('splits cellEditors into the flat editType / editOptions / editValidator props', () => {
    const result = migrateTableColumnsSource(`
const cfg = createTable<User>({
  visible: ['status'],
  cellEditors: { status: { type: 'select', options: [{ label: 'A', value: 'a' }], validator: (v) => v !== '' } },
});
`);
    expect(norm(result.code)).toContain(
      norm(`status: { editType: 'select', editOptions: [{ label: 'A', value: 'a' }], editValidator: (v) => v !== '' }`),
    );
  });

  // Regression: `getName()` returns the *quoted* text for a string-literal key, which never matched the
  // unquoted key from `visible` — the entry was dropped and a misleading orphan warning was emitted.
  it('matches quoted keys against `visible` without dropping them', () => {
    const result = migrateTableColumnsSource(`
const cfg = createTable<User>({
  visible: ['first-name'],
  headers: { 'first-name': 'First' },
});
`);
    expect(result.warnings).toEqual([]);
    expect(norm(result.code)).toContain(norm(`"first-name": { header: 'First' }`));
  });

  it('copies function and multi-line expressions verbatim', () => {
    const formatter = `(v: number, row: User) => {
      return \`$\${v.toFixed(2)}\`;
    }`;
    const result = migrateTableColumnsSource(`
const cfg = createTable<User>({
  visible: ['salary'],
  formatters: { salary: ${formatter} },
});
`);
    expect(norm(result.code)).toContain(norm(`format: ${formatter}`));
  });

  it('is idempotent — a declarative config is left alone', () => {
    const source = `const cfg = createTable<User>({ columns: { name: { header: 'Name' } } });`;
    const result = migrateTableColumnsSource(source);
    expect(result.changed).toBe(false);
    expect(result.code).toBe(source);
  });

  it('leaves non-createTable calls and non-object args alone', () => {
    for (const source of [`const cfg = createForm({ visible: ['a'] });`, `const cfg = createTable(baseConfig);`]) {
      expect(migrateTableColumnsSource(source).changed).toBe(false);
    }
  });

  it('bails (without rewriting) when `visible` is not a literal string array', () => {
    const result = migrateTableColumnsSource(`const cfg = createTable<User>({ visible: [...base, 'name'], headers: { name: 'N' } });`);
    expect(result.changed).toBe(false);
    expect(result.warnings[0]).toContain('non-literal entry');
  });

  it('warns about map keys that were not in `visible` (already dead at runtime)', () => {
    const result = migrateTableColumnsSource(`
const cfg = createTable<User>({
  visible: ['name'],
  headers: { name: 'Name', ghost: 'Ghost' },
});
`);
    expect(result.changed).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('headers.ghost');
  });

  it('warns when a spread could hide column maps it cannot see', () => {
    const result = migrateTableColumnsSource(`const cfg = createTable<User>({ visible: ['name'], ...base });`);
    expect(result.warnings.some((w) => w.includes('spread'))).toBe(true);
  });

  it('warns about computed keys instead of silently mismatching them', () => {
    const result = migrateTableColumnsSource(`
const cfg = createTable<User>({
  visible: ['name'],
  headers: { [dynamicKey]: 'X' },
});
`);
    expect(result.warnings.some((w) => w.includes('computed key'))).toBe(true);
  });

  it('migrates every createTable call in a file', () => {
    const result = migrateTableColumnsSource(`
const a = createTable<User>({ visible: ['name'], headers: { name: 'N' } });
const b = createTable<User>({ visible: ['email'], headers: { email: 'E' } });
`);
    expect(result.changed).toBe(true);
    expect(result.code).toContain(`name: { header: 'N' }`);
    expect(result.code).toContain(`email: { header: 'E' }`);
  });
});
