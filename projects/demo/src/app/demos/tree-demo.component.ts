import { Component, signal } from '@angular/core';
import {
  TreeComponent,
  TreeNode,
  LucideIconComponent,
  ToastService,
  createTree,
  node,
} from '@hakistack/ng-daisyui';
import { inject } from '@angular/core';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { ApiDocEntry } from '../shared/api-table.types';

interface FileNode {
  name: string;
  type: 'folder' | 'file';
  size?: number;
}

type DemoTab = 'basic' | 'selection' | 'checkbox' | 'dragdrop' | 'lazy' | 'filter';

@Component({
  selector: 'app-tree-demo',
  imports: [TreeComponent, LucideIconComponent, DocSectionComponent, ApiTableComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Tree</h1>
        <p class="text-base-content/70 mt-2">
          Hierarchical data display with selection, drag & drop, lazy loading, and filtering
        </p>
        <div class="mt-2">
          <code class="badge badge-outline text-xs">import {{ '{' }} TreeComponent, createTree, node {{ '}' }} from '&#64;hakistack/ng-daisyui'</code>
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
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'basic'" (click)="activeTab.set('basic')">
            Basic
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'selection'" (click)="activeTab.set('selection')">
            Single Selection
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'checkbox'" (click)="activeTab.set('checkbox')">
            Checkbox
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'dragdrop'" (click)="activeTab.set('dragdrop')">
            Drag & Drop
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'lazy'" (click)="activeTab.set('lazy')">
            Lazy Loading
          </button>
          <button role="tab" class="tab" [class.tab-active]="activeTab() === 'filter'" (click)="activeTab.set('filter')">
            Filter
          </button>
        </div>

        <!-- Basic Tab -->
        @if (activeTab() === 'basic') {
          <app-doc-section
            title="Basic Tree with Lines"
            description="Simple tree display with connecting lines and expand/collapse"
            [codeExample]="basicCode"
          >
            <div class="flex gap-2 mb-4">
              <button class="btn btn-sm btn-outline" (click)="basicTree?.expandAll()">
                Expand All
              </button>
              <button class="btn btn-sm btn-outline" (click)="basicTree?.collapseAll()">
                Collapse All
              </button>
            </div>

            <div class="max-w-md">
              <hk-tree
                #basicTree
                [tree]="fileSystem"
                (nodeExpand)="onNodeExpand($event)"
                (nodeCollapse)="onNodeCollapse($event)"
              />
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
                    <hk-lucide-icon name="Info" [size]="20" />
                    <span>Selected: <strong>{{ singleSelection()?.label }}</strong></span>
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
              <button class="btn btn-sm btn-outline" (click)="clearCheckboxSelection()">
                Clear Selection
              </button>
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
                    <hk-lucide-icon name="CheckCheck" [size]="20" />
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
                <hk-lucide-icon name="Move" [size]="20" />
                <span>
                  Dropped "<strong>{{ lastDropEvent()?.dragNode?.label }}</strong>"
                  {{ lastDropEvent()?.dropPosition }}
                  "<strong>{{ lastDropEvent()?.dropNode?.label }}</strong>"
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
              <hk-tree
                #lazyTree
                [nodes]="lazyNodes()"
                [config]="lazySetup.config"
                (lazyLoad)="onLazyLoad($event)"
              />
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
              <hk-tree
                [tree]="filterableTree"
                (filterChange)="onFilterChange($event)"
              />
            </div>

            @if (filterMatchCount() !== null) {
              <div class="text-sm text-base-content/60 mt-2">
                {{ filterMatchCount() }} matching nodes
              </div>
            }
          </app-doc-section>
        }
      }

      @if (pageTab() === 'api') {
        <div class="space-y-6">
          <app-api-table title="Inputs" [entries]="inputDocs" />
          <app-api-table title="Outputs" [entries]="outputDocs" />
          <app-api-table title="Methods" [entries]="methodDocs" />
          <app-api-table title="Builder Functions" [entries]="builderDocs" />
          <app-api-table title="Node Helpers" [entries]="nodeHelperDocs" />
          <app-api-table title="Tree Utilities" [entries]="utilityDocs" />
        </div>
      }
    </div>
  `,
})
export class TreeDemoComponent {
  private toast = inject(ToastService);

  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<DemoTab>('basic');

  // Selection state
  singleSelection = signal<TreeNode<FileNode> | null>(null);
  checkboxSelection = signal<TreeNode<FileNode>[]>([]);
  lastDropEvent = signal<any>(null);
  filterMatchCount = signal<number | null>(null);

  // ---- Trees built with createTree + node helpers ----

  fileSystem = createTree<FileNode>({
    nodes: [
      node.folder<FileNode>('src', [
        node.folder<FileNode>('app', [
          node.folder<FileNode>('components', [
            node.file('header.component.ts', { icon: 'FileCode', data: { name: 'header.component.ts', type: 'file', size: 2048 } }),
            node.file('footer.component.ts', { icon: 'FileCode', data: { name: 'footer.component.ts', type: 'file', size: 1024 } }),
            node.file('sidebar.component.ts', { icon: 'FileCode', data: { name: 'sidebar.component.ts', type: 'file', size: 3072 } }),
          ], { data: { name: 'components', type: 'folder' } }),
          node.folder<FileNode>('services', [
            node.file('api.service.ts', { icon: 'FileCode', data: { name: 'api.service.ts', type: 'file', size: 4096 } }),
            node.file('auth.service.ts', { icon: 'FileCode', data: { name: 'auth.service.ts', type: 'file', size: 2560 } }),
          ], { data: { name: 'services', type: 'folder' } }),
          node.file('app.component.ts', { icon: 'FileCode', data: { name: 'app.component.ts', type: 'file', size: 1536 } }),
          node.file('app.component.html', { icon: 'FileText', data: { name: 'app.component.html', type: 'file', size: 512 } }),
        ], { expanded: true, data: { name: 'app', type: 'folder' } }),
        node.folder<FileNode>('assets', [
          node.file('logo.png', { icon: 'Image', data: { name: 'logo.png', type: 'file', size: 15360 } }),
          node.file('styles.css', { icon: 'FileCode', data: { name: 'styles.css', type: 'file', size: 8192 } }),
        ], { data: { name: 'assets', type: 'folder' } }),
        node.file('main.ts', { icon: 'FileCode', data: { name: 'main.ts', type: 'file', size: 256 } }),
        node.file('index.html', { icon: 'FileText', data: { name: 'index.html', type: 'file', size: 512 } }),
      ], { expanded: true, data: { name: 'src', type: 'folder' } }),
      node.file('package.json', { icon: 'Braces', data: { name: 'package.json', type: 'file', size: 1536 } }),
      node.file('README.md', { icon: 'FileText', data: { name: 'README.md', type: 'file', size: 2048 } }),
    ],
    showLines: false,
    keyboardNavigation: true,
    indentSize: 24,
  });

  departments = createTree<FileNode>({
    nodes: [
      node.folder<FileNode>('Acme Corporation', [
        node.folder<FileNode>('Engineering', [
          node.create('Frontend Team', { icon: 'Monitor', data: { name: 'Frontend Team', type: 'folder' } }),
          node.create('Backend Team', { icon: 'Server', data: { name: 'Backend Team', type: 'folder' } }),
          node.create('DevOps Team', { icon: 'Cloud', data: { name: 'DevOps Team', type: 'folder' } }),
        ], { icon: 'Code', expanded: true, data: { name: 'Engineering', type: 'folder' } }),
        node.folder<FileNode>('Design', [
          node.create('UX Team', { icon: 'Users', data: { name: 'UX Team', type: 'folder' } }),
          node.create('UI Team', { icon: 'LayoutGrid', data: { name: 'UI Team', type: 'folder' } }),
        ], { icon: 'Palette', data: { name: 'Design', type: 'folder' } }),
        node.folder<FileNode>('Marketing', [
          node.create('Content Team', { icon: 'FileText', data: { name: 'Content Team', type: 'folder' } }),
          node.create('Social Media', { icon: 'Share2', data: { name: 'Social Media', type: 'folder' } }),
        ], { icon: 'Megaphone', data: { name: 'Marketing', type: 'folder' } }),
      ], { icon: 'Building2', expanded: true, data: { name: 'Acme Corporation', type: 'folder' } }),
    ],
    selectionMode: 'single',
    showLines: false,
    keyboardNavigation: true,
  });

  checkboxDepts = createTree<FileNode>({
    nodes: [
      node.folder<FileNode>('Acme Corporation', [
        node.folder<FileNode>('Engineering', [
          node.create('Frontend Team', { icon: 'Monitor', data: { name: 'Frontend Team', type: 'folder' } }),
          node.create('Backend Team', { icon: 'Server', data: { name: 'Backend Team', type: 'folder' } }),
          node.create('DevOps Team', { icon: 'Cloud', data: { name: 'DevOps Team', type: 'folder' } }),
        ], { icon: 'Code', expanded: true, data: { name: 'Engineering', type: 'folder' } }),
        node.folder<FileNode>('Design', [
          node.create('UX Team', { icon: 'Users', data: { name: 'UX Team', type: 'folder' } }),
          node.create('UI Team', { icon: 'LayoutGrid', data: { name: 'UI Team', type: 'folder' } }),
        ], { icon: 'Palette', data: { name: 'Design', type: 'folder' } }),
        node.folder<FileNode>('Marketing', [
          node.create('Content Team', { icon: 'FileText', data: { name: 'Content Team', type: 'folder' } }),
          node.create('Social Media', { icon: 'Share2', data: { name: 'Social Media', type: 'folder' } }),
        ], { icon: 'Megaphone', data: { name: 'Marketing', type: 'folder' } }),
      ], { icon: 'Building2', expanded: true, data: { name: 'Acme Corporation', type: 'folder' } }),
    ],
    selectionMode: 'checkbox',
    showLines: false,
    propagateSelectionDown: true,
    propagateSelectionUp: true,
    keyboardNavigation: true,
  });

  dragDrop = createTree<FileNode>({
    nodes: [
      node.folder<FileNode>('Tasks', [
        node.create('Design homepage', { icon: 'Circle', data: { name: 'Design homepage', type: 'file' } }),
        node.create('Implement API', { icon: 'Circle', data: { name: 'Implement API', type: 'file' } }),
        node.create('Write tests', { icon: 'Circle', data: { name: 'Write tests', type: 'file' } }),
        node.create('Deploy to staging', { icon: 'Circle', data: { name: 'Deploy to staging', type: 'file' } }),
      ], { icon: 'ListTodo', expanded: true, data: { name: 'Tasks', type: 'folder' } }),
      node.folder<FileNode>('Completed', [
        node.create('Setup project', { icon: 'CircleCheckBig', data: { name: 'Setup project', type: 'file' } }),
        node.create('Create database schema', { icon: 'CircleCheckBig', data: { name: 'Create database schema', type: 'file' } }),
      ], { icon: 'CircleCheck', expanded: true, data: { name: 'Completed', type: 'folder' } }),
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
    { name: 'tree', type: 'TreeSetup<T> | null', default: 'null', description: 'Combined setup from createTree() — pass instead of separate nodes + config' },
    { name: 'nodes', type: 'TreeNode<T>[]', default: '[]', description: 'Tree node data (ignored if [tree] is set)' },
    { name: 'config', type: 'TreeConfig<T>', default: '{}', description: 'Tree configuration (ignored if [tree] is set)' },
    { name: 'selection', type: 'TreeNode<T> | TreeNode<T>[] | null', default: 'null', description: 'Selected node(s)' },
  ];

  outputDocs: ApiDocEntry[] = [
    { name: 'selectionChange', type: 'TreeNode<T> | TreeNode<T>[] | null', description: 'Selection changed' },
    { name: 'nodeSelect', type: 'TreeNodeSelectEvent<T>', description: 'Node selected' },
    { name: 'nodeUnselect', type: 'TreeNodeUnselectEvent<T>', description: 'Node unselected' },
    { name: 'nodeExpand', type: 'TreeNodeExpandEvent<T>', description: 'Node expanded' },
    { name: 'nodeCollapse', type: 'TreeNodeCollapseEvent<T>', description: 'Node collapsed' },
    { name: 'lazyLoad', type: 'TreeLazyLoadEvent<T>', description: 'Lazy load requested' },
    { name: 'nodeDragStart', type: 'TreeNodeDragStartEvent<T>', description: 'Drag started' },
    { name: 'nodeDrop', type: 'TreeNodeDropEvent<T>', description: 'Node dropped' },
    { name: 'filterChange', type: 'TreeFilterEvent', description: 'Filter changed' },
  ];

  methodDocs: ApiDocEntry[] = [
    { name: 'expandAll()', type: 'void', description: 'Expand all nodes' },
    { name: 'collapseAll()', type: 'void', description: 'Collapse all nodes' },
    { name: 'toggleNode(node)', type: 'void', description: 'Toggle node expand/collapse' },
    { name: 'selectNode(node)', type: 'void', description: 'Select a node' },
    { name: 'clearSelection()', type: 'void', description: 'Clear all selections' },
    { name: 'completeLoading(node)', type: 'void', description: 'Complete lazy loading for a node' },
  ];

  builderDocs: ApiDocEntry[] = [
    {
      name: 'createTree(input)',
      type: 'TreeSetup<T>',
      description: 'All-in-one builder: pass nodes + config, returns { config, nodes } ready for the template',
    },
  ];

  nodeHelperDocs: ApiDocEntry[] = [
    { name: 'node.create(label, opts?)', type: 'TreeNode<T>', description: 'Create a generic tree node' },
    { name: 'node.folder(label, children, opts?)', type: 'TreeNode<T>', description: 'Create a folder node with Folder/FolderOpen icons' },
    { name: 'node.file(label, opts?)', type: 'TreeNode<T>', description: 'Create a leaf/file node (leaf: true)' },
    { name: 'node.lazy(label, opts?)', type: 'TreeNode<T>', description: 'Create a lazy-loading node (leaf: false, no children)' },
    { name: 'node.fromData(items, opts)', type: 'TreeNode<T>[]', description: 'Convert a data array into tree nodes using mapping functions' },
  ];

  utilityDocs: ApiDocEntry[] = [
    { name: 'walkTree(nodes, cb)', type: 'void', description: 'DFS walk; callback returns false to stop' },
    { name: 'findNode(nodes, predicate)', type: 'TreeNode | undefined', description: 'Find first matching node (DFS)' },
    { name: 'findNodePath(nodes, predicate)', type: 'TreeNode[] | undefined', description: 'Get ancestor path to matching node' },
    { name: 'mapTree(nodes, fn)', type: 'TreeNode[]', description: 'Transform every node (returns new tree)' },
    { name: 'filterTree(nodes, predicate)', type: 'TreeNode[]', description: 'Keep matching nodes + their ancestors' },
    { name: 'flattenTree(nodes)', type: 'TreeNode[]', description: 'Flatten to single array (DFS order)' },
    { name: 'countNodes(nodes)', type: 'number', description: 'Count total nodes recursively' },
    { name: 'ensureKeys(nodes)', type: 'void', description: 'Assign unique keys to keyless nodes (mutates)' },
    { name: 'buildTree(items, opts)', type: 'TreeNode[]', description: 'Convert flat list with parent IDs to tree' },
  ];

  // Reference to tree components for expand/collapse all
  basicTree: TreeComponent<FileNode> | undefined;
  checkboxTree: TreeComponent<FileNode> | undefined;
  lazyTree: TreeComponent<FileNode> | undefined;

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
    this.checkboxTree?.clearSelection();
  }

  onNodeDrop(event: any) {
    this.lastDropEvent.set(event);
    this.toast.success(`Moved "${event.dragNode.label}" ${event.dropPosition} "${event.dropNode?.label}"`);
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
      this.lazyTree?.completeLoading(nd);
      this.toast.success(`Loaded ${children.length} children`);
    }, 1000);
  }

  onFilterChange(event: any) {
    this.filterMatchCount.set(event.matchedNodeCount);
  }
}
