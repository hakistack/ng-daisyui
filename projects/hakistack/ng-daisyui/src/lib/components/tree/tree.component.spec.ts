import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreeComponent } from './tree.component';
import { TreeNode } from '../../api/treenode';
import {
  createTree,
  node,
  walkTree,
  findNode,
  findNodePath,
  mapTree,
  filterTree,
  flattenTree,
  countNodes,
  ensureKeys,
  buildTree,
} from './tree.helpers';
import { TreeConfig } from './tree.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSimpleTree(): TreeNode[] {
  return [
    {
      key: 'root-1',
      label: 'Documents',
      children: [
        { key: 'doc-1', label: 'Resume.pdf', leaf: true },
        { key: 'doc-2', label: 'Cover Letter.docx', leaf: true },
      ],
    },
    {
      key: 'root-2',
      label: 'Images',
      children: [
        { key: 'img-1', label: 'Photo.png', leaf: true },
        { key: 'img-2', label: 'Logo.svg', leaf: true },
      ],
    },
    {
      key: 'root-3',
      label: 'ReadMe.md',
      leaf: true,
    },
  ];
}

function makeDeepTree(): TreeNode[] {
  return [
    {
      key: 'a',
      label: 'Level 0',
      children: [
        {
          key: 'b',
          label: 'Level 1',
          children: [
            {
              key: 'c',
              label: 'Level 2',
              children: [{ key: 'd', label: 'Level 3', leaf: true }],
            },
          ],
        },
      ],
    },
  ];
}

function query(fixture: ComponentFixture<unknown>, selector: string): HTMLElement | null {
  return fixture.nativeElement.querySelector(selector);
}

function queryAll(fixture: ComponentFixture<unknown>, selector: string): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll(selector));
}

/** Create a mock DragEvent since JSDOM does not provide DragEvent */
function mockDragEvent(type: string): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as unknown as DragEvent;
  Object.defineProperty(event, 'dataTransfer', { value: null });
  return event;
}

// ---------------------------------------------------------------------------
// Tree Helper Functions (pure, no TestBed needed)
// ---------------------------------------------------------------------------

