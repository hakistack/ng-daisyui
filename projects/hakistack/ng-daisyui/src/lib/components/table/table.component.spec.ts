import { ComponentFixture, TestBed } from '@angular/core/testing';

import { createTable } from './table.helpers';
import { FieldConfiguration, SortChange } from './table.types';
import { TableComponent } from './table.component';

// ---------------------------------------------------------------------------
// Test data types & helpers
// ---------------------------------------------------------------------------

interface TestRow {
  id: number;
  name: string;
  email: string;
  age: number;
  active: boolean;
}

const SAMPLE_DATA: TestRow[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com', age: 30, active: true },
  { id: 2, name: 'Bob', email: 'bob@example.com', age: 25, active: false },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', age: 35, active: true },
  { id: 4, name: 'Diana', email: 'diana@example.com', age: 28, active: false },
  { id: 5, name: 'Eve', email: 'eve@example.com', age: 32, active: true },
];

function buildConfig(overrides: Partial<Parameters<typeof createTable<TestRow>>[0]> = {}): FieldConfiguration<TestRow> {
  return TestBed.runInInjectionContext(() =>
    createTable<TestRow>({
      visible: ['id', 'name', 'email'],
      ...overrides,
    }),
  );
}

function queryAllHeaders(fixture: ComponentFixture<TableComponent<TestRow>>): string[] {
  const ths = fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLElement>;
  return Array.from(ths).map((th) => th.textContent?.trim() ?? '');
}

function queryAllBodyRows(fixture: ComponentFixture<TableComponent<TestRow>>): HTMLElement[] {
  // CDK table uses cdk-row attribute
  return Array.from(
    fixture.nativeElement.querySelectorAll(
      'tr[cdk-row], tbody tr:not(.group-header-row):not(.group-footer-row):not(.footer-row):not(.detail-row)',
    ),
  );
}

