import { Component, inject, signal } from '@angular/core';
import { TableComponent, createTable, ToastService, LucideIconComponent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  department: string;
  salary: number;
  joinDate: Date;
}

type TableTab = 'basic' | 'full';

@Component({
  selector: 'app-table-demo',
  imports: [TableComponent, LucideIconComponent, DocSectionComponent, ApiTableComponent, CodeBlockComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Data Table</h1>
        <p class="text-base-content/70 mt-2">Feature-rich data table with sorting, filtering, and pagination</p>
        <div class="mt-2">
          <code class="badge badge-outline text-xs">import {{ '{' }} TableComponent, createTable {{ '}' }} from '&#64;hakistack/ng-daisyui'</code>
        </div>
      </div>

      <!-- Page Tabs -->
      <div role="tablist" class="tabs tabs-border">
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'examples'" (click)="pageTab.set('examples')">Examples</button>
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'api'" (click)="pageTab.set('api')">API</button>
      </div>

      @if (pageTab() === 'examples') {
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-box w-fit">
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'basic'" (click)="activeTab.set('basic')">Basic</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'full'" (click)="activeTab.set('full')">Full Featured</button>
        </div>

        @if (activeTab() === 'basic') {
          <app-doc-section title="Basic Table" description="Simple table with sorting" [codeExample]="basicCode">
            <app-table [data]="users()" [config]="basicConfig" (sortChange)="onSort($event)" />
          </app-doc-section>
        }

        @if (activeTab() === 'full') {
          <app-doc-section title="Full Featured Table" description="Selection, actions, filters, global search, pagination" [codeExample]="fullCode">
            <app-table
              [data]="users()"
              [config]="fullConfig"
              [paginationOptions]="paginationOptions"
              (selectionChange)="onSelection($event)"
              (sortChange)="onSort($event)"
              (filterChange)="onFilter($event)"
              (globalSearchChange)="onSearch($event)"
              (pageChange)="onPageChange($event)"
            />
          </app-doc-section>

          @if (selectedUsers().length > 0) {
            <div class="alert alert-info">
              <app-lucide-icon name="Info" [size]="20" />
              <span>{{ selectedUsers().length }} user(s) selected</span>
            </div>
          }
        }
      }

      @if (pageTab() === 'api') {
        <div class="space-y-6">
          <app-api-table title="Inputs" [entries]="inputDocs" />
          <app-api-table title="Outputs" [entries]="outputDocs" />
          <app-api-table title="Methods" [entries]="methodDocs" />

          <div>
            <h3 class="text-lg font-semibold mb-2">Builder: createTable()</h3>
            <app-code-block [code]="builderCode" />
          </div>
        </div>
      }
    </div>
  `,
})
export class TableDemoComponent {
  private toast = inject(ToastService);
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<TableTab>('basic');

  // Sample data
  users = signal<User[]>([
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      status: 'active',
      department: 'Engineering',
      salary: 120000,
      joinDate: new Date('2022-01-15'),
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'editor',
      status: 'active',
      department: 'Marketing',
      salary: 95000,
      joinDate: new Date('2022-03-20'),
    },
    {
      id: 3,
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'viewer',
      status: 'inactive',
      department: 'Sales',
      salary: 75000,
      joinDate: new Date('2021-11-10'),
    },
    {
      id: 4,
      name: 'Alice Brown',
      email: 'alice@example.com',
      role: 'editor',
      status: 'active',
      department: 'Engineering',
      salary: 110000,
      joinDate: new Date('2023-02-01'),
    },
    {
      id: 5,
      name: 'Charlie Wilson',
      email: 'charlie@example.com',
      role: 'admin',
      status: 'pending',
      department: 'HR',
      salary: 130000,
      joinDate: new Date('2020-06-15'),
    },
    {
      id: 6,
      name: 'Diana Prince',
      email: 'diana@example.com',
      role: 'viewer',
      status: 'active',
      department: 'Finance',
      salary: 85000,
      joinDate: new Date('2023-05-20'),
    },
    {
      id: 7,
      name: 'Edward Stone',
      email: 'edward@example.com',
      role: 'editor',
      status: 'active',
      department: 'Engineering',
      salary: 105000,
      joinDate: new Date('2022-08-10'),
    },
    {
      id: 8,
      name: 'Fiona Green',
      email: 'fiona@example.com',
      role: 'viewer',
      status: 'inactive',
      department: 'Marketing',
      salary: 70000,
      joinDate: new Date('2021-04-05'),
    },
  ]);

  selectedUsers = signal<User[]>([]);

  basicConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'status'],
    headers: {
      id: 'ID',
      name: 'Full Name',
      email: 'Email Address',
      role: 'Role',
      status: 'Status',
    },
    formatters: {
      role: (value) => String(value).charAt(0).toUpperCase() + String(value).slice(1),
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
  });

  fullConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status', 'joinDate'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      salary: 'Salary',
      status: 'Status',
      joinDate: 'Join Date',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
      joinDate: (value) => new Date(value as Date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
      role: (value) => {
        return `<span class="capitalize">${value}</span>`;
      },
    },
    hasSelection: true,
    hasActions: true,
    actions: [
      {
        type: 'view',
        label: 'View',
        icon: 'Eye',
        action: (row) => this.toast.info(`Viewing ${row.name}`),
      },
      {
        type: 'edit',
        label: 'Edit',
        icon: 'Pencil',
        action: (row) => this.toast.info(`Editing ${row.name}`),
      },
      {
        type: 'delete',
        label: 'Delete',
        icon: 'Trash2',
        action: (row) => this.toast.warning(`Delete ${row.name}?`),
      },
    ],
    bulkActions: [
      {
        type: 'delete',
        label: 'Delete Selected',
        icon: 'Trash2',
        action: (rows) => this.toast.warning(`Delete ${rows.length} users?`),
      },
      {
        type: 'export',
        label: 'Export',
        icon: 'Download',
        action: (rows, option) => this.toast.success(`Exporting ${rows.length} users as ${option?.label ?? 'file'}`),
      },
    ],
    filters: [
      {
        field: 'role',
        type: 'select',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Editor', value: 'editor' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
      {
        field: 'status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
          { label: 'Pending', value: 'pending' },
        ],
      },
      {
        field: 'department',
        type: 'select',
        options: [
          { label: 'Engineering', value: 'Engineering' },
          { label: 'Marketing', value: 'Marketing' },
          { label: 'Sales', value: 'Sales' },
          { label: 'HR', value: 'HR' },
          { label: 'Finance', value: 'Finance' },
        ],
      },
    ],
    globalSearch: {
      enabled: true,
      mode: 'fuzzy',
      placeholder: 'Search users...',
      debounceTime: 300,
    },
    columnVisibility: {
      enabled: true,
      alwaysVisible: ['name'],
      defaultVisible: ['id', 'name', 'email', 'role', 'status'],
    },
  });

  paginationOptions = {
    mode: 'offset' as const,
    pageSize: 5,
    pageSizeOptions: [5, 10, 25],
    totalItems: 8,
  };

  onSelection(users: readonly User[]) {
    this.selectedUsers.set([...users]);
  }

  onSort(event: unknown) {
    console.log('Sort:', event);
  }

  onFilter(event: unknown) {
    console.log('Filter:', event);
  }

  onSearch(event: unknown) {
    console.log('Search:', event);
  }

  onPageChange(event: unknown) {
    console.log('Page:', event);
  }

  // --- Code examples ---
  basicCode = `// TypeScript
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'status'],
  headers: { id: 'ID', name: 'Full Name' },
  formatters: {
    status: (v) => \`<span class="badge">\${v}</span>\`,
  },
});

// Template
<app-table [data]="users()" [config]="config" />`;

  fullCode = `// TypeScript
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'salary', 'status'],
  hasSelection: true,
  hasActions: true,
  actions: [
    { type: 'view', label: 'View', icon: 'Eye', action: (row) => {} },
  ],
  bulkActions: [
    { type: 'delete', label: 'Delete', icon: 'Trash2', action: (rows) => {} },
  ],
  filters: [
    { field: 'role', type: 'select', options: [...] },
  ],
  globalSearch: { enabled: true, mode: 'fuzzy' },
  columnVisibility: { enabled: true },
});

// Template
<app-table
  [data]="users()"
  [config]="config"
  [paginationOptions]="{ mode: 'offset', pageSize: 10 }"
  (selectionChange)="onSelection($event)"
  (sortChange)="onSort($event)"
/>`;

  builderCode = `import { createTable } from '@hakistack/ng-daisyui';

const config = createTable<User>({
  visible: ['id', 'name', 'email', 'status'],
  headers: { id: 'ID', name: 'Full Name' },
  formatters: {
    status: (value) => \`<span class="badge">\${value}</span>\`,
  },
  hasSelection: true,
  hasActions: true,
  actions: [
    { type: 'edit', label: 'Edit', icon: 'Pencil', action: (row) => {} },
  ],
  bulkActions: [
    { type: 'delete', label: 'Delete', icon: 'Trash2', action: (rows) => {} },
  ],
  filters: [
    { field: 'status', type: 'select', options: [{ label: 'Active', value: 'active' }] },
  ],
  globalSearch: { enabled: true, mode: 'fuzzy', debounceTime: 300 },
  columnVisibility: { enabled: true, alwaysVisible: ['name'] },
});`;

  // --- API docs ---
  inputDocs: ApiDocEntry[] = [
    { name: 'data', type: 'readonly T[] | null', default: 'null', description: 'Array of data rows to display' },
    { name: 'config', type: 'FieldConfiguration<T> | null', default: 'null', description: 'Table configuration from createTable()' },
    { name: 'paginationOptions', type: 'PaginationOptions | null', default: 'null', description: 'Pagination settings (mode, pageSize, totalItems)' },
    { name: 'showFirstLastButtons', type: 'boolean', default: 'true', description: 'Show first/last page navigation buttons' },
    { name: 'hidePageSize', type: 'boolean', default: 'false', description: 'Hide page size selector' },
    { name: 'showPageSizeOptions', type: 'boolean', default: 'true', description: 'Show page size dropdown options' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable all table interactions' },
  ];

  outputDocs: ApiDocEntry[] = [
    { name: 'selectionChange', type: 'readonly T[]', description: 'Emitted when row selection changes' },
    { name: 'pageChange', type: 'PageSizeChange', description: 'Emitted on page change (offset mode)' },
    { name: 'cursorChange', type: 'CursorPageChange', description: 'Emitted on cursor pagination change' },
    { name: 'sortChange', type: 'SortChange', description: 'Emitted when sort column/direction changes' },
    { name: 'filterChange', type: 'FilterChange<T>', description: 'Emitted when column filters change' },
    { name: 'globalSearchChange', type: 'GlobalSearchChange', description: 'Emitted when global search term changes' },
    { name: 'expansionChange', type: '{ row: T; expanded: boolean }', description: 'Emitted when tree table row is expanded/collapsed' },
  ];

  methodDocs: ApiDocEntry[] = [
    { name: 'firstPage()', type: 'void', description: 'Navigate to first page' },
    { name: 'previousPage()', type: 'void', description: 'Navigate to previous page' },
    { name: 'nextPage()', type: 'void', description: 'Navigate to next page' },
    { name: 'lastPage()', type: 'void', description: 'Navigate to last page' },
    { name: 'gotoPage(n)', type: 'void', description: 'Go to specific page (1-based)' },
    { name: 'clearSelection()', type: 'void', description: 'Clear all selected rows' },
    { name: 'sort(field)', type: 'void', description: 'Toggle sorting on a field' },
    { name: 'applyColumnFilter(field, value, op)', type: 'void', description: 'Apply a column filter' },
    { name: 'clearAllFilters()', type: 'void', description: 'Clear all active filters' },
    { name: 'clearGlobalSearch()', type: 'void', description: 'Clear global search term' },
    { name: 'toggleColumnVisibility(field)', type: 'void', description: 'Toggle visibility of a column' },
    { name: 'resetColumnVisibility()', type: 'void', description: 'Reset columns to default visibility' },
  ];
}