describe('Tree helper functions', () => {
  // -------- createTree --------
  describe('createTree', () => {
    it('should separate nodes from config', () => {
      const result = createTree({
        nodes: [{ key: '1', label: 'A' }],
        filterable: true,
        showLines: true,
      });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].label).toBe('A');
      expect(result.config.filterable).toBe(true);
      expect(result.config.showLines).toBe(true);
    });

    it('should provide default config values', () => {
      const result = createTree({ nodes: [] });

      expect(result.config.selectionMode).toBeNull();
      expect(result.config.dragDrop).toBe(false);
      expect(result.config.filterable).toBe(false);
      expect(result.config.filterMode).toBe('lenient');
      expect(result.config.indentSize).toBe(24);
      expect(result.config.propagateSelectionDown).toBe(true);
      expect(result.config.propagateSelectionUp).toBe(true);
      expect(result.config.expandAll).toBe(false);
      expect(result.config.loading).toBe(false);
      expect(result.config.emptyMessage).toBe('No data available');
      expect(result.config.keyboardNavigation).toBe(true);
    });

    it('should assign keys to nodes without keys', () => {
      const result = createTree({
        nodes: [{ label: 'No Key' }],
      });

      expect(result.nodes[0].key).toBeDefined();
      expect(result.nodes[0].key!.length).toBeGreaterThan(0);
    });

    it('should preserve existing keys', () => {
      const result = createTree({
        nodes: [{ key: 'my-key', label: 'Has Key' }],
      });

      expect(result.nodes[0].key).toBe('my-key');
    });
  });

  // -------- node namespace --------
  describe('node builders', () => {
    describe('node.create', () => {
      it('should create a basic node with label and auto key', () => {
        const n = node.create('Test Node');
        expect(n.label).toBe('Test Node');
        expect(n.key).toBeDefined();
      });

      it('should accept optional overrides', () => {
        const n = node.create('Test', { icon: 'File', leaf: true });
        expect(n.label).toBe('Test');
        expect(n.icon).toBe('File');
        expect(n.leaf).toBe(true);
      });

      it('should use provided key if given in opts', () => {
        const n = node.create('Test', { key: 'custom-key' });
        // label is applied after opts spread, but key from opts should be preserved
        // Actually: { key: generateKey(), ...opts, label } => key from opts wins via spread
        expect(n.key).toBe('custom-key');
      });
    });

    describe('node.folder', () => {
      it('should create a folder with default icons', () => {
        const children = [node.file('child.txt')];
        const n = node.folder('My Folder', children);

        expect(n.label).toBe('My Folder');
        expect(n.icon).toBe('folder');
        expect(n.expandedIcon).toBe('folder-open');
        expect(n.children).toBe(children);
        expect(n.key).toBeDefined();
      });

      it('should allow overriding icons', () => {
        const n = node.folder('Custom', [], { icon: 'Box', expandedIcon: 'BoxSelect' });
        expect(n.icon).toBe('Box');
        expect(n.expandedIcon).toBe('BoxSelect');
      });
    });

    describe('node.file', () => {
      it('should create a leaf node', () => {
        const n = node.file('test.txt');
        expect(n.label).toBe('test.txt');
        expect(n.leaf).toBe(true);
        expect(n.key).toBeDefined();
      });

      it('should accept extra options', () => {
        const n = node.file('test.pdf', { icon: 'FileText' });
        expect(n.icon).toBe('FileText');
      });
    });

    describe('node.lazy', () => {
      it('should create a lazy-loading node', () => {
        const n = node.lazy('Archives');
        expect(n.label).toBe('Archives');
        expect(n.leaf).toBe(false);
        expect(n.children).toBeUndefined();
        expect(n.icon).toBe('folder');
        expect(n.expandedIcon).toBe('folder-open');
      });
    });

    describe('node.fromData', () => {
      it('should convert a flat data array to tree nodes', () => {
        interface Dept {
          name: string;
          subs?: Dept[];
        }
        const data: Dept[] = [{ name: 'Engineering', subs: [{ name: 'Frontend' }, { name: 'Backend' }] }, { name: 'Marketing' }];

        const result = node.fromData(data, {
          labelFn: (d) => d.name,
          childrenFn: (d) => d.subs,
        });

        expect(result).toHaveLength(2);
        expect(result[0].label).toBe('Engineering');
        expect(result[0].children).toHaveLength(2);
        expect(result[0].children![0].label).toBe('Frontend');
        expect(result[1].label).toBe('Marketing');
        expect(result[1].leaf).toBe(true);
      });

      it('should use keyFn if provided', () => {
        const data = [{ id: 'x1', name: 'Item' }];
        const result = node.fromData(data, {
          labelFn: (d) => d.name,
          keyFn: (d) => d.id,
        });

        expect(result[0].key).toBe('x1');
      });

      it('should store original data in node.data', () => {
        const item = { id: '1', name: 'Obj' };
        const result = node.fromData([item], {
          labelFn: (d) => d.name,
        });

        expect(result[0].data).toBe(item);
      });
    });
  });

  // -------- walkTree --------
  describe('walkTree', () => {
    it('should visit all nodes in DFS order', () => {
      const tree = makeSimpleTree();
      const visited: string[] = [];
      walkTree(tree, (n) => {
        visited.push(n.key!);
      });

      expect(visited).toEqual(['root-1', 'doc-1', 'doc-2', 'root-2', 'img-1', 'img-2', 'root-3']);
    });

    it('should stop traversal when callback returns false', () => {
      const tree = makeSimpleTree();
      const visited: string[] = [];
      walkTree(tree, (n) => {
        visited.push(n.key!);
        if (n.key === 'doc-1') return false;
        return undefined;
      });

      expect(visited).toEqual(['root-1', 'doc-1']);
    });

    it('should pass parent reference to callback', () => {
      const tree = makeSimpleTree();
      const parentMap: Record<string, string | null> = {};
      walkTree(tree, (n, parent) => {
        parentMap[n.key!] = parent?.key ?? null;
      });

      expect(parentMap['root-1']).toBeNull();
      expect(parentMap['doc-1']).toBe('root-1');
      expect(parentMap['img-2']).toBe('root-2');
    });
  });

  // -------- findNode --------
  describe('findNode', () => {
    it('should find a node by predicate', () => {
      const tree = makeSimpleTree();
      const found = findNode(tree, (n) => n.key === 'img-1');
      expect(found).toBeDefined();
      expect(found!.label).toBe('Photo.png');
    });

    it('should return undefined when not found', () => {
      const tree = makeSimpleTree();
      const found = findNode(tree, (n) => n.key === 'nonexistent');
      expect(found).toBeUndefined();
    });

    it('should find deeply nested nodes', () => {
      const tree = makeDeepTree();
      const found = findNode(tree, (n) => n.key === 'd');
      expect(found).toBeDefined();
      expect(found!.label).toBe('Level 3');
    });
  });

  // -------- findNodePath --------
  describe('findNodePath', () => {
    it('should return ancestor path to the found node', () => {
      const tree = makeDeepTree();
      const path = findNodePath(tree, (n) => n.key === 'd');
      expect(path).toBeDefined();
      expect(path!.map((n) => n.key)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should return undefined when node not found', () => {
      const tree = makeSimpleTree();
      const path = findNodePath(tree, (n) => n.key === 'nope');
      expect(path).toBeUndefined();
    });

    it('should return single-element path for root node', () => {
      const tree = makeSimpleTree();
      const path = findNodePath(tree, (n) => n.key === 'root-1');
      expect(path).toEqual([tree[0]]);
    });
  });

  // -------- mapTree --------
  describe('mapTree', () => {
    it('should transform all nodes', () => {
      const tree: TreeNode[] = [{ key: '1', label: 'a', children: [{ key: '2', label: 'b' }] }];

      const result = mapTree(tree, (n) => ({ ...n, label: n.label!.toUpperCase() }));
      expect(result[0].label).toBe('A');
      expect(result[0].children![0].label).toBe('B');
    });

    it('should not mutate the original tree', () => {
      const tree: TreeNode[] = [{ key: '1', label: 'original' }];
      mapTree(tree, (n) => ({ ...n, label: 'changed' }));
      expect(tree[0].label).toBe('original');
    });
  });

  // -------- filterTree --------
  describe('filterTree', () => {
    it('should keep matching nodes and their ancestors', () => {
      const tree = makeSimpleTree();
      const result = filterTree(tree, (n) => n.label === 'Photo.png');

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('root-2');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].key).toBe('img-1');
    });

    it('should return empty when nothing matches', () => {
      const tree = makeSimpleTree();
      const result = filterTree(tree, (n) => n.label === 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('should keep root-level match', () => {
      const tree = makeSimpleTree();
      const result = filterTree(tree, (n) => n.key === 'root-3');
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('ReadMe.md');
    });
  });

  // -------- flattenTree --------
  describe('flattenTree', () => {
    it('should flatten all nodes in DFS order', () => {
      const tree = makeSimpleTree();
      const flat = flattenTree(tree);
      expect(flat.map((n) => n.key)).toEqual(['root-1', 'doc-1', 'doc-2', 'root-2', 'img-1', 'img-2', 'root-3']);
    });

    it('should return empty for empty tree', () => {
      expect(flattenTree([])).toEqual([]);
    });
  });

  // -------- countNodes --------
  describe('countNodes', () => {
    it('should count all nodes', () => {
      expect(countNodes(makeSimpleTree())).toBe(7);
    });

    it('should return 0 for empty tree', () => {
      expect(countNodes([])).toBe(0);
    });

    it('should count deeply nested nodes', () => {
      expect(countNodes(makeDeepTree())).toBe(4);
    });
  });

  // -------- ensureKeys --------
  describe('ensureKeys', () => {
    it('should assign keys to nodes without keys', () => {
      const tree: TreeNode[] = [{ label: 'A', children: [{ label: 'B' }] }];
      ensureKeys(tree);

      expect(tree[0].key).toBeDefined();
      expect(tree[0].children![0].key).toBeDefined();
    });

    it('should not overwrite existing keys', () => {
      const tree: TreeNode[] = [{ key: 'existing', label: 'A' }];
      ensureKeys(tree);
      expect(tree[0].key).toBe('existing');
    });

    it('should use prefix when provided', () => {
      const tree: TreeNode[] = [{ label: 'A' }];
      ensureKeys(tree, 'pfx');
      expect(tree[0].key).toContain('pfx');
    });
  });

  // -------- buildTree --------
  describe('buildTree', () => {
    interface Employee {
      id: string;
      name: string;
      managerId: string | null;
    }

    const employees: Employee[] = [
      { id: '1', name: 'CEO', managerId: null },
      { id: '2', name: 'CTO', managerId: '1' },
      { id: '3', name: 'Dev', managerId: '2' },
      { id: '4', name: 'CFO', managerId: '1' },
    ];

    it('should build a tree from flat list with parent IDs', () => {
      const tree = buildTree(employees, {
        idFn: (e) => e.id,
        parentIdFn: (e) => e.managerId,
        labelFn: (e) => e.name,
      });

      expect(tree).toHaveLength(1); // only CEO is root
      expect(tree[0].label).toBe('CEO');
      expect(tree[0].children).toHaveLength(2); // CTO and CFO
    });

    it('should store original data in node.data', () => {
      const tree = buildTree(employees, {
        idFn: (e) => e.id,
        parentIdFn: (e) => e.managerId,
        labelFn: (e) => e.name,
      });

      expect(tree[0].data).toBe(employees[0]);
    });

    it('should mark leaf nodes', () => {
      const tree = buildTree(employees, {
        idFn: (e) => e.id,
        parentIdFn: (e) => e.managerId,
        labelFn: (e) => e.name,
      });

      const dev = findNode(tree, (n) => n.label === 'Dev');
      expect(dev!.leaf).toBe(true);
      expect(dev!.children).toBeUndefined();
    });

    it('should handle multiple root nodes', () => {
      const data: Employee[] = [
        { id: '1', name: 'A', managerId: null },
        { id: '2', name: 'B', managerId: null },
      ];

      const tree = buildTree(data, {
        idFn: (e) => e.id,
        parentIdFn: (e) => e.managerId,
        labelFn: (e) => e.name,
      });

      expect(tree).toHaveLength(2);
    });
  });
});

