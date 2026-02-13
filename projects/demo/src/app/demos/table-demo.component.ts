import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableComponent, createTable, ToastService, LucideIconComponent, CellEditEvent, RowReorderEvent, ColumnReorderEvent } from '@hakistack/ng-daisyui';
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

interface OrderItem {
  itemId: number;
  sku: string;
  description: string;
  qty: number;
  price: number;
}

interface Order {
  orderId: number;
  product: string;
  quantity: number;
  unitPrice: number;
  orderDate: string;
  items: OrderItem[];
}

interface Employee {
  id: number;
  name: string;
  title: string;
  hireDate: string;
  orders: Order[];
}

type TableTab = 'basic' | 'full' | 'sticky' | 'resizable' | 'virtualScroll' | 'editable' | 'footer' | 'expandable' | 'grouped' | 'reorderable' | 'keyboard' | 'hierarchy';

@Component({
  selector: 'app-table-demo',
  imports: [CommonModule, TableComponent, LucideIconComponent, DocSectionComponent, ApiTableComponent, CodeBlockComponent],
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
        <div role="tablist" class="tabs tabs-box w-fit flex-wrap">
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'basic'" (click)="activeTab.set('basic')">Basic</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'full'" (click)="activeTab.set('full')">Full Featured</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'sticky'" (click)="activeTab.set('sticky')">Sticky</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'resizable'" (click)="activeTab.set('resizable')">Resizable</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'virtualScroll'" (click)="activeTab.set('virtualScroll')">Virtual Scroll</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'editable'" (click)="activeTab.set('editable')">Editable</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'footer'" (click)="activeTab.set('footer')">Footer</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'expandable'" (click)="activeTab.set('expandable')">Expandable</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'grouped'" (click)="activeTab.set('grouped')">Grouped</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'reorderable'" (click)="activeTab.set('reorderable')">Reorderable</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'keyboard'" (click)="activeTab.set('keyboard')">Keyboard</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'hierarchy'" (click)="activeTab.set('hierarchy')">Hierarchy</button>
        </div>

        @if (activeTab() === 'basic') {
          <app-doc-section title="Basic Table" description="Simple table with sorting" [codeExample]="basicCode">
            <hk-table [data]="users()" [config]="basicConfig" (sortChange)="onSort($event)" />
          </app-doc-section>
        }

        @if (activeTab() === 'full') {
          <app-doc-section title="Full Featured Table" description="Selection, actions, filters, global search, pagination" [codeExample]="fullCode">
            <hk-table
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
              <hk-lucide-icon name="Info" [size]="20" />
              <span>{{ selectedUsers().length }} user(s) selected</span>
            </div>
          }
        }

        @if (activeTab() === 'sticky') {
          <app-doc-section title="Sticky Columns" description="Pin columns to start/end during horizontal scroll. Selection and actions columns auto-stick." [codeExample]="stickyCode">
            <div style="max-width: 600px;">
              <hk-table [data]="users()" [config]="stickyConfig" />
            </div>
          </app-doc-section>
        }

        @if (activeTab() === 'resizable') {
          <app-doc-section title="Resizable Columns" description="Drag column borders to resize. Supports min/max width constraints." [codeExample]="resizableCode">
            <hk-table
              [data]="users()"
              [config]="resizableConfig"
              (columnResize)="onColumnResize($event)"
            />
          </app-doc-section>
        }

        @if (activeTab() === 'virtualScroll') {
          <app-doc-section title="Virtual Scrolling" description="Efficiently render large datasets with CDK virtual scroll. Pagination is disabled." [codeExample]="virtualScrollCode">
            <hk-table [data]="virtualScrollUsers()" [config]="virtualScrollConfig" />
          </app-doc-section>
        }

        @if (activeTab() === 'editable') {
          <app-doc-section title="Inline Cell Editing" description="Double-click a cell to edit. Supports text, number, select, and toggle editors." [codeExample]="editableCode">
            <hk-table
              [data]="editableUsers()"
              [config]="editableConfig"
              (cellEdit)="onCellEdit($event)"
            />
          </app-doc-section>
        }

        @if (activeTab() === 'footer') {
          <app-doc-section title="Multi-Row Summary Footer" description="Display multiple footer rows with different aggregates per row (totals, averages, min/max)." [codeExample]="footerCode">
            <hk-table [data]="users()" [config]="footerConfig" />
          </app-doc-section>
        }

        @if (activeTab() === 'expandable') {
          <app-doc-section title="Expandable Row Detail" description="Click the chevron to expand a row and reveal additional detail content." [codeExample]="expandableCode">
            <hk-table [data]="users()" [config]="expandableConfig" (detailExpansionChange)="onDetailExpand($event)">
              <ng-template #rowDetail let-row>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <h4 class="font-semibold mb-2">Contact Information</h4>
                    <p class="text-sm">Email: {{ row.email }}</p>
                    <p class="text-sm">Department: {{ row.department }}</p>
                  </div>
                  <div>
                    <h4 class="font-semibold mb-2">Employment Details</h4>
                    <p class="text-sm">Role: {{ row.role }}</p>
                    <p class="text-sm">Status: {{ row.status }}</p>
                    <p class="text-sm">Salary: {{ row.salary | number:'1.0-0' }}</p>
                  </div>
                </div>
              </ng-template>
            </hk-table>
          </app-doc-section>
        }

        @if (activeTab() === 'grouped') {
          <app-doc-section title="Row Grouping" description="Group rows by a field with caption aggregates in headers and column-aligned multi-row group footers." [codeExample]="groupedCode">
            <hk-table [data]="users()" [config]="groupedConfig" (groupExpandChange)="onGroupExpand($event)" />
          </app-doc-section>
        }

        @if (activeTab() === 'reorderable') {
          <app-doc-section title="Reorderable Columns & Rows" description="Drag column headers to reorder columns. Drag row handles to reorder rows." [codeExample]="reorderableCode">
            <hk-table
              [data]="reorderableUsers()"
              [config]="reorderableConfig"
              (columnReorder)="onColumnReorder($event)"
              (rowReorder)="onRowReorder($event)"
            />
          </app-doc-section>
        }

        @if (activeTab() === 'keyboard') {
          <app-doc-section title="Keyboard Navigation" description="Use arrow keys to navigate cells. Enter to edit or expand. Space to toggle selection. Escape to clear focus." [codeExample]="keyboardCode">
            <hk-table
              [data]="editableUsers()"
              [config]="keyboardConfig"
              [paginationOptions]="keyboardPaginationOptions"
              (cellEdit)="onCellEdit($event)"
              (selectionChange)="onSelection($event)"
            />
          </app-doc-section>
        }

        @if (activeTab() === 'hierarchy') {
          <app-doc-section title="Hierarchy Grid" description="Expanding a parent row reveals a fully-featured nested child table with its own sorting and pagination. Multi-level nesting is supported." [codeExample]="hierarchyCode">
            <hk-table [data]="employees()" [config]="hierarchyConfig" />
          </app-doc-section>
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

  // --- Sticky Columns Config ---
  stickyConfig = createTable<User>({
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
    },
    hasSelection: true,
    hasActions: true,
    actions: [
      { type: 'view', label: 'View', icon: 'Eye', action: (row) => this.toast.info(`Viewing ${row.name}`) },
      { type: 'edit', label: 'Edit', icon: 'Pencil', action: (row) => this.toast.info(`Editing ${row.name}`) },
    ],
    stickyColumns: {
      stickySelection: true,
      stickyActions: true,
    },
  });

  // --- Resizable Columns Config ---
  resizableConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
    },
    enableColumnResizing: true,
    resizeMode: 'expand',
  });

  // --- Virtual Scroll Config ---
  virtualScrollUsers = signal<User[]>(this.generateVirtualScrollData(1000));

  virtualScrollConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
    },
    virtualScroll: {
      enabled: true,
      itemHeight: 48,
      viewportHeight: '400px',
    },
  });

  // --- Editable Cells Config ---
  editableUsers = signal<User[]>([...this.users()]);

  editableConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
    enableInlineEditing: true,
    cellEditors: {
      name: { type: 'text' },
      email: { type: 'text' },
      salary: { type: 'number', validator: (v) => Number(v) > 0 || 'Salary must be positive' },
      role: {
        type: 'select',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Editor', value: 'editor' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
    },
  });

  // --- Footer Config (multi-row) ---
  footerConfig = createTable<User>({
    visible: ['id', 'name', 'department', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      department: 'Department',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: ['currency', 'USD'],
    },
    footerRows: [
      {
        columns: {
          salary: { fn: 'sum', label: 'Total' },
          id: { fn: 'count', label: 'Rows' },
        },
      },
      {
        columns: {
          salary: { fn: 'avg', label: 'Average' },
          id: { fn: 'max', label: 'Max ID' },
        },
      },
      {
        columns: {
          salary: { fn: 'median', label: 'Median' },
          department: { fn: 'distinctCount', label: 'Departments' },
        },
      },
    ],
  });

  // --- Expandable Config ---
  expandableConfig = createTable<User>({
    visible: ['id', 'name', 'role', 'department', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      role: 'Role',
      department: 'Department',
      status: 'Status',
    },
    formatters: {
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
    expandableDetail: true,
    expandMode: 'multi',
  });

  // --- Grouped Config ---
  groupedConfig = createTable<User>({
    visible: ['id', 'name', 'role', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      role: 'Role',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: ['currency', 'USD'],
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
    grouping: {
      groupBy: 'department',
      initiallyExpanded: true,
      groupHeaderLabel: (value, rows) => `${value} (${rows.length} employees)`,
      captionAggregates: {
        columns: {
          salary: { fn: 'min', label: 'Min' },
        },
      },
      groupFooterRows: [
        { columns: { salary: { fn: 'sum', label: 'Total' }, id: { fn: 'count', label: 'Count' } } },
        { columns: { salary: { fn: 'avg', label: 'Average' } } },
      ],
    },
  });

  // --- Reorderable Config ---
  reorderableUsers = signal<User[]>([...this.users()]);

  reorderableConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'department', 'salary'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      salary: 'Salary',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
    },
    enableColumnReorder: true,
    enableRowReorder: true,
    showDragHandle: true,
  });

  // --- Keyboard Navigation Config ---
  keyboardConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
    hasSelection: true,
    enableKeyboardNavigation: true,
    enableInlineEditing: true,
    cellEditors: {
      name: { type: 'text' },
      email: { type: 'text' },
      salary: { type: 'number', validator: (v) => Number(v) > 0 || 'Salary must be positive' },
      role: {
        type: 'select',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Editor', value: 'editor' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
    },
  });

  keyboardPaginationOptions = {
    mode: 'offset' as const,
    pageSize: 8,
    pageSizeOptions: [5, 8, 10],
    totalItems: 8,
  };

  // --- Hierarchy Grid Config (3-level: Employee → Order → OrderItem) ---
  orderItemChildConfig = createTable<OrderItem>({
    visible: ['itemId', 'sku', 'description', 'qty', 'price'],
    headers: { itemId: 'Item ID', sku: 'SKU', description: 'Description', qty: 'Qty', price: 'Price' },
    formatters: { price: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)) },
  });

  orderChildConfig = createTable<Order>({
    visible: ['orderId', 'product', 'quantity', 'unitPrice', 'orderDate'],
    headers: { orderId: 'Order ID', product: 'Product', quantity: 'Qty', unitPrice: 'Price', orderDate: 'Date' },
    formatters: { unitPrice: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)) },
    childGrid: {
      config: this.orderItemChildConfig,
      childDataProperty: 'items',
      bordered: true,
    },
  });

  hierarchyConfig = createTable<Employee>({
    visible: ['id', 'name', 'title', 'hireDate'],
    headers: { id: 'ID', name: 'Name', title: 'Title', hireDate: 'Hire Date' },
    childGrid: {
      config: this.orderChildConfig,
      childDataProperty: 'orders',
      pagination: { mode: 'offset', pageSize: 5, pageSizeOptions: [3, 5, 10] },
      bordered: true,
    },
  });

  employees = signal<Employee[]>([
    {
      id: 1, name: 'Alice Martin', title: 'Senior Engineer', hireDate: '2020-03-15',
      orders: [
        { orderId: 101, product: 'Laptop Pro 16"', quantity: 1, unitPrice: 2499, orderDate: '2024-01-10', items: [
          { itemId: 1, sku: 'LP16-SLV', description: 'Laptop Pro 16" Silver', qty: 1, price: 2499 },
        ]},
        { orderId: 102, product: 'Mechanical Keyboard', quantity: 2, unitPrice: 159, orderDate: '2024-02-05', items: [
          { itemId: 1, sku: 'KB-RED', description: 'Cherry MX Red Switch', qty: 1, price: 159 },
          { itemId: 2, sku: 'KB-BLU', description: 'Cherry MX Blue Switch', qty: 1, price: 159 },
        ]},
        { orderId: 103, product: 'USB-C Hub', quantity: 1, unitPrice: 79, orderDate: '2024-03-12', items: [
          { itemId: 1, sku: 'HUB-7P', description: 'USB-C Hub 7-Port', qty: 1, price: 79 },
        ]},
        { orderId: 104, product: '4K Monitor', quantity: 1, unitPrice: 599, orderDate: '2024-04-20', items: [
          { itemId: 1, sku: 'MON-27', description: '27" 4K IPS Monitor', qty: 1, price: 599 },
        ]},
        { orderId: 105, product: 'Webcam HD', quantity: 1, unitPrice: 129, orderDate: '2024-05-15', items: [
          { itemId: 1, sku: 'WC-1080', description: '1080p Webcam', qty: 1, price: 129 },
        ]},
        { orderId: 106, product: 'Desk Lamp', quantity: 1, unitPrice: 45, orderDate: '2024-06-01', items: [
          { itemId: 1, sku: 'LAMP-LED', description: 'LED Desk Lamp', qty: 1, price: 45 },
        ]},
      ],
    },
    {
      id: 2, name: 'Bob Chen', title: 'Product Manager', hireDate: '2019-07-01',
      orders: [
        { orderId: 201, product: 'Whiteboard Markers', quantity: 12, unitPrice: 3, orderDate: '2024-01-20', items: [
          { itemId: 1, sku: 'WBM-BLK', description: 'Black Marker', qty: 4, price: 3 },
          { itemId: 2, sku: 'WBM-RED', description: 'Red Marker', qty: 4, price: 3 },
          { itemId: 3, sku: 'WBM-BLU', description: 'Blue Marker', qty: 4, price: 3 },
        ]},
        { orderId: 202, product: 'Notebook Set', quantity: 5, unitPrice: 12, orderDate: '2024-02-18', items: [
          { itemId: 1, sku: 'NB-A4', description: 'A4 Lined Notebook', qty: 3, price: 12 },
          { itemId: 2, sku: 'NB-A5', description: 'A5 Grid Notebook', qty: 2, price: 12 },
        ]},
        { orderId: 203, product: 'Standing Desk', quantity: 1, unitPrice: 899, orderDate: '2024-03-05', items: [
          { itemId: 1, sku: 'DSK-EL', description: 'Electric Standing Desk 60"', qty: 1, price: 899 },
        ]},
        { orderId: 204, product: 'Ergonomic Chair', quantity: 1, unitPrice: 749, orderDate: '2024-04-10', items: [
          { itemId: 1, sku: 'CHR-ERG', description: 'Ergonomic Mesh Chair', qty: 1, price: 749 },
        ]},
        { orderId: 205, product: 'Presentation Remote', quantity: 1, unitPrice: 49, orderDate: '2024-05-22', items: [
          { itemId: 1, sku: 'RMT-LS', description: 'Laser Presentation Remote', qty: 1, price: 49 },
        ]},
      ],
    },
    {
      id: 3, name: 'Carol Davis', title: 'UX Designer', hireDate: '2021-11-10',
      orders: [
        { orderId: 301, product: 'Drawing Tablet', quantity: 1, unitPrice: 349, orderDate: '2024-01-15', items: [
          { itemId: 1, sku: 'TAB-MED', description: 'Drawing Tablet Medium', qty: 1, price: 349 },
        ]},
        { orderId: 302, product: 'Color Calibrator', quantity: 1, unitPrice: 199, orderDate: '2024-02-28', items: [
          { itemId: 1, sku: 'CAL-PRO', description: 'Display Calibrator Pro', qty: 1, price: 199 },
        ]},
        { orderId: 303, product: 'Design Book Bundle', quantity: 3, unitPrice: 45, orderDate: '2024-03-20', items: [
          { itemId: 1, sku: 'BK-UX', description: 'UX Design Handbook', qty: 1, price: 45 },
          { itemId: 2, sku: 'BK-TYP', description: 'Typography Essentials', qty: 1, price: 45 },
          { itemId: 3, sku: 'BK-CLR', description: 'Color Theory Guide', qty: 1, price: 45 },
        ]},
        { orderId: 304, product: 'Stylus Pen Set', quantity: 2, unitPrice: 29, orderDate: '2024-04-05', items: [
          { itemId: 1, sku: 'PEN-FN', description: 'Fine Tip Stylus', qty: 1, price: 29 },
          { itemId: 2, sku: 'PEN-BRD', description: 'Broad Tip Stylus', qty: 1, price: 29 },
        ]},
        { orderId: 305, product: 'Monitor Arm', quantity: 1, unitPrice: 119, orderDate: '2024-05-10', items: [
          { itemId: 1, sku: 'ARM-DL', description: 'Dual Monitor Arm', qty: 1, price: 119 },
        ]},
        { orderId: 306, product: 'Headphones Pro', quantity: 1, unitPrice: 299, orderDate: '2024-06-15', items: [
          { itemId: 1, sku: 'HP-ANC', description: 'ANC Headphones', qty: 1, price: 299 },
        ]},
        { orderId: 307, product: 'Mouse Pad XL', quantity: 1, unitPrice: 25, orderDate: '2024-07-01', items: [
          { itemId: 1, sku: 'MP-XL', description: 'Extended Mouse Pad', qty: 1, price: 25 },
        ]},
      ],
    },
    {
      id: 4, name: 'David Kim', title: 'DevOps Lead', hireDate: '2018-05-20',
      orders: [
        { orderId: 401, product: 'Server Rack Mount', quantity: 2, unitPrice: 189, orderDate: '2024-01-08', items: [
          { itemId: 1, sku: 'RCK-2U', description: '2U Rack Mount', qty: 1, price: 189 },
          { itemId: 2, sku: 'RCK-4U', description: '4U Rack Mount', qty: 1, price: 189 },
        ]},
        { orderId: 402, product: 'Network Switch', quantity: 1, unitPrice: 459, orderDate: '2024-02-14', items: [
          { itemId: 1, sku: 'SW-48', description: '48-Port Managed Switch', qty: 1, price: 459 },
        ]},
        { orderId: 403, product: 'SSD 2TB', quantity: 4, unitPrice: 149, orderDate: '2024-03-25', items: [
          { itemId: 1, sku: 'SSD-NVM', description: 'NVMe SSD 2TB', qty: 4, price: 149 },
        ]},
        { orderId: 404, product: 'KVM Switch', quantity: 1, unitPrice: 89, orderDate: '2024-04-18', items: [
          { itemId: 1, sku: 'KVM-4P', description: '4-Port KVM Switch', qty: 1, price: 89 },
        ]},
        { orderId: 405, product: 'Cable Management Kit', quantity: 3, unitPrice: 35, orderDate: '2024-05-30', items: [
          { itemId: 1, sku: 'CBL-VLC', description: 'Velcro Cable Ties', qty: 2, price: 15 },
          { itemId: 2, sku: 'CBL-TRY', description: 'Cable Tray', qty: 1, price: 35 },
        ]},
      ],
    },
    {
      id: 5, name: 'Eva Lopez', title: 'QA Engineer', hireDate: '2022-01-05',
      orders: [
        { orderId: 501, product: 'Testing Device Pack', quantity: 1, unitPrice: 799, orderDate: '2024-02-01', items: [
          { itemId: 1, sku: 'DEV-AND', description: 'Android Test Device', qty: 1, price: 399 },
          { itemId: 2, sku: 'DEV-IOS', description: 'iOS Test Device', qty: 1, price: 400 },
        ]},
        { orderId: 502, product: 'Dual Monitor Stand', quantity: 1, unitPrice: 139, orderDate: '2024-03-15', items: [
          { itemId: 1, sku: 'STD-DL', description: 'Dual Monitor Stand', qty: 1, price: 139 },
        ]},
        { orderId: 503, product: 'USB Hub 7-Port', quantity: 2, unitPrice: 45, orderDate: '2024-04-22', items: [
          { itemId: 1, sku: 'HUB-7U', description: 'USB 3.0 Hub 7-Port', qty: 2, price: 45 },
        ]},
        { orderId: 504, product: 'Noise-Cancelling Earbuds', quantity: 1, unitPrice: 179, orderDate: '2024-05-08', items: [
          { itemId: 1, sku: 'EB-ANC', description: 'ANC Wireless Earbuds', qty: 1, price: 179 },
        ]},
        { orderId: 505, product: 'Laptop Stand', quantity: 1, unitPrice: 59, orderDate: '2024-06-20', items: [
          { itemId: 1, sku: 'STD-AL', description: 'Aluminum Laptop Stand', qty: 1, price: 59 },
        ]},
        { orderId: 506, product: 'Portable Charger', quantity: 2, unitPrice: 39, orderDate: '2024-07-10', items: [
          { itemId: 1, sku: 'CHG-10K', description: '10000mAh Charger', qty: 1, price: 29 },
          { itemId: 2, sku: 'CHG-20K', description: '20000mAh Charger', qty: 1, price: 49 },
        ]},
        { orderId: 507, product: 'Screen Protector', quantity: 3, unitPrice: 15, orderDate: '2024-08-01', items: [
          { itemId: 1, sku: 'SP-13', description: '13" Screen Protector', qty: 2, price: 15 },
          { itemId: 2, sku: 'SP-16', description: '16" Screen Protector', qty: 1, price: 15 },
        ]},
        { orderId: 508, product: 'Cleaning Kit', quantity: 1, unitPrice: 22, orderDate: '2024-09-05', items: [
          { itemId: 1, sku: 'CLN-KIT', description: 'Electronics Cleaning Kit', qty: 1, price: 22 },
        ]},
      ],
    },
  ]);

  private generateVirtualScrollData(count: number): User[] {
    const roles: ('admin' | 'editor' | 'viewer')[] = ['admin', 'editor', 'viewer'];
    const statuses: ('active' | 'inactive' | 'pending')[] = ['active', 'inactive', 'pending'];
    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Helen'];
    const lastNames = ['Doe', 'Smith', 'Johnson', 'Brown', 'Wilson', 'Prince', 'Stone', 'Green', 'Taylor', 'White'];

    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      email: `user${i + 1}@example.com`,
      role: roles[i % roles.length],
      status: statuses[i % statuses.length],
      department: departments[i % departments.length],
      salary: 60000 + Math.floor(Math.random() * 80000),
      joinDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
    }));
  }

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

  onColumnResize(event: unknown) {
    console.log('Column resized:', event);
  }

  onCellEdit(event: CellEditEvent<User>) {
    console.log('Cell edit:', event);
    // Apply the edit to the data
    this.editableUsers.update(users =>
      users.map(u => {
        if (u === event.row) {
          return { ...u, [event.field]: event.newValue };
        }
        return u;
      }),
    );
    this.toast.success(`Updated ${event.field} for ${event.row.name}`);
  }

  onDetailExpand(event: { row: User; expanded: boolean }) {
    console.log('Detail expand:', event);
  }

  onGroupExpand(event: { groupValue: unknown; expanded: boolean }) {
    console.log('Group expand:', event);
  }

  onColumnReorder(event: ColumnReorderEvent) {
    console.log('Column reorder:', event);
    this.toast.info(`Column moved from position ${event.previousIndex + 1} to ${event.currentIndex + 1}`);
  }

  onRowReorder(event: RowReorderEvent<User>) {
    console.log('Row reorder:', event);
    // Apply the reorder to the data
    this.reorderableUsers.update(users => {
      const arr = [...users];
      const [moved] = arr.splice(event.previousIndex, 1);
      arr.splice(event.currentIndex, 0, moved);
      return arr;
    });
    this.toast.info(`Row moved from position ${event.previousIndex + 1} to ${event.currentIndex + 1}`);
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
<hk-table [data]="users()" [config]="config" />`;

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
<hk-table
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

  stickyCode = `const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status', 'joinDate'],
  hasSelection: true,
  hasActions: true,
  actions: [...],
  stickyColumns: {
    stickySelection: true,  // auto-pin checkbox column
    stickyActions: true,     // auto-pin actions column
  },
});

