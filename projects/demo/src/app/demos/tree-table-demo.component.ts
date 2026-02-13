import { Component, inject, signal } from '@angular/core';
import { TableComponent, createTable, ToastService, LucideIconComponent, TreeNode } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';

// Example: Department hierarchy using TreeNode
interface Department {
  name: string;
  head: string;
  budget: number;
  employees: number;
}

// Example: File system using custom children property
interface FileSystemItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: number;
  modified: Date;
  items?: FileSystemItem[]; // Custom children property
}

type DemoTab = 'treenode' | 'custom' | 'features';

@Component({
  selector: 'app-tree-table-demo',
  imports: [TableComponent, LucideIconComponent, DocSectionComponent, ApiTableComponent, CodeBlockComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Tree Table</h1>
        <p class="text-base-content/70 mt-2">Hierarchical data display with expand/collapse, unlimited nesting depth</p>
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
          <button
            role="tab"
            class="tab"
            [class.tab-active]="activeTab() === 'treenode'"
            (click)="activeTab.set('treenode')"
          >
            TreeNode Data
          </button>
          <button
            role="tab"
            class="tab"
            [class.tab-active]="activeTab() === 'custom'"
            (click)="activeTab.set('custom')"
          >
            Custom Children
          </button>
          <button
            role="tab"
            class="tab"
            [class.tab-active]="activeTab() === 'features'"
            (click)="activeTab.set('features')"
          >
            Full Features
          </button>
        </div>

        <!-- TreeNode Data Tab -->
        @if (activeTab() === 'treenode') {
          <app-doc-section
            title="Organization Structure (TreeNode)"
            description="Using the standard TreeNode interface with 'children' property"
            [codeExample]="treeNodeCode"
          >
            <div class="flex gap-2 mb-4">
              <button class="btn btn-sm btn-outline" (click)="expandAllDepts()">
                <hk-lucide-icon name="ChevronsDownUp" [size]="16" />
                Expand All
              </button>
              <button class="btn btn-sm btn-outline" (click)="collapseAllDepts()">
                <hk-lucide-icon name="ChevronsUpDown" [size]="16" />
                Collapse All
              </button>
            </div>

            <hk-table
              #deptTable
              [data]="departmentTree()"
              [config]="treeNodeConfig"
              [paginationOptions]="paginationOptions"
              (expansionChange)="onExpansionChange($event)"
            />
          </app-doc-section>
        }

        <!-- Custom Children Property Tab -->
        @if (activeTab() === 'custom') {
          <app-doc-section
            title="File Explorer (Custom Children)"
            description="Using a custom 'items' property for children instead of the default 'children'"
            [codeExample]="customChildrenCode"
          >
            <hk-table
              [data]="fileSystem()"
              [config]="customChildrenConfig"
              [paginationOptions]="{ mode: 'offset', pageSize: 20 }"
            />
          </app-doc-section>
        }

        <!-- Full Features Tab -->
        @if (activeTab() === 'features') {
          <app-doc-section
            title="Tree Table with Selection, Sorting & Filtering"
            description="Full-featured tree table with selection, actions, sorting (root level only), and global search"
          >
            <hk-table
              [data]="departmentTree()"
              [config]="fullFeaturedConfig"
              [paginationOptions]="{ mode: 'offset', pageSize: 10 }"
              (selectionChange)="onSelection($event)"
            />
          </app-doc-section>

          @if (selectedItems().length > 0) {
            <div class="alert alert-info">
              <hk-lucide-icon name="Info" [size]="20" />
              <span>{{ selectedItems().length }} item(s) selected</span>
            </div>
          }
        }
      }

      @if (pageTab() === 'api') {
        <div class="space-y-6">
          <app-api-table title="Tree Table Config (via createTable treeTable option)" [entries]="treeConfigDocs" />
          <app-api-table title="Table Tree Methods" [entries]="treeMethodDocs" />
          <app-api-table title="Outputs" [entries]="treeOutputDocs" />

          <div>
            <h3 class="text-lg font-semibold mb-2">TreeNode Example</h3>
            <app-code-block [code]="treeNodeCode" />
          </div>

          <div>
            <h3 class="text-lg font-semibold mb-2">Custom Children Property Example</h3>
            <app-code-block [code]="customChildrenCode" />
          </div>
        </div>
      }
    </div>
  `,
})
export class TreeTableDemoComponent {
  private toast = inject(ToastService);
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<DemoTab>('treenode');
  selectedItems = signal<TreeNode<Department>[]>([]);

  // TreeNode-based department data
  departmentTree = signal<TreeNode<Department>[]>([
    {
      key: 'eng',
      label: 'Engineering',
      data: { name: 'Engineering', head: 'Alice Johnson', budget: 500000, employees: 50 },
      expanded: true,
      children: [
        {
          key: 'eng-fe',
          label: 'Frontend',
          data: { name: 'Frontend', head: 'Bob Smith', budget: 150000, employees: 15 },
          children: [
            {
              key: 'eng-fe-react',
              label: 'React Team',
              data: { name: 'React Team', head: 'Carol Davis', budget: 75000, employees: 8 },
            },
            {
              key: 'eng-fe-angular',
              label: 'Angular Team',
              data: { name: 'Angular Team', head: 'Dan Wilson', budget: 75000, employees: 7 },
            },
          ],
        },
        {
          key: 'eng-be',
          label: 'Backend',
          data: { name: 'Backend', head: 'Eve Martinez', budget: 200000, employees: 20 },
          children: [
            {
              key: 'eng-be-api',
              label: 'API Team',
              data: { name: 'API Team', head: 'Frank Brown', budget: 100000, employees: 10 },
            },
            {
              key: 'eng-be-infra',
              label: 'Infrastructure',
              data: { name: 'Infrastructure', head: 'Grace Lee', budget: 100000, employees: 10 },
            },
          ],
        },
        {
          key: 'eng-qa',
          label: 'QA',
          data: { name: 'QA', head: 'Henry Taylor', budget: 100000, employees: 10 },
        },
      ],
    },
    {
      key: 'sales',
      label: 'Sales',
      data: { name: 'Sales', head: 'Ivan Chen', budget: 300000, employees: 30 },
      children: [
        {
          key: 'sales-na',
          label: 'North America',
          data: { name: 'North America', head: 'Julia Adams', budget: 150000, employees: 15 },
        },
        {
          key: 'sales-eu',
          label: 'Europe',
          data: { name: 'Europe', head: 'Kevin White', budget: 100000, employees: 10 },
        },
        {
          key: 'sales-apac',
          label: 'Asia Pacific',
          data: { name: 'Asia Pacific', head: 'Linda Park', budget: 50000, employees: 5 },
        },
      ],
    },
    {
      key: 'hr',
      label: 'Human Resources',
      data: { name: 'Human Resources', head: 'Mike Robinson', budget: 100000, employees: 10 },
      children: [
        {
          key: 'hr-recruit',
          label: 'Recruiting',
          data: { name: 'Recruiting', head: 'Nancy Scott', budget: 50000, employees: 5 },
        },
        {
          key: 'hr-benefits',
          label: 'Benefits',
          data: { name: 'Benefits', head: 'Oscar Hill', budget: 50000, employees: 5 },
        },
      ],
    },
  ]);

  // File system data with custom children property ('items')
  fileSystem = signal<FileSystemItem[]>([
    {
      id: 'root-src',
      name: 'src',
      type: 'folder',
      modified: new Date('2024-01-15'),
      items: [
        {
          id: 'src-app',
          name: 'app',
          type: 'folder',
          modified: new Date('2024-01-15'),
          items: [
            {
              id: 'app-component',
              name: 'app.component.ts',
              type: 'file',
              size: 2048,
              modified: new Date('2024-01-14'),
            },
            {
              id: 'app-module',
              name: 'app.module.ts',
              type: 'file',
              size: 1024,
              modified: new Date('2024-01-10'),
            },
            {
              id: 'app-routes',
              name: 'app.routes.ts',
              type: 'file',
              size: 512,
              modified: new Date('2024-01-12'),
            },
          ],
        },
        {
          id: 'src-assets',
          name: 'assets',
          type: 'folder',
          modified: new Date('2024-01-08'),
          items: [
            {
              id: 'assets-images',
              name: 'images',
              type: 'folder',
              modified: new Date('2024-01-05'),
              items: [
                { id: 'img-logo', name: 'logo.png', type: 'file', size: 15360, modified: new Date('2024-01-05') },
                { id: 'img-bg', name: 'background.jpg', type: 'file', size: 102400, modified: new Date('2024-01-03') },
              ],
            },
            { id: 'assets-styles', name: 'styles.css', type: 'file', size: 4096, modified: new Date('2024-01-08') },
          ],
        },
        {
          id: 'src-main',
          name: 'main.ts',
          type: 'file',
          size: 256,
          modified: new Date('2024-01-01'),
        },
        {
          id: 'src-index',
          name: 'index.html',
          type: 'file',
          size: 512,
          modified: new Date('2024-01-01'),
        },
      ],
    },
    {
      id: 'root-package',
      name: 'package.json',
      type: 'file',
      size: 1536,
      modified: new Date('2024-01-15'),
    },
    {
      id: 'root-tsconfig',
      name: 'tsconfig.json',
      type: 'file',
      size: 768,
      modified: new Date('2024-01-01'),
    },
    {
      id: 'root-readme',
      name: 'README.md',
      type: 'file',
      size: 2048,
      modified: new Date('2024-01-10'),
    },
  ]);

  // TreeNode config - uses default 'children' property
  treeNodeConfig = createTable<TreeNode<Department>>({
    visible: ['label', 'data'],
    headers: {
      label: 'Department',
      data: 'Details',
    },
    formatters: {
      data: (value) => {
        const dept = value as Department;
        return `<div class="text-sm">
          <div><strong>Head:</strong> ${dept.head}</div>
          <div><strong>Budget:</strong> ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dept.budget)}</div>
          <div><strong>Employees:</strong> ${dept.employees}</div>
        </div>`;
      },
    },
    treeTable: {
      enabled: true,
      expandAll: false,
      initialExpandedKeys: ['eng'],
      indentSize: 24,
    },
  });

  // Custom children property config
  customChildrenConfig = createTable<FileSystemItem>({
    visible: ['name', 'type', 'size', 'modified'],
    headers: {
      name: 'Name',
      type: 'Type',
      size: 'Size',
      modified: 'Modified',
    },
    formatters: {
      name: (value, row) => {
        const item = row as FileSystemItem;
        const icon = item.type === 'folder' ? 'Folder' : 'File';
        const iconClass = item.type === 'folder' ? 'text-warning' : 'text-info';
        return `<div class="flex items-center gap-2">
          <span class="${iconClass}">${value}</span>
        </div>`;
      },
      type: (value) => {
        const isFolder = value === 'folder';
        const badge = isFolder ? 'badge-warning' : 'badge-info';
        return `<span class="badge badge-sm ${badge}">${value}</span>`;
      },
      size: (value) => {
        if (!value) return '-';
        const bytes = Number(value);
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      },
      modified: (value) => new Date(value as Date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    },
    treeTable: {
      enabled: true,
      childrenProperty: 'items', // Custom property name
      expandAll: true,
      getRowKey: (row) => row.id,
      indentSize: 20,
    },
  });

  // Full-featured config
  fullFeaturedConfig = createTable<TreeNode<Department>>({
    visible: ['label', 'data'],
    headers: {
      label: 'Department',
      data: 'Details',
    },
    formatters: {
      data: (value) => {
        const dept = value as Department;
        return `<div class="text-sm space-y-0.5">
          <div><span class="font-medium">Head:</span> ${dept.head}</div>
          <div><span class="font-medium">Budget:</span> ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dept.budget)}</div>
          <div><span class="font-medium">Employees:</span> ${dept.employees}</div>
        </div>`;
      },
    },
    hasSelection: true,
    hasActions: true,
    actions: [
      {
        type: 'view',
        label: 'View',
        icon: 'Eye',
        action: (row) => this.toast.info(`Viewing: ${row.label}`),
      },
      {
        type: 'edit',
        label: 'Edit',
        icon: 'Pencil',
        action: (row) => this.toast.info(`Editing: ${row.label}`),
      },
    ],
    bulkActions: [
      {
        type: 'export',
        label: 'Export',
        icon: 'Download',
        action: (rows, option) => this.toast.success(`Exporting ${rows.length} items as ${option?.label ?? 'file'}`),
      },
    ],
    globalSearch: {
      enabled: true,
      mode: 'contains',
      placeholder: 'Search departments...',
    },
    treeTable: {
      enabled: true,
      expandAll: false,
      initialExpandedKeys: ['eng', 'sales'],
      indentSize: 24,
    },
  });

  paginationOptions = {
    mode: 'offset' as const,
    pageSize: 15,
  };

  // --- API Documentation ---

  treeConfigDocs: ApiDocEntry[] = [
    { name: 'treeTable.enabled', type: 'boolean', default: 'false', description: 'Enable tree table mode' },
    { name: 'treeTable.childrenProperty', type: 'string', default: "'children'", description: 'Property name for children array' },
    { name: 'treeTable.expandAll', type: 'boolean', default: 'false', description: 'Expand all rows initially' },
    { name: 'treeTable.initialExpandedKeys', type: 'string[]', default: '[]', description: 'Keys of initially expanded rows' },
    { name: 'treeTable.indentSize', type: 'number', default: '24', description: 'Indent size per level in pixels' },
    { name: 'treeTable.getRowKey', type: '(row) => string', default: '-', description: 'Function to get unique key from row' },
  ];

  treeMethodDocs: ApiDocEntry[] = [
    { name: 'expandAllRows()', type: 'void', description: 'Expand all tree rows' },
    { name: 'collapseAllRows()', type: 'void', description: 'Collapse all tree rows' },
    { name: 'toggleRowExpand(row)', type: 'void', description: 'Toggle row expansion' },
    { name: 'isRowExpanded(row)', type: 'boolean', description: 'Check if row is expanded' },
    { name: 'getRowLevel(row)', type: 'number', description: 'Get row indentation level' },
  ];

  treeOutputDocs: ApiDocEntry[] = [
    { name: 'expansionChange', type: '{ row: T; expanded: boolean }', description: 'Emitted when a row expansion state changes' },
  ];

  // --- Code Examples ---

  treeNodeCode = `const treeNodeConfig = createTable<TreeNode<Department>>({
  visible: ['label', 'data'],
  headers: {
    label: 'Department',
    data: 'Details',
  },
  formatters: {
    data: (value) => {
      const dept = value as Department;
      return \`<div class="text-sm">
        <div><strong>Head:</strong> \${dept.head}</div>
        <div><strong>Budget:</strong> \${dept.budget}</div>
      </div>\`;
    },
  },
  treeTable: {
    enabled: true,
    expandAll: false,
    initialExpandedKeys: ['eng'],
    indentSize: 24,
  },
});

// Template
<hk-table
  #deptTable
  [data]="departmentTree()"
  [config]="treeNodeConfig"
  (expansionChange)="onExpansionChange($event)"
/>`;

  customChildrenCode = `const customChildrenConfig = createTable<FileSystemItem>({
  visible: ['name', 'type', 'size', 'modified'],
  headers: {
    name: 'Name',
    type: 'Type',
    size: 'Size',
    modified: 'Modified',
  },
  treeTable: {
    enabled: true,
    childrenProperty: 'items', // Custom property name
    expandAll: true,
    getRowKey: (row) => row.id,
    indentSize: 20,
  },
});

// Template
<hk-table
  [data]="fileSystem()"
  [config]="customChildrenConfig"
  [paginationOptions]="{ mode: 'offset', pageSize: 20 }"
/>`;

  onExpansionChange(event: { row: TreeNode<Department>; expanded: boolean }) {
    console.log('Expansion changed:', event.row.label, 'expanded:', event.expanded);
  }

  onSelection(items: readonly TreeNode<Department>[]) {
    this.selectedItems.set([...items]);
  }

  // These methods would need ViewChild to access the table component
  // For demo purposes, we'll just log
  expandAllDepts() {
    this.toast.info('Use table.expandAllRows() method');
  }

  collapseAllDepts() {
    this.toast.info('Use table.collapseAllRows() method');
  }
}
