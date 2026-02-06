import { Component, signal } from '@angular/core';
import {
  OrganizationChartComponent,
  TreeNode,
  OrgChartNodeSelectEvent,
  OrgChartNodeExpandEvent,
  OrgChartNodeCollapseEvent,
} from '@hakistack/ng-daisyui';

type OrgChartTab = 'basic' | 'selection' | 'templates' | 'colors';

interface Person {
  name: string;
  title: string;
  avatar?: string;
}

@Component({
  selector: 'app-org-chart-demo',
  imports: [OrganizationChartComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Organization Chart</h1>
        <p class="text-base-content/70 mt-2">Visualize hierarchical organizational data</p>
      </div>

      <!-- Tabs -->
      <div role="tablist" class="tabs tabs-box">
        <input
          type="radio"
          name="orgchart_tabs"
          role="tab"
          class="tab"
          aria-label="Basic"
          [checked]="activeTab() === 'basic'"
          (change)="activeTab.set('basic')"
        />
        <input
          type="radio"
          name="orgchart_tabs"
          role="tab"
          class="tab"
          aria-label="Selection"
          [checked]="activeTab() === 'selection'"
          (change)="activeTab.set('selection')"
        />
        <input
          type="radio"
          name="orgchart_tabs"
          role="tab"
          class="tab"
          aria-label="Templates"
          [checked]="activeTab() === 'templates'"
          (change)="activeTab.set('templates')"
        />
        <input
          type="radio"
          name="orgchart_tabs"
          role="tab"
          class="tab"
          aria-label="Colors"
          [checked]="activeTab() === 'colors'"
          (change)="activeTab.set('colors')"
        />
      </div>

      <!-- Basic Tab -->
      @if (activeTab() === 'basic') {
        <div class="space-y-6">
          <!-- Basic Chart -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Basic Organization Chart</h2>
              <p class="text-sm text-base-content/60 mb-4">Simple hierarchical data visualization</p>

              <div class="overflow-x-auto">
                <app-organization-chart [value]="basicData" />
              </div>

              <div class="mt-4 text-sm text-base-content/60">
                <code class="bg-base-200 px-2 py-1 rounded">&lt;app-organization-chart [value]="data" /&gt;</code>
              </div>
            </div>
          </div>

          <!-- With Icons -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">With Icons</h2>
              <p class="text-sm text-base-content/60 mb-4">Nodes can display Lucide icons</p>

              <div class="overflow-x-auto">
                <app-organization-chart [value]="dataWithIcons" />
              </div>
            </div>
          </div>

          <!-- Collapsed by Default -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Collapsible Nodes</h2>
              <p class="text-sm text-base-content/60 mb-4">Click the toggle button to expand/collapse nodes</p>

              <div class="overflow-x-auto">
                <app-organization-chart
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
            </div>
          </div>
        </div>
      }

      <!-- Selection Tab -->
      @if (activeTab() === 'selection') {
        <div class="space-y-6">
          <!-- Single Selection -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Single Selection</h2>
              <p class="text-sm text-base-content/60 mb-4">Click on a node to select it</p>

              <div class="overflow-x-auto">
                <app-organization-chart
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
            </div>
          </div>

          <!-- Multiple Selection -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Multiple Selection</h2>
              <p class="text-sm text-base-content/60 mb-4">Select multiple nodes</p>

              <div class="overflow-x-auto">
                <app-organization-chart
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
            </div>
          </div>
        </div>
      }

      <!-- Templates Tab -->
      @if (activeTab() === 'templates') {
        <div class="space-y-6">
          <!-- Custom Template -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Custom Node Template</h2>
              <p class="text-sm text-base-content/60 mb-4">Use ng-template to customize node rendering</p>

              <div class="overflow-x-auto">
                <app-organization-chart [value]="templateData" selectionMode="single">
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
                </app-organization-chart>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Colors Tab -->
      @if (activeTab() === 'colors') {
        <div class="space-y-6">
          <!-- Color Variants -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Node Colors</h2>
              <p class="text-sm text-base-content/60 mb-4">Use the type property to set node colors</p>

              <div class="overflow-x-auto">
                <app-organization-chart [value]="colorData" />
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
            </div>
          </div>

          <!-- Default Color -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Default Node Color</h2>
              <p class="text-sm text-base-content/60 mb-4">Set a default color for all nodes</p>

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
                <app-organization-chart [value]="basicData" [nodeColor]="defaultColor()" />
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class OrgChartDemoComponent {
  activeTab = signal<OrgChartTab>('basic');
  selectedNode = signal<TreeNode | null>(null);
  selectedNodes = signal<TreeNode[]>([]);
  lastEvent = signal<string>('');
  defaultColor = signal<'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error'>('primary');

  colors: Array<'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error'> = [
    'primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'
  ];

  // Basic hierarchical data
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

  // Data with icons
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

  // Collapsible data (starts collapsed)
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

  // Data with custom templates
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

  // Data with colors
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
}