// Template — wrap in a constrained container to trigger horizontal scroll
<div style="max-width: 600px;">
  <hk-table [data]="users()" [config]="config" />
</div>`;

  resizableCode = `const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary'],
  enableColumnResizing: true,
  resizeMode: 'expand',  // 'fit' adjusts neighbor
});

<hk-table
  [data]="users()"
  [config]="config"
  (columnResize)="onResize($event)"
/>`;

  virtualScrollCode = `const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary'],
  virtualScroll: {
    enabled: true,
    itemHeight: 48,       // row height in px (required)
    viewportHeight: '400px',
  },
});

// Pagination is automatically hidden when virtual scroll is enabled
<hk-table [data]="thousandRows()" [config]="config" />`;

  editableCode = `const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'salary'],
  enableInlineEditing: true,
  cellEditors: {
    name: { type: 'text' },
    email: { type: 'text' },
    salary: {
      type: 'number',
      validator: (v) => Number(v) > 0 || 'Must be positive',
    },
    role: {
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Viewer', value: 'viewer' },
      ],
    },
  },
});

// Double-click a cell to edit. Enter to confirm, Escape to cancel.
<hk-table
  [data]="users()"
  [config]="config"
  (cellEdit)="onCellEdit($event)"
/>`;

  footerCode = `import { createTable } from '@hakistack/ng-daisyui';