// ---------------------------------------------------------------------------
// TreeComponent (Angular TestBed)
// ---------------------------------------------------------------------------

describe('TreeComponent', () => {
  let fixture: ComponentFixture<TreeComponent>;
  let component: TreeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreeComponent);
    component = fixture.componentInstance;
  });

  // -------- Component creation --------
  describe('creation', () => {
    it('should create the component', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have tree role on host', () => {
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      expect(host.getAttribute('role')).toBe('tree');
    });

    it('should render empty message when no nodes', () => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('No data available');
    });
  });

  // -------- Node rendering --------
  describe('node rendering', () => {
    it('should render root-level nodes', () => {
      const tree = makeSimpleTree();
      fixture.componentRef.setInput('nodes', tree);
      fixture.detectChanges();

      const labels = queryAll(fixture, '.app-tree-node-label');
      // Only root-level visible (collapsed by default)
      expect(labels.map((el) => el.textContent!.trim())).toEqual(['Documents', 'Images', 'ReadMe.md']);
    });

    it('should render children when node is expanded', () => {
      const tree = makeSimpleTree();
      tree[0].expanded = true; // expand Documents
      fixture.componentRef.setInput('nodes', tree);
      fixture.detectChanges();

      const labels = queryAll(fixture, '.app-tree-node-label');
      expect(labels.map((el) => el.textContent!.trim())).toEqual(['Documents', 'Resume.pdf', 'Cover Letter.docx', 'Images', 'ReadMe.md']);
    });

    it('should render treeitem role on each node', () => {
      fixture.componentRef.setInput('nodes', makeSimpleTree());
      fixture.detectChanges();

      const items = queryAll(fixture, '[role="treeitem"]');
      expect(items.length).toBe(3); // root nodes only
    });

    it('should show toggle button for parent nodes', () => {
      fixture.componentRef.setInput('nodes', makeSimpleTree());
      fixture.detectChanges();

      const toggleButtons = queryAll(fixture, '.app-tree-node-toggle button');
      // Documents and Images have children, ReadMe.md does not
      expect(toggleButtons.length).toBe(2);
    });

    it('should show custom empty message', () => {
      fixture.componentRef.setInput('nodes', []);
      fixture.componentRef.setInput('config', { emptyMessage: 'Nothing here' } as TreeConfig);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Nothing here');
    });
  });

  // -------- Expand / Collapse --------
  describe('expand/collapse', () => {
    it('should expand a node via toggleNode', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();

      component.toggleNode(nodes[0]);
      fixture.detectChanges();

      expect(component.isExpanded(nodes[0])).toBe(true);
      const labels = queryAll(fixture, '.app-tree-node-label');
      expect(labels.map((el) => el.textContent!.trim())).toContain('Resume.pdf');
    });

    it('should collapse an expanded node via toggleNode', () => {
      const nodes = makeSimpleTree();
      nodes[0].expanded = true;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();

      component.toggleNode(nodes[0]);
      fixture.detectChanges();

      expect(component.isExpanded(nodes[0])).toBe(false);
    });

    it('should expand a node via expandNode', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();

      component.expandNode(nodes[0]);
      fixture.detectChanges();

      expect(component.isExpanded(nodes[0])).toBe(true);
    });

    it('should collapse a node via collapseNode', () => {
      const nodes = makeSimpleTree();
      nodes[0].expanded = true;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();

      component.collapseNode(nodes[0]);
      fixture.detectChanges();

      expect(component.isExpanded(nodes[0])).toBe(false);
    });

    it('should expandAll nodes', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();

      component.expandAll();
      fixture.detectChanges();

      expect(component.isExpanded(nodes[0])).toBe(true);
      expect(component.isExpanded(nodes[1])).toBe(true);
    });

    it('should collapseAll nodes', () => {
      const nodes = makeSimpleTree();
      nodes[0].expanded = true;
      nodes[1].expanded = true;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();

      component.collapseAll();
      fixture.detectChanges();

      expect(component.isExpanded(nodes[0])).toBe(false);
      expect(component.isExpanded(nodes[1])).toBe(false);
    });

    it('should set aria-expanded on parent nodes', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();

      const items = queryAll(fixture, '[role="treeitem"]');
      // Documents (has children, collapsed) -> aria-expanded="false"
      expect(items[0].getAttribute('aria-expanded')).toBe('false');
      // ReadMe.md (leaf) -> no aria-expanded
      expect(items[2].getAttribute('aria-expanded')).toBeNull();
    });

    it('should expand all nodes when config.expandAll is true', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { expandAll: true } as TreeConfig);
      fixture.detectChanges();

      expect(component.isExpanded(nodes[0])).toBe(true);
      expect(component.isExpanded(nodes[1])).toBe(true);
    });
  });

  // -------- Events: nodeExpand / nodeCollapse --------
  describe('expand/collapse events', () => {
    it('should emit nodeExpand when expanding a node', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();

      let expandedNode: TreeNode | null = null;
      component.nodeExpand.subscribe((ev) => {
        expandedNode = ev.node;
      });

      component.expandNode(nodes[0]);
      expect(expandedNode).toBe(nodes[0]);
    });

    it('should emit nodeCollapse when collapsing a node', () => {
      const nodes = makeSimpleTree();
      nodes[0].expanded = true;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();

      let collapsedNode: TreeNode | null = null;
      component.nodeCollapse.subscribe((ev) => {
        collapsedNode = ev.node;
      });

      component.collapseNode(nodes[0]);
      expect(collapsedNode).toBe(nodes[0]);
    });
  });

  // -------- Single selection --------
  describe('single selection', () => {
    it('should select a node', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'single' } as TreeConfig);
      fixture.detectChanges();

      component.selectNode(nodes[2]); // ReadMe.md
      fixture.detectChanges();

      expect(component.isSelected(nodes[2])).toBe(true);
    });

    it('should replace selection in single mode', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'single' } as TreeConfig);
      fixture.detectChanges();

      component.selectNode(nodes[0]);
      component.selectNode(nodes[1]);
      fixture.detectChanges();

      expect(component.isSelected(nodes[0])).toBe(false);
      expect(component.isSelected(nodes[1])).toBe(true);
    });

    it('should emit nodeSelect on selection', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'single' } as TreeConfig);
      fixture.detectChanges();

      let selectedNode: TreeNode | null = null;
      component.nodeSelect.subscribe((ev) => {
        selectedNode = ev.node;
      });

      component.selectNode(nodes[0]);
      expect(selectedNode).toBe(nodes[0]);
    });

    it('should emit selectionChange with single node', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'single' } as TreeConfig);
      fixture.detectChanges();

      let selection: TreeNode | TreeNode[] | null = null;
      component.selectionChange.subscribe((s) => {
        selection = s;
      });

      component.selectNode(nodes[0]);
      expect(selection).toBe(nodes[0]);
    });

    it('should not select when selectionMode is null', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();

      component.selectNode(nodes[0]);
      fixture.detectChanges();

      expect(component.isSelected(nodes[0])).toBe(false);
    });
  });

  // -------- Multiple selection --------
  describe('multiple selection', () => {
    it('should allow selecting multiple nodes', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'multiple' } as TreeConfig);
      fixture.detectChanges();

      component.selectNode(nodes[0]);
      component.selectNode(nodes[2]);
      fixture.detectChanges();

      expect(component.isSelected(nodes[0])).toBe(true);
      expect(component.isSelected(nodes[2])).toBe(true);
    });

    it('should emit selectionChange with array of nodes', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'multiple' } as TreeConfig);
      fixture.detectChanges();

      let selection: TreeNode | TreeNode[] | null = null;
      component.selectionChange.subscribe((s) => {
        selection = s;
      });

      component.selectNode(nodes[0]);
      component.selectNode(nodes[2]);
      expect(Array.isArray(selection)).toBe(true);
      expect((selection as unknown as TreeNode[]).length).toBe(2);
    });
  });

  // -------- Unselect --------
  describe('unselect', () => {
    it('should unselect a selected node', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'multiple' } as TreeConfig);
      fixture.detectChanges();

      component.selectNode(nodes[0]);
      component.unselectNode(nodes[0]);
      fixture.detectChanges();

      expect(component.isSelected(nodes[0])).toBe(false);
    });

    it('should emit nodeUnselect event', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'multiple' } as TreeConfig);
      fixture.detectChanges();

      let unselectedNode: TreeNode | null = null;
      component.nodeUnselect.subscribe((ev) => {
        unselectedNode = ev.node;
      });

      component.selectNode(nodes[0]);
      component.unselectNode(nodes[0]);
      expect(unselectedNode).toBe(nodes[0]);
    });
  });

  // -------- Checkbox selection --------
  describe('checkbox selection', () => {
    it('should render checkboxes in checkbox mode', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'checkbox' } as TreeConfig);
      fixture.detectChanges();

      const checkboxes = queryAll(fixture, 'input[type="checkbox"]');
      expect(checkboxes.length).toBe(3); // root nodes only
    });

    it('should toggle checkbox selection via selectNode', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'checkbox' } as TreeConfig);
      fixture.detectChanges();

      component.selectNode(nodes[2]); // ReadMe.md (leaf)
      fixture.detectChanges();

      expect(component.isSelected(nodes[2])).toBe(true);
    });

    it('should propagate selection down to children by default', () => {
      const nodes = makeSimpleTree();
      nodes[0].expanded = true;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'checkbox' } as TreeConfig);
      fixture.detectChanges();

      component.selectNode(nodes[0]); // Documents
      fixture.detectChanges();

      expect(component.isSelected(nodes[0])).toBe(true);
      expect(component.isSelected(nodes[0].children![0])).toBe(true);
      expect(component.isSelected(nodes[0].children![1])).toBe(true);
    });

    it('should deselect children when parent is unchecked', () => {
      const nodes = makeSimpleTree();
      nodes[0].expanded = true;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'checkbox' } as TreeConfig);
      fixture.detectChanges();

      // Select then unselect
      component.selectNode(nodes[0]);
      fixture.detectChanges();
      component.selectNode(nodes[0]); // toggle off
      fixture.detectChanges();

      expect(component.isSelected(nodes[0])).toBe(false);
      expect(component.isSelected(nodes[0].children![0])).toBe(false);
    });

    it('should not propagate down when propagateSelectionDown is false', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', {
        selectionMode: 'checkbox',
        propagateSelectionDown: false,
      } as TreeConfig);
      fixture.detectChanges();

      component.selectNode(nodes[0]);
      fixture.detectChanges();

      expect(component.isSelected(nodes[0])).toBe(true);
      expect(component.isSelected(nodes[0].children![0])).toBe(false);
    });

    it('should not select non-selectable nodes via onNodeClick', () => {
      const nodes = makeSimpleTree();
      nodes[2].selectable = false;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'checkbox' } as TreeConfig);
      fixture.detectChanges();

      const event = new MouseEvent('click');
      component.onNodeClick(event, nodes[2]);
      fixture.detectChanges();

      expect(component.isSelected(nodes[2])).toBe(false);
    });
  });

  // -------- onNodeClick --------
  describe('onNodeClick', () => {
    it('should toggle selection in single mode', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'single' } as TreeConfig);
      fixture.detectChanges();

      const event = new MouseEvent('click');
      component.onNodeClick(event, nodes[0]);
      fixture.detectChanges();

      expect(component.isSelected(nodes[0])).toBe(true);

      component.onNodeClick(event, nodes[0]);
      fixture.detectChanges();

      expect(component.isSelected(nodes[0])).toBe(false);
    });

    it('should skip non-selectable nodes', () => {
      const nodes = makeSimpleTree();
      nodes[0].selectable = false;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'single' } as TreeConfig);
      fixture.detectChanges();

      component.onNodeClick(new MouseEvent('click'), nodes[0]);
      expect(component.isSelected(nodes[0])).toBe(false);
    });
  });

  // -------- Clear selection --------
  describe('clearSelection', () => {
    it('should clear all selections', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'multiple' } as TreeConfig);
      fixture.detectChanges();

      component.selectNode(nodes[0]);
      component.selectNode(nodes[1]);
      component.clearSelection();
      fixture.detectChanges();

      expect(component.isSelected(nodes[0])).toBe(false);
      expect(component.isSelected(nodes[1])).toBe(false);
    });

    it('should emit selectionChange after clearing', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'multiple' } as TreeConfig);
      fixture.detectChanges();

      component.selectNode(nodes[0]);

      let selection: TreeNode | TreeNode[] | null = 'unset' as unknown as null;
      component.selectionChange.subscribe((s) => {
        selection = s;
      });

      component.clearSelection();
      expect(Array.isArray(selection)).toBe(true);
      expect((selection as unknown as TreeNode[]).length).toBe(0);
    });
  });

  // -------- Filter / search --------
  describe('filter/search', () => {
    it('should show filter input when filterable is true', () => {
      fixture.componentRef.setInput('nodes', makeSimpleTree());
      fixture.componentRef.setInput('config', { filterable: true } as TreeConfig);
      fixture.detectChanges();

      const input = query(fixture, '.app-tree-filter input');
      expect(input).toBeTruthy();
    });

    it('should not show filter input when filterable is false', () => {
      fixture.componentRef.setInput('nodes', makeSimpleTree());
      fixture.detectChanges();

      const input = query(fixture, '.app-tree-filter input');
      expect(input).toBeNull();
    });

    it('should filter nodes based on filterText (lenient mode)', () => {
      const nodes = makeSimpleTree();
      // Expand parents so children appear in flatNodes
      nodes[0].expanded = true;
      nodes[1].expanded = true;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { filterable: true } as TreeConfig);
      fixture.detectChanges();

      component.onFilterTextChange('Resume');
      fixture.detectChanges();

      // Check flatNodes computed signal directly — lenient mode keeps ancestor + match
      const flatLabels = component.flatNodes().map((fn) => fn.node.label);
      expect(flatLabels).toContain('Documents');
      expect(flatLabels).toContain('Resume.pdf');
      expect(flatLabels).not.toContain('Images');
      expect(flatLabels).not.toContain('ReadMe.md');
    });

    it('should show only matching nodes in strict mode (root-level match)', () => {
      const nodes = makeSimpleTree();
      nodes[0].expanded = true;
      nodes[1].expanded = true;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { filterable: true, filterMode: 'strict' } as TreeConfig);
      fixture.detectChanges();

      // Search for a root-level node label
      component.onFilterTextChange('ReadMe');
      fixture.detectChanges();

      const flatLabels = component.flatNodes().map((fn) => fn.node.label);
      // Strict mode: only the exact match appears, ancestors of non-matches are excluded
      expect(flatLabels).toContain('ReadMe.md');
      expect(flatLabels).not.toContain('Documents');
      expect(flatLabels).not.toContain('Images');
    });

    it('should exclude parent in strict mode when only child matches', () => {
      const nodes = makeSimpleTree();
      nodes[0].expanded = true;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { filterable: true, filterMode: 'strict' } as TreeConfig);
      fixture.detectChanges();

      // In strict mode, if parent does not match, it is hidden and children are not visited
      component.onFilterTextChange('Resume');
      fixture.detectChanges();

      const flatLabels = component.flatNodes().map((fn) => fn.node.label);
      // "Documents" doesn't match, so it's excluded; children are not visited
      expect(flatLabels).not.toContain('Documents');
      expect(flatLabels).not.toContain('Resume.pdf');
    });

    it('should emit filterChange event', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { filterable: true } as TreeConfig);
      fixture.detectChanges();

      let filterEvent: { filter: string; matchedNodeCount: number } | null = null;
      component.filterChange.subscribe((ev) => {
        filterEvent = ev;
      });

      component.onFilterTextChange('resume');
      expect(filterEvent).toBeTruthy();
      expect(filterEvent!.filter).toBe('resume');
      expect(filterEvent!.matchedNodeCount).toBe(1);
    });

    it('should clear filter when empty string is set', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { filterable: true } as TreeConfig);
      fixture.detectChanges();

      component.onFilterTextChange('Resume');
      fixture.detectChanges();

      component.onFilterTextChange('');
      fixture.detectChanges();

      const labels = queryAll(fixture, '.app-tree-node-label');
      expect(labels.length).toBe(3); // All root nodes visible again
    });
  });

  // -------- Config computed properties --------
  describe('config computed properties', () => {
    it('should reflect selectionMode from config', () => {
      fixture.componentRef.setInput('config', { selectionMode: 'checkbox' } as TreeConfig);
      fixture.detectChanges();

      expect(component.selectionMode()).toBe('checkbox');
    });

    it('should default selectionMode to null', () => {
      fixture.detectChanges();
      expect(component.selectionMode()).toBeNull();
    });

    it('should reflect dragDrop from config', () => {
      fixture.componentRef.setInput('config', { dragDrop: true } as TreeConfig);
      fixture.detectChanges();

      expect(component.isDragDropEnabled()).toBe(true);
    });

    it('should reflect showLines from config', () => {
      fixture.componentRef.setInput('config', { showLines: true } as TreeConfig);
      fixture.componentRef.setInput('nodes', makeSimpleTree());
      fixture.detectChanges();

      expect(component.showLines()).toBe(true);
      const container = query(fixture, '.app-tree-container');
      expect(container?.classList.contains('app-tree-lines')).toBe(true);
    });

    it('should reflect indentSize from config', () => {
      fixture.componentRef.setInput('config', { indentSize: 32 } as TreeConfig);
      fixture.detectChanges();

      expect(component.indentSize()).toBe(32);
    });

    it('should default indentSize to 24', () => {
      fixture.detectChanges();
      expect(component.indentSize()).toBe(24);
    });

    it('should reflect loading state', () => {
      fixture.componentRef.setInput('config', { loading: true } as TreeConfig);
      fixture.detectChanges();

      expect(component.isLoading()).toBe(true);
      const spinner = query(fixture, '.loading-spinner');
      expect(spinner).toBeTruthy();
    });
  });

  // -------- tree input (createTree) --------
  describe('tree input (createTree)', () => {
    it('should use tree input for nodes and config', () => {
      const treeSetup = createTree({
        nodes: [
          { key: 'a', label: 'Alpha' },
          { key: 'b', label: 'Beta' },
        ],
        selectionMode: 'single',
      });

      fixture.componentRef.setInput('tree', treeSetup);
      fixture.detectChanges();

      const labels = queryAll(fixture, '.app-tree-node-label');
      expect(labels.map((el) => el.textContent!.trim())).toEqual(['Alpha', 'Beta']);
      expect(component.selectionMode()).toBe('single');
    });

    it('should prefer tree input over nodes/config inputs', () => {
      const treeSetup = createTree({
        nodes: [{ key: 'x', label: 'From Tree' }],
      });

      fixture.componentRef.setInput('tree', treeSetup);
      fixture.componentRef.setInput('nodes', [{ key: 'y', label: 'From Nodes' }]);
      fixture.detectChanges();

      const labels = queryAll(fixture, '.app-tree-node-label');
      expect(labels[0].textContent!.trim()).toBe('From Tree');
    });
  });

  // -------- Flat node computation --------
  describe('flatNodes computation', () => {
    it('should include only root nodes when nothing expanded', () => {
      fixture.componentRef.setInput('nodes', makeSimpleTree());
      fixture.detectChanges();

      const flatNodes = component.flatNodes();
      expect(flatNodes).toHaveLength(3);
      expect(flatNodes.every((fn) => fn.level === 0)).toBe(true);
    });

    it('should include children when parent is expanded', () => {
      const nodes = makeSimpleTree();
      nodes[0].expanded = true;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();

      const flatNodes = component.flatNodes();
      expect(flatNodes).toHaveLength(5); // 3 root + 2 children of Documents
      expect(flatNodes[1].level).toBe(1);
      expect(flatNodes[1].parent).toBe(nodes[0]);
    });

    it('should set first/last flags correctly', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();

      const flatNodes = component.flatNodes();
      expect(flatNodes[0].first).toBe(true);
      expect(flatNodes[0].last).toBe(false);
      expect(flatNodes[2].first).toBe(false);
      expect(flatNodes[2].last).toBe(true);
    });

    it('should set state properties', () => {
      const nodes = makeSimpleTree();
      nodes[0].expanded = true;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'single' } as TreeConfig);
      fixture.detectChanges();

      component.selectNode(nodes[0]);
      fixture.detectChanges();

      const flatNodes = component.flatNodes();
      const docNode = flatNodes.find((fn) => fn.node.key === 'root-1')!;
      expect(docNode.state.expanded).toBe(true);
      expect(docNode.state.selected).toBe(true);
    });

    it('should be empty when isEmpty is true', () => {
      fixture.componentRef.setInput('nodes', []);
      fixture.detectChanges();

      expect(component.isEmpty()).toBe(true);
      expect(component.flatNodes()).toHaveLength(0);
    });
  });

  // -------- FlatTreeNode.indentPx --------
  describe('FlatTreeNode.indentPx', () => {
    it('should be 0 for root nodes', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();
      expect(component.flatNodes()[0].indentPx).toBe(0);
    });

    it('should be level * indentSize for nested nodes', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { expandAll: true } as TreeConfig);
      fixture.detectChanges();
      const child = component.flatNodes().find((fn) => fn.level === 1);
      expect(child?.indentPx).toBe(24);
    });

    it('should honor custom indentSize', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { expandAll: true, indentSize: 32 } as TreeConfig);
      fixture.detectChanges();
      const child = component.flatNodes().find((fn) => fn.level === 1);
      expect(child?.indentPx).toBe(32);
    });
  });

  // -------- hasChildren --------
  describe('hasChildren', () => {
    it('should return true for nodes with children', () => {
      fixture.detectChanges();
      const n: TreeNode = { key: 'a', label: 'A', children: [{ key: 'b', label: 'B' }] };
      expect(component.hasChildren(n)).toBe(true);
    });

    it('should return false for leaf nodes', () => {
      fixture.detectChanges();
      const n: TreeNode = { key: 'a', label: 'A', leaf: true };
      expect(component.hasChildren(n)).toBe(false);
    });

    it('should return true for lazy nodes (leaf=false, no children)', () => {
      fixture.detectChanges();
      const n: TreeNode = { key: 'a', label: 'A', leaf: false };
      expect(component.hasChildren(n)).toBe(true);
    });

    it('should return false for nodes with empty children array', () => {
      fixture.detectChanges();
      const n: TreeNode = { key: 'a', label: 'A', children: [] };
      expect(component.hasChildren(n)).toBe(false);
    });
  });

  // -------- getNodeKey --------
  describe('getNodeKey', () => {
    it('should return the key if present', () => {
      fixture.detectChanges();
      expect(component.getNodeKey({ key: 'test', label: 'A' })).toBe('test');
    });

    it('should return null if no key', () => {
      fixture.detectChanges();
      expect(component.getNodeKey({ label: 'A' })).toBeNull();
    });
  });

  // -------- Lazy loading --------
  describe('lazy loading', () => {
    it('should emit lazyLoad event for lazy nodes', () => {
      const lazyNode: TreeNode = { key: 'lazy-1', label: 'Archives', leaf: false };
      fixture.componentRef.setInput('nodes', [lazyNode]);
      fixture.detectChanges();

      let lazyEvent: { node: TreeNode } | null = null;
      component.lazyLoad.subscribe((ev) => {
        lazyEvent = ev;
      });

      component.expandNode(lazyNode);
      expect(lazyEvent).toBeTruthy();
      expect(lazyEvent!.node).toBe(lazyNode);
    });

    it('should show loading state during lazy load', () => {
      const lazyNode: TreeNode = { key: 'lazy-1', label: 'Archives', leaf: false };
      fixture.componentRef.setInput('nodes', [lazyNode]);
      fixture.detectChanges();

      component.expandNode(lazyNode);
      fixture.detectChanges();

      expect(component.isNodeLoading(lazyNode)).toBe(true);
    });

    it('should complete loading and expand node', () => {
      const lazyNode: TreeNode = { key: 'lazy-1', label: 'Archives', leaf: false };
      fixture.componentRef.setInput('nodes', [lazyNode]);
      fixture.detectChanges();

      component.expandNode(lazyNode);
      fixture.detectChanges();

      // Simulate children loaded
      lazyNode.children = [{ key: 'child-1', label: 'Old Archive', leaf: true }];
      component.completeLoading(lazyNode);
      fixture.detectChanges();

      expect(component.isNodeLoading(lazyNode)).toBe(false);
      expect(component.isExpanded(lazyNode)).toBe(true);
    });
  });

  // -------- Drag and drop basics --------
  describe('drag and drop', () => {
    it('should not be enabled by default', () => {
      fixture.detectChanges();
      expect(component.isDragDropEnabled()).toBe(false);
    });

    it('should emit nodeDragStart on drag start', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { dragDrop: true } as TreeConfig);
      fixture.detectChanges();

      let dragNode: TreeNode | null = null;
      component.nodeDragStart.subscribe((ev) => {
        dragNode = ev.node;
      });

      const event = mockDragEvent('dragstart');
      component.onDragStart(event, nodes[2]);
      expect(dragNode).toBe(nodes[2]);
    });

    it('should not emit dragStart if node.draggable is false', () => {
      const nodes = makeSimpleTree();
      nodes[0].draggable = false;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { dragDrop: true } as TreeConfig);
      fixture.detectChanges();

      let called = false;
      component.nodeDragStart.subscribe(() => {
        called = true;
      });

      component.onDragStart(mockDragEvent('dragstart'), nodes[0]);
      expect(called).toBe(false);
    });

    it('should emit nodeDragEnd on drag end', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { dragDrop: true } as TreeConfig);
      fixture.detectChanges();

      let endNode: TreeNode | null = null;
      component.nodeDragEnd.subscribe((ev) => {
        endNode = ev.node;
      });

      component.onDragStart(mockDragEvent('dragstart'), nodes[0]);
      component.onDragEnd(mockDragEvent('dragend'), nodes[0]);
      expect(endNode).toBe(nodes[0]);
    });

    it('should track isDragging state', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { dragDrop: true } as TreeConfig);
      fixture.detectChanges();

      component.onDragStart(mockDragEvent('dragstart'), nodes[0]);
      expect(component.isDragging(nodes[0])).toBe(true);
      expect(component.isDragging(nodes[1])).toBe(false);

      component.onDragEnd(mockDragEvent('dragend'), nodes[0]);
      expect(component.isDragging(nodes[0])).toBe(false);
    });

    it('should emit nodeDrop event on drop', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { dragDrop: true } as TreeConfig);
      fixture.detectChanges();

      let dropEvent: { dragNode: TreeNode; dropNode: TreeNode } | null = null;
      component.nodeDrop.subscribe((ev) => {
        dropEvent = { dragNode: ev.dragNode, dropNode: ev.dropNode! };
      });

      component.onDragStart(mockDragEvent('dragstart'), nodes[2]); // drag ReadMe.md
      component.onDropOnNode(mockDragEvent('drop'), nodes[0]); // drop onto Documents (position defaults to 'after')

      expect(dropEvent).toBeTruthy();
      expect(dropEvent!.dragNode).toBe(nodes[2]);
      expect(dropEvent!.dropNode).toBe(nodes[0]);
    });

    it('should not drop a node onto itself', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { dragDrop: true } as TreeConfig);
      fixture.detectChanges();

      let called = false;
      component.nodeDrop.subscribe(() => {
        called = true;
      });

      component.onDragStart(mockDragEvent('dragstart'), nodes[0]);
      component.onDropOnNode(mockDragEvent('drop'), nodes[0]);
      expect(called).toBe(false);
    });

    it('should not allow dropping on non-droppable nodes', () => {
      const nodes = makeSimpleTree();
      nodes[1].droppable = false;
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { dragDrop: true } as TreeConfig);
      fixture.detectChanges();

      component.onDragStart(mockDragEvent('dragstart'), nodes[0]);

      // Verify that dragOver does not set drop target for non-droppable
      const dragOverEvent = mockDragEvent('dragover');
      component.onDragOver(dragOverEvent, nodes[1]);
      expect(component.isDropTarget(nodes[1])).toBe(false);
    });
  });

  // -------- Selection input (two-way binding) --------
  describe('selection input', () => {
    it('should sync selection from input (single node)', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'single' } as TreeConfig);
      fixture.componentRef.setInput('selection', nodes[0]);
      fixture.detectChanges();

      expect(component.isSelected(nodes[0])).toBe(true);
    });

    it('should sync selection from input (array of nodes)', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'multiple' } as TreeConfig);
      fixture.componentRef.setInput('selection', [nodes[0], nodes[2]]);
      fixture.detectChanges();

      expect(component.isSelected(nodes[0])).toBe(true);
      expect(component.isSelected(nodes[2])).toBe(true);
      expect(component.isSelected(nodes[1])).toBe(false);
    });

    it('should handle null selection input', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'single' } as TreeConfig);
      fixture.componentRef.setInput('selection', null);
      fixture.detectChanges();

      expect(component.isSelected(nodes[0])).toBe(false);
    });
  });

  // -------- ARIA attributes --------
  describe('accessibility', () => {
    it('should set aria-label from config', () => {
      fixture.componentRef.setInput('config', { ariaLabel: 'File Browser' } as TreeConfig);
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      expect(host.getAttribute('aria-label')).toBe('File Browser');
    });

    it('should set aria-labelledby from config', () => {
      fixture.componentRef.setInput('config', { ariaLabelledBy: 'tree-label' } as TreeConfig);
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      expect(host.getAttribute('aria-labelledby')).toBe('tree-label');
    });

    it('should set aria-selected on selected nodes', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'single' } as TreeConfig);
      fixture.detectChanges();

      component.selectNode(nodes[0]);
      fixture.detectChanges();

      const items = queryAll(fixture, '[role="treeitem"]');
      expect(items[0].getAttribute('aria-selected')).toBe('true');
      expect(items[1].getAttribute('aria-selected')).toBe('false');
    });
  });

  // -------- onToggleClick --------
  describe('onToggleClick', () => {
    it('should toggle expansion on toggle button click', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.detectChanges();

      const toggleBtns = queryAll(fixture, '.app-tree-node-toggle button');
      expect(toggleBtns.length).toBeGreaterThan(0);

      toggleBtns[0].click();
      fixture.detectChanges();

      expect(component.isExpanded(nodes[0])).toBe(true);

      // Refetch toggle buttons after re-render
      const toggleBtns2 = queryAll(fixture, '.app-tree-node-toggle button');
      toggleBtns2[0].click();
      fixture.detectChanges();

      expect(component.isExpanded(nodes[0])).toBe(false);
    });
  });

  // -------- Node click via template --------
  describe('node content click', () => {
    it('should select node when clicking content in single mode', () => {
      const nodes = makeSimpleTree();
      fixture.componentRef.setInput('nodes', nodes);
      fixture.componentRef.setInput('config', { selectionMode: 'single' } as TreeConfig);
      fixture.detectChanges();

      const contents = queryAll(fixture, '.app-tree-node-content');
      contents[2].click(); // click ReadMe.md
      fixture.detectChanges();

      expect(component.isSelected(nodes[2])).toBe(true);
    });
  });

  // -------- trackByNode --------
  describe('trackByNode', () => {
    const flatOf = (node: TreeNode, index: number) => ({
      node,
      level: 0,
      parent: null,
      first: true,
      last: true,
      index,
      path: [index],
      indentPx: 0,
      hasChildren: false,
      ancestorIsLastMask: [true],
      state: {
        expanded: false,
        selected: false,
        partialSelected: false,
        visible: true,
        loading: false,
      },
    });

    it('should return node key', () => {
      fixture.detectChanges();
      const n: TreeNode = { key: 'k1', label: 'A' };
      expect(component.trackByNode(0, flatOf(n, 0))).toBe('k1');
    });

    it('should fall back to index when no key', () => {
      fixture.detectChanges();
      const n: TreeNode = { label: 'No Key' };
      expect(component.trackByNode(5, flatOf(n, 5))).toBe('5');
    });
  });
});
