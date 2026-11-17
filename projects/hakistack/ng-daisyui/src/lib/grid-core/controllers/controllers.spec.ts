import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { PaginationOptions } from '../grid.types';
import { PaginationController } from './pagination.controller';
import { CheckboxCascadeMode, SelectionController } from './selection.controller';
import { SortController, SortState } from './sort.controller';

/**
 * grid-core controllers are plain classes shared by hk-table and hk-datagrid. These specs pin their contracts
 * without a component, so a regression shows up here and not only through one grid's template.
 */

describe('SortController', () => {
  function setup(opts: { resizing?: boolean; offset?: boolean } = {}) {
    const emitted: SortState[] = [];
    const resets = { count: 0 };
    const controller = new SortController({
      isResizing: signal(opts.resizing ?? false),
      isOffsetMode: signal(opts.offset ?? true),
      onResetToFirstPage: () => resets.count++,
      onSortChange: (s) => emitted.push(s),
    });
    return { controller, emitted, resets };
  }

  it('cycles ascending → descending → unsorted and restarts on a new field', () => {
    const { controller } = setup();
    controller.sort('name');
    expect(controller.state()).toEqual({ field: 'name', direction: 'Ascending' });
    controller.sort('name');
    expect(controller.direction()).toBe('Descending');
    controller.sort('name');
    expect(controller.state()).toEqual({ field: '', direction: '' });
    controller.sort('name');
    controller.sort('age');
    expect(controller.state()).toEqual({ field: 'age', direction: 'Ascending' });
  });

  it('emits every change and resets to page 1 only in offset mode', () => {
    const offset = setup({ offset: true });
    offset.controller.sort('name');
    expect(offset.emitted).toEqual([{ field: 'name', direction: 'Ascending' }]);
    expect(offset.resets.count).toBe(1);

    const cursor = setup({ offset: false });
    cursor.controller.sort('name');
    expect(cursor.resets.count).toBe(0);
  });

  it('ignores clicks while a column is being resized', () => {
    const { controller, emitted } = setup({ resizing: true });
    controller.sort('name');
    expect(controller.state().field).toBe('');
    expect(emitted).toEqual([]);
  });

  it('compares type-aware and keeps empty values last in both directions', () => {
    const { controller } = setup();
    const values = ['b10', null, 'b2', undefined, 'A1'];
    const asc = [...values].sort((a, b) => controller.compareValues(a, b, 'Ascending'));
    const desc = [...values].sort((a, b) => controller.compareValues(a, b, 'Descending'));
    expect(asc.slice(0, 3)).toEqual(['A1', 'b2', 'b10']);
    expect(desc.slice(0, 3)).toEqual(['b10', 'b2', 'A1']);
    expect(asc.slice(3).every((v) => v == null)).toBe(true);
    expect(desc.slice(3).every((v) => v == null)).toBe(true);
  });
});

describe('PaginationController', () => {
  function setup(total = 95, options: PaginationOptions | null = { mode: 'offset', pageSize: 10 }) {
    const events: { pageIndex: number; pageSize: number }[] = [];
    const deps = {
      paginationOptions: signal<PaginationOptions | null>(options),
      totalItems: signal(total),
      showFirstLastButtons: signal(true),
      disabled: signal(false),
      injector: TestBed.inject(Injector),
      onPageChange: (e: { pageIndex: number; pageSize: number }) => events.push(e),
    };
    const controller = TestBed.runInInjectionContext(() => new PaginationController(deps));
    TestBed.tick();
    return { controller, deps, events };
  }

  it('navigates within bounds and emits each move', () => {
    const { controller, events } = setup(95);
    expect(controller.totalPages()).toBe(10);
    controller.previousPage();
    expect(events).toEqual([]);
    controller.nextPage();
    controller.lastPage();
    expect(controller.pageIndex()).toBe(9);
    controller.nextPage();
    expect(controller.pageIndex()).toBe(9);
    controller.gotoPage(3);
    expect(controller.pageIndex()).toBe(2);
    controller.gotoPage(99);
    expect(controller.pageIndex()).toBe(2);
    controller.firstPage();
    expect(events.map((e) => e.pageIndex)).toEqual([1, 9, 2, 0]);
  });

  it('does nothing while disabled', () => {
    const { controller, deps } = setup();
    deps.disabled.set(true);
    controller.nextPage();
    controller.gotoPage(4);
    expect(controller.pageIndex()).toBe(0);
  });

  it('clamps the page when the data shrinks', () => {
    const { controller } = setup(95);
    controller.lastPage();
    controller.clampToData(25);
    expect(controller.pageIndex()).toBe(2);
    controller.clampToData(0);
    expect(controller.pageIndex()).toBe(0);
  });

  it('follows the options page size only when the options change it, not on every effect run', () => {
    const { controller, deps } = setup(200, { mode: 'offset', pageSize: 10 });
    controller.handlePageChange({ pageIndex: 0, pageSize: 50 });
    deps.disabled.set(true);
    TestBed.tick();
    expect(controller.pageSize()).toBe(50);
    deps.paginationOptions.set({ mode: 'offset', pageSize: 25 });
    TestBed.tick();
    expect(controller.pageSize()).toBe(25);
  });

  it('treats cursor mode and serverSide offset as server-side', () => {
    expect(setup(10, { mode: 'cursor', pageSize: 10 }).controller.isServerSide()).toBe(true);
    expect(setup(10, { mode: 'offset', pageSize: 10, serverSide: true }).controller.isServerSide()).toBe(true);
    expect(setup(10, { mode: 'offset', pageSize: 10 }).controller.isServerSide()).toBe(false);
  });
});