const config = createTable<User>({
  visible: ['id', 'name', 'department', 'salary', 'status'],
  formatters: { salary: ['currency', 'USD'] },
  footerRows: [
    {
      columns: {
        salary: { fn: 'sum', label: 'Total' },
        id: { fn: 'count', label: 'Rows' },
      },
    },
    {
      columns: {
        salary: { fn: 'avg', label: 'Average' },
        id: { fn: 'max', label: 'Max ID' },
      },
    },
    {
      columns: {
        salary: { fn: 'median', label: 'Median' },
        department: { fn: 'distinctCount', label: 'Departments' },
      },
    },
  ],
});

// Legacy single-row footer (still supported):
// showFooter: true,
// footers: { salary: { fn: 'sum', label: 'Total' }, id: 'count' }

<hk-table [data]="users()" [config]="config" />`;

  expandableCode = `const config = createTable<User>({
  visible: ['id', 'name', 'role', 'department', 'status'],
  expandableDetail: true,
  expandMode: 'multi',  // 'single' collapses others
});

// Template — provide a #rowDetail template
<hk-table [data]="users()" [config]="config" (detailExpansionChange)="onExpand($event)">
  <ng-template #rowDetail let-row>
    <div>
      <p>Email: {{ row.email }}</p>
      <p>Salary: {{ row.salary | number }}</p>
    </div>
  </ng-template>
