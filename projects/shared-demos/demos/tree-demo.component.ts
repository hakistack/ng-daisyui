import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { TreeComponent, TreeNode, ToastService, createTree, node } from '@hakistack/ng-daisyui';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Info,
  CheckCheck,
  Move,
  FileCode,
  FileText,
  Image,
  Braces,
  Monitor,
  Server,
  Cloud,
  Code,
  Users,
  LayoutGrid,
  Palette,
  Share2,
  Megaphone,
  Building2,
  Circle,
  ListTodo,
  CircleCheckBig,
  CircleCheck,
} from 'lucide-angular';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';
import { DemoPageComponent } from '../shared/demo-page.component';

interface FileNode {
  name: string;
  type: 'folder' | 'file';
  size?: number;
}

type DemoTab = 'basic' | 'selection' | 'checkbox' | 'dragdrop' | 'lazy' | 'filter';

@Component({
  selector: 'app-tree-demo',
  imports: [TreeComponent, LucideAngularModule, DocSectionComponent, ApiTableComponent, CodeBlockComponent, DemoPageComponent],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        FileCode,
        FileText,
        Image,
        Braces,
        Monitor,
        Server,
        Cloud,
        Code,
        Users,
        LayoutGrid,
        Palette,
        Share2,
        Megaphone,
        Building2,
        Circle,
        ListTodo,
        CircleCheckBig,
        CircleCheck,
      }),
    },
  ],
  template: `
    <app-demo-page
      title="Tree"
      description="Hierarchical tree view with selection, drag-and-drop, and lazy loading"
      icon="GitBranch"
      category="Data Display"
      importName="TreeComponent, createTree, node"
    >
      <div examples class="space-y-6">
        <!-- Basic Tab -->
        @if (activeTab() === 'basic') {
          <app-doc-section
            title="Basic Tree with Lines"
            description="Simple tree display with connecting lines and expand/collapse"
            [codeExample]="basicCode"
          >
            <div class="flex gap-2 mb-4">
              <button class="btn btn-sm btn-outline" (click)="basicTree?.expandAll()">Expand All</button>
              <button class="btn btn-sm btn-outline" (click)="basicTree?.collapseAll()">Collapse All</button>
            </div>

            <div class="max-w-md">
              <hk-tree #basicTree [tree]="fileSystem" (nodeExpand)="onNodeExpand($event)" (nodeCollapse)="onNodeCollapse($event)" />
            </div>
          </app-doc-section>
        }

        <!-- Single Selection Tab -->
        @if (activeTab() === 'selection') {
          <app-doc-section
            title="Single Selection Mode"
            description="Click a node to select it. Only one node can be selected at a time."
            [codeExample]="selectionCode"
          >
            <div class="grid md:grid-cols-2 gap-4">
              <div class="max-w-md">
                <hk-tree
                  [tree]="departments"
                  [selection]="singleSelection()"
                  (selectionChange)="onSingleSelectionChange($event)"
                  (nodeSelect)="onNodeSelect($event)"
                />
              </div>

              <div>
                @if (singleSelection()) {
                  <div class="alert alert-info">
                    <lucide-icon [img]="infoIcon" [size]="20" />
                    <span
                      >Selected: <strong>{{ singleSelection()?.label }}</strong></span
                    >
                  </div>
                } @else {
                  <div class="alert">
                    <span>No node selected</span>
                  </div>
                }
              </div>
            </div>
          </app-doc-section>
        }

        <!-- Checkbox Tab -->
        @if (activeTab() === 'checkbox') {
          <app-doc-section
            title="Checkbox Selection Mode"
            description="Multi-select with checkboxes. Selection propagates to children and parent shows partial state."
            [codeExample]="checkboxCode"
          >
            <div class="flex gap-2 mb-4">
              <button class="btn btn-sm btn-outline" (click)="clearCheckboxSelection()">Clear Selection</button>
            </div>

            <div class="grid md:grid-cols-2 gap-4">
              <div class="max-w-md">
                <hk-tree
                  #checkboxTree
                  [tree]="checkboxDepts"
                  [selection]="checkboxSelection()"
                  (selectionChange)="onCheckboxSelectionChange($event)"
                />
              </div>

              <div>
                @if (checkboxSelection().length > 0) {
                  <div class="alert alert-success">
                    <lucide-icon [img]="checkCheckIcon" [size]="20" />
                    <div>
                      <strong>{{ checkboxSelection().length }} nodes selected:</strong>
                      <ul class="list-disc list-inside mt-1 text-sm">
                        @for (node of checkboxSelection(); track node.key) {
                          <li>{{ node.label }}</li>
                        }
                      </ul>
                    </div>
                  </div>
                } @else {
                  <div class="alert">
                    <span>No nodes selected</span>
                  </div>
                }
              </div>
            </div>
          </app-doc-section>
        }

        <!-- Drag & Drop Tab -->
        @if (activeTab() === 'dragdrop') {
          <app-doc-section
            title="Drag & Drop"
            description="Drag nodes to reorder them. Drop on a node to make it a child, or between nodes to reorder."
          >
            <div class="max-w-md">
              <hk-tree
                [tree]="dragDrop"
                (nodeDrop)="onNodeDrop($event)"
                (nodeDragStart)="onDragStart($event)"
                (nodeDragEnd)="onDragEnd($event)"
              />
            </div>

            @if (lastDropEvent()) {
              <div class="alert alert-info mt-4">
                <lucide-icon [img]="moveIcon" [size]="20" />
                <span>
                  Dropped "<strong>{{ lastDropEvent()?.dragNode?.label }}</strong
                  >"
                  {{ lastDropEvent()?.dropPosition }}
                  "<strong>{{ lastDropEvent()?.dropNode?.label }}</strong
                  >"
                </span>
              </div>
            }
          </app-doc-section>
        }

        <!-- Lazy Loading Tab -->
        @if (activeTab() === 'lazy') {
          <app-doc-section
            title="Lazy Loading"
            description="Children are loaded on demand when expanding a node. Click the arrow to load children."
          >
            <div class="max-w-md">
              <hk-tree #lazyTree [nodes]="lazyNodes()" [config]="lazySetup.config" (lazyLoad)="onLazyLoad($event)" />
            </div>
          </app-doc-section>
        }

        <!-- Filter Tab -->
        @if (activeTab() === 'filter') {
          <app-doc-section
            title="Filterable Tree"
            description="Type in the search box to filter nodes. Matching nodes and their ancestors are shown."
          >
            <div class="max-w-md">
              <hk-tree [tree]="filterableTree" (filterChange)="onFilterChange($event)" />
            </div>

            @if (filterMatchCount() !== null) {
              <div class="text-sm text-base-content/60 mt-2">{{ filterMatchCount() }} matching nodes</div>
            }
          </app-doc-section>
        }
      </div>

      <div api class="space-y-6">
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'component'" (click)="apiTab.set('component')">Component</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'tree-config'" (click)="apiTab.set('tree-config')">
            TreeConfig
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'node-helpers'" (click)="apiTab.set('node-helpers')">
            Node Helpers
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>

        <!-- Component sub-tab -->
        @if (apiTab() === 'component') {
          <div class="space-y-6">
            <app-api-table title="Inputs" [entries]="inputDocs" />
            <app-api-table title="Outputs" [entries]="outputDocs" />
            <app-api-table title="Methods" [entries]="methodDocs" />
          </div>
        }

        <!-- TreeConfig sub-tab -->
        @if (apiTab() === 'tree-config') {
          <div class="space-y-6">
            <app-api-table title="TreeConfig Options (passed via config input or createTree)" [entries]="configDocs" />
            <app-api-table title="Builder Functions" [entries]="builderDocs" />
          </div>
        }

        <!-- Node Helpers sub-tab -->
        @if (apiTab() === 'node-helpers') {
          <div class="space-y-6">
            <app-api-table title="node.* Helper Functions" [entries]="nodeHelperDocs" />
            <app-api-table title="Tree Utilities" [entries]="utilityDocs" />
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">TreeNode&lt;T&gt;</h3>
                <p class="text-sm text-base-content/70">
                  The core data structure for tree nodes. Supports a generic type parameter for custom data payloads. Each node can have
                  children, selection state, drag-and-drop flags, and icon overrides.
                </p>
                <app-code-block [code]="typeTreeNode" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">TreeSetup&lt;T&gt;</h3>
                <p class="text-sm text-base-content/70">
                  The return type of <code>createTree()</code>. Contains the separated <code>config</code> object and
                  <code>nodes</code> array, ready to be passed to the component via the <code>[tree]</code> input.
                </p>
                <app-code-block [code]="typeTreeSetup" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Event Types</h3>
                <p class="text-sm text-base-content/70">
                  All event types emitted by the tree component. Each event includes the original DOM event and the affected node(s).
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
export class TreeDemoComponent {
  readonly infoIcon = Info;
  readonly checkCheckIcon = CheckCheck;
  readonly moveIcon = Move;
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'basic') as DemoTab);
  apiTab = signal<'component' | 'tree-config' | 'node-helpers' | 'types'>('component');

  // Selection state
  singleSelection = signal<TreeNode<FileNode> | null>(null);
  checkboxSelection = signal<TreeNode<FileNode>[]>([]);
  lastDropEvent = signal<any>(null);
  filterMatchCount = signal<number | null>(null);

  // ---- Trees built with createTree + node helpers ----

  fileSystem = createTree<FileNode>({
    nodes: [
      node.folder<FileNode>(
        'src',
        [
          node.folder<FileNode>(
            'app',
            [
              node.folder<FileNode>(
                'components',
                [
                  node.file('header.component.ts', { icon: 'FileCode', data: { name: 'header.component.ts', type: 'file', size: 2048 } }),
                  node.file('footer.component.ts', { icon: 'FileCode', data: { name: 'footer.component.ts', type: 'file', size: 1024 } }),
                  node.file('sidebar.component.ts', { icon: 'FileCode', data: { name: 'sidebar.component.ts', type: 'file', size: 3072 } }),
                ],
                { data: { name: 'components', type: 'folder' } },
              ),
              node.folder<FileNode>(
                'services',
                [
                  node.file('api.service.ts', { icon: 'FileCode', data: { name: 'api.service.ts', type: 'file', size: 4096 } }),
                  node.file('auth.service.ts', { icon: 'FileCode', data: { name: 'auth.service.ts', type: 'file', size: 2560 } }),
                ],
                { data: { name: 'services', type: 'folder' } },
              ),
              node.file('app.component.ts', { icon: 'FileCode', data: { name: 'app.component.ts', type: 'file', size: 1536 } }),
              node.file('app.component.html', { icon: 'FileText', data: { name: 'app.component.html', type: 'file', size: 512 } }),
            ],
            { expanded: true, data: { name: 'app', type: 'folder' } },
          ),
          node.folder<FileNode>(
            'assets',
            [
              node.file('logo.png', { icon: 'Image', data: { name: 'logo.png', type: 'file', size: 15360 } }),
              node.file('styles.css', { icon: 'FileCode', data: { name: 'styles.css', type: 'file', size: 8192 } }),
            ],
            { data: { name: 'assets', type: 'folder' } },
          ),
          node.file('main.ts', { icon: 'FileCode', data: { name: 'main.ts', type: 'file', size: 256 } }),
          node.file('index.html', { icon: 'FileText', data: { name: 'index.html', type: 'file', size: 512 } }),
        ],
        { expanded: true, data: { name: 'src', type: 'folder' } },
      ),
      node.file('package.json', { icon: 'Braces', data: { name: 'package.json', type: 'file', size: 1536 } }),
      node.file('README.md', { icon: 'FileText', data: { name: 'README.md', type: 'file', size: 2048 } }),
    ],
    showLines: false,
    keyboardNavigation: true,
    indentSize: 24,
  });

  departments = createTree<FileNode>({
    nodes: [
      node.folder<FileNode>(
        'Acme Corporation',
        [
          node.folder<FileNode>(
            'Engineering',
            [
              node.create('Frontend Team', { icon: 'Monitor', data: { name: 'Frontend Team', type: 'folder' } }),
              node.create('Backend Team', { icon: 'Server', data: { name: 'Backend Team', type: 'folder' } }),
              node.create('DevOps Team', { icon: 'Cloud', data: { name: 'DevOps Team', type: 'folder' } }),
            ],
            { icon: 'Code', expanded: true, data: { name: 'Engineering', type: 'folder' } },
          ),
          node.folder<FileNode>(
            'Design',
            [
              node.create('UX Team', { icon: 'Users', data: { name: 'UX Team', type: 'folder' } }),
              node.create('UI Team', { icon: 'LayoutGrid', data: { name: 'UI Team', type: 'folder' } }),
            ],
            { icon: 'Palette', data: { name: 'Design', type: 'folder' } },
          ),
          node.folder<FileNode>(
            'Marketing',
            [
              node.create('Content Team', { icon: 'FileText', data: { name: 'Content Team', type: 'folder' } }),
              node.create('Social Media', { icon: 'Share2', data: { name: 'Social Media', type: 'folder' } }),
            ],
            { icon: 'Megaphone', data: { name: 'Marketing', type: 'folder' } },
          ),
        ],
        { icon: 'Building2', expanded: true, data: { name: 'Acme Corporation', type: 'folder' } },
      ),
    ],
    selectionMode: 'single',
    showLines: false,
    keyboardNavigation: true,
  });

  checkboxDepts = createTree<FileNode>({
    nodes: [
      node.folder<FileNode>(
        'Acme Corporation',
        [
          node.folder<FileNode>(
            'Engineering',
            [
              node.create('Frontend Team', { icon: 'Monitor', data: { name: 'Frontend Team', type: 'folder' } }),
              node.create('Backend Team', { icon: 'Server', data: { name: 'Backend Team', type: 'folder' } }),
              node.create('DevOps Team', { icon: 'Cloud', data: { name: 'DevOps Team', type: 'folder' } }),
            ],
            { icon: 'Code', expanded: true, data: { name: 'Engineering', type: 'folder' } },
          ),
          node.folder<FileNode>(
            'Design',
            [
              node.create('UX Team', { icon: 'Users', data: { name: 'UX Team', type: 'folder' } }),
              node.create('UI Team', { icon: 'LayoutGrid', data: { name: 'UI Team', type: 'folder' } }),
            ],
            { icon: 'Palette', data: { name: 'Design', type: 'folder' } },
          ),
          node.folder<FileNode>(
            'Marketing',
            [
              node.create('Content Team', { icon: 'FileText', data: { name: 'Content Team', type: 'folder' } }),
              node.create('Social Media', { icon: 'Share2', data: { name: 'Social Media', type: 'folder' } }),
            ],
            { icon: 'Megaphone', data: { name: 'Marketing', type: 'folder' } },
          ),
        ],
        { icon: 'Building2', expanded: true, data: { name: 'Acme Corporation', type: 'folder' } },
      ),
    ],
    selectionMode: 'checkbox',
    showLines: false,
    propagateSelectionDown: true,
    propagateSelectionUp: true,
    keyboardNavigation: true,
  });

  dragDrop = createTree<FileNode>({
    nodes: [
      node.folder<FileNode>(
        'Tasks',
        [
          node.create('Design homepage', { icon: 'Circle', data: { name: 'Design homepage', type: 'file' } }),
          node.create('Implement API', { icon: 'Circle', data: { name: 'Implement API', type: 'file' } }),
          node.create('Write tests', { icon: 'Circle', data: { name: 'Write tests', type: 'file' } }),
          node.create('Deploy to staging', { icon: 'Circle', data: { name: 'Deploy to staging', type: 'file' } }),
        ],
        { icon: 'ListTodo', expanded: true, data: { name: 'Tasks', type: 'folder' } },
      ),
      node.folder<FileNode>(
        'Completed',
        [
          node.create('Setup project', { icon: 'CircleCheckBig', data: { name: 'Setup project', type: 'file' } }),
          node.create('Create database schema', { icon: 'CircleCheckBig', data: { name: 'Create database schema', type: 'file' } }),
        ],
        { icon: 'CircleCheck', expanded: true, data: { name: 'Completed', type: 'folder' } },
      ),
    ],
    dragDrop: true,
    showLines: false,
    selectionMode: 'single',
    keyboardNavigation: true,
  });

  lazySetup = createTree<FileNode>({
    nodes: [
      node.lazy<FileNode>('Documents', { data: { name: 'Documents', type: 'folder' } }),
      node.lazy<FileNode>('Pictures', { data: { name: 'Pictures', type: 'folder' } }),
      node.lazy<FileNode>('Music', { data: { name: 'Music', type: 'folder' } }),
    ],
    showLines: false,
    keyboardNavigation: true,
  });

  // Lazy nodes need to be mutable via signal for dynamic child loading
  lazyNodes = signal<TreeNode<FileNode>[]>(this.lazySetup.nodes);

  filterableTree = createTree<FileNode>({
    nodes: this.fileSystem.nodes,
    filterable: true,
    filterMode: 'lenient',
    filterPlaceholder: 'Search files...',
    showLines: false,
    expandAll: true,
    keyboardNavigation: true,
  });

  // Code examples
  basicCode = `import { createTree, node } from '@hakistack/ng-daisyui';

