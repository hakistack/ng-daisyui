import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  ElementRef,
  input,
  output,
  signal,
  TemplateRef,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeNode, TreeSelectionMode } from '../../api/treenode';
import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import {
  FlatTreeNode,
  TreeConfig,
  TreeFilterEvent,
  TreeLazyLoadEvent,
  TreeNodeCollapseEvent,
  TreeNodeDragEndEvent,
  TreeNodeDragStartEvent,
  TreeNodeDropEvent,
  TreeNodeExpandEvent,
  TreeNodeSelectEvent,
  TreeNodeState,
  TreeNodeTemplateContext,
  TreeNodeUnselectEvent,
  TreeSetup,
} from './tree.types';

@Component({
  selector: 'app-tree',
  imports: [CommonModule, FormsModule, LucideIconComponent],
  templateUrl: './tree.component.html',
  styleUrl: './tree.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-tree block',
    '[attr.role]': '"tree"',
    '[attr.aria-label]': 'resolvedConfig()?.ariaLabel',
    '[attr.aria-labelledby]': 'resolvedConfig()?.ariaLabelledBy',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class TreeComponent<T = unknown> {

  /** Combined tree setup from createTree() — pass a single object instead of separate nodes + config */
  readonly tree = input<TreeSetup<T> | null>(null);

  /** Tree nodes data */
  readonly nodes = input<TreeNode<T>[]>([]);

  /** Tree configuration */
  readonly config = input<TreeConfig<T>>({});

  /** Currently selected node(s) - for two-way binding */
  readonly selection = input<TreeNode<T> | TreeNode<T>[] | null>(null);

  /** Resolved nodes: tree input wins, falls back to nodes input */
  protected readonly resolvedNodes = computed(() => this.tree()?.nodes ?? this.nodes());

  /** Resolved config: tree input wins, falls back to config input */
  protected readonly resolvedConfig = computed(() => this.tree()?.config ?? this.config());


  /** Emitted when selection changes */
  readonly selectionChange = output<TreeNode<T> | TreeNode<T>[] | null>();

  /** Emitted when a node is selected */
  readonly nodeSelect = output<TreeNodeSelectEvent<T>>();

  /** Emitted when a node is unselected */
  readonly nodeUnselect = output<TreeNodeUnselectEvent<T>>();

  /** Emitted when a node is expanded */
  readonly nodeExpand = output<TreeNodeExpandEvent<T>>();

  /** Emitted when a node is collapsed */
  readonly nodeCollapse = output<TreeNodeCollapseEvent<T>>();

  /** Emitted for lazy loading when a node needs children */
  readonly lazyLoad = output<TreeLazyLoadEvent<T>>();

  /** Emitted when drag starts */
  readonly nodeDragStart = output<TreeNodeDragStartEvent<T>>();

  /** Emitted when drag ends */
  readonly nodeDragEnd = output<TreeNodeDragEndEvent<T>>();

  /** Emitted when a node is dropped */
  readonly nodeDrop = output<TreeNodeDropEvent<T>>();

  /** Emitted when filter changes */
  readonly filterChange = output<TreeFilterEvent>();


  /** Custom node template */
  readonly nodeTemplateRef = contentChild<TemplateRef<TreeNodeTemplateContext<T>>>('nodeTemplate');


  /** Map of node key -> expanded state */
  private readonly expandedKeys = signal<Set<string>>(new Set());

  /** Map of node key -> selected state */
  private readonly selectedKeys = signal<Set<string>>(new Set());

  /** Map of node key -> partial selected state (checkbox mode) */
  private readonly partialSelectedKeys = signal<Set<string>>(new Set());

  /** Map of node key -> loading state */
  private readonly loadingKeys = signal<Set<string>>(new Set());

  /** Filter text */
  readonly filterText = signal<string>('');

  /** Set of node keys that match filter */
  private readonly matchedFilterKeys = computed(() => {
    const filterText = this.filterText().toLowerCase().trim();
    if (!filterText) return new Set<string>();

    const matchedKeys = new Set<string>();
    this.findMatchingNodes(this.resolvedNodes(), filterText, matchedKeys);
    return matchedKeys;
  });

  /** Currently focused node key */
  private readonly focusedKey = signal<string | null>(null);

  /** Node being dragged */
  private readonly draggingNode = signal<TreeNode<T> | null>(null);

  /** Valid drop target node */
  private readonly dropTargetKey = signal<string | null>(null);


  /** Selection mode from config */
  readonly selectionMode = computed<TreeSelectionMode>(() => this.resolvedConfig()?.selectionMode ?? null);

  /** Whether drag & drop is enabled */
  readonly isDragDropEnabled = computed(() => this.resolvedConfig()?.dragDrop ?? false);

  /** Whether filtering is enabled */
  readonly isFilterable = computed(() => this.resolvedConfig()?.filterable ?? false);

  /** Whether to show connecting lines */
  readonly showLines = computed(() => this.resolvedConfig()?.showLines ?? false);

  /** Indent size per level */
  readonly indentSize = computed(() => this.resolvedConfig()?.indentSize ?? 24);

  /** Whether propagate selection down is enabled */
  readonly propagateDown = computed(() => this.resolvedConfig()?.propagateSelectionDown ?? true);

  /** Whether propagate selection up is enabled */
  readonly propagateUp = computed(() => this.resolvedConfig()?.propagateSelectionUp ?? true);

  /** Empty message */
  readonly emptyMessage = computed(() => this.resolvedConfig()?.emptyMessage ?? 'No data available');

  /** Flattened visible nodes for rendering */
  readonly flatNodes = computed<FlatTreeNode<T>[]>(() => {
    const nodes = this.resolvedNodes();
    const filterText = this.filterText().toLowerCase().trim();
    const isFiltering = filterText.length > 0;
    const matchedKeys = this.matchedFilterKeys();
    const filterMode = this.resolvedConfig()?.filterMode ?? 'lenient';

    const result: FlatTreeNode<T>[] = [];
    this.flattenNodes(nodes, null, 0, [], result, isFiltering, matchedKeys, filterMode);
    return result;
  });

  /** Whether tree is empty */
  readonly isEmpty = computed(() => this.flatNodes().length === 0);

  /** Whether tree is loading */
  readonly isLoading = computed(() => this.resolvedConfig()?.loading ?? false);


  constructor() {
    // Initialize expanded state from nodes
    effect(() => {
      const nodes = this.resolvedNodes();
      const expandAll = this.resolvedConfig()?.expandAll ?? false;

      if (expandAll) {
        const allKeys = new Set<string>();
        this.collectAllKeys(nodes, allKeys);
        this.expandedKeys.set(allKeys);
      } else {
        // Collect initially expanded nodes
        const expandedKeys = new Set<string>();
        this.collectExpandedKeys(nodes, expandedKeys);
        this.expandedKeys.set(expandedKeys);
      }
    });

    // Sync selection input to internal state
    effect(() => {
      const selection = this.selection();
      const selectedKeys = new Set<string>();

      if (selection) {
        if (Array.isArray(selection)) {
          selection.forEach((node) => {
            const key = this.getNodeKey(node);
            if (key) selectedKeys.add(key);
          });
        } else {
          const key = this.getNodeKey(selection);
          if (key) selectedKeys.add(key);
        }
      }

      this.selectedKeys.set(selectedKeys);
    });

  }


  onFilterTextChange(text: string): void {
    this.filterText.set(text);
    const trimmed = text.toLowerCase().trim();
    if (trimmed) {
      this.filterChange.emit({
        filter: trimmed,
        matchedNodeCount: this.matchedFilterKeys().size,
      });
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.resolvedConfig()?.keyboardNavigation) return;

    const flatNodes = this.flatNodes();
    const focusedKey = this.focusedKey();
    const focusedIndex = focusedKey ? flatNodes.findIndex((fn) => this.getNodeKey(fn.node) === focusedKey) : -1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (focusedIndex < flatNodes.length - 1) {
          this.focusedKey.set(this.getNodeKey(flatNodes[focusedIndex + 1].node));
        } else if (focusedIndex === -1 && flatNodes.length > 0) {
          this.focusedKey.set(this.getNodeKey(flatNodes[0].node));
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (focusedIndex > 0) {
          this.focusedKey.set(this.getNodeKey(flatNodes[focusedIndex - 1].node));
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (focusedIndex >= 0) {
          const node = flatNodes[focusedIndex].node;
          if (this.hasChildren(node) && !this.isExpanded(node)) {
            this.expandNode(node, event);
          }
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (focusedIndex >= 0) {
          const node = flatNodes[focusedIndex].node;
          if (this.hasChildren(node) && this.isExpanded(node)) {
            this.collapseNode(node, event);
          } else if (flatNodes[focusedIndex].parent) {
            // Move focus to parent
            this.focusedKey.set(this.getNodeKey(flatNodes[focusedIndex].parent!));
          }
        }
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0) {
          const node = flatNodes[focusedIndex].node;
          this.onNodeClick(event, node);
        }
        break;

      case 'Home':
        event.preventDefault();
        if (flatNodes.length > 0) {
          this.focusedKey.set(this.getNodeKey(flatNodes[0].node));
        }
        break;

      case 'End':
        event.preventDefault();
        if (flatNodes.length > 0) {
          this.focusedKey.set(this.getNodeKey(flatNodes[flatNodes.length - 1].node));
        }
        break;
    }
  }


  /** Expand a node */
  expandNode(node: TreeNode<T>, event?: Event): void {
    const key = this.getNodeKey(node);
    if (!key) return;

    // Check for lazy loading
    if (node.leaf === false && !node.children?.length && !this.loadingKeys().has(key)) {
      this.loadingKeys.update((keys) => {
        const newKeys = new Set(keys);
        newKeys.add(key);
        return newKeys;
      });

      this.lazyLoad.emit({
        originalEvent: event || new Event('expand'),
        node,
      });
      return;
    }

    this.expandedKeys.update((keys) => {
      const newKeys = new Set(keys);
      newKeys.add(key);
      return newKeys;
    });

    this.nodeExpand.emit({
      originalEvent: event || new Event('expand'),
      node,
    });
  }

  /** Collapse a node */
  collapseNode(node: TreeNode<T>, event?: Event): void {
    const key = this.getNodeKey(node);
    if (!key) return;

    this.expandedKeys.update((keys) => {
      const newKeys = new Set(keys);
      newKeys.delete(key);
      return newKeys;
    });

    this.nodeCollapse.emit({
      originalEvent: event || new Event('collapse'),
      node,
    });
  }

  /** Toggle node expansion */
  toggleNode(node: TreeNode<T>, event?: Event): void {
    if (this.isExpanded(node)) {
      this.collapseNode(node, event);
    } else {
      this.expandNode(node, event);
    }
  }

  /** Expand all nodes */
  expandAll(): void {
    const allKeys = new Set<string>();
    this.collectAllKeys(this.resolvedNodes(), allKeys);
    this.expandedKeys.set(allKeys);
  }

  /** Collapse all nodes */
  collapseAll(): void {
    this.expandedKeys.set(new Set());
  }

  /** Select a node */
  selectNode(node: TreeNode<T>, event?: Event): void {
    const mode = this.selectionMode();
    if (!mode) return;

    const key = this.getNodeKey(node);
    if (!key) return;

    if (mode === 'single') {
      this.selectedKeys.set(new Set([key]));
      this.emitSelection();
      this.nodeSelect.emit({ originalEvent: event || new Event('select'), node });
    } else if (mode === 'multiple') {
      this.selectedKeys.update((keys) => {
        const newKeys = new Set(keys);
        newKeys.add(key);
        return newKeys;
      });
      this.emitSelection();
      this.nodeSelect.emit({ originalEvent: event || new Event('select'), node });
    } else if (mode === 'checkbox') {
      this.toggleCheckbox(node, event);
    }
  }

  /** Unselect a node */
  unselectNode(node: TreeNode<T>, event?: Event): void {
    const key = this.getNodeKey(node);
    if (!key) return;

    this.selectedKeys.update((keys) => {
      const newKeys = new Set(keys);
      newKeys.delete(key);
      return newKeys;
    });

    this.emitSelection();
    this.nodeUnselect.emit({ originalEvent: event || new Event('unselect'), node });
  }

  /** Clear all selections */
  clearSelection(): void {
    this.selectedKeys.set(new Set());
    this.partialSelectedKeys.set(new Set());
    this.emitSelection();
  }

  /** Complete lazy loading for a node */
  completeLoading(node: TreeNode<T>): void {
    const key = this.getNodeKey(node);
    if (!key) return;

    this.loadingKeys.update((keys) => {
      const newKeys = new Set(keys);
      newKeys.delete(key);
      return newKeys;
    });

    // Now expand the node
    this.expandedKeys.update((keys) => {
      const newKeys = new Set(keys);
      newKeys.add(key);
      return newKeys;
    });
  }


  /** Check if node has children */
  hasChildren(node: TreeNode<T>): boolean {
    return (node.children && node.children.length > 0) || node.leaf === false;
  }

  /** Check if node is expanded */
  isExpanded(node: TreeNode<T>): boolean {
    const key = this.getNodeKey(node);
    return key ? this.expandedKeys().has(key) : false;
  }

  /** Check if node is selected */
  isSelected(node: TreeNode<T>): boolean {
    const key = this.getNodeKey(node);
    return key ? this.selectedKeys().has(key) : false;
  }

  /** Check if node is partially selected */
  isPartialSelected(node: TreeNode<T>): boolean {
    const key = this.getNodeKey(node);
    return key ? this.partialSelectedKeys().has(key) : false;
  }

  /** Check if node is loading */
  isNodeLoading(node: TreeNode<T>): boolean {
    const key = this.getNodeKey(node);
    return key ? this.loadingKeys().has(key) : false;
  }

  /** Check if node is focused */
  isFocused(node: TreeNode<T>): boolean {
    const key = this.getNodeKey(node);
    return key === this.focusedKey();
  }

  /** Get unique key for a node */
  getNodeKey(node: TreeNode<T>): string | null {
    return node.key ?? null;
  }

  /** Get indent style for a node */
  getIndentStyle(level: number): Record<string, string> {
    const indent = level * this.indentSize();
    return { 'padding-left': `${indent}px` };
  }

  /** Handle node click */
  onNodeClick(event: Event, node: TreeNode<T>): void {
    if (node.selectable === false) return;

    const mode = this.selectionMode();
    if (!mode) return;

    if (mode === 'single') {
      if (this.isSelected(node)) {
        this.unselectNode(node, event);
      } else {
        this.selectNode(node, event);
      }
    } else if (mode === 'multiple') {
      if (this.isSelected(node)) {
        this.unselectNode(node, event);
      } else {
        this.selectNode(node, event);
      }
    } else if (mode === 'checkbox') {
      this.toggleCheckbox(node, event);
    }

    // Update focus
    const key = this.getNodeKey(node);
    if (key) this.focusedKey.set(key);
  }

  /** Handle toggle button click */
  onToggleClick(event: Event, node: TreeNode<T>): void {
    event.stopPropagation();
    this.toggleNode(node, event);
  }

  /** Handle checkbox click */
  onCheckboxClick(event: Event, node: TreeNode<T>): void {
    event.stopPropagation();
    this.toggleCheckbox(node, event);
  }

  /** Track by function for nodes */
  trackByNode = (_: number, flatNode: FlatTreeNode<T>): string => {
    return this.getNodeKey(flatNode.node) || String(_);
  };

  /** Check if node is last at a specific level (for connecting lines) */
  isLastAtLevel(flatNode: FlatTreeNode<T>, level: number): boolean {
    if (level >= flatNode.path.length) return false;

    // Find the ancestor at this level
    let current: TreeNode<T> | null = flatNode.node;
    let currentLevel = flatNode.level;

    while (currentLevel > level && current) {
      current = this.findParent(this.resolvedNodes(), current);
      currentLevel--;
    }

    if (!current) return false;

    const parent = this.findParent(this.resolvedNodes(), current);
    if (!parent) {
      // Root level
      const rootNodes = this.resolvedNodes();
      return rootNodes.indexOf(current) === rootNodes.length - 1;
    }

    return parent.children ? parent.children.indexOf(current) === parent.children.length - 1 : false;
  }


  onDragStart(event: DragEvent, node: TreeNode<T>): void {
    if (!this.isDragDropEnabled() || node.draggable === false) return;

    this.draggingNode.set(node);
    this.nodeDragStart.emit({
      originalEvent: event,
      node,
    });
  }

  onDragEnd(event: DragEvent, node: TreeNode<T>): void {
    this.draggingNode.set(null);
    this.dropTargetKey.set(null);
    this.nodeDragEnd.emit({
      originalEvent: event,
      node,
    });
  }

  onDragOver(event: DragEvent, node: TreeNode<T>): void {
    if (!this.isDragDropEnabled()) return;
    if (node.droppable === false) return;

    const dragging = this.draggingNode();
    if (!dragging || dragging === node) return;

    // Prevent dropping on descendants
    if (this.isDescendant(dragging, node)) return;

    event.preventDefault();
    const key = this.getNodeKey(node);
    if (key) this.dropTargetKey.set(key);
  }

  onDragLeave(event: DragEvent, node: TreeNode<T>): void {
    const key = this.getNodeKey(node);
    if (this.dropTargetKey() === key) {
      this.dropTargetKey.set(null);
    }
  }

  onDrop(event: DragEvent, targetNode: TreeNode<T>, position: 'before' | 'after' | 'inside'): void {
    event.preventDefault();

    const dragNode = this.draggingNode();
    if (!dragNode || dragNode === targetNode) return;

    // Find parents and indices
    const dragParent = this.findParent(this.resolvedNodes(), dragNode);
    const dropParent = position === 'inside' ? targetNode : this.findParent(this.resolvedNodes(), targetNode);
    const dragIndex = this.findIndex(dragParent ? dragParent.children! : this.resolvedNodes(), dragNode);

    let dropIndex: number;
    if (position === 'inside') {
      dropIndex = targetNode.children?.length ?? 0;
    } else {
      const targetIndex = this.findIndex(dropParent ? dropParent.children! : this.resolvedNodes(), targetNode);
      dropIndex = position === 'before' ? targetIndex : targetIndex + 1;
    }

    this.nodeDrop.emit({
      originalEvent: event,
      dragNode,
      dropNode: targetNode,
      dragNodeParent: dragParent,
      dropNodeParent: dropParent,
      dropPosition: position,
      dragNodeIndex: dragIndex,
      dropIndex,
    });

    this.draggingNode.set(null);
    this.dropTargetKey.set(null);
  }

  isDropTarget(node: TreeNode<T>): boolean {
    const key = this.getNodeKey(node);
    return key === this.dropTargetKey();
  }

  isDragging(node: TreeNode<T>): boolean {
    return this.draggingNode() === node;
  }


  private toggleCheckbox(node: TreeNode<T>, event?: Event): void {
    const key = this.getNodeKey(node);
    if (!key) return;

    const isCurrentlySelected = this.isSelected(node);

    if (isCurrentlySelected) {
      // Unselect
      this.selectedKeys.update((keys) => {
        const newKeys = new Set(keys);
        newKeys.delete(key);
        return newKeys;
      });

      // Propagate down
      if (this.propagateDown() && node.children) {
        this.unselectDescendants(node);
      }

      this.nodeUnselect.emit({ originalEvent: event || new Event('unselect'), node });
    } else {
      // Select
      this.selectedKeys.update((keys) => {
        const newKeys = new Set(keys);
        newKeys.add(key);
        return newKeys;
      });

      // Propagate down
      if (this.propagateDown() && node.children) {
        this.selectDescendants(node);
      }

      this.nodeSelect.emit({ originalEvent: event || new Event('select'), node });
    }

    // Propagate up
    if (this.propagateUp()) {
      this.updateParentSelection(node);
    }

    this.emitSelection();
  }

  private selectDescendants(node: TreeNode<T>): void {
    this.updateDescendantKeys(node, 'add');
  }

  private unselectDescendants(node: TreeNode<T>): void {
    this.updateDescendantKeys(node, 'delete');
  }

  private updateDescendantKeys(node: TreeNode<T>, selectedOp: 'add' | 'delete'): void {
    if (!node.children) return;

    const descendantKeys: string[] = [];
    this.forEachDescendant(node, (n) => {
      const k = this.getNodeKey(n);
      if (k) descendantKeys.push(k);
    });

    this.selectedKeys.update((keys) => {
      const newKeys = new Set(keys);
      for (const k of descendantKeys) newKeys[selectedOp](k);
      return newKeys;
    });

    this.partialSelectedKeys.update((keys) => {
      const newKeys = new Set(keys);
      for (const k of descendantKeys) newKeys.delete(k);
      return newKeys;
    });
  }

  private updateParentSelection(node: TreeNode<T>): void {
    const parent = this.findParent(this.resolvedNodes(), node);
    if (!parent) return;

    const parentKey = this.getNodeKey(parent);
    if (!parentKey || !parent.children) return;

    let allSelected = true;
    let someSelected = false;

    for (const child of parent.children) {
      const childKey = this.getNodeKey(child);
      if (!childKey) continue;

      if (this.selectedKeys().has(childKey)) {
        someSelected = true;
      } else if (this.partialSelectedKeys().has(childKey)) {
        someSelected = true;
        allSelected = false;
      } else {
        allSelected = false;
      }
    }

    this.selectedKeys.update((keys) => {
      const newKeys = new Set(keys);
      if (allSelected) {
        newKeys.add(parentKey);
      } else {
        newKeys.delete(parentKey);
      }
      return newKeys;
    });

    this.partialSelectedKeys.update((keys) => {
      const newKeys = new Set(keys);
      if (someSelected && !allSelected) {
        newKeys.add(parentKey);
      } else {
        newKeys.delete(parentKey);
      }
      return newKeys;
    });

    // Continue up the tree
    this.updateParentSelection(parent);
  }

  private forEachDescendant(node: TreeNode<T>, fn: (n: TreeNode<T>) => void): void {
    if (!node.children) return;
    for (const child of node.children) {
      fn(child);
      this.forEachDescendant(child, fn);
    }
  }

  private emitSelection(): void {
    const mode = this.selectionMode();
    const selectedKeys = this.selectedKeys();
    const allNodes: TreeNode<T>[] = [];
    this.collectNodesByKeys(this.resolvedNodes(), selectedKeys, allNodes);

    if (mode === 'single') {
      this.selectionChange.emit(allNodes[0] ?? null);
    } else {
      this.selectionChange.emit(allNodes);
    }
  }

  private collectNodesByKeys(nodes: TreeNode<T>[], keys: Set<string>, result: TreeNode<T>[]): void {
    for (const node of nodes) {
      const key = this.getNodeKey(node);
      if (key && keys.has(key)) {
        result.push(node);
      }
      if (node.children) {
        this.collectNodesByKeys(node.children, keys, result);
      }
    }
  }

  private flattenNodes(
    nodes: TreeNode<T>[],
    parent: TreeNode<T> | null,
    level: number,
    path: number[],
    result: FlatTreeNode<T>[],
    isFiltering: boolean,
    matchedKeys: Set<string>,
    filterMode: 'lenient' | 'strict',
  ): void {
    nodes.forEach((node, index) => {
      const key = this.getNodeKey(node);
      const isMatch = key ? matchedKeys.has(key) : false;
      const hasMatchingDescendant = key ? this.hasMatchingDescendant(node, matchedKeys) : false;

      // Determine visibility
      let visible = true;
      if (isFiltering) {
        if (filterMode === 'strict') {
          visible = isMatch;
        } else {
          // Lenient: show if match or has matching descendant
          visible = isMatch || hasMatchingDescendant;
        }
      }

      if (!visible) return;

      const currentPath = [...path, index];
      const state: TreeNodeState = {
        expanded: this.isExpanded(node),
        selected: this.isSelected(node),
        partialSelected: this.isPartialSelected(node),
        visible: true,
        dragging: this.isDragging(node),
        dropTarget: this.isDropTarget(node),
        loading: this.isNodeLoading(node),
        focused: this.isFocused(node),
      };

      result.push({
        node,
        level,
        parent,
        first: index === 0,
        last: index === nodes.length - 1,
        index,
        path: currentPath,
        state,
      });

      // Recursively add children if expanded
      if (node.children && this.isExpanded(node)) {
        this.flattenNodes(node.children, node, level + 1, currentPath, result, isFiltering, matchedKeys, filterMode);
      }
    });
  }

  private hasMatchingDescendant(node: TreeNode<T>, matchedKeys: Set<string>): boolean {
    if (!node.children) return false;

    for (const child of node.children) {
      const childKey = this.getNodeKey(child);
      if (childKey && matchedKeys.has(childKey)) return true;
      if (this.hasMatchingDescendant(child, matchedKeys)) return true;
    }

    return false;
  }

  private findMatchingNodes(nodes: TreeNode<T>[], filterText: string, result: Set<string>): void {
    for (const node of nodes) {
      const label = node.label?.toLowerCase() ?? '';
      if (label.includes(filterText)) {
        const key = this.getNodeKey(node);
        if (key) result.add(key);
      }
      if (node.children) {
        this.findMatchingNodes(node.children, filterText, result);
      }
    }
  }

  private collectAllKeys(nodes: TreeNode<T>[], result: Set<string>): void {
    for (const node of nodes) {
      const key = this.getNodeKey(node);
      if (key && this.hasChildren(node)) {
        result.add(key);
      }
      if (node.children) {
        this.collectAllKeys(node.children, result);
      }
    }
  }

  private collectExpandedKeys(nodes: TreeNode<T>[], result: Set<string>): void {
    for (const node of nodes) {
      if (node.expanded) {
        const key = this.getNodeKey(node);
        if (key) result.add(key);
      }
      if (node.children) {
        this.collectExpandedKeys(node.children, result);
      }
    }
  }

  private findParent(nodes: TreeNode<T>[], target: TreeNode<T>): TreeNode<T> | null {
    for (const node of nodes) {
      if (node.children?.includes(target)) {
        return node;
      }
      if (node.children) {
        const found = this.findParent(node.children, target);
        if (found) return found;
      }
    }
    return null;
  }

  private findIndex(nodes: TreeNode<T>[], target: TreeNode<T>): number {
    return nodes.indexOf(target);
  }

  private isDescendant(ancestor: TreeNode<T>, node: TreeNode<T>): boolean {
    if (!ancestor.children) return false;
    for (const child of ancestor.children) {
      if (child === node) return true;
      if (this.isDescendant(child, node)) return true;
    }
    return false;
  }
}
