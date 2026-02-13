import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  TemplateRef,
  computed,
  input,
  output,
  signal,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideIconComponent, IconName } from '../lucide-icon/lucide-icon.component';
import { TreeNode } from '../../api/treenode';
import {
  OrgChartSelectionMode,
  OrgChartNodeSelectEvent,
  OrgChartNodeUnselectEvent,
  OrgChartNodeExpandEvent,
  OrgChartNodeCollapseEvent,
  OrgChartNodeTemplateContext,
  OrgChartOrientation,
  OrgChartNodeColor,
} from './organization-chart.types';

@Component({
  selector: 'hk-organization-chart',
  imports: [CommonModule, LucideIconComponent],
  templateUrl: './organization-chart.component.html',
  styleUrl: './organization-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationChartComponent<T = unknown> {
  readonly nodeTemplate = contentChild<TemplateRef<OrgChartNodeTemplateContext<T>>>('nodeTemplate');

  /** The hierarchical data to display */
  readonly value = input<TreeNode<T>[]>([]);

  /** Selection mode: 'single', 'multiple', or null (disabled) */
  readonly selectionMode = input<OrgChartSelectionMode>(null);

  /** Currently selected node(s) - for two-way binding use with selectionChange */
  readonly selection = input<TreeNode<T> | TreeNode<T>[] | null>(null);

  /** Whether to preserve space for collapsed nodes */
  readonly preserveSpace = input<boolean>(true);

  /** Chart orientation */
  readonly orientation = input<OrgChartOrientation>('vertical');

  /** Default node color */
  readonly nodeColor = input<OrgChartNodeColor>('primary');

  /** Whether nodes are collapsible */
  readonly collapsible = input<boolean>(true);

  /** Custom CSS class for the chart container */
  readonly styleClass = input<string>('');

  /** Whether to show connecting lines */
  readonly showLines = input<boolean>(true);

  /** Line color */
  readonly lineColor = input<string>('');

  /** Emitted when a node is selected */
  readonly onNodeSelect = output<OrgChartNodeSelectEvent<T>>();

  /** Emitted when a node is unselected */
  readonly onNodeUnselect = output<OrgChartNodeUnselectEvent<T>>();

  /** Emitted when a node is expanded */
  readonly onNodeExpand = output<OrgChartNodeExpandEvent<T>>();

  /** Emitted when a node is collapsed */
  readonly onNodeCollapse = output<OrgChartNodeCollapseEvent<T>>();

  /** Emitted when selection changes (for two-way binding) */
  readonly selectionChange = output<TreeNode<T> | TreeNode<T>[] | null>();

  private readonly _selection: WritableSignal<TreeNode<T>[]> = signal([]);

  readonly containerClasses = computed(() => {
    const classes = ['org-chart'];
    if (this.orientation() === 'horizontal') {
      classes.push('org-chart-horizontal');
    }
    if (this.styleClass()) {
      classes.push(this.styleClass());
    }
    return classes.join(' ');
  });

  readonly lineStyle = computed(() => {
    const color = this.lineColor();
    return color ? { borderColor: color } : {};
  });

  isNodeSelected(node: TreeNode<T>): boolean {
    const currentSelection = this._selection();
    return currentSelection.some(n => this.isSameNode(n, node));
  }

  hasChildren(node: TreeNode<T>): boolean {
    // If leaf is explicitly true, it has no children
    if (node.leaf === true) return false;
    return !!node.children && node.children.length > 0;
  }

  isExpanded(node: TreeNode<T>): boolean {
    return node.expanded === true;
  }

  getNodeIcon(node: TreeNode<T>): IconName | undefined {
    if (this.hasChildren(node)) {
      if (this.isExpanded(node) && node.expandedIcon) {
        return node.expandedIcon;
      }
      if (!this.isExpanded(node) && node.collapsedIcon) {
        return node.collapsedIcon;
      }
    }
    return node.icon;
  }

  toggleNode(event: Event, node: TreeNode<T>): void {
    event.stopPropagation();

    if (!this.collapsible() || !this.hasChildren(node)) {
      return;
    }

    const wasExpanded = this.isExpanded(node);
    node.expanded = !wasExpanded;

    if (node.expanded) {
      this.onNodeExpand.emit({ originalEvent: event, node });
    } else {
      this.onNodeCollapse.emit({ originalEvent: event, node });
    }
  }

  selectNode(event: Event, node: TreeNode<T>): void {
    if (!this.selectionMode() || node.selectable === false) {
      return;
    }

    const isSelected = this.isNodeSelected(node);
    const mode = this.selectionMode();

    if (mode === 'single') {
      if (isSelected) {
        // Unselect
        this._selection.set([]);
        this.onNodeUnselect.emit({ originalEvent: event, node });
        this.selectionChange.emit(null);
      } else {
        // Unselect previous and select new
        const previousSelection = this._selection();
        if (previousSelection.length > 0) {
          this.onNodeUnselect.emit({ originalEvent: event, node: previousSelection[0] });
        }
        this._selection.set([node]);
        this.onNodeSelect.emit({ originalEvent: event, node });
        this.selectionChange.emit(node);
      }
    } else if (mode === 'multiple' || mode === 'checkbox') {
      if (isSelected) {
        // Remove from selection
        this._selection.update(current => current.filter(n => !this.isSameNode(n, node)));
        this.onNodeUnselect.emit({ originalEvent: event, node });
      } else {
        // Add to selection
        this._selection.update(current => [...current, node]);
        this.onNodeSelect.emit({ originalEvent: event, node });
      }
      this.selectionChange.emit(this._selection().length > 0 ? [...this._selection()] : null);
    }
  }

  getNodeColor(node: TreeNode<T>): OrgChartNodeColor {
    return (node.type as OrgChartNodeColor) || this.nodeColor();
  }

  getNodeClasses(node: TreeNode<T>, level: number): string {
    const classes = ['org-chart-node'];

    // Color based on type or default
    const color = node.type || this.nodeColor();
    classes.push(`org-chart-node-${color}`);

    // Selection state
    if (this.selectionMode() && node.selectable !== false) {
      classes.push('org-chart-node-selectable');
      if (this.isNodeSelected(node)) {
        classes.push('org-chart-node-selected');
      }
    }

    // Custom class from node
    if (node.styleClass) {
      classes.push(node.styleClass);
    }

    // Level class for styling
    classes.push(`org-chart-level-${level}`);

    // Loading state
    if (node.loading) {
      classes.push('org-chart-node-loading');
    }

    return classes.join(' ');
  }

  getNodeStyle(node: TreeNode<T>): Record<string, string> {
    return node.style || {};
  }

  getTemplateContext(node: TreeNode<T>, level: number): OrgChartNodeTemplateContext<T> {
    return {
      $implicit: node,
      node,
      selected: this.isNodeSelected(node),
      expanded: this.isExpanded(node),
      level,
      toggle: () => this.toggleNode(new Event('click'), node),
      select: (event: Event) => this.selectNode(event, node),
    };
  }

  trackByNode(_: number, node: TreeNode<T>): string {
    return node.key || node.label || JSON.stringify(node.data);
  }

  private isSameNode(node1: TreeNode<T>, node2: TreeNode<T>): boolean {
    if (node1.key && node2.key) {
      return node1.key === node2.key;
    }
    return node1 === node2;
  }
}