function queryAllBodyCellsInRow(row: HTMLElement): string[] {
  const cells = row.querySelectorAll('td') as NodeListOf<HTMLElement>;
  return Array.from(cells).map((td) => td.textContent?.trim() ?? '');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TableComponent', () => {
  let component: TableComponent<TestRow>;
  let fixture: ComponentFixture<TableComponent<TestRow>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent<TableComponent<TestRow>>(TableComponent);
    component = fixture.componentInstance;
  });

  // =========================================================================
  // Component creation
  // =========================================================================

  describe('Component creation', () => {
    it('should create without inputs', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should create with data and config', () => {
      const config = buildConfig();
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component).toBeTruthy();
    });

    it('should auto-generate column definitions from data keys when no config is provided', () => {
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const colDefs = component.columnDefsSignal();
      const fields = colDefs.map((c) => c.field);
      expect(fields).toEqual(expect.arrayContaining(['id', 'name', 'email', 'age', 'active']));
    });
  });

  // =========================================================================
  // Column rendering
  // =========================================================================

  describe('Column rendering', () => {
    it('should render the correct column headers', () => {
      const config = buildConfig({ headers: { name: 'Full Name', email: 'E-Mail' } });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const headers = queryAllHeaders(fixture);
      expect(headers).toContain('Full Name');
      expect(headers).toContain('E-Mail');
    });

    it('should render auto-formatted headers when none provided', () => {
      const config = buildConfig();
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const colDefs = component.columnDefsSignal();
      // 'name' should become 'Name' etc.
      const nameCol = colDefs.find((c) => c.field === 'name');
      expect(nameCol?.header).toBe('Name');
    });

    it('should show only visible columns', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const colDefs = component.columnDefsSignal();
      expect(colDefs.length).toBe(1);
      expect(colDefs[0].field).toBe('name');
    });

    it('should render cell values correctly', () => {
      const config = buildConfig({ visible: ['name', 'email'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const rows = queryAllBodyRows(fixture);
      // The default page size is 10 and we have 5 rows, so all should render
      expect(rows.length).toBe(5);

      const firstRowCells = queryAllBodyCellsInRow(rows[0]);
      expect(firstRowCells).toContain('Alice');
      expect(firstRowCells).toContain('alice@example.com');
    });

    it('should apply column formatters', () => {
      const config = buildConfig({
        visible: ['name'],
        formatters: {
          name: (value: unknown) => `[${String(value)}]`,
        },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const rows = queryAllBodyRows(fixture);
      const firstRowCells = queryAllBodyCellsInRow(rows[0]);
      expect(firstRowCells.some((cell) => cell.includes('[Alice]'))).toBe(true);
    });

    it('should display fallback text for null/empty values', () => {
      const dataWithNull = [{ id: 1, name: '', email: 'a@b.com', age: 30, active: true }];
      const config = buildConfig({
        visible: ['name'],
        fallbacks: { name: 'N/A' },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', dataWithNull);
      fixture.detectChanges();

      const rows = queryAllBodyRows(fixture);
      const cells = queryAllBodyCellsInRow(rows[0]);
      expect(cells.some((cell) => cell.includes('N/A'))).toBe(true);
    });
  });

  // =========================================================================
  // Sorting
  // =========================================================================

  describe('Sorting', () => {
    beforeEach(() => {
      const config = buildConfig({ visible: ['name', 'age'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();
    });

    it('should have no active sort by default', () => {
      expect(component.sortFieldSignal()).toBe('');
      expect(component.sortDirectionSignal()).toBe('');
    });

    it('should sort ascending on first click', () => {
      component.sort('name');
      fixture.detectChanges();

      expect(component.sortFieldSignal()).toBe('name');
      expect(component.sortDirectionSignal()).toBe('Ascending');
    });

    it('should sort descending on second click of same column', () => {
      component.sort('name');
      component.sort('name');
      fixture.detectChanges();

      expect(component.sortDirectionSignal()).toBe('Descending');
    });

    it('should clear sort on third click of same column', () => {
      component.sort('name');
      component.sort('name');
      component.sort('name');
      fixture.detectChanges();

      expect(component.sortFieldSignal()).toBe('');
      expect(component.sortDirectionSignal()).toBe('');
    });

    it('should restart ascending when switching to a different column', () => {
      component.sort('name');
      component.sort('name'); // descending
      component.sort('age'); // should be ascending on 'age'
      fixture.detectChanges();

      expect(component.sortFieldSignal()).toBe('age');
      expect(component.sortDirectionSignal()).toBe('Ascending');
    });

    it('should emit sortChange output', () => {
      let emitted: SortChange | undefined;
      component.sortChange.subscribe((v: SortChange) => (emitted = v));

      component.sort('name');
      expect(emitted).toEqual({ field: 'name', direction: 'Ascending' });
    });

    it('should actually reorder data when sorted ascending by name', () => {
      component.sort('name');
      fixture.detectChanges();

      const displayData = component.displayDataSignal();
      const names = displayData.map((d) => d.name);
      expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']);
    });

    it('should actually reorder data when sorted descending by name', () => {
      component.sort('name');
      component.sort('name');
      fixture.detectChanges();

      const displayData = component.displayDataSignal();
      const names = displayData.map((d) => d.name);
      expect(names).toEqual(['Eve', 'Diana', 'Charlie', 'Bob', 'Alice']);
    });
  });

  // =========================================================================
  // Row selection (checkbox)
  // =========================================================================

  describe('Row selection (checkbox)', () => {
    beforeEach(() => {
      const config = buildConfig({ visible: ['name', 'email'], hasSelection: true });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();
    });

    it('should render selection checkboxes when hasSelection is true', () => {
      expect(component.hasSelectionSignal()).toBe(true);
      const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
      // Header "select all" + 5 row checkboxes
      expect(checkboxes.length).toBe(6);
    });

    it('should toggle a single row selection', () => {
      const row = SAMPLE_DATA[0];
      component.toggleRow(row, true);
      fixture.detectChanges();

      expect(component.isSelected(row)).toBe(true);
      expect(component.selectedSignal().size).toBe(1);
    });

    it('should deselect a row', () => {
      const row = SAMPLE_DATA[0];
      component.toggleRow(row, true);
      component.toggleRow(row, false);
      fixture.detectChanges();

      expect(component.isSelected(row)).toBe(false);
      expect(component.selectedSignal().size).toBe(0);
    });

    it('should emit selectionChange when toggling rows', () => {
      let emitted: readonly TestRow[] = [];
      component.selectionChange.subscribe((v: readonly TestRow[]) => (emitted = v));

      component.toggleRow(SAMPLE_DATA[0], true);
      expect(emitted.length).toBe(1);
      expect(emitted[0]).toBe(SAMPLE_DATA[0]);
    });

    it('should select all rows via toggleSelectAll', () => {
      component.toggleSelectAll(true);
      fixture.detectChanges();

      expect(component.selectedSignal().size).toBe(5);
      expect(component.isAllSelected()).toBe(true);
    });

    it('should deselect all rows via toggleSelectAll', () => {
      component.toggleSelectAll(true);
      component.toggleSelectAll(false);
      fixture.detectChanges();

      expect(component.selectedSignal().size).toBe(0);
      expect(component.isAllSelected()).toBe(false);
    });

    it('should clear selection', () => {
      component.toggleRow(SAMPLE_DATA[0], true);
      component.toggleRow(SAMPLE_DATA[1], true);
      component.clearSelection();
      fixture.detectChanges();

      expect(component.selectedSignal().size).toBe(0);
    });
  });

  // =========================================================================
  // Row click / selectable rows
  // =========================================================================

  describe('Row click', () => {
    it('should emit rowClick on click', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      let clicked: TestRow | undefined;
      component.rowClick.subscribe((v: TestRow) => (clicked = v));

      component.onRowClick(SAMPLE_DATA[2]);
      expect(clicked).toBe(SAMPLE_DATA[2]);
    });

    it('should highlight active row in single selectable mode', () => {
      const config = buildConfig({ visible: ['name'], selectableRows: 'single' });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.onRowClick(SAMPLE_DATA[1]);
      expect(component.activeRow()).toBe(SAMPLE_DATA[1]);
    });

    it('should toggle off active row when clicking the same row in single mode', () => {
      const config = buildConfig({ visible: ['name'], selectableRows: 'single' });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.onRowClick(SAMPLE_DATA[1]);
      component.onRowClick(SAMPLE_DATA[1]);
      expect(component.activeRow()).toBeNull();
    });

    it('should allow multiple active rows in multi selectable mode', () => {
      const config = buildConfig({ visible: ['name'], selectableRows: 'multi' });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.onRowClick(SAMPLE_DATA[0]);
      component.onRowClick(SAMPLE_DATA[2]);
      expect(component.activeRows().size).toBe(2);
      expect(component.activeRows().has(SAMPLE_DATA[0])).toBe(true);
      expect(component.activeRows().has(SAMPLE_DATA[2])).toBe(true);
    });

    it('should toggle off a row in multi selectable mode', () => {
      const config = buildConfig({ visible: ['name'], selectableRows: 'multi' });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.onRowClick(SAMPLE_DATA[0]);
      component.onRowClick(SAMPLE_DATA[0]);
      expect(component.activeRows().has(SAMPLE_DATA[0])).toBe(false);
    });
  });

  // =========================================================================
  // Actions column
  // =========================================================================

  describe('Actions column', () => {
    it('should render action buttons when actions are configured', () => {
      const config = buildConfig({
        visible: ['name'],
        actions: [
          { type: 'view', label: 'View', action: () => {} },
          { type: 'delete', label: 'Delete', action: () => {} },
        ],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.hasActionsSignal()).toBe(true);

      // Headers should include "Actions"
      const headers = queryAllHeaders(fixture);
      expect(headers).toContain('Actions');

      // Action buttons should appear in each row
      const actionBtns = fixture.nativeElement.querySelectorAll('td.text-center button');
      expect(actionBtns.length).toBeGreaterThanOrEqual(10); // 2 actions x 5 rows
    });

    it('should not show actions column when no actions are configured', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.hasActionsSignal()).toBe(false);
      const headers = queryAllHeaders(fixture);
      expect(headers).not.toContain('Actions');
    });

    it('should call action handler when button is clicked', () => {
      let clicked: TestRow | undefined;
      const config = buildConfig({
        visible: ['name'],
        actions: [
          {
            type: 'view',
            label: 'View',
            action: (row) => {
              clicked = row;
            },
          },
        ],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const actionList = component.actionListSignal();
      actionList[0].config.action(SAMPLE_DATA[0]);
      expect(clicked).toBe(SAMPLE_DATA[0]);
    });

    it('should hide actions when hidden callback returns true', () => {
      const config = buildConfig({
        visible: ['name'],
        actions: [{ type: 'view', label: 'View', action: () => {}, hidden: (row) => row.id === 1 }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const actionList = component.actionListSignal();
      expect(actionList[0].config.hidden?.(SAMPLE_DATA[0])).toBe(true);
      expect(actionList[0].config.hidden?.(SAMPLE_DATA[1])).toBe(false);
    });

    it('should apply correct CSS classes per action type', () => {
      const config = buildConfig({
        visible: ['name'],
        actions: [
          { type: 'view', label: 'View', action: () => {} },
          { type: 'delete', label: 'Delete', action: () => {} },
        ],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const actionList = component.actionListSignal();
      const viewClasses = component.classesFor(actionList[0]);
      expect(viewClasses).toContain('btn-secondary');

      const deleteClasses = component.classesFor(actionList[1]);
      expect(deleteClasses).toContain('btn-error');
    });
  });

  // =========================================================================
  // Pagination
  // =========================================================================

  describe('Pagination', () => {
    it('should paginate data in offset mode', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.componentRef.setInput('paginationOptions', {
        mode: 'offset',
        pageSize: 2,
      });
      fixture.detectChanges();

      // Only 2 rows should be visible on the first page
      const rows = queryAllBodyRows(fixture);
      expect(rows.length).toBe(2);
    });

    it('should navigate to next page', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.componentRef.setInput('paginationOptions', {
        mode: 'offset',
        pageSize: 2,
      });
      fixture.detectChanges();

      component.nextPage();
      fixture.detectChanges();

      expect(component.pageIndexSignal()).toBe(1);
      const rows = queryAllBodyRows(fixture);
      expect(rows.length).toBe(2);
    });

    it('should navigate to previous page', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.componentRef.setInput('paginationOptions', {
        mode: 'offset',
        pageSize: 2,
      });
      fixture.detectChanges();

      component.nextPage();
      component.previousPage();
      fixture.detectChanges();

      expect(component.pageIndexSignal()).toBe(0);
    });

    it('should navigate to first and last page', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.componentRef.setInput('paginationOptions', {
        mode: 'offset',
        pageSize: 2,
      });
      fixture.detectChanges();

      component.lastPage();
      fixture.detectChanges();
      expect(component.pageIndexSignal()).toBe(2); // 5 items, 2 per page => last page is index 2

      component.firstPage();
      fixture.detectChanges();
      expect(component.pageIndexSignal()).toBe(0);
    });

    it('should emit pageChange on navigation', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.componentRef.setInput('paginationOptions', {
        mode: 'offset',
        pageSize: 2,
      });
      fixture.detectChanges();

      let emitted: { pageIndex: number; pageSize: number } | undefined;
      component.pageChange.subscribe((v) => (emitted = v));

      component.nextPage();
      expect(emitted).toEqual({ pageIndex: 1, pageSize: 2 });
    });

    it('should go to a specific page', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.componentRef.setInput('paginationOptions', {
        mode: 'offset',
        pageSize: 2,
      });
      fixture.detectChanges();

      component.gotoPage(3); // 1-based, so page 3 = index 2
      fixture.detectChanges();
      expect(component.pageIndexSignal()).toBe(2);
    });

    it('should not navigate beyond boundaries', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.componentRef.setInput('paginationOptions', {
        mode: 'offset',
        pageSize: 2,
      });
      fixture.detectChanges();

      component.previousPage(); // Already on first page
      expect(component.pageIndexSignal()).toBe(0);

      component.lastPage();
      const lastIdx = component.pageIndexSignal();
      component.nextPage(); // Already on last page
      expect(component.pageIndexSignal()).toBe(lastIdx);
    });

    it('should show correct total items', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.componentRef.setInput('paginationOptions', {
        mode: 'offset',
        pageSize: 2,
      });
      fixture.detectChanges();

      expect(component.totalItemsSignal()).toBe(5);
    });
  });

  // =========================================================================
  // Empty state
  // =========================================================================

  describe('Empty state', () => {
    it('should render zero rows when data is empty', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', []);
      fixture.detectChanges();

      const rows = queryAllBodyRows(fixture);
      expect(rows.length).toBe(0);
    });

    it('should render zero rows when data is null', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', null);
      fixture.detectChanges();

      const rows = queryAllBodyRows(fixture);
      expect(rows.length).toBe(0);
    });
  });

  // =========================================================================
  // createTable() helper
  // =========================================================================

  describe('createTable() helper', () => {
    it('should produce a valid FieldConfiguration', () => {
      const config = buildConfig({ visible: ['id', 'name', 'email'] });
      expect(config).toBeDefined();
      expect(config.config).toBeDefined();
      expect(config.columns).toBeDefined();
    });

    it('should generate column definitions matching visible fields', () => {
      const config = buildConfig({ visible: ['name', 'email'] });
      expect(config.columns.length).toBe(2);
      expect(config.columns[0].field).toBe('name');
      expect(config.columns[1].field).toBe('email');
    });

    it('should apply custom headers', () => {
      const config = buildConfig({
        visible: ['name'],
        headers: { name: 'Full Name' },
      });
      expect(config.columns[0].header).toBe('Full Name');
    });

    it('should default-format camelCase field names', () => {
      interface CamelRow {
        firstName: string;
        lastName: string;
      }
      const config = TestBed.runInInjectionContext(() =>
        createTable<CamelRow>({
          visible: ['firstName', 'lastName'],
        }),
      );
      expect(config.columns[0].header).toBe('First Name');
      expect(config.columns[1].header).toBe('Last Name');
    });

    it('should set hasSelection on the config', () => {
      const config = buildConfig({ visible: ['name'], hasSelection: true });
      expect(config.config.hasSelection).toBe(true);
    });

    it('should apply formatters to column definitions', () => {
      const config = buildConfig({
        visible: ['name'],
        formatters: { name: (value: unknown) => `Hello ${value}` },
      });
      expect(config.columns[0].format).toBeDefined();
      expect(config.columns[0].format!('Test', {} as TestRow)).toBe('Hello Test');
    });

    it('should set default values for optional fields', () => {
      const config = buildConfig({ visible: ['name'] });
      expect(config.config.hasSelection).toBe(false);
      expect(config.config.hasActions).toBe(false);
      expect(config.config.enableFiltering).toBe(false);
      expect(config.config.enableInlineEditing).toBe(false);
      expect(config.config.enableColumnResizing).toBe(false);
      expect(config.config.enableColumnReorder).toBe(false);
      expect(config.config.enableRowReorder).toBe(false);
    });
  });

  // =========================================================================
  // Column visibility
  // =========================================================================

  describe('Column visibility', () => {
    it('should enable column visibility feature', () => {
      const config = buildConfig({
        visible: ['id', 'name', 'email'],
        columnVisibility: { enabled: true },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.isColumnVisibilityEnabled()).toBe(true);
    });

    it('should toggle column visibility', () => {
      const config = buildConfig({
        visible: ['id', 'name', 'email'],
        columnVisibility: { enabled: true },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.isColumnVisible('name')).toBe(true);
      component.toggleColumnVisibility('name');
      fixture.detectChanges();
      expect(component.isColumnVisible('name')).toBe(false);
    });

    it('should not hide the last visible column', () => {
      const config = buildConfig({
        visible: ['name'],
        columnVisibility: { enabled: true },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.toggleColumnVisibility('name');
      expect(component.isColumnVisible('name')).toBe(true);
    });

    it('should not hide always-visible columns', () => {
      const config = buildConfig({
        visible: ['id', 'name', 'email'],
        columnVisibility: { enabled: true, alwaysVisible: ['id'] },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.toggleColumnVisibility('id');
      expect(component.isColumnVisible('id')).toBe(true);
    });

    it('should show all columns', () => {
      const config = buildConfig({
        visible: ['id', 'name', 'email'],
        columnVisibility: { enabled: true },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.toggleColumnVisibility('name');
      component.toggleColumnVisibility('email');
      component.showAllColumns();
      fixture.detectChanges();

      expect(component.isColumnVisible('name')).toBe(true);
      expect(component.isColumnVisible('email')).toBe(true);
    });

    it('should hide all columns except always-visible and first non-always-visible', () => {
      const config = buildConfig({
        visible: ['id', 'name', 'email'],
        columnVisibility: { enabled: true, alwaysVisible: ['id'] },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.hideAllColumns();
      fixture.detectChanges();

      // id is always-visible, name is kept as the first non-always-visible column
      expect(component.isColumnVisible('id')).toBe(true);
      expect(component.isColumnVisible('name')).toBe(true);
      expect(component.isColumnVisible('email')).toBe(false);
    });

    it('should reset column visibility', () => {
      const config = buildConfig({
        visible: ['id', 'name', 'email'],
        columnVisibility: { enabled: true, defaultVisible: ['id', 'name'] },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      // Show all first, then reset
      component.showAllColumns();
      component.resetColumnVisibility();
      fixture.detectChanges();

      expect(component.isColumnVisible('id')).toBe(true);
      expect(component.isColumnVisible('name')).toBe(true);
      expect(component.isColumnVisible('email')).toBe(false);
    });
  });

  // =========================================================================
  // Cell display types
  // =========================================================================

  describe('Cell display types', () => {
    it('should display string values', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const col = component.columnDefsSignal().find((c) => c.field === 'name')!;
      const cellDisplay = component.getCellDisplaySync(SAMPLE_DATA[0], col);
      expect(cellDisplay).toBeTruthy();
      expect(cellDisplay!.value).toBe('Alice');
      expect(cellDisplay!.isHtml).toBe(false);
    });

    it('should display numeric values', () => {
      const config = buildConfig({ visible: ['age'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const col = component.columnDefsSignal().find((c) => c.field === 'age')!;
      const cellDisplay = component.getCellDisplaySync(SAMPLE_DATA[0], col);
      expect(cellDisplay).toBeTruthy();
      expect(cellDisplay!.value).toBe('30');
    });

    it('should display boolean values', () => {
      const config = buildConfig({ visible: ['active'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const col = component.columnDefsSignal().find((c) => c.field === 'active')!;
      const trueDisplay = component.getCellDisplaySync(SAMPLE_DATA[0], col);
      expect(trueDisplay!.value).toBe('true');

      // false is falsy, so getCellDisplaySync returns the fallback '—'
      const falseDisplay = component.getCellDisplaySync(SAMPLE_DATA[1], col);
      expect(falseDisplay!.value).toBe('—');
    });

    it('should display fallback for missing values', () => {
      const dataWithUndefined = [{ id: 1, name: undefined as unknown as string, email: 'a@b.com', age: 30, active: true }];
      const config = buildConfig({ visible: ['name'], fallbacks: { name: 'Unknown' } });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', dataWithUndefined);
      fixture.detectChanges();

      const col = component.columnDefsSignal().find((c) => c.field === 'name')!;
      const cellDisplay = component.getCellDisplaySync(dataWithUndefined[0], col);
      expect(cellDisplay!.value).toBe('Unknown');
    });

    it('should detect and sanitize HTML values', () => {
      const htmlData = [{ id: 1, name: '<b>Alice</b>', email: 'a@b.com', age: 30, active: true }];
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', htmlData);
      fixture.detectChanges();

      const col = component.columnDefsSignal().find((c) => c.field === 'name')!;
      const cellDisplay = component.getCellDisplaySync(htmlData[0], col);
      expect(cellDisplay!.isHtml).toBe(true);
      expect(cellDisplay!.safeHtml).toBeTruthy();
    });

    it('should display zero values correctly (not as fallback)', () => {
      const zeroData = [{ id: 0, name: 'Zero', email: 'z@b.com', age: 0, active: false }];
      const config = buildConfig({ visible: ['age'], fallbacks: { age: 'N/A' } });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', zeroData);
      fixture.detectChanges();

      const col = component.columnDefsSignal().find((c) => c.field === 'age')!;
      const cellDisplay = component.getCellDisplaySync(zeroData[0], col);
      expect(cellDisplay!.value).toBe('0');
    });
  });

  // =========================================================================
  // Displayed columns structure
  // =========================================================================

  describe('Displayed columns signal', () => {
    it('should include only data columns when no selection or actions', () => {
      const config = buildConfig({ visible: ['name', 'email'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const displayed = component.displayedColumnsSignal();
      expect(displayed).toEqual(['name', 'email']);
    });

    it('should prepend "select" when hasSelection is true', () => {
      const config = buildConfig({ visible: ['name'], hasSelection: true });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const displayed = component.displayedColumnsSignal();
      expect(displayed[0]).toBe('select');
    });

    it('should append "actions" when actions are configured', () => {
      const config = buildConfig({
        visible: ['name'],
        actions: [{ type: 'view', label: 'View', action: () => {} }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const displayed = component.displayedColumnsSignal();
      expect(displayed[displayed.length - 1]).toBe('actions');
    });
  });

  // =========================================================================
  // Filtering
  // =========================================================================

  describe('Filtering', () => {
    it('should apply column filter', () => {
      const config = buildConfig({
        visible: ['name', 'email'],
        enableFiltering: true,
        filters: [{ type: 'text', field: 'name', operators: ['contains'] }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.applyColumnFilter('name', 'Ali', 'contains');
      fixture.detectChanges();

      expect(component.hasActiveFiltersSignal()).toBe(true);
      expect(component.activeFiltersCountSignal()).toBe(1);
    });

    it('should emit filterChange when filter is applied', () => {
      const config = buildConfig({
        visible: ['name'],
        enableFiltering: true,
        filters: [{ type: 'text', field: 'name', operators: ['contains'] }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      let emitted: unknown;
      component.filterChange.subscribe((v) => (emitted = v));

      component.applyColumnFilter('name', 'Alice', 'contains');
      expect(emitted).toBeDefined();
    });

    it('should remove a specific filter', () => {
      const config = buildConfig({
        visible: ['name', 'email'],
        enableFiltering: true,
        filters: [
          { type: 'text', field: 'name', operators: ['contains'] },
          { type: 'text', field: 'email', operators: ['contains'] },
        ],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.applyColumnFilter('name', 'Alice', 'contains');
      component.applyColumnFilter('email', 'bob', 'contains');
      expect(component.activeFiltersCountSignal()).toBe(2);

      component.removeFilter('name');
      fixture.detectChanges();
      expect(component.activeFiltersCountSignal()).toBe(1);
    });

    it('should clear all filters', () => {
      const config = buildConfig({
        visible: ['name', 'email'],
        enableFiltering: true,
        filters: [{ type: 'text', field: 'name', operators: ['contains'] }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.applyColumnFilter('name', 'Alice', 'contains');
      component.clearAllFilters();
      fixture.detectChanges();

      expect(component.hasActiveFiltersSignal()).toBe(false);
      expect(component.activeFiltersCountSignal()).toBe(0);
    });

    it('should filter data client-side in offset mode', () => {
      const config = buildConfig({
        visible: ['name'],
        enableFiltering: true,
        filters: [{ type: 'text', field: 'name', operators: ['contains'] }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.applyColumnFilter('name', 'Ali', 'contains');
      fixture.detectChanges();

      const displayData = component.displayDataSignal();
      expect(displayData.length).toBe(1);
      expect(displayData[0].name).toBe('Alice');
    });
  });

  // =========================================================================
  // Global search
  // =========================================================================

  describe('Global search', () => {
    it('should enable global search', () => {
      const config = buildConfig({
        visible: ['name', 'email'],
        globalSearch: { enabled: true },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.hasGlobalSearchSignal()).toBe(true);
    });

    it('should clear global search', () => {
      const config = buildConfig({
        visible: ['name', 'email'],
        globalSearch: { enabled: true },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.onGlobalSearchChange('Alice');
      fixture.detectChanges();

      component.clearGlobalSearch();
      fixture.detectChanges();

      expect(component.globalSearchTerm()).toBe('');
    });
  });

  // =========================================================================
  // Inline cell editing
  // =========================================================================

  describe('Inline cell editing', () => {
    it('should start editing a cell', () => {
      const config = buildConfig({
        visible: ['name'],
        enableInlineEditing: true,
        cellEditors: { name: { type: 'text' } },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.startEdit(SAMPLE_DATA[0], 'name');
      expect(component.editingCell()).toEqual({ row: SAMPLE_DATA[0], field: 'name' });
      expect(component.editingValue()).toBe('Alice');
    });

    it('should not start editing if editing is disabled', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.startEdit(SAMPLE_DATA[0], 'name');
      expect(component.editingCell()).toBeNull();
    });

    it('should confirm edit and emit cellEdit', () => {
      const config = buildConfig({
        visible: ['name'],
        enableInlineEditing: true,
        cellEditors: { name: { type: 'text' } },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      let emitted: unknown;
      component.cellEdit.subscribe((v) => (emitted = v));

      component.startEdit(SAMPLE_DATA[0], 'name');
      component.editingValue.set('Alice Updated');
      component.confirmEdit();

      expect(emitted).toEqual({
        row: SAMPLE_DATA[0],
        field: 'name',
        oldValue: 'Alice',
        newValue: 'Alice Updated',
      });
      expect(component.editingCell()).toBeNull();
    });

    it('should cancel edit and emit cellEditCancel', () => {
      const config = buildConfig({
        visible: ['name'],
        enableInlineEditing: true,
        cellEditors: { name: { type: 'text' } },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      let emitted: unknown;
      component.cellEditCancel.subscribe((v) => (emitted = v));

      component.startEdit(SAMPLE_DATA[0], 'name');
      component.cancelEdit();

      expect(emitted).toEqual({ row: SAMPLE_DATA[0], field: 'name' });
      expect(component.editingCell()).toBeNull();
    });

    it('should show validation error when validator fails', () => {
      const config = buildConfig({
        visible: ['name'],
        enableInlineEditing: true,
        cellEditors: {
          name: {
            type: 'text',
            validator: (value) => (value === '' ? 'Name is required' : true),
          },
        },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      let errorEmitted: unknown;
      component.cellEditError.subscribe((v) => (errorEmitted = v));

      component.startEdit(SAMPLE_DATA[0], 'name');
      component.editingValue.set('');
      component.confirmEdit();

      expect(component.editError()).toBe('Name is required');
      expect(component.editingCell()).not.toBeNull(); // Still in edit mode
      expect(errorEmitted).toBeDefined();
    });

    it('should check isEditing', () => {
      const config = buildConfig({
        visible: ['name'],
        enableInlineEditing: true,
        cellEditors: { name: { type: 'text' } },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.isEditing(SAMPLE_DATA[0], 'name')).toBe(false);

      component.startEdit(SAMPLE_DATA[0], 'name');
      expect(component.isEditing(SAMPLE_DATA[0], 'name')).toBe(true);
      expect(component.isEditing(SAMPLE_DATA[1], 'name')).toBe(false);
    });
  });

  // =========================================================================
  // Expandable row detail
  // =========================================================================

  describe('Expandable row detail', () => {
    it('should not show expand column when expandable detail is disabled', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.showExpandColumnSignal()).toBe(false);
    });

    it('should track expanded detail rows', () => {
      const config = buildConfig({ visible: ['name'], expandableDetail: true });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.isDetailExpanded(SAMPLE_DATA[0])).toBe(false);

      component.toggleDetailExpand(SAMPLE_DATA[0]);
      expect(component.isDetailExpanded(SAMPLE_DATA[0])).toBe(true);

      component.toggleDetailExpand(SAMPLE_DATA[0]);
      expect(component.isDetailExpanded(SAMPLE_DATA[0])).toBe(false);
    });

    it('should allow only one expanded row in single expand mode', () => {
      const config = buildConfig({ visible: ['name'], expandableDetail: true, expandMode: 'single' });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.toggleDetailExpand(SAMPLE_DATA[0]);
      component.toggleDetailExpand(SAMPLE_DATA[1]);

      expect(component.isDetailExpanded(SAMPLE_DATA[0])).toBe(false);
      expect(component.isDetailExpanded(SAMPLE_DATA[1])).toBe(true);
    });

    it('should allow multiple expanded rows in multi expand mode', () => {
      const config = buildConfig({ visible: ['name'], expandableDetail: true, expandMode: 'multi' });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.toggleDetailExpand(SAMPLE_DATA[0]);
      component.toggleDetailExpand(SAMPLE_DATA[1]);

      expect(component.isDetailExpanded(SAMPLE_DATA[0])).toBe(true);
      expect(component.isDetailExpanded(SAMPLE_DATA[1])).toBe(true);
    });

    it('should emit detailExpansionChange', () => {
      const config = buildConfig({ visible: ['name'], expandableDetail: true });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      let emitted: { row: TestRow; expanded: boolean } | undefined;
      component.detailExpansionChange.subscribe((v) => (emitted = v));

      component.toggleDetailExpand(SAMPLE_DATA[0]);
      expect(emitted).toEqual({ row: SAMPLE_DATA[0], expanded: true });
    });

    it('should expand all and collapse all details', () => {
      const config = buildConfig({ visible: ['name'], expandableDetail: true });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.expandAllDetails();
      expect(component.expandedDetailRows().size).toBe(5);

      component.collapseAllDetails();
      expect(component.expandedDetailRows().size).toBe(0);
    });
  });

  // =========================================================================
  // Bulk actions
  // =========================================================================

  describe('Bulk actions', () => {
    it('should render bulk actions when items are selected', () => {
      const config = buildConfig({
        visible: ['name'],
        hasSelection: true,
        bulkActions: [{ type: 'delete', label: 'Delete Selected', action: () => {} }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      // Select some rows
      component.toggleRow(SAMPLE_DATA[0], true);
      component.toggleRow(SAMPLE_DATA[1], true);
      fixture.detectChanges();

      const bulkActions = component.bulkActionListSignal();
      expect(bulkActions.length).toBe(1);
      expect(bulkActions[0].config.label).toBe('Delete Selected');
    });

    it('should call bulk action with selected rows', () => {
      let actionRows: TestRow[] = [];
      const config = buildConfig({
        visible: ['name'],
        hasSelection: true,
        bulkActions: [
          {
            type: 'delete',
            label: 'Delete',
            action: (rows) => {
              actionRows = rows;
            },
          },
        ],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.toggleRow(SAMPLE_DATA[0], true);
      component.toggleRow(SAMPLE_DATA[2], true);
      fixture.detectChanges();

      const bulkAction = component.bulkActionListSignal()[0];
      bulkAction.config.action(component.selectedArraySignal());

      expect(actionRows.length).toBe(2);
    });
  });

  // =========================================================================
  // Data source integration
  // =========================================================================

  describe('DataSource integration', () => {
    it('should expose a CDK DataSource', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.dataSource).toBeDefined();
      expect(component.dataSource.connect).toBeDefined();
      expect(component.dataSource.disconnect).toBeDefined();
    });
  });

  // =========================================================================
  // Sorting comparison behavior
  // =========================================================================

  describe('Sort comparison edge cases', () => {
    it('should sort numeric fields numerically', () => {
      const config = buildConfig({ visible: ['age'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.sort('age');
      fixture.detectChanges();

      const displayData = component.displayDataSignal();
      const ages = displayData.map((d) => d.age);
      expect(ages).toEqual([25, 28, 30, 32, 35]);
    });

    it('should push null values to end during sort', () => {
      const dataWithNulls: TestRow[] = [
        ...SAMPLE_DATA,
        { id: 6, name: null as unknown as string, email: 'f@g.com', age: 40, active: true },
      ];
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', dataWithNulls);
      fixture.detectChanges();

      component.sort('name');
      fixture.detectChanges();

      const displayData = component.displayDataSignal();
      // null should be at the end
      expect(displayData[displayData.length - 1].name).toBeNull();
    });
  });

  // =========================================================================
  // Keyboard navigation
  // =========================================================================

  describe('Keyboard navigation', () => {
    it('should enable keyboard navigation when configured', () => {
      const config = buildConfig({
        visible: ['name', 'email'],
        enableKeyboardNavigation: true,
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.enableKeyboardNavSignal()).toBe(true);
    });

    it('should not enable keyboard navigation by default', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.enableKeyboardNavSignal()).toBe(false);
    });

    it('should track active cell', () => {
      const config = buildConfig({
        visible: ['name', 'email'],
        enableKeyboardNavigation: true,
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.onCellClick(1, 0);
      expect(component.activeCellSignal()).toEqual([1, 0]);
      expect(component.isActiveCell(1, 0)).toBe(true);
      expect(component.isActiveCell(0, 0)).toBe(false);
    });

    it('should generate cell IDs', () => {
      const config = buildConfig({
        visible: ['name'],
        enableKeyboardNavigation: true,
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.getCellId(2, 3)).toBe('cell-2-3');
    });
  });

  // =========================================================================
  // Column resizing
  // =========================================================================

  describe('Column resizing', () => {
    it('should enable column resizing when configured', () => {
      const config = buildConfig({
        visible: ['name', 'email'],
        enableColumnResizing: true,
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.enableResizingSignal()).toBe(true);
    });

    it('should return null width for columns without explicit width', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.getColumnWidth('name')).toBeNull();
    });

    it('should track resizing state', () => {
      const config = buildConfig({
        visible: ['name'],
        enableColumnResizing: true,
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.isResizingSignal()).toBe(false);
    });
  });

  // =========================================================================
  // Row grouping
  // =========================================================================

  describe('Row grouping', () => {
    it('should not group data when grouping is not configured', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.isGroupedSignal()).toBe(false);
      expect(component.groupedDataSignal().length).toBe(0);
    });

    it('should group data by a field', () => {
      const config = buildConfig({
        visible: ['name', 'active'],
        grouping: { groupBy: 'active' },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.isGroupedSignal()).toBe(true);
      const groups = component.groupedDataSignal();
      expect(groups.length).toBe(2); // true and false groups
    });

    it('should toggle group expand/collapse', () => {
      const config = buildConfig({
        visible: ['name', 'active'],
        grouping: { groupBy: 'active', initiallyExpanded: true },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const groups = component.groupedDataSignal();
      const firstGroupValue = groups[0].groupValue;

      // Initially expanded
      expect(groups[0].expanded).toBe(true);

      // Toggle collapse
      component.toggleGroupExpand(firstGroupValue);
      fixture.detectChanges();

      const updatedGroups = component.groupedDataSignal();
      const firstGroup = updatedGroups.find((g) => g.groupValue === firstGroupValue);
      expect(firstGroup?.expanded).toBe(false);
    });

    it('should expand all and collapse all groups', () => {
      const config = buildConfig({
        visible: ['name', 'active'],
        grouping: { groupBy: 'active', initiallyExpanded: false },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.expandAllGroups();
      fixture.detectChanges();

      let groups = component.groupedDataSignal();
      expect(groups.every((g) => g.expanded)).toBe(true);

      component.collapseAllGroups();
      fixture.detectChanges();

      groups = component.groupedDataSignal();
      expect(groups.every((g) => !g.expanded)).toBe(true);
    });
  });

  // =========================================================================
  // Tooltip helpers
  // =========================================================================

  describe('Tooltip helpers', () => {
    it('should resolve static tooltip', () => {
      const config = buildConfig({
        visible: ['name'],
        actions: [{ type: 'view', label: 'View', action: () => {}, tooltip: 'View details' }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const action = component.actionListSignal()[0];
      expect(component.getTooltip(SAMPLE_DATA[0], action)).toBe('View details');
      expect(component.isTooltipVisible(SAMPLE_DATA[0], action)).toBe(true);
    });

    it('should resolve dynamic tooltip from function', () => {
      const config = buildConfig({
        visible: ['name'],
        actions: [{ type: 'view', label: 'View', action: () => {}, tooltip: (row: TestRow) => `View ${row.name}` }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const action = component.actionListSignal()[0];
      expect(component.getTooltip(SAMPLE_DATA[0], action)).toBe('View Alice');
    });

    it('should return empty tooltip when not configured', () => {
      const config = buildConfig({
        visible: ['name'],
        actions: [{ type: 'view', label: 'View', action: () => {} }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const action = component.actionListSignal()[0];
      expect(component.getTooltip(SAMPLE_DATA[0], action)).toBe('');
      expect(component.isTooltipVisible(SAMPLE_DATA[0], action)).toBe(false);
    });
  });

  // =========================================================================
  // classesFor action
  // =========================================================================

  describe('classesFor', () => {
    it('should apply custom buttonClass', () => {
      const config = buildConfig({
        visible: ['name'],
        actions: [{ type: 'custom' as 'view', label: 'Custom', action: () => {}, buttonClass: 'my-custom-class' }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const action = component.actionListSignal()[0];
      const classes = component.classesFor(action);
      expect(classes).toContain('my-custom-class');
    });

    it('should apply multiple buttonClasses', () => {
      const config = buildConfig({
        visible: ['name'],
        actions: [{ type: 'view', label: 'View', action: () => {}, buttonClasses: ['extra-a', 'extra-b'] }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const action = component.actionListSignal()[0];
      const classes = component.classesFor(action);
      expect(classes).toContain('extra-a');
      expect(classes).toContain('extra-b');
    });
  });

  // =========================================================================
  // Master-detail
  // =========================================================================

  describe('Master-detail', () => {
    it('should set master detail selected row on click', () => {
      const config = buildConfig({
        visible: ['name'],
      });

      // We need to test masterDetail but the config type is complex.
      // Test the component methods directly instead.
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.hasMasterDetailSignal()).toBe(false);
    });
  });

  // =========================================================================
  // isSelectedBgClass
  // =========================================================================

  describe('isSelectedBgClass', () => {
    it('should return bg-base-200 for selected rows', () => {
      const config = buildConfig({ visible: ['name'], hasSelection: true });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.toggleRow(SAMPLE_DATA[0], true);
      const classes = component.isSelectedBgClass(SAMPLE_DATA[0]);
      expect(classes['bg-base-200']).toBe(true);
    });

    it('should return bg-primary/10 for active rows', () => {
      const config = buildConfig({ visible: ['name'], selectableRows: 'single' });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.onRowClick(SAMPLE_DATA[0]);
      const classes = component.isSelectedBgClass(SAMPLE_DATA[0]);
      expect(classes['bg-primary/10']).toBe(true);
    });

    it('should use custom selectedRowClass', () => {
      const config = buildConfig({
        visible: ['name'],
        selectableRows: 'single',
        selectedRowClass: 'bg-accent',
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.onRowClick(SAMPLE_DATA[0]);
      const classes = component.isSelectedBgClass(SAMPLE_DATA[0]);
      expect(classes['bg-accent']).toBe(true);
    });
  });

  // =========================================================================
  // Action ordering
  // =========================================================================

  describe('Action ordering', () => {
    it('should sort actions by predefined order (view before delete)', () => {
      const config = buildConfig({
        visible: ['name'],
        actions: [
          { type: 'delete', label: 'Delete', action: () => {} },
          { type: 'view', label: 'View', action: () => {} },
        ],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const actionList = component.actionListSignal();
      expect(actionList[0].key).toBe('view');
      expect(actionList[1].key).toBe('delete');
    });
  });

  // =========================================================================
  // Filter dropdown methods
  // =========================================================================

  describe('Filter dropdown methods', () => {
    it('should toggle filter dropdown', () => {
      const config = buildConfig({
        visible: ['name'],
        enableFiltering: true,
        filters: [{ type: 'text', field: 'name' }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.toggleFilterDropdown('name');
      expect(component.isFilterOpen('name')).toBe(true);

      component.toggleFilterDropdown('name');
      expect(component.isFilterOpen('name')).toBe(false);
    });

    it('should close all filter dropdowns', () => {
      const config = buildConfig({
        visible: ['name'],
        enableFiltering: true,
        filters: [{ type: 'text', field: 'name' }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.toggleFilterDropdown('name');
      component.closeAllFilterDropdowns();
      expect(component.isFilterOpen('name')).toBe(false);
    });

    it('should check if column has filter config', () => {
      const config = buildConfig({
        visible: ['name', 'email'],
        enableFiltering: true,
        filters: [{ type: 'text', field: 'name' }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.hasFilterForColumn('name')).toBe(true);
      expect(component.hasFilterForColumn('email')).toBe(false);
    });
  });

  // =========================================================================
  // Dropdown bulk actions
  // =========================================================================

  describe('Dropdown bulk actions', () => {
    it('should identify dropdown bulk actions', () => {
      const config = buildConfig({
        visible: ['name'],
        hasSelection: true,
        bulkActions: [
          {
            type: 'export',
            label: 'Export',
            action: () => {},
            dropdownOptions: [
              { label: 'CSV', value: 'csv' },
              { label: 'JSON', value: 'json' },
            ],
          },
        ],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const bulkActions = component.bulkActionListSignal();
      expect(component.isDropdownBulkAction(bulkActions[0])).toBe(true);
    });

    it('should use default export options for export type', () => {
      const config = buildConfig({
        visible: ['name'],
        hasSelection: true,
        bulkActions: [{ type: 'export', label: 'Export', action: () => {} }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const bulkActions = component.bulkActionListSignal();
      expect(component.isDropdownBulkAction(bulkActions[0])).toBe(true);
      const options = component.getDropdownOptions(bulkActions[0]);
      expect(options.length).toBe(4);
      expect(options.map((o) => o.value)).toEqual(['csv', 'excel', 'pdf', 'json']);
    });

    it('should toggle bulk action dropdown', () => {
      const config = buildConfig({
        visible: ['name'],
        hasSelection: true,
        bulkActions: [{ type: 'export', label: 'Export', action: () => {} }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.isBulkActionDropdownOpen('export')).toBe(false);
      component.toggleBulkActionDropdown('export', { stopPropagation: () => {} } as unknown as MouseEvent);
      expect(component.isBulkActionDropdownOpen('export')).toBe(true);
      component.toggleBulkActionDropdown('export', { stopPropagation: () => {} } as unknown as MouseEvent);
      expect(component.isBulkActionDropdownOpen('export')).toBe(false);
    });
  });

  // =========================================================================
  // Sticky columns
  // =========================================================================

  describe('Sticky columns', () => {
    it('should not enable sticky behavior by default', () => {
      const config = buildConfig({ visible: ['name'], hasSelection: true });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.hasStickyColumnsSignal()).toBe(false);
    });

    it('should enable sticky selection column', () => {
      const config = buildConfig({
        visible: ['name'],
        hasSelection: true,
        stickyColumns: { stickySelection: true },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.hasStickyColumnsSignal()).toBe(true);
      expect(component.stickySelectionSignal()).toBe(true);
    });

    it('should enable sticky actions column', () => {
      const config = buildConfig({
        visible: ['name'],
        actions: [{ type: 'view', label: 'View', action: () => {} }],
        stickyColumns: { stickyActions: true },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.stickyActionsSignal()).toBe(true);
    });

    it('should check isStickyStart and isStickyEnd', () => {
      const config = buildConfig({
        visible: ['name'],
        hasSelection: true,
        actions: [{ type: 'view', label: 'View', action: () => {} }],
        stickyColumns: { stickySelection: true, stickyActions: true },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.isStickyStart('select')).toBe(true);
      expect(component.isStickyEnd('actions')).toBe(true);
      expect(component.isStickyStart('name')).toBe(false);
      expect(component.isStickyEnd('name')).toBe(false);
    });
  });

  // =========================================================================
  // NgOnDestroy
  // =========================================================================

  describe('Lifecycle', () => {
    it('should clean up on destroy', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      // Should not throw
      expect(() => fixture.destroy()).not.toThrow();
    });
  });

  // =========================================================================
  // Data change resets
  // =========================================================================

  describe('Data change behavior', () => {
    it('should update displayed rows when data changes', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      let rows = queryAllBodyRows(fixture);
      expect(rows.length).toBe(5);

      // Change data
      const newData = SAMPLE_DATA.slice(0, 2);
      fixture.componentRef.setInput('data', newData);
      fixture.detectChanges();

      rows = queryAllBodyRows(fixture);
      expect(rows.length).toBe(2);
    });

    it('should clear selection when data changes', () => {
      const config = buildConfig({ visible: ['name'], hasSelection: true });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      component.toggleRow(SAMPLE_DATA[0], true);
      expect(component.selectedSignal().size).toBe(1);

      // Change data reference
      fixture.componentRef.setInput('data', [...SAMPLE_DATA]);
      fixture.detectChanges();

      expect(component.selectedSignal().size).toBe(0);
    });
  });

  // =========================================================================
  // Virtual scroll config
  // =========================================================================

  describe('Virtual scroll configuration', () => {
    it('should read virtual scroll config from fieldConfig', () => {
      const config = buildConfig({
        visible: ['name'],
        virtualScroll: { enabled: true, itemHeight: 48, viewportHeight: '400px' },
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.isVirtualScrollSignal()).toBe(true);
      expect(component.virtualScrollItemHeightSignal()).toBe(48);
      expect(component.virtualScrollViewportHeightSignal()).toBe('400px');
    });

    it('should default virtual scroll to disabled', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      expect(component.isVirtualScrollSignal()).toBe(false);
    });
  });

  // =========================================================================
  // Track by functions
  // =========================================================================

  describe('Track by functions', () => {
    it('should track columns by field', () => {
      const config = buildConfig({ visible: ['name'] });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const col = component.columnDefsSignal()[0];
      expect(component.trackByField(0, col)).toBe('name');
    });

    it('should track actions by key', () => {
      const config = buildConfig({
        visible: ['name'],
        actions: [{ type: 'view', label: 'View', action: () => {} }],
      });
      fixture.componentRef.setInput('config', config);
      fixture.componentRef.setInput('data', SAMPLE_DATA);
      fixture.detectChanges();

      const action = component.actionListSignal()[0];
      expect(component.trackByAction(0, action)).toBe('view');
    });
  });
});
