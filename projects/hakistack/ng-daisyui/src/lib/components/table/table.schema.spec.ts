import { TestBed } from '@angular/core/testing';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { createTable } from './table.helpers';
import { DeclarativeTableConfig } from './table.schema';
import { ColumnDefinition, FieldConfiguration } from './table.types';

interface User {
  id: number;
  name: string;
  email: string;
  salary: number;
  status: 'active' | 'inactive';
}

function build(config: DeclarativeTableConfig<User>): FieldConfiguration<User> {
  return TestBed.runInInjectionContext(() => createTable<User>(config));
}

const colByField = (cols: readonly ColumnDefinition<User>[], field: keyof User) => cols.find((c) => c.field === field)!;

describe('createTable — declarative columns map', () => {
  it('produces columns in key order with default + explicit headers', () => {
    const table = build({
      columns: {
        id: {},
        name: { header: 'Full Name' },
        email: {},
      },
    });

    expect(table.columns.map((c) => c.field)).toEqual(['id', 'name', 'email']);
    expect(colByField(table.columns, 'name').header).toBe('Full Name');
    // default header humanizes the key (same engine as the legacy path)
    expect(colByField(table.columns, 'email').header).toBe('Email');
  });

  it('wires format and fallback through the existing pipeline', () => {
    const table = build({
      columns: {
        salary: { header: 'Salary', format: (value, row) => `$${value.toFixed(2)} (${row.name})` },
        email: { fallback: '—' },
      },
    });

    const salary = colByField(table.columns, 'salary');
    expect(salary.format?.(1234.5, { id: 1, name: 'Ann', email: 'a@x.io', salary: 1234.5, status: 'active' })).toBe('$1234.50 (Ann)');
    expect(colByField(table.columns, 'email').fallback).toBe('—');
  });

  it('maps a flat editType to an editable column', () => {
    const table = build({
      columns: {
        status: { editType: 'select', editOptions: [{ label: 'Active', value: 'active' }] },
      },
    });
    const status = colByField(table.columns, 'status');
    expect(status.editable).toBe(true);
    expect(status.editType).toBe('select');
    expect(status.editOptions).toEqual([{ label: 'Active', value: 'active' }]);
  });

  it('wires editValidator / editOptions even without an explicit editType', () => {
    const table = build({
      columns: {
        name: { editValidator: (value) => (value.length > 0 ? true : 'Required') },
      },
    });

    const name = colByField(table.columns, 'name');
    expect(name.editable).toBe(true);
    expect(name.editType).toBe('text'); // ColumnDefinition's documented default
    expect(name.editValidator?.('', { id: 1, name: '', email: '', salary: 0, status: 'active' })).toBe('Required');
  });

  it('lets an explicit `editable: false` win over an inferred editor', () => {
    const table = build({
      columns: {
        status: { editable: false, editType: 'select' },
      },
    });
    expect(colByField(table.columns, 'status').editable).toBe(false);
  });

  it('supports both aggregate-shorthand and function footers', () => {
    const table = build({
      columns: {
        salary: { footer: 'sum' },
        id: { footer: (rows) => `n=${rows.length}` },
      },
    });
    expect(typeof colByField(table.columns, 'salary').footer).toBe('function'); // aggregate compiled to a fn
    const idFooter = colByField(table.columns, 'id').footer;
    expect(idFooter?.([{ id: 1 }, { id: 2 }] as User[])).toBe('n=2'); // function footer applied verbatim
  });

  it('overlays rich props buildColumnSchema ignores (sticky, resizable, minWidth, width)', () => {
    const table = build({
      columns: {
        id: { sticky: 'start', minWidth: 80, width: 120 },
        name: { resizable: true },
      },
    });
    const id = colByField(table.columns, 'id');
    expect(id.sticky).toBe('start');
    expect(id.minWidth).toBe(80);
    expect(colByField(table.columns, 'name').resizable).toBe(true);
    // width folds into the normalized config's columnWidths
    expect(table.config.columnWidths?.id).toBe(120);
  });

  it('passes table-level options through untouched', () => {
    const table = build({
      columns: { id: {}, name: {} },
      hasSelection: true,
      pagination: { mode: 'offset', pageSize: 5 },
    });
    expect(table.config.hasSelection).toBe(true);
    expect(table.config.pagination?.pageSize).toBe(5);
    expect(table.config.visible).toEqual(['id', 'name']);
  });

  it('still accepts the legacy projection config (regression)', () => {
    // Deliberately *not* cast — this asserts the legacy overload still type-checks, which is the whole
    // back-compat promise of the additive `columns` overload.
    const table = TestBed.runInInjectionContext(() =>
      createTable<User>({
        visible: ['id', 'name'],
        headers: { name: 'Name' },
        formatters: { salary: (value) => `$${value}` },
        cellEditors: { status: { type: 'select', options: [{ label: 'Active', value: 'active' }] } },
      }),
    );

    expect(table.columns.map((c) => c.field)).toEqual(['id', 'name']);
    expect(colByField(table.columns, 'name').header).toBe('Name');
  });

  describe('type inference (compile-time)', () => {
    it('infers the cell value type per column', () => {
      build({
        columns: {
          salary: {
            format: (value, row) => {
              expectTypeOf(value).toEqualTypeOf<number>();
              expectTypeOf(row).toEqualTypeOf<User>();
              return String(value);
            },
          },
          status: {
            editValidator: (value) => {
              expectTypeOf(value).toEqualTypeOf<'active' | 'inactive'>();
              return true;
            },
          },
        },
      });
      expect(true).toBe(true);
    });
  });
});
