import { Component, signal } from '@angular/core';
import {
  OrganizationChartComponent,
  TreeNode,
  OrgChartNodeSelectEvent,
  OrgChartNodeExpandEvent,
  OrgChartNodeCollapseEvent,
} from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { ApiDocEntry } from '../shared/api-table.types';

type OrgChartTab = 'basic' | 'selection' | 'templates' | 'colors';

interface Person {
  name: string;
  title: string;
  avatar?: string;
}

@Component({
  selector: 'app-org-chart-demo',
  imports: [OrganizationChartComponent, DocSectionComponent, ApiTableComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Organization Chart</h1>
        <p class="text-base-content/70 mt-2">Visualize hierarchical organizational data</p>
        <div class="mt-2">
          <code class="badge badge-outline text-xs">import {{ '{' }} OrganizationChartComponent {{ '}' }} from '&#64;hakistack/ng-daisyui'</code>
        </div>
      </div>

      <!-- Page Tabs -->
      <div role="tablist" class="tabs tabs-bordered">
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'examples'" (click)="pageTab.set('examples')">Examples</button>
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'api'" (click)="pageTab.set('api')">API</button>
      </div>

      @if (pageTab() === 'examples') {
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-boxed">
          <input type="radio" name="orgchart_tabs" role="tab" class="tab" aria-label="Basic"
            [checked]="activeTab() === 'basic'" (change)="activeTab.set('basic')" />
          <input type="radio" name="orgchart_tabs" role="tab" class="tab" aria-label="Selection"
            [checked]="activeTab() === 'selection'" (change)="activeTab.set('selection')" />
          <input type="radio" name="orgchart_tabs" role="tab" class="tab" aria-label="Templates"
            [checked]="activeTab() === 'templates'" (change)="activeTab.set('templates')" />
          <input type="radio" name="orgchart_tabs" role="tab" class="tab" aria-label="Colors"
            [checked]="activeTab() === 'colors'" (change)="activeTab.set('colors')" />
        </div>

        @if (activeTab() === 'basic') {
          <div class="space-y-6">
            <app-doc-section title="Basic Organization Chart" description="Simple hierarchical data visualization" [codeExample]="basicCode">
              <div class="overflow-x-auto">
                <hk-organization-chart [value]="basicData" />
              </div>
            </app-doc-section>

            <app-doc-section title="With Icons" description="Nodes can display Lucide icons">
              <div class="overflow-x-auto">
                <hk-organization-chart [value]="dataWithIcons" />
              </div>
            </app-doc-section>

            <app-doc-section title="Collapsible Nodes" description="Click the toggle button to expand/collapse nodes">
              <div class="overflow-x-auto">
                <hk-organization-chart
                  [value]="collapsibleData"
                  (onNodeExpand)="onExpand($event)"
                  (onNodeCollapse)="onCollapse($event)"
                />
              </div>
              @if (lastEvent()) {
                <div class="alert alert-info mt-4">
                  <span>{{ lastEvent() }}</span>
                </div>
              }
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'selection') {
          <div class="space-y-6">
            <app-doc-section title="Single Selection" description="Click on a node to select it" [codeExample]="singleSelectCode">
              <div class="overflow-x-auto">
                <hk-organization-chart
                  [value]="basicData"
                  selectionMode="single"
                  (onNodeSelect)="onSelect($event)"
                />
              </div>
              @if (selectedNode()) {
                <div class="alert alert-success mt-4">
                  <span>Selected: {{ selectedNode()?.label }}</span>
                </div>
              }
            </app-doc-section>

            <app-doc-section title="Multiple Selection" description="Select multiple nodes">
              <div class="overflow-x-auto">
                <hk-organization-chart
                  [value]="basicData"
                  selectionMode="multiple"
                  (selectionChange)="onMultiSelect($event)"
                />
              </div>
              @if (selectedNodes().length > 0) {
                <div class="alert alert-success mt-4">
                  <span>Selected: {{ getSelectedLabels() }}</span>
                </div>
              }
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'templates') {
          <app-doc-section title="Custom Node Template" description="Use ng-template to customize node rendering" [codeExample]="templateCode">
            <div class="overflow-x-auto">
              <hk-organization-chart [value]="templateData" selectionMode="single">
                <ng-template #nodeTemplate let-node let-selected="selected">
                  <div class="flex flex-col items-center gap-2 p-2">
                    <div class="avatar placeholder">
                      <div
                        class="w-12 rounded-full"
                        [class.bg-primary]="selected"
                        [class.bg-neutral]="!selected"
                        [class.text-primary-content]="selected"
                        [class.text-neutral-content]="!selected"
                      >
                        <span class="text-lg">{{ getInitials(node.data?.name) }}</span>
                      </div>
                    </div>
                    <div class="text-center">
                      <div class="font-semibold text-sm">{{ node.data?.name }}</div>
                      <div class="text-xs text-base-content/60">{{ node.data?.title }}</div>
                    </div>
                  </div>
                </ng-template>
              </hk-organization-chart>
            </div>
          </app-doc-section>
        }

        @if (activeTab() === 'colors') {
          <div class="space-y-6">
            <app-doc-section title="Node Colors" description="Use the type property to set node colors">
              <div class="overflow-x-auto">
                <hk-organization-chart [value]="colorData" />
              </div>
              <div class="mt-4 text-sm text-base-content/60">
                Available colors: <code class="bg-base-200 px-1">primary</code>,
                <code class="bg-base-200 px-1">secondary</code>,
                <code class="bg-base-200 px-1">accent</code>,
                <code class="bg-base-200 px-1">neutral</code>,
                <code class="bg-base-200 px-1">info</code>,
                <code class="bg-base-200 px-1">success</code>,
                <code class="bg-base-200 px-1">warning</code>,
                <code class="bg-base-200 px-1">error</code>
              </div>
            </app-doc-section>

            <app-doc-section title="Default Node Color" description="Set a default color for all nodes">
              <div class="flex flex-wrap gap-2 mb-4">
                @for (color of colors; track color) {
                  <button
                    class="btn btn-sm"
                    [class.btn-primary]="defaultColor() === color"
                    [class.btn-ghost]="defaultColor() !== color"
                    (click)="defaultColor.set(color)"
                  >
                    {{ color }}
                  </button>
                }
              </div>
              <div class="overflow-x-auto">
                <hk-organization-chart [value]="basicData" [nodeColor]="defaultColor()" />
              </div>
            </app-doc-section>
          </div>
        }
      }

      @if (pageTab() === 'api') {
        <div class="space-y-6">
          <app-api-table title="Inputs" [entries]="inputDocs" />
          <app-api-table title="Outputs" [entries]="outputDocs" />
          <app-api-table title="Methods" [entries]="methodDocs" />
        </div>
      }
    </div>
  `,
})
export class OrgChartDemoComponent {
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<OrgChartTab>('basic');
  selectedNode = signal<TreeNode | null>(null);
  selectedNodes = signal<TreeNode[]>([]);
  lastEvent = signal<string>('');
  defaultColor = signal<'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error'>('primary');

  colors: Array<'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error'> = [
    'primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'
  ];

  basicData: TreeNode[] = [
    {
      key: '1',
      label: 'CEO',
      expanded: true,
      children: [
        {
          key: '2',
          label: 'CTO',
          expanded: true,
          children: [
            { key: '5', label: 'Dev Lead' },
            { key: '6', label: 'QA Lead' },
          ],
        },
        {
          key: '3',
          label: 'CFO',
          expanded: true,
          children: [
            { key: '7', label: 'Accountant' },
            { key: '8', label: 'Controller' },
          ],
        },
        {
          key: '4',
          label: 'COO',
          expanded: true,
          children: [
            { key: '9', label: 'Operations Manager' },
            { key: '10', label: 'HR Manager' },
          ],
        },
      ],
    },
  ];

  dataWithIcons: TreeNode[] = [
    {
      key: '1',
      label: 'Company',
      icon: 'Building2',
      expanded: true,
      children: [
        {
          key: '2',
          label: 'Engineering',
          icon: 'Code',
          expanded: true,
          children: [
            { key: '5', label: 'Frontend', icon: 'Monitor' },
            { key: '6', label: 'Backend', icon: 'Server' },
          ],
        },
        {
          key: '3',
          label: 'Design',
          icon: 'Palette',
          expanded: true,
          children: [
            { key: '7', label: 'UI/UX', icon: 'Figma' },
            { key: '8', label: 'Brand', icon: 'Brush' },
          ],
        },
      ],
    },
  ];

  collapsibleData: TreeNode[] = [
    {
      key: '1',
      label: 'Root',
      expanded: true,
      children: [
        {
          key: '2',
          label: 'Branch A',
          expanded: false,
          children: [
            { key: '5', label: 'Leaf A1' },
            { key: '6', label: 'Leaf A2' },
          ],
        },
        {
          key: '3',
          label: 'Branch B',
          expanded: false,
          children: [
            { key: '7', label: 'Leaf B1' },
            { key: '8', label: 'Leaf B2' },
          ],
        },
      ],
    },
  ];

  templateData: TreeNode<Person>[] = [
    {
      key: '1',
      label: 'John Smith',
      data: { name: 'John Smith', title: 'CEO' },
      expanded: true,
      children: [
        {
          key: '2',
          label: 'Sarah Johnson',
          data: { name: 'Sarah Johnson', title: 'CTO' },
          expanded: true,
          children: [
            { key: '5', label: 'Mike Brown', data: { name: 'Mike Brown', title: 'Lead Developer' } },
            { key: '6', label: 'Emily Davis', data: { name: 'Emily Davis', title: 'QA Manager' } },
          ],
        },
        {
          key: '3',
          label: 'David Wilson',
          data: { name: 'David Wilson', title: 'CFO' },
          expanded: true,
          children: [
            { key: '7', label: 'Lisa Anderson', data: { name: 'Lisa Anderson', title: 'Accountant' } },
          ],
        },
      ],
    },
  ];

  colorData: TreeNode[] = [
    {
      key: '1',
      label: 'CEO',
      type: 'primary',
      expanded: true,
      children: [
        {
          key: '2',
          label: 'CTO',
          type: 'info',
          expanded: true,
          children: [
            { key: '5', label: 'Developer', type: 'info' },
          ],
        },
        {
          key: '3',
          label: 'CFO',
          type: 'success',
          expanded: true,
          children: [
            { key: '6', label: 'Accountant', type: 'success' },
          ],
        },
        {
          key: '4',
          label: 'COO',
          type: 'warning',
          expanded: true,
          children: [
            { key: '7', label: 'Manager', type: 'warning' },
          ],
        },
      ],
    },
  ];

  getInitials(name?: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  getSelectedLabels(): string {
    return this.selectedNodes()
      .map(n => n.label)
      .join(', ');
  }

  onSelect(event: OrgChartNodeSelectEvent): void {
    this.selectedNode.set(event.node);
  }

  onMultiSelect(nodes: TreeNode | TreeNode[] | null): void {
    if (Array.isArray(nodes)) {
      this.selectedNodes.set(nodes);
    } else if (nodes) {
      this.selectedNodes.set([nodes]);
    } else {
      this.selectedNodes.set([]);
    }
  }

  onExpand(event: OrgChartNodeExpandEvent): void {
    this.lastEvent.set(`Expanded: ${event.node.label}`);
  }

  onCollapse(event: OrgChartNodeCollapseEvent): void {
    this.lastEvent.set(`Collapsed: ${event.node.label}`);
  }

  // --- Code examples ---
  basicCode = `// TypeScript
orgData: TreeNode[] = [
  {
    label: 'CEO',
    expanded: true,
    children: [
      {
        label: 'CTO',
        children: [{ label: 'Dev Lead' }, { label: 'QA Lead' }],
      },
      {
        label: 'CFO',
        children: [{ label: 'Accountant' }],
      },
    ],
  },
];

// Template
<hk-organization-chart [value]="orgData" />`;

  singleSelectCode = `// TypeScript
selectedNode = signal<TreeNode | null>(null);

onSelect(event: OrgChartNodeSelectEvent): void {
  this.selectedNode.set(event.node);
}

// Template
<hk-organization-chart
  [value]="orgData"
  selectionMode="single"
  (onNodeSelect)="onSelect($event)"
/>`;

  templateCode = `// TypeScript
interface Person {
  name: string;
  title: string;
}

templateData: TreeNode<Person>[] = [
  {
    label: 'John Smith',
    data: { name: 'John Smith', title: 'CEO' },
    expanded: true,
    children: [
      { label: 'Sarah Johnson', data: { name: 'Sarah Johnson', title: 'CTO' } },
      { label: 'David Wilson', data: { name: 'David Wilson', title: 'CFO' } },
    ],
  },
];

// Template
<hk-organization-chart [value]="templateData" selectionMode="single">
  <ng-template #nodeTemplate let-node let-selected="selected">
    <div class="flex flex-col items-center gap-2 p-2">
      <div class="avatar placeholder">
        <div class="w-12 rounded-full" [class.bg-primary]="selected">
          <span>{{ getInitials(node.data?.name) }}</span>
        </div>
      </div>
      <div class="font-semibold text-sm">{{ node.data?.name }}</div>
      <div class="text-xs">{{ node.data?.title }}</div>
    </div>
  </ng-template>
</hk-organization-chart>`;

  // --- API docs ---
  inputDocs: ApiDocEntry[] = [
    { name: 'value', type: 'TreeNode<T>[]', default: '[]', description: 'Hierarchical data to display' },
    { name: 'selectionMode', type: "'single' | 'multiple' | 'checkbox' | null", default: 'null', description: 'Node selection mode' },
    { name: 'selection', type: 'TreeNode<T> | TreeNode<T>[] | null', default: 'null', description: 'Currently selected node(s)' },
    { name: 'preserveSpace', type: 'boolean', default: 'true', description: 'Preserve space for collapsed nodes' },
    { name: 'orientation', type: "'vertical' | 'horizontal'", default: "'vertical'", description: 'Chart orientation' },
    { name: 'nodeColor', type: 'OrgChartNodeColor', default: "'primary'", description: 'Default node color' },
    { name: 'collapsible', type: 'boolean', default: 'true', description: 'Whether nodes can be collapsed' },
    { name: 'showLines', type: 'boolean', default: 'true', description: 'Show connecting lines' },
    { name: 'lineColor', type: 'string', default: "''", description: 'Custom line color' },
  ];

  outputDocs: ApiDocEntry[] = [
    { name: 'onNodeSelect', type: 'OrgChartNodeSelectEvent<T>', description: 'Emitted when a node is selected' },
    { name: 'onNodeUnselect', type: 'OrgChartNodeUnselectEvent<T>', description: 'Emitted when a node is unselected' },
    { name: 'onNodeExpand', type: 'OrgChartNodeExpandEvent<T>', description: 'Emitted when a node is expanded' },
    { name: 'onNodeCollapse', type: 'OrgChartNodeCollapseEvent<T>', description: 'Emitted when a node is collapsed' },
    { name: 'selectionChange', type: 'TreeNode<T> | TreeNode<T>[] | null', description: 'Emitted when selection changes' },
  ];

  methodDocs: ApiDocEntry[] = [
    { name: 'isNodeSelected(node)', type: 'boolean', description: 'Check if a node is selected' },
    { name: 'hasChildren(node)', type: 'boolean', description: 'Check if a node has children' },
    { name: 'isExpanded(node)', type: 'boolean', description: 'Check if a node is expanded' },
    { name: 'toggleNode(event, node)', type: 'void', description: 'Toggle node expand/collapse' },
    { name: 'selectNode(event, node)', type: 'void', description: 'Select a node' },
    { name: 'getNodeColor(node)', type: 'OrgChartNodeColor', description: 'Get the computed color of a node' },
  ];
}