const tree = createTree({
  nodes: [
    node.folder('src', [
      node.file('app.component.ts', { icon: 'FileCode' }),
      node.file('main.ts', { icon: 'FileCode' }),
    ], { expanded: true }),
    node.file('package.json', { icon: 'Braces' }),
  ],
  showLines: false,
  keyboardNavigation: true,
});

// Template
<hk-tree
  [tree]="tree"
  (nodeExpand)="onExpand($event)"
  (nodeCollapse)="onCollapse($event)"
/>`;

  selectionCode = `import { createTree, node } from '@hakistack/ng-daisyui';

const tree = createTree({
  nodes: [
    node.folder('Acme Corp', [
      node.create('Engineering', { icon: 'Code' }),
      node.create('Design', { icon: 'Palette' }),
    ], { icon: 'Building2', expanded: true }),
  ],
  selectionMode: 'single',
  showLines: false,
});

selectedNode = signal<TreeNode | null>(null);

onSelectionChange(node: TreeNode | TreeNode[] | null) {
  this.selectedNode.set(Array.isArray(node) ? node[0] : node);
}

// Template
<hk-tree
  [tree]="tree"
  [selection]="selectedNode()"
  (selectionChange)="onSelectionChange($event)"
/>`;

  checkboxCode = `import { createTree, node } from '@hakistack/ng-daisyui';

