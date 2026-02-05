import { Component, inject, signal } from '@angular/core';
import { TableComponent, createTable, ToastService, LucideIconComponent } from '@hakistack/ng-daisyui-v4';

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
  imports: [TableComponent, LucideIconComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Data Table</h1>
        <p class="text-base-content/70 mt-2">Feature-rich data table with sorting, filtering, and pagination</p>
      </div>

      <!-- DaisyUI v4 Tabs (boxed, no tab-content body) -->
      <div role="tablist" class="tabs tabs-boxed w-fit">
        <button
          role="tab"
          class="tab"
          [class.tab-active]="activeTab() === 'basic'"
          (click)="activeTab.set('basic')"
        >
          Basic
        </button>
        <button
          role="tab"
          class="tab"
          [class.tab-active]="activeTab() === 'full'"
          (click)="activeTab.set('full')"
        >
          Full Featured
        </button>
      </div>

      <!-- Basic Tab Content -->
      @if (activeTab() === 'basic') {
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Basic Table</h2>
            <p class="text-sm text-base-content/60 mb-4">Simple table with sorting</p>
            <app-table [data]="users()" [config]="basicConfig" (sortChange)="onSort($event)" />
          </div>
        </div>
      }

      <!-- Full Featured Tab Content -->
      @if (activeTab() === 'full') {
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Full Featured Table</h2>
            <p class="text-sm text-base-content/60 mb-4">Selection, actions, filters, global search, pagination</p>
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
          </div>
        </div>

        <!-- Selection Info -->
        @if (selectedUsers().length > 0) {
          <div class="alert alert-info">
            <app-lucide-icon name="Info" [size]="20" />
            <span>{{ selectedUsers().length }} user(s) selected</span>
          </div>
        }
      }
    </div>
  `,
})
export class TableDemoComponent {
  private toast = inject(ToastService);
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

  // Basic config
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

  // Full featured config
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
}
