import { Component, inject, signal, viewChild } from '@angular/core';
import { TableComponent, createTable, ToastService, LucideIconComponent, TreeNode } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { DemoPageComponent } from '../shared/demo-page.component';
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

type DemoTab = 'treenode' | 'custom' | 'features' | 'cascade' | 'filtering' | 'large';

@Component({
  selector: 'app-tree-table-demo',
  imports: [TableComponent, LucideIconComponent, DocSectionComponent, ApiTableComponent, CodeBlockComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="Tree Table"
      description="Hierarchical data tables with expandable rows and tree structure"
      icon="ListTree"
      category="Data Display"
      importName="TableComponent, createTable"
    >
      <div examples>
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed w-fit flex-wrap">
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'treenode'" (click)="activeTab.set('treenode')">
            TreeNode Data
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'custom'" (click)="activeTab.set('custom')">
            Custom Children
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'features'" (click)="activeTab.set('features')">
            Full Features
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'cascade'" (click)="activeTab.set('cascade')">
            Cascade Selection
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'filtering'" (click)="activeTab.set('filtering')">
            Hierarchy Filtering
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'large'" (click)="activeTab.set('large')">
            Large Dataset
          </button>
        </div>

        <!-- TreeNode Data Tab -->
        @if (activeTab() === 'treenode') {
          <app-doc-section
            title="Organization Structure (TreeNode)"
            description="Using the standard TreeNode interface with 'children' property. Toggle is inline in the first data column."
            [codeExample]="treeNodeCode"
          >
            <div class="flex gap-2 mb-4 flex-wrap">
              <button class="btn btn-sm btn-outline" (click)="expandAllDept()">
                <hk-lucide-icon name="ChevronsDownUp" [size]="16" />
                Expand All
              </button>
              <button class="btn btn-sm btn-outline" (click)="collapseAllDept()">
                <hk-lucide-icon name="ChevronsUpDown" [size]="16" />
                Collapse All
              </button>
              <button class="btn btn-sm btn-outline" (click)="expandDeptToLevel(1)">Level 1</button>
              <button class="btn btn-sm btn-outline" (click)="expandDeptToLevel(2)">Level 2</button>
            </div>

            <hk-table
              #deptTableRef
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
            <hk-table [data]="fileSystem()" [config]="customChildrenConfig" [paginationOptions]="{ mode: 'offset', pageSize: 20 }" />
          </app-doc-section>
        }

        <!-- Full Features Tab -->
        @if (activeTab() === 'features') {
          <app-doc-section
            title="Tree Table with Selection, Sorting & Filtering"
            description="Full-featured tree table with selection, actions, hierarchy-aware sorting at every level, and global search that keeps ancestors of matching children visible"
          >
            <hk-table
              [data]="departmentTree()"
              [config]="fullFeaturedConfig"
              [paginationOptions]="{ mode: 'offset', pageSize: 20 }"
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

        <!-- Cascade Selection Tab -->
        @if (activeTab() === 'cascade') {
          <app-doc-section
            title="Cascade Selection"
            description="Checking a parent auto-checks all children. When all children are checked, parent is auto-checked. Shows indeterminate state when partially selected."
          >
            <hk-table
              [data]="departmentTree()"
              [config]="cascadeConfig"
              [paginationOptions]="{ mode: 'offset', pageSize: 20 }"
              (selectionChange)="onCascadeSelection($event)"
            />
          </app-doc-section>

          @if (cascadeSelectedItems().length > 0) {
            <div class="alert alert-info">
              <hk-lucide-icon name="Info" [size]="20" />
              <span>{{ cascadeSelectedItems().length }} item(s) selected via cascade</span>
            </div>
          }
        }

        <!-- Hierarchy Filtering Tab -->
        @if (activeTab() === 'filtering') {
          <app-doc-section
            title="Hierarchy-Aware Filtering"
            description="When a child matches a filter/search, its ancestors stay visible. Try searching for 'React' or 'API' to see ancestors preserved."
          >
            <hk-table [data]="departmentTree()" [config]="filteringConfig" [paginationOptions]="{ mode: 'offset', pageSize: 20 }" />
          </app-doc-section>
        }

        <!-- Large Dataset Tab -->
        @if (activeTab() === 'large') {
          <app-doc-section
            title="Large Dataset ({{ largeDatasetCount }} rows)"
            description="100 roots x 10 children x 5 grandchildren = 6,600 rows. Performance test with hierarchy-aware sorting."
          >
            <div class="flex gap-2 mb-4 flex-wrap">
              <button class="btn btn-sm btn-outline" (click)="expandLargeToLevel(1)">Expand Level 1</button>
              <button class="btn btn-sm btn-outline" (click)="expandLargeToLevel(2)">Expand Level 2</button>
              <button class="btn btn-sm btn-outline" (click)="expandAllLarge()">Expand All</button>
              <button class="btn btn-sm btn-outline" (click)="collapseAllLarge()">Collapse All</button>
            </div>

            <hk-table
              #largeTableRef
              [data]="largeDataset()"
              [config]="largeDatasetConfig"
              [paginationOptions]="{ mode: 'offset', pageSize: 50 }"
            />
          </app-doc-section>
        }
      </div>
      <div api>
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'component'" (click)="apiTab.set('component')">Component</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'configuration'" (click)="apiTab.set('configuration')">
            Configuration
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'methods'" (click)="apiTab.set('methods')">Methods</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>

        <!-- Component sub-tab -->
        @if (apiTab() === 'component') {
          <div class="space-y-6">
            <app-api-table title="Table Inputs (hk-table)" [entries]="tableInputDocs" />
            <app-api-table title="Outputs" [entries]="treeOutputDocs" />
          </div>
        }

        <!-- Configuration sub-tab -->
        @if (apiTab() === 'configuration') {
          <div class="space-y-6">
            <app-api-table title="Tree Table Config (via createTable treeTable option)" [entries]="treeConfigDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">TreeNode Data Example</h3>
                <p class="text-sm text-base-content/70">
                  Use the standard <code>TreeNode</code> interface with a <code>children</code> property. The tree table automatically
                  detects and renders the hierarchy with inline expand/collapse toggles.
                </p>
                <app-code-block [code]="treeNodeCode" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Custom Children Property Example</h3>
                <p class="text-sm text-base-content/70">
                  For data that uses a property other than <code>children</code> (e.g., <code>items</code>, <code>subRows</code>), set the
                  <code>childrenProperty</code> option along with a <code>getRowKey</code> function.
                </p>
                <app-code-block [code]="customChildrenCode" />
              </div>
            </div>
          </div>
        }

        <!-- Methods sub-tab -->
        @if (apiTab() === 'methods') {
          <div class="space-y-6">
            <app-api-table title="Table Tree Methods" [entries]="treeMethodDocs" />
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">TreeTableConfig</h3>
                <p class="text-sm text-base-content/70">
                  The <code>treeTable</code> object within <code>createTable()</code> configuration. Controls all tree-specific behavior
                  including expansion, indentation, cascade selection, and hierarchy-aware filtering.
                </p>
                <app-code-block [code]="typeTreeTableConfig" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ExpansionChangeEvent</h3>
                <p class="text-sm text-base-content/70">
                  Emitted by the <code>(expansionChange)</code> output whenever a row is expanded or collapsed. Contains the affected row
                  data and its new expansion state.
                </p>
                <app-code-block [code]="typeExpansionChangeEvent" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">CheckboxCascade</h3>
                <p class="text-sm text-base-content/70">
                  Controls how checkbox selection propagates through the hierarchy. Choose between downward-only, upward-only,
                  bidirectional, or no propagation.
                </p>
                <app-code-block [code]="typeCheckboxCascade" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">FilterHierarchyMode</h3>
                <p class="text-sm text-base-content/70">
                  Determines how global search/filtering interacts with the tree hierarchy when rows are filtered. Controls whether ancestor
                  and/or descendant rows remain visible for context.
                </p>
                <app-code-block [code]="typeFilterHierarchyMode" />
              </div>
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class TreeTableDemoComponent {
  private toast = inject(ToastService);
  activeTab = signal<DemoTab>('treenode');
  apiTab = signal<'component' | 'configuration' | 'methods' | 'types'>('component');
  selectedItems = signal<TreeNode<Department>[]>([]);
  cascadeSelectedItems = signal<TreeNode<Department>[]>([]);

  // ViewChild refs for calling methods
  readonly deptTable = viewChild<TableComponent<TreeNode<Department>>>('deptTableRef');
  readonly largeTable =
    viewChild<TableComponent<{ id: string; name: string; category: string; value: number; children?: unknown[] }>>('largeTableRef');

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
            { id: 'app-component', name: 'app.component.ts', type: 'file', size: 2048, modified: new Date('2024-01-14') },
            { id: 'app-module', name: 'app.module.ts', type: 'file', size: 1024, modified: new Date('2024-01-10') },
            { id: 'app-routes', name: 'app.routes.ts', type: 'file', size: 512, modified: new Date('2024-01-12') },
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
        { id: 'src-main', name: 'main.ts', type: 'file', size: 256, modified: new Date('2024-01-01') },
        { id: 'src-index', name: 'index.html', type: 'file', size: 512, modified: new Date('2024-01-01') },
      ],
    },
    { id: 'root-package', name: 'package.json', type: 'file', size: 1536, modified: new Date('2024-01-15') },
    { id: 'root-tsconfig', name: 'tsconfig.json', type: 'file', size: 768, modified: new Date('2024-01-01') },
    { id: 'root-readme', name: 'README.md', type: 'file', size: 2048, modified: new Date('2024-01-10') },
  ]);

  // Generate large dataset
  readonly largeDatasetCount = 6600;
  largeDataset = signal(this.generateLargeDataset());

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
      modified: (value) =>
        new Date(value as Date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    treeTable: {
      enabled: true,
      childrenProperty: 'items',
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
      filterHierarchyMode: 'ancestors',
    },
  });

  // Cascade selection config
  cascadeConfig = createTable<TreeNode<Department>>({
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
          <div><strong>Employees:</strong> ${dept.employees}</div>
        </div>`;
      },
    },
    hasSelection: true,
    treeTable: {
      enabled: true,
      expandAll: true,
      indentSize: 24,
      checkboxCascade: 'both',
    },
  });

  // Hierarchy filtering config
  filteringConfig = createTable<TreeNode<Department>>({
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
        </div>`;
      },
    },
    globalSearch: {
      enabled: true,
      mode: 'contains',
      placeholder: 'Search (try "React" or "API")...',
    },
    treeTable: {
      enabled: true,
      expandAll: true,
      indentSize: 24,
      filterHierarchyMode: 'ancestors',
    },
  });

  // Large dataset config
  largeDatasetConfig = createTable<{ id: string; name: string; category: string; value: number }>({
    visible: ['name', 'category', 'value'],
    headers: {
      name: 'Name',
      category: 'Category',
      value: 'Value',
    },
    formatters: {
      value: (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v)),
    },
    treeTable: {
      enabled: true,
      initialExpandLevel: 1,
      indentSize: 20,
      getRowKey: (row) => row.id,
    },
  });

  paginationOptions = {
    mode: 'offset' as const,
    pageSize: 15,
  };

  // --- API Documentation ---

  tableInputDocs: ApiDocEntry[] = [
    {
      name: 'data',
      type: 'readonly T[] | null',
      default: 'null',
      description:
        'The hierarchical data array to display. For TreeNode-based data, each item uses the standard "children" property. For custom data, specify the children property name in treeTable.childrenProperty.',
    },
    {
      name: 'config',
      type: 'FieldConfiguration<T> | null',
      default: 'null',
      description:
        'Table configuration object returned by createTable(). Contains column definitions, formatters, selection settings, global search config, and the treeTable option that enables hierarchical display.',
    },
    {
      name: 'paginationOptions',
      type: 'PaginationOptions | null',
      default: 'null',
      description:
        "Pagination configuration. Supports offset mode ({ mode: 'offset', pageSize: number }) or cursor mode. In tree table mode, pagination applies to the flattened visible rows.",
    },
    {
      name: 'showFirstLastButtons',
      type: 'boolean',
      default: 'true',
      description: 'Show first/last page navigation buttons in the paginator.',
    },
    { name: 'hidePageSize', type: 'boolean', default: 'false', description: 'Hide the page size selector in the paginator.' },
    { name: 'showPageSizeOptions', type: 'boolean', default: 'true', description: 'Show page size dropdown options in the paginator.' },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'Disable all interactive elements in the table (selection, sorting, filtering, expansion toggles).',
    },
  ];

  treeConfigDocs: ApiDocEntry[] = [
    {
      name: 'treeTable.enabled',
      type: 'boolean',
      default: 'false',
      description:
        'Enable tree table mode. When true, the table renders hierarchical data with inline expand/collapse toggles, indentation, and optional indent guide lines.',
    },
    {
      name: 'treeTable.childrenProperty',
      type: 'string',
      default: "'children'",
      description:
        "Property name on each row object that contains the child items array. Set this when your data uses a custom property like 'items' or 'subRows' instead of the default 'children'.",
    },
    {
      name: 'treeTable.expandAll',
      type: 'boolean',
      default: 'false',
      description:
        'Expand all rows on initial render. All nodes at every depth level are shown expanded. Overrides initialExpandedKeys and initialExpandLevel.',
    },
    {
      name: 'treeTable.initialExpandedKeys',
      type: 'string[]',
      default: '[]',
      description:
        'Array of row keys to expand on initial render. For TreeNode data, these match the node key property. For custom data, keys are generated by getRowKey or by index.',
    },
    {
      name: 'treeTable.initialExpandLevel',
      type: 'number',
      default: '-',
      description:
        'Expand all nodes up to this depth on initial render. 1 = only root nodes are expanded (their children are visible). 2 = roots and their children expanded, etc.',
    },
    {
      name: 'treeTable.indentSize',
      type: 'number',
      default: '24',
      description: 'Indentation size in pixels per nesting level. Controls how far child rows are offset from their parent.',
    },
    {
      name: 'treeTable.getRowKey',
      type: '(row: T) => string',
      default: '-',
      description:
        'Custom function to extract a unique key from each row. Required for non-TreeNode data without a "key" property. Used for tracking expanded state and selection.',
    },
    {
      name: 'treeTable.treeColumnIndex',
      type: 'number',
      default: '0',
      description:
        'Index into the visible[] column array that renders the inline tree toggle (expand/collapse chevron). Defaults to 0 (first visible column).',
    },
    {
      name: 'treeTable.showIndentGuides',
      type: 'boolean',
      default: 'true',
      description: 'Show visual vertical indent guide lines connecting parent and child rows. Helps users visually trace the hierarchy.',
    },
    {
      name: 'treeTable.filterHierarchyMode',
      type: "'ancestors' | 'descendants' | 'both' | 'none'",
      default: "'ancestors'",
      description:
        "Controls how global search/filtering interacts with the tree hierarchy. 'ancestors' keeps parent rows visible when a child matches. 'descendants' shows all children when a parent matches. 'both' combines both behaviors. 'none' filters rows independently.",
    },
    {
      name: 'treeTable.checkboxCascade',
      type: "'none' | 'downward' | 'upward' | 'both'",
      default: "'none'",
      description:
        "Checkbox selection cascade behavior when hasSelection is true. 'downward' auto-selects all children when a parent is checked. 'upward' auto-checks a parent when all children are checked. 'both' enables bidirectional cascade. 'none' disables cascade.",
    },
  ];

  treeMethodDocs: ApiDocEntry[] = [
    {
      name: 'expandAllRows()',
      type: 'void',
      description:
        'Expand every row in the tree, making all descendants visible at every level. Collects all row keys and marks them as expanded.',
    },
    {
      name: 'collapseAllRows()',
      type: 'void',
      description: 'Collapse every row in the tree, hiding all child rows. Only root-level rows remain visible.',
    },
    {
      name: 'expandToLevel(n)',
      type: 'void',
      description:
        'Expand all nodes up to depth n. For example, expandToLevel(1) expands only root nodes so their direct children are visible. expandToLevel(2) also expands those children.',
    },
    {
      name: 'collapseToLevel(n)',
      type: 'void',
      description:
        'Collapse nodes deeper than depth n, keeping shallower levels expanded. collapseToLevel(1) keeps roots expanded but collapses everything below.',
    },
    {
      name: 'toggleRowExpand(row, event?)',
      type: 'void',
      description:
        'Toggle a specific row between expanded and collapsed states. Optionally pass the MouseEvent to stop propagation. Triggers expand animation on newly revealed children and emits expansionChange.',
    },
    {
      name: 'isRowExpanded(row)',
      type: 'boolean',
      description:
        'Check whether a specific row is currently expanded. Returns false for rows without children or rows not in the expanded set.',
    },
    {
      name: 'getRowLevel(row)',
      type: 'number',
      description: 'Get the nesting depth level of a row. Returns 0 for root-level rows, 1 for their children, and so on.',
    },
    {
      name: 'getRowIndentPadding(row)',
      type: 'number',
      description:
        'Get the computed left padding in pixels for a row based on its nesting level. Includes an 8px base padding plus level * indentSize.',
    },
    {
      name: 'hasChildren(row)',
      type: 'boolean',
      description: 'Check whether a row has child rows (based on the configured childrenProperty).',
    },
    {
      name: 'isIndeterminate(row)',
      type: 'boolean',
      description:
        'Check if a parent row has a partial/indeterminate selection state. Returns true when some (but not all) children are selected and checkboxCascade is enabled. Used to show the indeterminate checkbox visual.',
    },
  ];

  treeOutputDocs: ApiDocEntry[] = [
    {
      name: 'expansionChange',
      type: '{ row: T; expanded: boolean }',
      description:
        'Emitted when a row is expanded or collapsed. The event contains the row data and its new expansion state (true = expanded, false = collapsed).',
    },
    {
      name: 'selectionChange',
      type: 'readonly T[]',
      description:
        'Emitted when row selection changes (requires hasSelection in config). Returns the array of all currently selected rows. In cascade mode, includes rows selected via propagation.',
    },
    {
      name: 'sortChange',
      type: 'SortChange',
      description:
        'Emitted when the sort column or direction changes. In tree table mode, sorting is hierarchy-aware: children are sorted within their parent group.',
    },
    {
      name: 'globalSearchChange',
      type: 'GlobalSearchChange',
      description:
        'Emitted when the global search input changes. In tree table mode with filterHierarchyMode, ancestors of matching rows stay visible.',
    },
    { name: 'rowClick', type: 'T', description: 'Emitted when a row is clicked. Provides the row data for the clicked row.' },
  ];

  // --- Code Examples ---

  treeNodeCode = `const treeNodeConfig = createTable<TreeNode<Department>>({
  visible: ['label', 'data'],
  headers: { label: 'Department', data: 'Details' },
  treeTable: {
    enabled: true,
    initialExpandedKeys: ['eng'],
    indentSize: 24,
    // Toggle is now inline in the first visible column (no separate expand column)
  },
});

// Template — use viewChild to call expandToLevel/collapseAllRows
<hk-table #deptTable [data]="data()" [config]="config" />
<button (click)="deptTable()?.expandToLevel(2)">Expand to Level 2</button>`;

  customChildrenCode = `const customChildrenConfig = createTable<FileSystemItem>({
  visible: ['name', 'type', 'size', 'modified'],
  treeTable: {
    enabled: true,
    childrenProperty: 'items', // Custom property name
    expandAll: true,
    getRowKey: (row) => row.id,
    checkboxCascade: 'both', // Cascade selection
    filterHierarchyMode: 'ancestors', // Keep ancestors of matching children
  },
});`;

  // Dept table actions
  expandAllDept() {
    this.deptTable()?.expandAllRows();
  }
  collapseAllDept() {
    this.deptTable()?.collapseAllRows();
  }
  expandDeptToLevel(level: number) {
    this.deptTable()?.expandToLevel(level);
  }

  // Large table actions
  expandAllLarge() {
    this.largeTable()?.expandAllRows();
  }
  collapseAllLarge() {
    this.largeTable()?.collapseAllRows();
  }
  expandLargeToLevel(level: number) {
    this.largeTable()?.expandToLevel(level);
  }

  onExpansionChange(event: { row: TreeNode<Department>; expanded: boolean }) {
    console.log('Expansion changed:', event.row.label, 'expanded:', event.expanded);
  }

  onSelection(items: readonly TreeNode<Department>[]) {
    this.selectedItems.set([...items]);
  }

  onCascadeSelection(items: readonly TreeNode<Department>[]) {
    this.cascadeSelectedItems.set([...items]);
  }

  private generateLargeDataset(): { id: string; name: string; category: string; value: number; children?: unknown[] }[] {
    const categories = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
    const roots: { id: string; name: string; category: string; value: number; children?: unknown[] }[] = [];

    for (let i = 0; i < 100; i++) {
      const children: { id: string; name: string; category: string; value: number; children?: unknown[] }[] = [];
      for (let j = 0; j < 10; j++) {
        const grandchildren: { id: string; name: string; category: string; value: number }[] = [];
        for (let k = 0; k < 5; k++) {
          grandchildren.push({
            id: `${i}-${j}-${k}`,
            name: `Item ${i}.${j}.${k}`,
            category: categories[(i + j + k) % categories.length],
            value: Math.round(Math.random() * 10000),
          });
        }
        children.push({
          id: `${i}-${j}`,
          name: `Group ${i}.${j}`,
          category: categories[(i + j) % categories.length],
          value: Math.round(Math.random() * 50000),
          children: grandchildren,
        });
      }
      roots.push({
        id: `${i}`,
        name: `Root ${i}`,
        category: categories[i % categories.length],
        value: Math.round(Math.random() * 100000),
        children,
      });
    }

    return roots;
  }

  // --- Type definitions ---
  typeTreeTableConfig = `interface TreeTableConfig<T> {
  enabled: boolean;             // Enable tree table mode
  childrenProperty?: string;    // Property name for children (default: 'children')
  expandAll?: boolean;          // Expand all rows on init
  initialExpandedKeys?: string[];  // Keys to expand on init
  initialExpandLevel?: number;  // Expand nodes up to this depth
  indentSize?: number;          // Pixels per indent level (default: 24)
  getRowKey?: (row: T) => string;  // Custom row key extractor
  treeColumnIndex?: number;     // Column index for toggle (default: 0)
  showIndentGuides?: boolean;   // Show vertical indent lines (default: true)
  filterHierarchyMode?: FilterHierarchyMode;
  checkboxCascade?: CheckboxCascade;
}`;

  typeExpansionChangeEvent = `interface ExpansionChangeEvent<T> {
  row: T;          // The row that was expanded or collapsed
  expanded: boolean;  // true = expanded, false = collapsed
}`;

  typeCheckboxCascade = `type CheckboxCascade =
  | 'none'      // No cascade - each checkbox is independent
  | 'downward'  // Checking a parent auto-checks all descendants
  | 'upward'    // When all children checked, parent auto-checks
  | 'both';     // Bidirectional: combines downward and upward`;

  typeFilterHierarchyMode = `type FilterHierarchyMode =
  | 'ancestors'    // Keep parent rows visible when a child matches
  | 'descendants'  // Show all children when a parent matches
  | 'both'         // Combines ancestors and descendants behavior
  | 'none';        // Filter rows independently (flat filtering)`;
}