const tree = createTree({
  nodes: [
    node.folder('Engineering', [
      node.create('Frontend Team', { icon: 'Monitor' }),
      node.create('Backend Team', { icon: 'Server' }),
      node.create('DevOps Team', { icon: 'Cloud' }),
    ], { icon: 'Code', expanded: true }),
  ],
  selectionMode: 'checkbox',
  showLines: false,
  propagateSelectionDown: true,
  propagateSelectionUp: true,
});

selectedNodes = signal<TreeNode[]>([]);

onSelectionChange(nodes: TreeNode | TreeNode[] | null) {
  this.selectedNodes.set(Array.isArray(nodes) ? nodes : nodes ? [nodes] : []);
}

// Template
<hk-tree
  [tree]="tree"
  [selection]="selectedNodes()"
  (selectionChange)="onSelectionChange($event)"
/>`;

  // API documentation
  inputDocs: ApiDocEntry[] = [
    {
      name: 'tree',
      type: 'TreeSetup<T> | null',
      default: 'null',
      description:
        'Combined tree setup object returned by createTree(). Pass this single input instead of separate [nodes] and [config] inputs. When set, [nodes] and [config] inputs are ignored.',
    },
    {
      name: 'nodes',
      type: 'TreeNode<T>[]',
      default: '[]',
      description:
        'Array of tree node data to render. Each node can have children, an icon, a label, a key, and custom data. Ignored if the [tree] input is provided.',
    },
    {
      name: 'config',
      type: 'TreeConfig<T>',
      default: '{}',
      description:
        'Tree configuration object controlling selection mode, drag & drop, filtering, visual options, and accessibility settings. Ignored if the [tree] input is provided.',
    },
    {
      name: 'selection',
      type: 'TreeNode<T> | TreeNode<T>[] | null',
      default: 'null',
      description:
        'Currently selected node(s) for two-way binding. Pass a single TreeNode for single/multiple selection modes, or an array for checkbox mode. The component syncs its internal selection state from this input.',
    },
  ];

  configDocs: ApiDocEntry[] = [
    {
      name: 'selectionMode',
      type: "'single' | 'multiple' | 'checkbox' | null",
      default: 'null',
      description:
        "Selection behavior. 'single' allows one node at a time. 'multiple' allows clicking to toggle individual nodes. 'checkbox' renders checkboxes with parent/child propagation. null disables selection.",
    },
    {
      name: 'dragDrop',
      type: 'boolean',
      default: 'false',
      description:
        'Enable drag and drop for reordering nodes. Nodes can be dragged before, after, or inside other nodes. Respects individual node draggable and droppable properties.',
    },
    {
      name: 'dragDropSameLevel',
      type: 'boolean',
      default: 'false',
      description: 'Restrict drag and drop to the same parent level only, preventing cross-level moves.',
    },
    {
      name: 'filterable',
      type: 'boolean',
      default: 'false',
      description:
        'Show a search/filter input above the tree. Nodes matching the filter text (by label) are shown along with their ancestors (in lenient mode) or alone (in strict mode).',
    },
    {
      name: 'filterMode',
      type: "'lenient' | 'strict'",
      default: "'lenient'",
      description:
        "How filtering affects visibility. 'lenient' shows matching nodes and their ancestors (so the hierarchy context is preserved). 'strict' shows only nodes whose labels match the filter.",
    },
    {
      name: 'filterPlaceholder',
      type: 'string',
      default: '-',
      description: 'Placeholder text for the filter search input. Only used when filterable is true.',
    },
    {
      name: 'showLines',
      type: 'boolean',
      default: 'false',
      description: 'Show connecting lines between parent and child nodes to visualize the hierarchy.',
    },
    {
      name: 'indentSize',
      type: 'number',
      default: '24',
      description: 'Indentation in pixels per nesting level. Controls the horizontal offset for child nodes.',
    },
    {
      name: 'virtualScroll',
      type: 'boolean',
      default: 'false',
      description: 'Enable virtual scrolling for large trees. Only renders visible nodes in the viewport for better performance.',
    },
    {
      name: 'virtualScrollItemHeight',
      type: 'number',
      default: '-',
      description: 'Item height in pixels for virtual scrolling calculations. Required when virtualScroll is enabled.',
    },
    {
      name: 'propagateSelectionDown',
      type: 'boolean',
      default: 'true',
      description: 'In checkbox selection mode, checking a parent automatically checks all its descendants.',
    },
    {
      name: 'propagateSelectionUp',
      type: 'boolean',
      default: 'true',
      description:
        'In checkbox selection mode, when all children are checked the parent becomes checked; when some are checked it shows a partial/indeterminate state.',
    },
    {
      name: 'selectionAllowParents',
      type: 'boolean',
      default: '-',
      description: 'Allow selecting parent (non-leaf) nodes. When false, only leaf nodes can be selected.',
    },
    {
      name: 'expandAll',
      type: 'boolean',
      default: 'false',
      description: 'Expand all nodes on initialization. Overrides the individual expanded property on nodes.',
    },
    {
      name: 'loading',
      type: 'boolean',
      default: 'false',
      description: 'Show a loading indicator for the entire tree. Useful when fetching the tree data asynchronously.',
    },
    {
      name: 'emptyMessage',
      type: 'string',
      default: "'No data available'",
      description: 'Message displayed when the tree has no nodes to show (either empty data or all nodes filtered out).',
    },
    {
      name: 'keyboardNavigation',
      type: 'boolean',
      default: 'false',
      description:
        'Enable keyboard navigation. Arrow keys move focus, Enter/Space selects, Home/End jump to first/last node, ArrowRight expands, ArrowLeft collapses or moves to parent.',
    },
    {
      name: 'ariaLabel',
      type: 'string',
      default: '-',
      description: 'Accessible label for the tree container (sets the aria-label attribute on the host element).',
    },
    {
      name: 'ariaLabelledBy',
      type: 'string',
      default: '-',
      description: 'ID of the element that labels the tree (sets the aria-labelledby attribute on the host element).',
    },
  ];

  outputDocs: ApiDocEntry[] = [
    {
      name: 'selectionChange',
      type: 'TreeNode<T> | TreeNode<T>[] | null',
      description:
        'Emitted whenever the selection state changes. In single mode emits a single TreeNode or null. In multiple/checkbox mode emits an array of selected TreeNode objects.',
    },
    {
      name: 'nodeSelect',
      type: 'TreeNodeSelectEvent<T>',
      description:
        'Emitted when a node is selected. The event contains the original DOM event and the selected node. Fires for each individual selection action.',
    },
    {
      name: 'nodeUnselect',
      type: 'TreeNodeUnselectEvent<T>',
      description: 'Emitted when a node is unselected (deselected). The event contains the original DOM event and the unselected node.',
    },
    {
      name: 'nodeExpand',
      type: 'TreeNodeExpandEvent<T>',
      description:
        'Emitted when a node is expanded (children become visible). The event contains the original DOM event and the expanded node.',
    },
    {
      name: 'nodeCollapse',
      type: 'TreeNodeCollapseEvent<T>',
      description:
        'Emitted when a node is collapsed (children become hidden). The event contains the original DOM event and the collapsed node.',
    },
    {
      name: 'lazyLoad',
      type: 'TreeLazyLoadEvent<T>',
      description:
        'Emitted when a lazy-loading node (leaf: false, no children) is expanded and needs its children fetched. Call completeLoading(node) after setting node.children to finish loading and expand the node.',
    },
    {
      name: 'nodeDragStart',
      type: 'TreeNodeDragStartEvent<T>',
      description:
        'Emitted when a drag operation begins on a node. The event contains the original DragEvent and the node being dragged. Only fires when dragDrop is enabled.',
    },
    {
      name: 'nodeDragEnd',
      type: 'TreeNodeDragEndEvent<T>',
      description:
        'Emitted when a drag operation ends (regardless of whether a drop occurred). The event contains the original DragEvent and the node that was dragged.',
    },
    {
      name: 'nodeDrop',
      type: 'TreeNodeDropEvent<T>',
      description:
        "Emitted when a node is dropped onto a valid target. The event contains dragNode, dropNode, both parents, the drop position ('before' | 'after' | 'inside'), and the drag/drop indices. Use this to update your data source.",
    },
    {
      name: 'filterChange',
      type: 'TreeFilterEvent',
      description:
        'Emitted when the filter input text changes (only when filterable is true). The event contains the filter string and the number of matching nodes.',
    },
  ];

  methodDocs: ApiDocEntry[] = [
    { name: 'expandAll()', type: 'void', description: 'Expand every node in the tree, making all children visible at every level.' },
    { name: 'collapseAll()', type: 'void', description: 'Collapse every node in the tree, hiding all children.' },
    {
      name: 'expandNode(node, event?)',
      type: 'void',
      description:
        'Expand a specific node, making its children visible. For lazy-loading nodes (leaf: false, no children), this triggers the lazyLoad output instead of expanding immediately.',
    },
    { name: 'collapseNode(node, event?)', type: 'void', description: 'Collapse a specific node, hiding its children.' },
    {
      name: 'toggleNode(node, event?)',
      type: 'void',
      description:
        'Toggle a node between expanded and collapsed states. Delegates to expandNode() or collapseNode() based on the current state.',
    },
    {
      name: 'selectNode(node, event?)',
      type: 'void',
      description:
        'Select a specific node programmatically. Behavior depends on selectionMode: single replaces the current selection, multiple adds to it, checkbox toggles with propagation.',
    },
    {
      name: 'unselectNode(node, event?)',
      type: 'void',
      description: 'Unselect (deselect) a specific node programmatically. Removes the node from the selected set and emits nodeUnselect.',
    },
    {
      name: 'clearSelection()',
      type: 'void',
      description:
        'Clear all selected nodes, resetting both the selected and partially-selected states. Emits selectionChange with an empty result.',
    },
    {
      name: 'completeLoading(node)',
      type: 'void',
      description:
        'Signal that lazy loading is complete for a node. Call this after you have assigned children to node.children in response to a lazyLoad event. Removes the loading spinner and expands the node to reveal its new children.',
    },
  ];

  builderDocs: ApiDocEntry[] = [
    {
      name: 'createTree(input)',
      type: 'TreeSetup<T>',
      description:
        'All-in-one builder function. Accepts an object with nodes (TreeNode[]) and all TreeConfig properties as top-level keys. Returns { config, nodes } ready to pass to the [tree] input. Separates node data from config internally.',
    },
  ];

  nodeHelperDocs: ApiDocEntry[] = [
    {
      name: 'node.create(label, opts?)',
      type: 'TreeNode<T>',
      description:
        'Create a generic tree node with the given label. Options include key, icon, data, expanded, selectable, draggable, droppable, and leaf.',
    },
    {
      name: 'node.folder(label, children, opts?)',
      type: 'TreeNode<T>',
      description:
        'Create a folder node with children. Automatically uses Folder/FolderOpen toggle icons. Useful for directory-like structures.',
    },
    {
      name: 'node.file(label, opts?)',
      type: 'TreeNode<T>',
      description: 'Create a leaf node (leaf: true) representing a file or terminal item. Cannot be expanded.',
    },
    {
      name: 'node.lazy(label, opts?)',
      type: 'TreeNode<T>',
      description:
        'Create a lazy-loading node (leaf: false, no children). When expanded, triggers the lazyLoad output. You must call completeLoading(node) after assigning children.',
    },
    {
      name: 'node.fromData(items, opts)',
      type: 'TreeNode<T>[]',
      description:
        'Convert a data array into tree nodes using mapping functions. opts provides labelFn, keyFn, childrenFn, and iconFn to extract values from each data item.',
    },
  ];

  utilityDocs: ApiDocEntry[] = [
    {
      name: 'walkTree(nodes, cb)',
      type: 'void',
      description: 'Depth-first walk of the tree. The callback receives each node; return false from the callback to stop traversal early.',
    },
    {
      name: 'findNode(nodes, predicate)',
      type: 'TreeNode | undefined',
      description: 'Find the first node matching the predicate using depth-first search. Returns undefined if no match.',
    },
    {
      name: 'findNodePath(nodes, predicate)',
      type: 'TreeNode[] | undefined',
      description:
        'Find the ancestor path (from root to the matching node) for the first node matching the predicate. Returns undefined if no match.',
    },
    {
      name: 'mapTree(nodes, fn)',
      type: 'TreeNode[]',
      description:
        'Transform every node in the tree using the provided function. Returns a new tree (does not mutate the original). Children are recursively mapped.',
    },
    {
      name: 'filterTree(nodes, predicate)',
      type: 'TreeNode[]',
      description:
        'Filter the tree, keeping nodes that match the predicate plus their ancestors (so the tree structure is preserved). Returns a new tree.',
    },
    {
      name: 'flattenTree(nodes)',
      type: 'TreeNode[]',
      description: 'Flatten the tree into a single array in depth-first order, including all descendants.',
    },
    {
      name: 'countNodes(nodes)',
      type: 'number',
      description: 'Count the total number of nodes in the tree recursively, including all descendants.',
    },
    {
      name: 'ensureKeys(nodes)',
      type: 'void',
      description:
        'Assign unique auto-generated keys to any nodes that lack a key. Mutates the tree in place. Useful before passing data to the tree component which requires keys for tracking.',
    },
    {
      name: 'buildTree(items, opts)',
      type: 'TreeNode[]',
      description:
        'Convert a flat list with parent ID references into a hierarchical tree structure. opts provides idFn, parentIdFn, labelFn, and iconFn to extract values from each item.',
    },
  ];

  // Reference to tree components for expand/collapse all
  readonly basicTree = viewChild<TreeComponent<FileNode>>('basicTree');
  readonly checkboxTree = viewChild<TreeComponent<FileNode>>('checkboxTree');
  readonly lazyTree = viewChild<TreeComponent<FileNode>>('lazyTree');

  // Event handlers
  onNodeExpand(event: any) {
    console.log('Node expanded:', event.node.label);
  }

  onNodeCollapse(event: any) {
    console.log('Node collapsed:', event.node.label);
  }

  onNodeSelect(event: any) {
    this.toast.info(`Selected: ${event.node.label}`);
  }

  onSingleSelectionChange(node: TreeNode<FileNode> | TreeNode<FileNode>[] | null) {
    if (Array.isArray(node)) {
      this.singleSelection.set(node[0] ?? null);
    } else {
      this.singleSelection.set(node);
    }
  }

  onCheckboxSelectionChange(nodes: TreeNode<FileNode> | TreeNode<FileNode>[] | null) {
    if (Array.isArray(nodes)) {
      this.checkboxSelection.set(nodes);
    } else if (nodes) {
      this.checkboxSelection.set([nodes]);
    } else {
      this.checkboxSelection.set([]);
    }
  }

  clearCheckboxSelection() {
    this.checkboxSelection.set([]);
    this.checkboxTree()?.clearSelection();
  }

  onNodeDrop(event: any) {
    this.lastDropEvent.set(event);

    const { dragNode, dragNodeParent, dropNode, dropNodeParent, dropPosition, dropIndex } = event;
    const sourceList: TreeNode<FileNode>[] = dragNodeParent ? dragNodeParent.children : this.dragDrop.nodes;
    const sourceIdx = sourceList.indexOf(dragNode);
    if (sourceIdx !== -1) sourceList.splice(sourceIdx, 1);

    if (dropPosition === 'inside') {
      if (!dropNode.children) dropNode.children = [];
      dropNode.children.push(dragNode);
    } else {
      const targetList: TreeNode<FileNode>[] = dropNodeParent ? dropNodeParent.children : this.dragDrop.nodes;
      const adjustedIdx = dropPosition === 'before' ? targetList.indexOf(dropNode) : targetList.indexOf(dropNode) + 1;
      targetList.splice(Math.max(0, adjustedIdx), 0, dragNode);
    }

    this.toast.success(`Moved "${dragNode.label}" ${dropPosition} "${dropNode?.label}"`);
  }

  onDragStart(event: any) {
    console.log('Drag started:', event.node.label);
  }

  onDragEnd(event: any) {
    console.log('Drag ended:', event.node.label);
  }

  onLazyLoad(event: any) {
    const nd = event.node;
    this.toast.info(`Loading children for: ${nd.label}`);

    setTimeout(() => {
      const children: TreeNode<FileNode>[] = [
        node.file(`${nd.label} - File 1`, { icon: 'FileText', data: { name: `${nd.label} - File 1`, type: 'file' } }),
        node.file(`${nd.label} - File 2`, { icon: 'FileText', data: { name: `${nd.label} - File 2`, type: 'file' } }),
        node.lazy<FileNode>(`${nd.label} - Subfolder`, { data: { name: `${nd.label} - Subfolder`, type: 'folder' } }),
      ];

      nd.children = children;
      this.lazyTree()?.completeLoading(nd);
      this.toast.success(`Loaded ${children.length} children`);
    }, 1000);
  }

  onFilterChange(event: any) {
    this.filterMatchCount.set(event.matchedNodeCount);
  }

  // --- Type definitions ---
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
  selectable?: boolean;
  draggable?: boolean;
  droppable?: boolean;
  style?: Record<string, string>;
  styleClass?: string;
}`;

  typeTreeSetup = `interface TreeSetup<T = unknown> {
  config: TreeConfig<T>;
  nodes: TreeNode<T>[];
}`;

  typeEvents = `interface TreeNodeSelectEvent<T> {
  originalEvent: Event;
  node: TreeNode<T>;
}

interface TreeNodeUnselectEvent<T> {
  originalEvent: Event;
  node: TreeNode<T>;
}

interface TreeNodeExpandEvent<T> {
  originalEvent: Event;
  node: TreeNode<T>;
}

interface TreeNodeCollapseEvent<T> {
  originalEvent: Event;
  node: TreeNode<T>;
}

interface TreeNodeDropEvent<T> {
  dragNode: TreeNode<T>;
  dropNode: TreeNode<T> | null;
  dragNodeParent: TreeNode<T> | null;
  dropNodeParent: TreeNode<T> | null;
  dropPosition: 'before' | 'after' | 'inside';
  dragIndex: number;
  dropIndex: number;
}

interface TreeLazyLoadEvent<T> {
  node: TreeNode<T>;
}

interface TreeFilterEvent {
  filter: string;
  matchedNodeCount: number;
}`;
}
