import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationChartComponent } from './organization-chart.component';
import { TreeNode } from '../../api/treenode';

function buildTree(): TreeNode[] {
  return [
    {
      key: 'ceo',
      label: 'CEO',
      expanded: true,
      children: [
        {
          key: 'vp-eng',
          label: 'VP Engineering',
          expanded: true,
          children: [
            { key: 'dev-lead', label: 'Dev Lead', leaf: true },
            { key: 'qa-lead', label: 'QA Lead', leaf: true },
          ],
        },
        {
          key: 'vp-sales',
          label: 'VP Sales',
          children: [{ key: 'sales-mgr', label: 'Sales Manager', leaf: true }],
        },
      ],
    },
  ];
}

describe('OrganizationChartComponent', () => {
  let component: OrganizationChartComponent;
  let fixture: ComponentFixture<OrganizationChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationChartComponent],
    }).compileComponents();
  });

  function createComponent(tree?: TreeNode[]): ComponentFixture<OrganizationChartComponent> {
    fixture = TestBed.createComponent(OrganizationChartComponent);
    component = fixture.componentInstance;
    if (tree) {
      fixture.componentRef.setInput('value', tree);
    }
    fixture.detectChanges();
    return fixture;
  }

  // ---------------------------------------------------------------------------
  // Component creation
  // ---------------------------------------------------------------------------
  describe('creation', () => {
    it('should create the component', () => {
      createComponent();
      expect(component).toBeTruthy();
    });

    it('should create with tree data', () => {
      createComponent(buildTree());
      expect(component).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Default input values
  // ---------------------------------------------------------------------------
  describe('default input values', () => {
    beforeEach(() => createComponent());

    it('should default value to empty array', () => {
      expect(component.value()).toEqual([]);
    });

    it('should default selectionMode to null', () => {
      expect(component.selectionMode()).toBeNull();
    });

    it('should default selection to null', () => {
      expect(component.selection()).toBeNull();
    });

    it('should default preserveSpace to true', () => {
      expect(component.preserveSpace()).toBe(true);
    });

    it('should default orientation to vertical', () => {
      expect(component.orientation()).toBe('vertical');
    });

    it('should default nodeColor to primary', () => {
      expect(component.nodeColor()).toBe('primary');
    });

    it('should default collapsible to true', () => {
      expect(component.collapsible()).toBe(true);
    });

    it('should default styleClass to empty string', () => {
      expect(component.styleClass()).toBe('');
    });

    it('should default showLines to true', () => {
      expect(component.showLines()).toBe(true);
    });

    it('should default lineColor to empty string', () => {
      expect(component.lineColor()).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // Node rendering
  // ---------------------------------------------------------------------------
  describe('node rendering', () => {
    it('should render root-level node labels', () => {
      createComponent(buildTree());
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('CEO');
    });

    it('should render child labels when expanded', () => {
      createComponent(buildTree());
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('VP Engineering');
      expect(el.textContent).toContain('Dev Lead');
    });

    it('should not render children of collapsed nodes', () => {
      const tree = buildTree();
      // vp-sales has children but expanded defaults to undefined (falsy)
      createComponent(tree);
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).not.toContain('Sales Manager');
    });

    it('should render connecting lines by default', () => {
      createComponent(buildTree());
      const lines = fixture.nativeElement.querySelectorAll('.bg-base-300');
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should not render connecting lines when showLines is false', () => {
      createComponent(buildTree());
      fixture.componentRef.setInput('showLines', false);
      fixture.detectChanges();
      // With showLines=false, connecting line divs (w-0.5 h-5 bg-base-300) should be absent
      const vertLineConnectors = fixture.nativeElement.querySelectorAll('.w-0\\.5.h-5.bg-base-300');
      expect(vertLineConnectors.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // hasChildren
  // ---------------------------------------------------------------------------
  describe('hasChildren', () => {
    it('should return true for nodes with children', () => {
      const node: TreeNode = { key: 'a', children: [{ key: 'b' }] };
      createComponent();
      expect(component.hasChildren(node)).toBe(true);
    });

    it('should return false for nodes with empty children array', () => {
      const node: TreeNode = { key: 'a', children: [] };
      createComponent();
      expect(component.hasChildren(node)).toBe(false);
    });

    it('should return false when leaf is true even if children exist', () => {
      const node: TreeNode = { key: 'a', leaf: true, children: [{ key: 'b' }] };
      createComponent();
      expect(component.hasChildren(node)).toBe(false);
    });

    it('should return false for nodes without children property', () => {
      const node: TreeNode = { key: 'a' };
      createComponent();
      expect(component.hasChildren(node)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isExpanded
  // ---------------------------------------------------------------------------
  describe('isExpanded', () => {
    beforeEach(() => createComponent());

    it('should return true when expanded is true', () => {
      expect(component.isExpanded({ key: 'a', expanded: true })).toBe(true);
    });

    it('should return false when expanded is false', () => {
      expect(component.isExpanded({ key: 'a', expanded: false })).toBe(false);
    });

    it('should return false when expanded is undefined', () => {
      expect(component.isExpanded({ key: 'a' })).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Expand / Collapse with events
  // ---------------------------------------------------------------------------
  describe('toggleNode', () => {
    it('should expand a collapsed node and emit onNodeExpand', () => {
      createComponent();
      const node: TreeNode = { key: 'a', expanded: false, children: [{ key: 'b' }] };
      const spy = vi.fn();
      component.onNodeExpand.subscribe(spy);

      const event = new Event('click');
      component.toggleNode(event, node);

      expect(node.expanded).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ node }));
    });

    it('should collapse an expanded node and emit onNodeCollapse', () => {
      createComponent();
      const node: TreeNode = { key: 'a', expanded: true, children: [{ key: 'b' }] };
      const spy = vi.fn();
      component.onNodeCollapse.subscribe(spy);

      const event = new Event('click');
      component.toggleNode(event, node);

      expect(node.expanded).toBe(false);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ node }));
    });

    it('should stop event propagation', () => {
      createComponent();
      const node: TreeNode = { key: 'a', children: [{ key: 'b' }] };
      const event = new Event('click');
      const stopSpy = vi.spyOn(event, 'stopPropagation');

      component.toggleNode(event, node);
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should not toggle a leaf node', () => {
      createComponent();
      const node: TreeNode = { key: 'a', leaf: true };
      const spy = vi.fn();
      component.onNodeExpand.subscribe(spy);
      component.onNodeCollapse.subscribe(spy);

      component.toggleNode(new Event('click'), node);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not toggle a node with no children', () => {
      createComponent();
      const node: TreeNode = { key: 'a' };
      const expandSpy = vi.fn();
      component.onNodeExpand.subscribe(expandSpy);

      component.toggleNode(new Event('click'), node);
      expect(expandSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Collapsible guard
  // ---------------------------------------------------------------------------
  describe('collapsible guard', () => {
    it('should not toggle when collapsible is false', () => {
      createComponent();
      fixture.componentRef.setInput('collapsible', false);
      fixture.detectChanges();

      const node: TreeNode = { key: 'a', expanded: true, children: [{ key: 'b' }] };
      const spy = vi.fn();
      component.onNodeCollapse.subscribe(spy);

      component.toggleNode(new Event('click'), node);

      expect(node.expanded).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not render toggle button when collapsible is false', () => {
      const tree: TreeNode[] = [{ key: 'root', label: 'Root', expanded: true, children: [{ key: 'c', label: 'Child' }] }];
      createComponent(tree);
      fixture.componentRef.setInput('collapsible', false);
      fixture.detectChanges();

      const toggleButtons = fixture.nativeElement.querySelectorAll('button[aria-label="Toggle children"]');
      expect(toggleButtons.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Selection modes
  // ---------------------------------------------------------------------------
  describe('selection - mode null (disabled)', () => {
    it('should not select a node when selectionMode is null', () => {
      createComponent(buildTree());
      const node = buildTree()[0];
      const spy = vi.fn();
      component.onNodeSelect.subscribe(spy);

      component.selectNode(new Event('click'), node);
      expect(spy).not.toHaveBeenCalled();
      expect(component.isNodeSelected(node)).toBe(false);
    });
  });

  describe('selection - single mode', () => {
    beforeEach(() => {
      createComponent(buildTree());
      fixture.componentRef.setInput('selectionMode', 'single');
      fixture.detectChanges();
    });

    it('should select a node', () => {
      const node: TreeNode = { key: 'test' };
      const selectSpy = vi.fn();
      component.onNodeSelect.subscribe(selectSpy);

      component.selectNode(new Event('click'), node);

      expect(component.isNodeSelected(node)).toBe(true);
      expect(selectSpy).toHaveBeenCalledTimes(1);
    });

    it('should unselect a previously selected node when clicking it again', () => {
      const node: TreeNode = { key: 'test' };
      const unselectSpy = vi.fn();
      component.onNodeUnselect.subscribe(unselectSpy);

      component.selectNode(new Event('click'), node);
      expect(component.isNodeSelected(node)).toBe(true);

      component.selectNode(new Event('click'), node);
      expect(component.isNodeSelected(node)).toBe(false);
      expect(unselectSpy).toHaveBeenCalledTimes(1);
    });

    it('should replace previous selection when selecting a new node', () => {
      const nodeA: TreeNode = { key: 'a' };
      const nodeB: TreeNode = { key: 'b' };
      const unselectSpy = vi.fn();
      component.onNodeUnselect.subscribe(unselectSpy);

      component.selectNode(new Event('click'), nodeA);
      expect(component.isNodeSelected(nodeA)).toBe(true);

      component.selectNode(new Event('click'), nodeB);
      expect(component.isNodeSelected(nodeA)).toBe(false);
      expect(component.isNodeSelected(nodeB)).toBe(true);
      expect(unselectSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit selectionChange with the selected node', () => {
      const node: TreeNode = { key: 'test' };
      const changeSpy = vi.fn();
      component.selectionChange.subscribe(changeSpy);

      component.selectNode(new Event('click'), node);
      expect(changeSpy).toHaveBeenCalledWith(node);
    });

    it('should emit selectionChange with null when unselecting', () => {
      const node: TreeNode = { key: 'test' };
      const changeSpy = vi.fn();
      component.selectionChange.subscribe(changeSpy);

      component.selectNode(new Event('click'), node);
      component.selectNode(new Event('click'), node);
      expect(changeSpy).toHaveBeenLastCalledWith(null);
    });

    it('should not select a node with selectable false', () => {
      const node: TreeNode = { key: 'locked', selectable: false };
      const spy = vi.fn();
      component.onNodeSelect.subscribe(spy);

      component.selectNode(new Event('click'), node);
      expect(spy).not.toHaveBeenCalled();
      expect(component.isNodeSelected(node)).toBe(false);
    });
  });

  describe('selection - multiple mode', () => {
    beforeEach(() => {
      createComponent(buildTree());
      fixture.componentRef.setInput('selectionMode', 'multiple');
      fixture.detectChanges();
    });

    it('should select multiple nodes', () => {
      const nodeA: TreeNode = { key: 'a' };
      const nodeB: TreeNode = { key: 'b' };

      component.selectNode(new Event('click'), nodeA);
      component.selectNode(new Event('click'), nodeB);

      expect(component.isNodeSelected(nodeA)).toBe(true);
      expect(component.isNodeSelected(nodeB)).toBe(true);
    });

    it('should remove from selection on second click', () => {
      const node: TreeNode = { key: 'a' };

      component.selectNode(new Event('click'), node);
      expect(component.isNodeSelected(node)).toBe(true);

      component.selectNode(new Event('click'), node);
      expect(component.isNodeSelected(node)).toBe(false);
    });

    it('should emit selectionChange with array of selected nodes', () => {
      const nodeA: TreeNode = { key: 'a' };
      const nodeB: TreeNode = { key: 'b' };
      const changeSpy = vi.fn();
      component.selectionChange.subscribe(changeSpy);

      component.selectNode(new Event('click'), nodeA);
      component.selectNode(new Event('click'), nodeB);

      const lastCall = changeSpy.mock.calls[changeSpy.mock.calls.length - 1][0];
      expect(Array.isArray(lastCall)).toBe(true);
      expect(lastCall).toHaveLength(2);
    });

    it('should emit selectionChange with null when all deselected', () => {
      const node: TreeNode = { key: 'a' };
      const changeSpy = vi.fn();
      component.selectionChange.subscribe(changeSpy);

      component.selectNode(new Event('click'), node);
      component.selectNode(new Event('click'), node);

      expect(changeSpy).toHaveBeenLastCalledWith(null);
    });
  });

  describe('selection - checkbox mode', () => {
    it('should behave like multiple mode', () => {
      createComponent(buildTree());
      fixture.componentRef.setInput('selectionMode', 'checkbox');
      fixture.detectChanges();

      const nodeA: TreeNode = { key: 'a' };
      const nodeB: TreeNode = { key: 'b' };

      component.selectNode(new Event('click'), nodeA);
      component.selectNode(new Event('click'), nodeB);

      expect(component.isNodeSelected(nodeA)).toBe(true);
      expect(component.isNodeSelected(nodeB)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Orientation
  // ---------------------------------------------------------------------------
  describe('orientation', () => {
    it('should include org-chart class for vertical orientation', () => {
      createComponent(buildTree());
      expect(component.containerClasses()).toContain('org-chart');
      expect(component.containerClasses()).not.toContain('org-chart-horizontal');
    });

    it('should include org-chart-horizontal class for horizontal orientation', () => {
      createComponent(buildTree());
      fixture.componentRef.setInput('orientation', 'horizontal');
      fixture.detectChanges();
      expect(component.containerClasses()).toContain('org-chart-horizontal');
    });
  });

  // ---------------------------------------------------------------------------
  // Node color / style helpers
  // ---------------------------------------------------------------------------
  describe('getNodeColor', () => {
    beforeEach(() => createComponent());

    it('should return node type as color when specified', () => {
      const node: TreeNode = { key: 'a', type: 'success' };
      expect(component.getNodeColor(node)).toBe('success');
    });

    it('should return default nodeColor when node has no type', () => {
      const node: TreeNode = { key: 'a' };
      expect(component.getNodeColor(node)).toBe('primary');
    });

    it('should respect custom default nodeColor', () => {
      fixture.componentRef.setInput('nodeColor', 'warning');
      fixture.detectChanges();
      const node: TreeNode = { key: 'a' };
      expect(component.getNodeColor(node)).toBe('warning');
    });
  });

  describe('getNodeClasses', () => {
    it('should include base class and color class', () => {
      createComponent();
      const node: TreeNode = { key: 'a' };
      const classes = component.getNodeClasses(node, 0);
      expect(classes).toContain('org-chart-node');
      expect(classes).toContain('org-chart-node-primary');
    });

    it('should include level class', () => {
      createComponent();
      const node: TreeNode = { key: 'a' };
      const classes = component.getNodeClasses(node, 2);
      expect(classes).toContain('org-chart-level-2');
    });

    it('should include selectable class when selectionMode is set', () => {
      createComponent();
      fixture.componentRef.setInput('selectionMode', 'single');
      fixture.detectChanges();
      const node: TreeNode = { key: 'a' };
      const classes = component.getNodeClasses(node, 0);
      expect(classes).toContain('org-chart-node-selectable');
    });

    it('should not include selectable class when node.selectable is false', () => {
      createComponent();
      fixture.componentRef.setInput('selectionMode', 'single');
      fixture.detectChanges();
      const node: TreeNode = { key: 'a', selectable: false };
      const classes = component.getNodeClasses(node, 0);
      expect(classes).not.toContain('org-chart-node-selectable');
    });

    it('should include selected class when node is selected', () => {
      createComponent();
      fixture.componentRef.setInput('selectionMode', 'single');
      fixture.detectChanges();

      const node: TreeNode = { key: 'a' };
      component.selectNode(new Event('click'), node);

      const classes = component.getNodeClasses(node, 0);
      expect(classes).toContain('org-chart-node-selected');
    });

    it('should include custom styleClass from node', () => {
      createComponent();
      const node: TreeNode = { key: 'a', styleClass: 'custom-class' };
      const classes = component.getNodeClasses(node, 0);
      expect(classes).toContain('custom-class');
    });

    it('should include loading class when node is loading', () => {
      createComponent();
      const node: TreeNode = { key: 'a', loading: true };
      const classes = component.getNodeClasses(node, 0);
      expect(classes).toContain('org-chart-node-loading');
    });

    it('should use node type as color', () => {
      createComponent();
      const node: TreeNode = { key: 'a', type: 'error' };
      const classes = component.getNodeClasses(node, 0);
      expect(classes).toContain('org-chart-node-error');
    });
  });

  describe('getNodeStyle', () => {
    beforeEach(() => createComponent());

    it('should return node style when set', () => {
      const node: TreeNode = { key: 'a', style: { color: 'red' } };
      expect(component.getNodeStyle(node)).toEqual({ color: 'red' });
    });

    it('should return empty object when node has no style', () => {
      const node: TreeNode = { key: 'a' };
      expect(component.getNodeStyle(node)).toEqual({});
    });
  });

  describe('getNodeIcon', () => {
    beforeEach(() => createComponent());

    it('should return node icon for leaf node', () => {
      const node: TreeNode = { key: 'a', icon: 'Home', leaf: true };
      expect(component.getNodeIcon(node)).toBe('Home');
    });

    it('should return expandedIcon when node with children is expanded', () => {
      const node: TreeNode = {
        key: 'a',
        expanded: true,
        expandedIcon: 'FolderOpen',
        collapsedIcon: 'Folder',
        icon: 'File',
        children: [{ key: 'b' }],
      };
      expect(component.getNodeIcon(node)).toBe('FolderOpen');
    });

    it('should return collapsedIcon when node with children is collapsed', () => {
      const node: TreeNode = {
        key: 'a',
        expanded: false,
        expandedIcon: 'FolderOpen',
        collapsedIcon: 'Folder',
        icon: 'File',
        children: [{ key: 'b' }],
      };
      expect(component.getNodeIcon(node)).toBe('Folder');
    });

    it('should fall back to icon when no expandedIcon/collapsedIcon set', () => {
      const node: TreeNode = { key: 'a', expanded: true, icon: 'File', children: [{ key: 'b' }] };
      expect(component.getNodeIcon(node)).toBe('File');
    });

    it('should return undefined when no icons set', () => {
      const node: TreeNode = { key: 'a' };
      expect(component.getNodeIcon(node)).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // containerClasses computed
  // ---------------------------------------------------------------------------
  describe('containerClasses', () => {
    it('should include custom styleClass', () => {
      createComponent();
      fixture.componentRef.setInput('styleClass', 'my-custom-chart');
      fixture.detectChanges();
      expect(component.containerClasses()).toContain('my-custom-chart');
    });

    it('should return just org-chart for vertical with no custom class', () => {
      createComponent();
      expect(component.containerClasses()).toBe('org-chart');
    });
  });

  // ---------------------------------------------------------------------------
  // lineStyle computed
  // ---------------------------------------------------------------------------
  describe('lineStyle', () => {
    it('should return empty object when lineColor is empty', () => {
      createComponent();
      expect(component.lineStyle()).toEqual({});
    });

    it('should return border color when lineColor is set', () => {
      createComponent();
      fixture.componentRef.setInput('lineColor', '#ff0000');
      fixture.detectChanges();
      expect(component.lineStyle()).toEqual({ borderColor: '#ff0000' });
    });
  });

  // ---------------------------------------------------------------------------
  // Template context
  // ---------------------------------------------------------------------------
  describe('getTemplateContext', () => {
    it('should return correct context shape', () => {
      createComponent();
      const node: TreeNode = { key: 'ctx', expanded: true };
      const ctx = component.getTemplateContext(node, 3);

      expect(ctx.$implicit).toBe(node);
      expect(ctx.node).toBe(node);
      expect(ctx.expanded).toBe(true);
      expect(ctx.level).toBe(3);
      expect(ctx.selected).toBe(false);
      expect(typeof ctx.toggle).toBe('function');
      expect(typeof ctx.select).toBe('function');
    });

    it('should reflect selected state in context', () => {
      createComponent();
      fixture.componentRef.setInput('selectionMode', 'single');
      fixture.detectChanges();

      const node: TreeNode = { key: 'sel' };
      component.selectNode(new Event('click'), node);

      const ctx = component.getTemplateContext(node, 0);
      expect(ctx.selected).toBe(true);
    });

    it('should provide a working toggle function', () => {
      createComponent();
      const node: TreeNode = { key: 'tog', expanded: false, children: [{ key: 'c' }] };
      const spy = vi.fn();
      component.onNodeExpand.subscribe(spy);

      const ctx = component.getTemplateContext(node, 0);
      ctx.toggle();

      expect(node.expanded).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should provide a working select function', () => {
      createComponent();
      fixture.componentRef.setInput('selectionMode', 'single');
      fixture.detectChanges();

      const node: TreeNode = { key: 'sel2' };
      const spy = vi.fn();
      component.onNodeSelect.subscribe(spy);

      const ctx = component.getTemplateContext(node, 0);
      ctx.select(new Event('click'));

      expect(component.isNodeSelected(node)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // trackByNode
  // ---------------------------------------------------------------------------
  describe('trackByNode', () => {
    beforeEach(() => createComponent());

    it('should return key when available', () => {
      expect(component.trackByNode(0, { key: 'abc' })).toBe('abc');
    });

    it('should fall back to label when key is not set', () => {
      expect(component.trackByNode(0, { label: 'My Label' })).toBe('My Label');
    });

    it('should fall back to JSON of data when neither key nor label', () => {
      const result = component.trackByNode(0, { data: { id: 1 } });
      expect(result).toBe(JSON.stringify({ id: 1 }));
    });
  });

  // ---------------------------------------------------------------------------
  // ARIA attributes
  // ---------------------------------------------------------------------------
  describe('ARIA attributes', () => {
    it('should set role=button on selectable nodes', () => {
      createComponent([{ key: 'root', label: 'Root' }]);
      fixture.componentRef.setInput('selectionMode', 'single');
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.card');
      expect(card.getAttribute('role')).toBe('button');
    });

    it('should not set role when selectionMode is null', () => {
      createComponent([{ key: 'root', label: 'Root' }]);
      const card = fixture.nativeElement.querySelector('.card');
      expect(card.getAttribute('role')).toBeNull();
    });

    it('should set tabindex on selectable nodes', () => {
      createComponent([{ key: 'root', label: 'Root' }]);
      fixture.componentRef.setInput('selectionMode', 'single');
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.card');
      expect(card.getAttribute('tabindex')).toBe('0');
    });

    it('should not set tabindex when selectable is false on node', () => {
      createComponent([{ key: 'root', label: 'Root', selectable: false }]);
      fixture.componentRef.setInput('selectionMode', 'single');
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.card');
      expect(card.getAttribute('tabindex')).toBeNull();
    });

    it('should set aria-expanded on toggle buttons', () => {
      createComponent([{ key: 'root', label: 'Root', expanded: true, children: [{ key: 'c', label: 'Child' }] }]);
      const btn = fixture.nativeElement.querySelector('button[aria-label="Toggle children"]');
      expect(btn).toBeTruthy();
      expect(btn.getAttribute('aria-expanded')).toBe('true');
    });

    it('should have aria-label on toggle buttons', () => {
      createComponent([{ key: 'root', label: 'Root', expanded: false, children: [{ key: 'c', label: 'Child' }] }]);
      const btn = fixture.nativeElement.querySelector('button[aria-label="Toggle children"]');
      expect(btn).toBeTruthy();
      expect(btn.getAttribute('aria-label')).toBe('Toggle children');
    });
  });

  // ---------------------------------------------------------------------------
  // isNodeSelected with key matching
  // ---------------------------------------------------------------------------
  describe('isNodeSelected - key-based matching', () => {
    it('should consider nodes with the same key as equal', () => {
      createComponent();
      fixture.componentRef.setInput('selectionMode', 'single');
      fixture.detectChanges();

      const nodeOriginal: TreeNode = { key: 'same-key', label: 'Original' };
      const nodeCopy: TreeNode = { key: 'same-key', label: 'Copy' };

      component.selectNode(new Event('click'), nodeOriginal);
      expect(component.isNodeSelected(nodeCopy)).toBe(true);
    });

    it('should use reference equality when keys are absent', () => {
      createComponent();
      fixture.componentRef.setInput('selectionMode', 'single');
      fixture.detectChanges();

      const nodeA: TreeNode = { label: 'A' };
      const nodeB: TreeNode = { label: 'A' };

      component.selectNode(new Event('click'), nodeA);
      expect(component.isNodeSelected(nodeA)).toBe(true);
      expect(component.isNodeSelected(nodeB)).toBe(false);
    });
  });
});
