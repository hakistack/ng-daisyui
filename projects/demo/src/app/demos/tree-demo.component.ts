import { Component, signal } from '@angular/core';
import { TreeComponent, TreeNode, LucideIconComponent, ToastService, TreeConfig } from '@hakistack/ng-daisyui';
import { inject } from '@angular/core';

interface FileNode {
  name: string;
  type: 'folder' | 'file';
  size?: number;
}

type DemoTab = 'basic' | 'selection' | 'checkbox' | 'dragdrop' | 'lazy' | 'filter';

@Component({
  selector: 'app-tree-demo',
  imports: [TreeComponent, LucideIconComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Tree</h1>
        <p class="text-base-content/70 mt-2">
          Hierarchical data display with selection, drag & drop, lazy loading, and filtering
        </p>
      </div>

      <!-- Tabs -->
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
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Basic Tree with Lines</h2>
            <p class="text-sm text-base-content/60 mb-4">
              Simple tree display with connecting lines and expand/collapse
            </p>

            <div class="flex gap-2 mb-4">
              <button class="btn btn-sm btn-outline" (click)="basicTree?.expandAll()">
                Expand All
              </button>
              <button class="btn btn-sm btn-outline" (click)="basicTree?.collapseAll()">
                Collapse All
              </button>
            </div>

            <div class="max-w-md">
              <app-tree
                #basicTree
                [nodes]="fileSystemNodes()"
                [config]="basicConfig"
                (nodeExpand)="onNodeExpand($event)"
                (nodeCollapse)="onNodeCollapse($event)"
              />
            </div>
          </div>
        </div>
      }

      <!-- Single Selection Tab -->
      @if (activeTab() === 'selection') {
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Single Selection Mode</h2>
            <p class="text-sm text-base-content/60 mb-4">
              Click a node to select it. Only one node can be selected at a time.
            </p>

            <div class="grid md:grid-cols-2 gap-4">
              <div class="max-w-md">
                <app-tree
                  [nodes]="departmentNodes()"
                  [config]="singleSelectionConfig"
                  [selection]="singleSelection()"
                  (selectionChange)="onSingleSelectionChange($event)"
                  (nodeSelect)="onNodeSelect($event)"
                />
              </div>

              <div>
                @if (singleSelection()) {
                  <div class="alert alert-info">
                    <app-lucide-icon name="Info" [size]="20" />
                    <span>Selected: <strong>{{ singleSelection()?.label }}</strong></span>
                  </div>
                } @else {
                  <div class="alert">
                    <span>No node selected</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Checkbox Tab -->
      @if (activeTab() === 'checkbox') {
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Checkbox Selection Mode</h2>
            <p class="text-sm text-base-content/60 mb-4">
              Multi-select with checkboxes. Selection propagates to children and parent shows partial state.
            </p>

            <div class="flex gap-2 mb-4">
              <button class="btn btn-sm btn-outline" (click)="clearCheckboxSelection()">
                Clear Selection
              </button>
            </div>

            <div class="grid md:grid-cols-2 gap-4">
              <div class="max-w-md">
                <app-tree
                  #checkboxTree
                  [nodes]="departmentNodes()"
                  [config]="checkboxConfig"
                  [selection]="checkboxSelection()"
                  (selectionChange)="onCheckboxSelectionChange($event)"
                />
              </div>

              <div>
                @if (checkboxSelection().length > 0) {
                  <div class="alert alert-success">
                    <app-lucide-icon name="CheckCheck" [size]="20" />
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
          </div>
        </div>
      }

      <!-- Drag & Drop Tab -->
      @if (activeTab() === 'dragdrop') {
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Drag & Drop</h2>
            <p class="text-sm text-base-content/60 mb-4">
              Drag nodes to reorder them. Drop on a node to make it a child, or between nodes to reorder.
            </p>

            <div class="max-w-md">
              <app-tree
                [nodes]="dragDropNodes()"
                [config]="dragDropConfig"
                (nodeDrop)="onNodeDrop($event)"
                (nodeDragStart)="onDragStart($event)"
                (nodeDragEnd)="onDragEnd($event)"
              />
            </div>

            @if (lastDropEvent()) {
              <div class="alert alert-info mt-4">
                <app-lucide-icon name="Move" [size]="20" />
                <span>
                  Dropped "<strong>{{ lastDropEvent()?.dragNode?.label }}</strong>"
                  {{ lastDropEvent()?.dropPosition }}
                  "<strong>{{ lastDropEvent()?.dropNode?.label }}</strong>"
                </span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Lazy Loading Tab -->
      @if (activeTab() === 'lazy') {
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Lazy Loading</h2>
            <p class="text-sm text-base-content/60 mb-4">
              Children are loaded on demand when expanding a node. Click the arrow to load children.
            </p>

            <div class="max-w-md">
              <app-tree
                #lazyTree
                [nodes]="lazyNodes()"
                [config]="lazyConfig"
                (lazyLoad)="onLazyLoad($event)"
              />
            </div>
          </div>
        </div>
      }

      <!-- Filter Tab -->
      @if (activeTab() === 'filter') {
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Filterable Tree</h2>
            <p class="text-sm text-base-content/60 mb-4">
              Type in the search box to filter nodes. Matching nodes and their ancestors are shown.
            </p>

            <div class="max-w-md">
              <app-tree
                [nodes]="fileSystemNodes()"
                [config]="filterConfig"
                (filterChange)="onFilterChange($event)"
              />
            </div>

            @if (filterMatchCount() !== null) {
              <div class="text-sm text-base-content/60 mt-2">
                {{ filterMatchCount() }} matching nodes
              </div>
            }
          </div>
        </div>
      }

      <!-- Features Card -->
      <div class="card bg-base-200">
        <div class="card-body">
          <h3 class="card-title text-lg">Tree Component Features</h3>
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li><strong>Selection Modes:</strong> Single, Multiple, Checkbox with propagation</li>
            <li><strong>Drag & Drop:</strong> Reorder nodes within the tree</li>
            <li><strong>Lazy Loading:</strong> Load children on demand from server</li>
            <li><strong>Filtering:</strong> Search and filter nodes by label</li>
            <li><strong>Connecting Lines:</strong> Visual lines showing hierarchy</li>
            <li><strong>Keyboard Navigation:</strong> Arrow keys, Enter, Space, Home, End</li>
            <li><strong>Custom Templates:</strong> Use ng-template for custom node rendering</li>
            <li><strong>Icons:</strong> Support for collapsed/expanded icon states</li>
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class TreeDemoComponent {
  private toast = inject(ToastService);

  activeTab = signal<DemoTab>('basic');

  // Selection state
  singleSelection = signal<TreeNode<FileNode> | null>(null);
  checkboxSelection = signal<TreeNode<FileNode>[]>([]);
  lastDropEvent = signal<any>(null);
  filterMatchCount = signal<number | null>(null);

  // Configs
  basicConfig: TreeConfig<FileNode> = {
    showLines: true,
    keyboardNavigation: true,
    indentSize: 24,
  };

  singleSelectionConfig: TreeConfig<FileNode> = {
    selectionMode: 'single',
    showLines: true,
    keyboardNavigation: true,
  };

  checkboxConfig: TreeConfig<FileNode> = {
    selectionMode: 'checkbox',
    showLines: true,
    propagateSelectionDown: true,
    propagateSelectionUp: true,
    keyboardNavigation: true,
  };

  dragDropConfig: TreeConfig<FileNode> = {
    dragDrop: true,
    showLines: true,
    selectionMode: 'single',
    keyboardNavigation: true,
  };

  lazyConfig: TreeConfig<FileNode> = {
    showLines: true,
    keyboardNavigation: true,
  };

  filterConfig: TreeConfig<FileNode> = {
    filterable: true,
    filterMode: 'lenient',
    filterPlaceholder: 'Search files...',
    showLines: true,
    expandAll: true,
    keyboardNavigation: true,
  };

  // File system nodes
  fileSystemNodes = signal<TreeNode<FileNode>[]>([
    {
      key: 'src',
      label: 'src',
      icon: 'Folder',
      expandedIcon: 'FolderOpen',
      data: { name: 'src', type: 'folder' },
      expanded: true,
      children: [
        {
          key: 'app',
          label: 'app',
          icon: 'Folder',
          expandedIcon: 'FolderOpen',
          data: { name: 'app', type: 'folder' },
          expanded: true,
          children: [
            {
              key: 'components',
              label: 'components',
              icon: 'Folder',
              expandedIcon: 'FolderOpen',
              data: { name: 'components', type: 'folder' },
              children: [
                { key: 'header.ts', label: 'header.component.ts', icon: 'FileCode', data: { name: 'header.component.ts', type: 'file', size: 2048 } },
                { key: 'footer.ts', label: 'footer.component.ts', icon: 'FileCode', data: { name: 'footer.component.ts', type: 'file', size: 1024 } },
                { key: 'sidebar.ts', label: 'sidebar.component.ts', icon: 'FileCode', data: { name: 'sidebar.component.ts', type: 'file', size: 3072 } },
              ],
            },
            {
              key: 'services',
              label: 'services',
              icon: 'Folder',
              expandedIcon: 'FolderOpen',
              data: { name: 'services', type: 'folder' },
              children: [
                { key: 'api.ts', label: 'api.service.ts', icon: 'FileCode', data: { name: 'api.service.ts', type: 'file', size: 4096 } },
                { key: 'auth.ts', label: 'auth.service.ts', icon: 'FileCode', data: { name: 'auth.service.ts', type: 'file', size: 2560 } },
              ],
            },
            { key: 'app.ts', label: 'app.component.ts', icon: 'FileCode', data: { name: 'app.component.ts', type: 'file', size: 1536 } },
            { key: 'app.html', label: 'app.component.html', icon: 'FileText', data: { name: 'app.component.html', type: 'file', size: 512 } },
          ],
        },
        {
          key: 'assets',
          label: 'assets',
          icon: 'Folder',
          expandedIcon: 'FolderOpen',
          data: { name: 'assets', type: 'folder' },
          children: [
            { key: 'logo.png', label: 'logo.png', icon: 'Image', data: { name: 'logo.png', type: 'file', size: 15360 } },
            { key: 'styles.css', label: 'styles.css', icon: 'FileCode', data: { name: 'styles.css', type: 'file', size: 8192 } },
          ],
        },
        { key: 'main.ts', label: 'main.ts', icon: 'FileCode', data: { name: 'main.ts', type: 'file', size: 256 } },
        { key: 'index.html', label: 'index.html', icon: 'FileText', data: { name: 'index.html', type: 'file', size: 512 } },
      ],
    },
    { key: 'package.json', label: 'package.json', icon: 'Braces', data: { name: 'package.json', type: 'file', size: 1536 } },
    { key: 'README.md', label: 'README.md', icon: 'FileText', data: { name: 'README.md', type: 'file', size: 2048 } },
  ]);

  // Department nodes
  departmentNodes = signal<TreeNode<FileNode>[]>([
    {
      key: 'company',
      label: 'Acme Corporation',
      icon: 'Building2',
      data: { name: 'Acme Corporation', type: 'folder' },
      expanded: true,
      children: [
        {
          key: 'engineering',
          label: 'Engineering',
          icon: 'Code',
          data: { name: 'Engineering', type: 'folder' },
          expanded: true,
          children: [
            { key: 'frontend', label: 'Frontend Team', icon: 'Monitor', data: { name: 'Frontend Team', type: 'folder' } },
            { key: 'backend', label: 'Backend Team', icon: 'Server', data: { name: 'Backend Team', type: 'folder' } },
            { key: 'devops', label: 'DevOps Team', icon: 'Cloud', data: { name: 'DevOps Team', type: 'folder' } },
          ],
        },
        {
          key: 'design',
          label: 'Design',
          icon: 'Palette',
          data: { name: 'Design', type: 'folder' },
          children: [
            { key: 'ux', label: 'UX Team', icon: 'Users', data: { name: 'UX Team', type: 'folder' } },
            { key: 'ui', label: 'UI Team', icon: 'LayoutGrid', data: { name: 'UI Team', type: 'folder' } },
          ],
        },
        {
          key: 'marketing',
          label: 'Marketing',
          icon: 'Megaphone',
          data: { name: 'Marketing', type: 'folder' },
          children: [
            { key: 'content', label: 'Content Team', icon: 'FileText', data: { name: 'Content Team', type: 'folder' } },
            { key: 'social', label: 'Social Media', icon: 'Share2', data: { name: 'Social Media', type: 'folder' } },
          ],
        },
      ],
    },
  ]);

  // Drag & drop nodes
  dragDropNodes = signal<TreeNode<FileNode>[]>([
    {
      key: 'tasks',
      label: 'Tasks',
      icon: 'ListTodo',
      data: { name: 'Tasks', type: 'folder' },
      expanded: true,
      children: [
        { key: 'task1', label: 'Design homepage', icon: 'Circle', data: { name: 'Design homepage', type: 'file' } },
        { key: 'task2', label: 'Implement API', icon: 'Circle', data: { name: 'Implement API', type: 'file' } },
        { key: 'task3', label: 'Write tests', icon: 'Circle', data: { name: 'Write tests', type: 'file' } },
        { key: 'task4', label: 'Deploy to staging', icon: 'Circle', data: { name: 'Deploy to staging', type: 'file' } },
      ],
    },
    {
      key: 'completed',
      label: 'Completed',
      icon: 'CircleCheck',
      data: { name: 'Completed', type: 'folder' },
      expanded: true,
      children: [
        { key: 'done1', label: 'Setup project', icon: 'CircleCheckBig', data: { name: 'Setup project', type: 'file' } },
        { key: 'done2', label: 'Create database schema', icon: 'CircleCheckBig', data: { name: 'Create database schema', type: 'file' } },
      ],
    },
  ]);

  // Lazy loading nodes
  lazyNodes = signal<TreeNode<FileNode>[]>([
    {
      key: 'lazy-root1',
      label: 'Documents',
      icon: 'Folder',
      expandedIcon: 'FolderOpen',
      data: { name: 'Documents', type: 'folder' },
      leaf: false, // Has children but not loaded yet
    },
    {
      key: 'lazy-root2',
      label: 'Pictures',
      icon: 'Folder',
      expandedIcon: 'FolderOpen',
      data: { name: 'Pictures', type: 'folder' },
      leaf: false,
    },
    {
      key: 'lazy-root3',
      label: 'Music',
      icon: 'Folder',
      expandedIcon: 'FolderOpen',
      data: { name: 'Music', type: 'folder' },
      leaf: false,
    },
  ]);

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
    // For single selection, we expect a single node
    if (Array.isArray(node)) {
      this.singleSelection.set(node[0] ?? null);
    } else {
      this.singleSelection.set(node);
    }
  }

  onCheckboxSelectionChange(nodes: TreeNode<FileNode> | TreeNode<FileNode>[] | null) {
    // For checkbox selection, we expect an array
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
    // Also need to clear on the tree component
    this.checkboxTree?.clearSelection();
  }

  onNodeDrop(event: any) {
    this.lastDropEvent.set(event);
    this.toast.success(`Moved "${event.dragNode.label}" ${event.dropPosition} "${event.dropNode?.label}"`);

    // Note: In a real app, you would update the nodes array here
    // This is just a demo showing the event
  }

  onDragStart(event: any) {
    console.log('Drag started:', event.node.label);
  }

  onDragEnd(event: any) {
    console.log('Drag ended:', event.node.label);
  }

  onLazyLoad(event: any) {
    const node = event.node;
    this.toast.info(`Loading children for: ${node.label}`);

    // Simulate API call
    setTimeout(() => {
      // Generate fake children
      const children: TreeNode<FileNode>[] = [
        {
          key: `${node.key}-child1`,
          label: `${node.label} - File 1`,
          icon: 'FileText',
          data: { name: `${node.label} - File 1`, type: 'file' },
        },
        {
          key: `${node.key}-child2`,
          label: `${node.label} - File 2`,
          icon: 'FileText',
          data: { name: `${node.label} - File 2`, type: 'file' },
        },
        {
          key: `${node.key}-subfolder`,
          label: `${node.label} - Subfolder`,
          icon: 'Folder',
          expandedIcon: 'FolderOpen',
          data: { name: `${node.label} - Subfolder`, type: 'folder' },
          leaf: false, // Can load more
        },
      ];

      // Update the node with children
      node.children = children;

      // Complete loading
      this.lazyTree?.completeLoading(node);

      this.toast.success(`Loaded ${children.length} children`);
    }, 1000);
  }

  onFilterChange(event: any) {
    this.filterMatchCount.set(event.matchedNodeCount);
  }
}
