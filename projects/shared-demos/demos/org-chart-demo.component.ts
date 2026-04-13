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
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';
import { DemoPageComponent } from '../shared/demo-page.component';

type OrgChartTab = 'basic' | 'selection' | 'templates' | 'colors';

interface Person {
  name: string;
  title: string;
  avatar?: string;
}

@Component({
  selector: 'app-org-chart-demo',
  imports: [OrganizationChartComponent, DocSectionComponent, ApiTableComponent, CodeBlockComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="Organization Chart"
      description="Visualize hierarchies with customizable node templates and interactive selection"
      icon="Network"
      category="Data Display"
      importName="OrganizationChartComponent"
    >
      <div examples class="space-y-6">
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'basic'" (click)="activeTab.set('basic')">Basic</button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'selection'" (click)="activeTab.set('selection')">
            Selection
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'templates'" (click)="activeTab.set('templates')">
            Templates
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'colors'" (click)="activeTab.set('colors')">Colors</button>
        </div>

        @if (activeTab() === 'basic') {
          <div class="space-y-6">
            <app-doc-section
              title="Basic Organization Chart"
              description="Simple hierarchical data visualization"
              [codeExample]="basicCode"
            >
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
                <hk-organization-chart [value]="collapsibleData" (onNodeExpand)="onExpand($event)" (onNodeCollapse)="onCollapse($event)" />
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
                <hk-organization-chart [value]="basicData" selectionMode="single" (onNodeSelect)="onSelect($event)" />
              </div>
              @if (selectedNode()) {
                <div class="alert alert-success mt-4">
                  <span>Selected: {{ selectedNode()?.label }}</span>
                </div>
              }
            </app-doc-section>

            <app-doc-section title="Multiple Selection" description="Select multiple nodes">
              <div class="overflow-x-auto">
                <hk-organization-chart [value]="basicData" selectionMode="multiple" (selectionChange)="onMultiSelect($event)" />
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
          <app-doc-section
            title="Custom Node Template"
            description="Use ng-template to customize node rendering"
            [codeExample]="templateCode"
          >
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
                Available colors: <code class="bg-base-200 px-1">primary</code>, <code class="bg-base-200 px-1">secondary</code>,
                <code class="bg-base-200 px-1">accent</code>, <code class="bg-base-200 px-1">neutral</code>,
                <code class="bg-base-200 px-1">info</code>, <code class="bg-base-200 px-1">success</code>,
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
      </div>

      <div api class="space-y-6">
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'component'" (click)="apiTab.set('component')">Component</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'node-config'" (click)="apiTab.set('node-config')">
            Node Configuration
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'methods'" (click)="apiTab.set('methods')">Methods</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>

        <!-- Component sub-tab -->
        @if (apiTab() === 'component') {
          <div class="space-y-6">
            <app-api-table title="Inputs" [entries]="inputDocs" />
            <app-api-table title="Outputs" [entries]="outputDocs" />
          </div>
        }

        <!-- Node Configuration sub-tab -->
        @if (apiTab() === 'node-config') {
          <div class="space-y-6">
            <app-api-table title="TreeNode Properties" [entries]="treeNodeDocs" />
            <app-api-table title="Custom Node Template" [entries]="nodeTemplateDocs" />
          </div>
        }

        <!-- Methods sub-tab -->
        @if (apiTab() === 'methods') {
          <div class="space-y-6">
            <app-api-table title="Public Methods" [entries]="methodDocs" />
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">TreeNode&lt;T&gt;</h3>
                <p class="text-sm text-base-content/70">
                  The data structure used to define each node in the chart. Supports generic typing for custom data payloads via the
                  <code>data</code> property.
                </p>
                <app-code-block [code]="typeTreeNode" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">OrgChartNodeColor</h3>
                <p class="text-sm text-base-content/70">
                  Union type of DaisyUI color names that can be applied to nodes via the <code>type</code> property on a TreeNode or the
                  <code>nodeColor</code> input on the component.
                </p>
                <app-code-block [code]="typeOrgChartNodeColor" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Event Types</h3>
                <p class="text-sm text-base-content/70">
                  All event payloads include the original DOM event and the affected node. Use these types to properly handle output events.
                </p>
                <app-code-block [code]="typeEvents" />
              </div>
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class OrgChartDemoComponent {
  activeTab = signal<OrgChartTab>('basic');
  apiTab = signal<'component' | 'node-config' | 'methods' | 'types'>('component');
  selectedNode = signal<TreeNode | null>(null);
  selectedNodes = signal<TreeNode[]>([]);
  lastEvent = signal<string>('');
  defaultColor = signal<'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error'>('primary');

  colors: Array<'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error'> = [
    'primary',
    'secondary',
    'accent',
    'neutral',
    'info',
    'success',
    'warning',
    'error',
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
          children: [{ key: '7', label: 'Lisa Anderson', data: { name: 'Lisa Anderson', title: 'Accountant' } }],
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
          children: [{ key: '5', label: 'Developer', type: 'info' }],
        },
        {
          key: '3',
          label: 'CFO',
          type: 'success',
          expanded: true,
          children: [{ key: '6', label: 'Accountant', type: 'success' }],
        },
        {
          key: '4',
          label: 'COO',
          type: 'warning',
          expanded: true,
          children: [{ key: '7', label: 'Manager', type: 'warning' }],
        },
      ],
    },
  ];

  getInitials(name?: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  getSelectedLabels(): string {
    return this.selectedNodes()
      .map((n) => n.label)
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
    { name: 'value', type: 'TreeNode<T>[]', default: '[]', description: 'The hierarchical data to display' },
    {
      name: 'selectionMode',
      type: "'single' | 'multiple' | 'checkbox' | null",
      default: 'null',
      description: 'Node selection mode. Null disables selection.',
    },
    {
      name: 'selection',
      type: 'TreeNode<T> | TreeNode<T>[] | null',
      default: 'null',
      description: 'Currently selected node(s). Use with selectionChange for two-way binding.',
    },
    { name: 'preserveSpace', type: 'boolean', default: 'true', description: 'Whether to preserve space for collapsed nodes in the layout' },
    {
      name: 'orientation',
      type: "'vertical' | 'horizontal'",
      default: "'vertical'",
      description: 'Chart orientation (vertical draws top-to-bottom, horizontal draws left-to-right)',
    },
    {
      name: 'nodeColor',
      type: 'OrgChartNodeColor',
      default: "'primary'",
      description: 'Default node color applied when a node has no type set',
    },
    { name: 'collapsible', type: 'boolean', default: 'true', description: 'Whether nodes with children can be collapsed/expanded' },
    { name: 'styleClass', type: 'string', default: "''", description: 'Custom CSS class applied to the chart container element' },
    { name: 'showLines', type: 'boolean', default: 'true', description: 'Whether to show connecting lines between nodes' },
    { name: 'lineColor', type: 'string', default: "''", description: 'Custom CSS color for the connecting lines (overrides default)' },
  ];

  outputDocs: ApiDocEntry[] = [
    {
      name: 'onNodeSelect',
      type: 'OrgChartNodeSelectEvent<T>',
      description: 'Emitted when a node is selected. Payload includes the original DOM event and the selected node.',
    },
    {
      name: 'onNodeUnselect',
      type: 'OrgChartNodeUnselectEvent<T>',
      description: 'Emitted when a node is unselected. Payload includes the original DOM event and the unselected node.',
    },
    {
      name: 'onNodeExpand',
      type: 'OrgChartNodeExpandEvent<T>',
      description: 'Emitted when a collapsed node is expanded. Payload includes the original DOM event and the expanded node.',
    },
    {
      name: 'onNodeCollapse',
      type: 'OrgChartNodeCollapseEvent<T>',
      description: 'Emitted when an expanded node is collapsed. Payload includes the original DOM event and the collapsed node.',
    },
    {
      name: 'selectionChange',
      type: 'TreeNode<T> | TreeNode<T>[] | null',
      description: 'Emitted when the selection changes. Use for two-way binding with [selection]. Returns null when nothing is selected.',
    },
  ];

  methodDocs: ApiDocEntry[] = [
    {
      name: 'isNodeSelected(node)',
      type: 'boolean',
      description: 'Returns whether the given node is currently in the selected set. Works for both single and multiple selection modes.',
    },
    {
      name: 'hasChildren(node)',
      type: 'boolean',
      description:
        'Returns whether the node has child nodes. Respects the leaf property -- nodes marked as leaf return false even if they have a children array.',
    },
    {
      name: 'isExpanded(node)',
      type: 'boolean',
      description: 'Returns whether the node is currently expanded, showing its children in the chart layout.',
    },
    {
      name: 'getNodeIcon(node)',
      type: 'IconName | undefined',
      description:
        'Returns the resolved Lucide icon name for a node. If the node has expandedIcon/collapsedIcon overrides, uses the appropriate one based on expansion state.',
    },
    {
      name: 'toggleNode(event, node)',
      type: 'void',
      description:
        'Programmatically toggle a node between expanded and collapsed states. Emits onNodeExpand or onNodeCollapse accordingly.',
    },
    {
      name: 'selectNode(event, node)',
      type: 'void',
      description:
        'Programmatically select or unselect a node based on the current selection mode. In single mode, replaces the selection; in multiple mode, toggles the node.',
    },
    {
      name: 'getNodeColor(node)',
      type: 'OrgChartNodeColor',
      description:
        'Returns the effective color for a node. Uses the node type property if set, otherwise falls back to the component-level nodeColor input default.',
    },
    {
      name: 'getNodeClasses(node, level)',
      type: 'string',
      description:
        'Returns the computed CSS class string for a node based on its color, selection state, nesting level, and loading state.',
    },
    {
      name: 'getNodeStyle(node)',
      type: 'Record<string, string>',
      description: 'Returns the inline style object from the node configuration. Used internally to apply custom per-node styles.',
    },
    {
      name: 'getTemplateContext(node, level)',
      type: 'OrgChartNodeTemplateContext<T>',
      description:
        'Returns the context object passed to custom node templates. Includes the node, whether it is selected, expanded, its nesting level, and toggle/select callback functions.',
    },
    {
      name: 'trackByNode(index, node)',
      type: 'string',
      description: 'Track-by function used for rendering optimization. Resolves the identity by key, then label, then serialized data.',
    },
  ];

  treeNodeDocs: ApiDocEntry[] = [
    {
      name: 'key',
      type: 'string',
      description: 'Unique identifier for the node. Used for tracking, selection state, and expansion state management.',
    },
    { name: 'label', type: 'string', description: 'Display text rendered inside the node card in the chart.' },
    { name: 'icon', type: 'IconName', default: '-', description: 'Lucide icon name displayed alongside the label inside the node card.' },
    {
      name: 'expandedIcon',
      type: 'IconName',
      default: '-',
      description: 'Lucide icon to show when the node is expanded. Overrides the default icon only in the expanded state.',
    },
    {
      name: 'collapsedIcon',
      type: 'IconName',
      default: '-',
      description: 'Lucide icon to show when the node is collapsed. Overrides the default icon only in the collapsed state.',
    },
    {
      name: 'type',
      type: 'OrgChartNodeColor',
      default: '-',
      description: 'DaisyUI color applied to this specific node, overriding the component-level nodeColor default.',
    },
    {
      name: 'expanded',
      type: 'boolean',
      default: 'true',
      description: 'Whether the node children are initially visible. Set to false to collapse a branch on render.',
    },
    {
      name: 'children',
      type: 'TreeNode<T>[]',
      default: '-',
      description: 'Array of child nodes rendered below this node with connecting lines.',
    },
    {
      name: 'data',
      type: 'T',
      default: '-',
      description: 'Arbitrary data payload attached to the node. Accessible in custom node templates via the template context.',
    },
    {
      name: 'leaf',
      type: 'boolean',
      default: '-',
      description: 'When true, marks the node as a leaf with no expand/collapse toggle, even if children are present.',
    },
    { name: 'style', type: 'Record<string, string>', default: '-', description: 'Inline styles applied directly to the node element.' },
    { name: 'styleClass', type: 'string', default: '-', description: 'CSS class(es) added to the node element for custom styling.' },
  ];

  nodeTemplateDocs: ApiDocEntry[] = [
    {
      name: '#nodeTemplate',
      type: 'TemplateRef',
      description:
        'Content-projected ng-template for fully custom node rendering. When provided, replaces the default node card layout entirely.',
    },
    {
      name: 'let-node',
      type: 'TreeNode<T>',
      description: 'Implicit template context variable providing the current node data, including label, icon, data, and children.',
    },
    {
      name: 'let-selected="selected"',
      type: 'boolean',
      description:
        'Template context variable indicating whether the current node is selected. Use this to conditionally style selected nodes.',
    },
    {
      name: 'let-expanded="expanded"',
      type: 'boolean',
      description: 'Template context variable indicating whether the current node is expanded.',
    },
    {
      name: 'let-level="level"',
      type: 'number',
      description: 'Template context variable providing the nesting depth of the current node (0 for root).',
    },
  ];

  typeTreeNode = `interface TreeNode<T = unknown> {
  key?: string;
  label?: string;
  icon?: IconName;
  expandedIcon?: IconName;
  collapsedIcon?: IconName;
  type?: string;
  expanded?: boolean;
  children?: TreeNode<T>[];
  data?: T;
  leaf?: boolean;
  style?: Record<string, string>;
  styleClass?: string;
  selectable?: boolean;
  draggable?: boolean;
  droppable?: boolean;
}`;

  typeOrgChartNodeColor = `type OrgChartNodeColor =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';`;

  typeEvents = `interface OrgChartNodeSelectEvent<T> {
  originalEvent: Event;
  node: TreeNode<T>;
}

interface OrgChartNodeUnselectEvent<T> {
  originalEvent: Event;
  node: TreeNode<T>;
}

interface OrgChartNodeExpandEvent<T> {
  originalEvent: Event;
  node: TreeNode<T>;
}

interface OrgChartNodeCollapseEvent<T> {
  originalEvent: Event;
  node: TreeNode<T>;
}`;
}