</hk-table>`;

  groupedCode = `const config = createTable<User>({
  visible: ['id', 'name', 'role', 'salary', 'status'],
  formatters: { salary: ['currency', 'USD'] },
  grouping: {
    groupBy: 'department',
    initiallyExpanded: true,
    groupHeaderLabel: (value, rows) =>
      \`\${value} (\${rows.length} employees)\`,
    // Inline caption aggregates in group header
    captionAggregates: {
      columns: { salary: { fn: 'min', label: 'Min' } },
    },
    // Column-aligned multi-row group footers
    groupFooterRows: [
      { columns: {
          salary: { fn: 'sum', label: 'Total' },
          id: { fn: 'count', label: 'Count' },
      }},
      { columns: { salary: { fn: 'avg', label: 'Average' } } },
    ],
    // Legacy single-row footer (still supported):
    // aggregates: { salary: 'sum' },
    // showGroupFooter: true,
  },
});

<hk-table [data]="users()" [config]="config"
  (groupExpandChange)="onGroupExpand($event)" />`;

  reorderableCode = `const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary'],
  enableColumnReorder: true,   // drag column headers
  enableRowReorder: true,      // drag row handles
  showDragHandle: true,        // show grip icon
});

// Row reorder is auto-disabled when sort/filter/search is active
<hk-table [data]="users()" [config]="config"
  (columnReorder)="onColumnReorder($event)"
  (rowReorder)="onRowReorder($event)" />`;

  keyboardCode = `const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'salary', 'status'],
  hasSelection: true,
  enableKeyboardNavigation: true,
  enableInlineEditing: true,
  cellEditors: {
    name: { type: 'text' },
    salary: { type: 'number' },
  },
});

// Arrow keys: navigate cells
// Enter: start editing / toggle expand
// Space: toggle selection
// Home/End: jump to first/last column (Ctrl for row)
// Escape: clear focus
<hk-table [data]="users()" [config]="config"
  (cellEdit)="onCellEdit($event)"
  (selectionChange)="onSelection($event)" />`;

  hierarchyCode = `// Level 3: Order Items (deepest)
const itemConfig = createTable<OrderItem>({
  visible: ['itemId', 'sku', 'description', 'qty', 'price'],
  formatters: { price: ['currency', 'USD'] },
});

// Level 2: Orders — with its own childGrid pointing to items
const orderConfig = createTable<Order>({
  visible: ['orderId', 'product', 'quantity', 'unitPrice', 'orderDate'],
  formatters: { unitPrice: ['currency', 'USD'] },
  childGrid: {
    config: itemConfig,
    childDataProperty: 'items',
    bordered: true,
  },
});

// Level 1: Employees — parent table
const config = createTable<Employee>({
  visible: ['id', 'name', 'title', 'hireDate'],
  childGrid: {
    config: orderConfig,
    childDataProperty: 'orders',
    pagination: { mode: 'offset', pageSize: 5 },
    bordered: true,
  },
});

// N-level deep: each childGrid.config can itself have a childGrid
<hk-table [data]="employees()" [config]="config" />`;

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
    { name: 'columnResize', type: 'ColumnResizeEvent', description: 'Emitted when a column is resized' },
    { name: 'cellEdit', type: 'CellEditEvent<T>', description: 'Emitted when a cell edit is confirmed' },
    { name: 'cellEditCancel', type: '{ row: T; field: string }', description: 'Emitted when a cell edit is cancelled' },
    { name: 'cellEditError', type: 'CellEditErrorEvent<T>', description: 'Emitted when a cell edit fails validation' },
    { name: 'detailExpansionChange', type: 'RowExpandEvent<T>', description: 'Emitted when an expandable detail row is expanded/collapsed' },
    { name: 'columnReorder', type: 'ColumnReorderEvent', description: 'Emitted when columns are reordered via drag' },
    { name: 'rowReorder', type: 'RowReorderEvent<T>', description: 'Emitted when rows are reordered via drag' },
    { name: 'groupExpandChange', type: 'GroupExpandEvent', description: 'Emitted when a row group is expanded/collapsed' },
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
    { name: 'expandAllDetails()', type: 'void', description: 'Expand all detail rows' },
    { name: 'collapseAllDetails()', type: 'void', description: 'Collapse all detail rows' },
    { name: 'expandAllGroups()', type: 'void', description: 'Expand all row groups' },
    { name: 'collapseAllGroups()', type: 'void', description: 'Collapse all row groups' },
  ];
}