describe('SelectionController', () => {
  interface Node {
    id: string;
    locked?: boolean;
    children?: Node[];
  }
  const leafA: Node = { id: 'a' };
  const leafB: Node = { id: 'b' };
  const parent: Node = { id: 'p', children: [leafA, leafB] };
  const other: Node = { id: 'o', locked: true };
  const parents = new Map<Node, Node>([
    [leafA, parent],
    [leafB, parent],
  ]);

  function setup(opts: { limit?: number | null; cascade?: CheckboxCascadeMode; data?: Node[] } = {}) {
    const changes: (readonly Node[])[] = [];
    const controller = new SelectionController<Node>({
      currentData: signal(opts.data ?? [parent, leafA, leafB, other]),
      hasSelection: signal(true),
      selectionLimit: signal(opts.limit ?? null),
      isRowSelectable: signal((row: Node) => !row.locked),
      selectableRowsMode: signal<false | 'single' | 'multi'>('single'),
      cascadeMode: signal(opts.cascade ?? 'none'),
      isTreeTable: signal(true),
      childrenProperty: signal('children'),
      getChildren: (row) => row.children,
      getParent: (row) => parents.get(row) ?? null,
      hasChildren: (row) => !!row.children?.length,
      onSelectionChange: (rows) => changes.push(rows),
    });
    return { controller, changes };
  }

  it('selects and deselects rows and emits the selection', () => {
    const { controller, changes } = setup();
    controller.toggleRow(leafA, true);
    expect(controller.isSelected(leafA)).toBe(true);
    controller.toggleRow(leafA, false);
    expect(changes).toEqual([[leafA], []]);
  });

  it('never selects a row the predicate rejects, but select-all skips it instead of failing', () => {
    const { controller } = setup();
    controller.toggleRow(other, true);
    expect(controller.isSelected(other)).toBe(false);
    expect(controller.isRowSelectDisabled(other)).toBe(true);
    controller.toggleSelectAll(true);
    expect(controller.selectedArray()).toEqual([parent, leafA, leafB]);
    expect(controller.isAllSelected()).toBe(true);
  });

  it('enforces the selection limit, and select-all fills only up to it', () => {
    const { controller } = setup({ limit: 2 });
    expect(controller.showSelectAllCheckbox()).toBe(false);
    controller.toggleSelectAll(true);
    expect(controller.selectedArray().length).toBe(2);
    expect(controller.isSelectionLimitReached()).toBe(true);
    controller.toggleRow(leafB, true);
    expect(controller.isSelected(leafB)).toBe(false);
    expect(controller.isRowSelectDisabledByLimit(leafB)).toBe(true);
    // Deselecting is always allowed at the cap.
    controller.toggleRow(parent, false);
    expect(controller.isSelected(parent)).toBe(false);
  });

  it('cascades down to children and up to a parent whose children are all selected', () => {
    const down = setup({ cascade: 'downward' }).controller;
    down.toggleRow(parent, true);
    expect(down.selectedArray()).toEqual([parent, leafA, leafB]);

    const up = setup({ cascade: 'upward' }).controller;
    up.toggleRow(leafA, true);
    expect(up.isSelected(parent)).toBe(false);
    expect(up.isIndeterminate(parent)).toBe(true);
    up.toggleRow(leafB, true);
    expect(up.isSelected(parent)).toBe(true);
    expect(up.isIndeterminate(parent)).toBe(false);
  });

  it('drops rows that left the data set and reports whether anything changed', () => {
    const { controller } = setup();
    controller.toggleRow(leafA, true);
    controller.toggleRow(leafB, true);
    expect(controller.pruneToData([leafA])).toBe(true);
    expect(controller.selectedArray()).toEqual([leafA]);
    expect(controller.pruneToData([leafA])).toBe(false);
    expect(controller.pruneToData([])).toBe(true);
    expect(controller.selectedArray()).toEqual([]);
  });

  it('toggles the single active row', () => {
    const { controller } = setup();
    controller.toggleActiveRow(leafA);
    expect(controller.activeRow()).toBe(leafA);
    controller.toggleActiveRow(leafA);
    expect(controller.activeRow()).toBeNull();
  });
});
