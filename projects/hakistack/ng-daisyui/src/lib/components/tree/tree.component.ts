import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeNode, TreeSelectionMode } from '../../api';
import { LucideDynamicIcon, LucideSearch, LucideX, LucideChevronDown, LucideChevronRight } from '@lucide/angular';
import { ensureKeys } from './tree.helpers';
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

/** Result of the single-pass filter walk. */
interface FilterState {
  /** Keys of nodes that should be rendered while filtering, or `null` when no filter is active. */
  visibleKeys: Set<string> | null;
  /** Count of nodes whose label directly matches the filter text. */
  matchCount: number;
}

const NO_FILTER: FilterState = { visibleKeys: null, matchCount: 0 };

@Component({
  selector: 'hk-tree',
  imports: [NgTemplateOutlet, FormsModule, LucideDynamicIcon, LucideSearch, LucideX, LucideChevronDown, LucideChevronRight],
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
  private readonly hostRef: ElementRef<HTMLElement> = inject(ElementRef);

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

  /** Currently focused node key */
  private readonly focusedKey = signal<string | null>(null);

  /** Node being dragged */
  private readonly draggingNode = signal<TreeNode<T> | null>(null);

  /** Valid drop target node */
  private readonly dropTargetKey = signal<string | null>(null);

  /** Computed drop position within the target node */
  private readonly dropPositionSignal = signal<'before' | 'after' | 'inside' | null>(null);

  /** Parent lookup built once per `resolvedNodes` change. */
  private readonly parentByNode = computed(() => {
    const map = new WeakMap<TreeNode<T>, TreeNode<T> | null>();
    const walk = (list: TreeNode<T>[], parent: TreeNode<T> | null) => {
      for (const n of list) {
        map.set(n, parent);
        if (n.children?.length) walk(n.children, n);
      }
    };
    walk(this.resolvedNodes(), null);
    return map;
  });

  /** Key → node lookup built once per `resolvedNodes` change. */
  private readonly nodeByKey = computed(() => {
    const map = new Map<string, TreeNode<T>>();
    const walk = (list: TreeNode<T>[]) => {
      for (const n of list) {
        if (n.key) map.set(n.key, n);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(this.resolvedNodes());
    return map;
  });

  /** Single-pass filter visibility + match count. */
  private readonly filterState = computed<FilterState>(() => {
    const filterText = this.filterText().toLowerCase().trim();
    if (!filterText) return NO_FILTER;

    const mode = this.resolvedConfig()?.filterMode ?? 'lenient';
    const visibleKeys = new Set<string>();
    let matchCount = 0;

    const walk = (list: TreeNode<T>[]): boolean => {
      let subtreeHasMatch = false;
      for (const n of list) {
        const labelMatch = (n.label?.toLowerCase() ?? '').includes(filterText);
        if (labelMatch) matchCount++;
        const descendantMatch = n.children?.length ? walk(n.children) : false;
        const include = mode === 'strict' ? labelMatch : labelMatch || descendantMatch;
        if (include && n.key) visibleKeys.add(n.key);
        if (labelMatch || descendantMatch) subtreeHasMatch = true;
      }
      return subtreeHasMatch;
    };
    walk(this.resolvedNodes());

    return { visibleKeys, matchCount };
  });

  /** Whether same-level-only drag is enforced */
  private readonly isDragDropSameLevel = computed(() => this.resolvedConfig()?.dragDropSameLevel ?? false);

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

  /** Flattened visible nodes for rendering. Intentionally does NOT read drag/focus/drop signals. */
  readonly flatNodes = computed<FlatTreeNode<T>[]>(() => {
    const nodes = this.resolvedNodes();
    const visibleKeys = this.filterState().visibleKeys;
    const indent = this.indentSize();
    const expanded = this.expandedKeys();
    const selected = this.selectedKeys();
    const partial = this.partialSelectedKeys();
    const loading = this.loadingKeys();

    const result: FlatTreeNode<T>[] = [];
    const EMPTY_MASK: readonly boolean[] = [];
    const EMPTY_PATH: readonly number[] = [];

    const walk = (
      list: TreeNode<T>[],
      parent: TreeNode<T> | null,
      level: number,
      path: readonly number[],
      mask: readonly boolean[],
    ): void => {
      for (let index = 0; index < list.length; index++) {
        const node = list[index];
        const key = node.key;

        if (visibleKeys && (!key || !visibleKeys.has(key))) continue;

        const isLast = index === list.length - 1;
        const childPath = [...path, index];
        const childMask = [...mask, isLast];
        const isExpanded = !!key && expanded.has(key);
        const hasChildren = !!node.children?.length || node.leaf === false;

        const state: TreeNodeState = {
          expanded: isExpanded,
          selected: !!key && selected.has(key),
          partialSelected: !!key && partial.has(key),
          visible: true,
          loading: !!key && loading.has(key),
        };

        result.push({
          node,
          level,
          parent,
          first: index === 0,
          last: isLast,
          index,
          path: childPath,
          indentPx: level * indent,
          hasChildren,
          ancestorIsLastMask: childMask,
          state,
        });

        if (isExpanded && node.children?.length) {
          walk(node.children, node, level + 1, childPath, childMask);
        }
      }
    };
    walk(nodes, null, 0, EMPTY_PATH, EMPTY_MASK);
    return result;
  });

  /** Whether tree is empty */
  readonly isEmpty = computed(() => this.flatNodes().length === 0);

  /** Whether tree is loading */
  readonly isLoading = computed(() => this.resolvedConfig()?.loading ?? false);

  /** Previous `resolvedNodes` reference — used to skip redundant init passes when a parent emits the same array. */
  private lastInitNodes: readonly TreeNode<T>[] | null = null;

  constructor() {
    // Ensure every node has a key, even for consumers who bypass createTree.
    effect(() => {
      ensureKeys(this.resolvedNodes());
    });

    // Initialize expanded state. Only runs when the nodes array identity actually changes,
    // so a parent re-emitting the same reference (common when piping data) doesn't wipe
    // user-driven expand/collapse state.
    effect(() => {
      const nodes = this.resolvedNodes();
      const expandAll = this.resolvedConfig()?.expandAll ?? false;

      if (nodes === this.lastInitNodes) return;
      this.lastInitNodes = nodes;

      untracked(() => {
        const keys = new Set<string>();
        if (expandAll) {
          this.collectAllKeys(nodes, keys);
        } else {
          this.collectExpandedKeys(nodes, keys);
        }
        this.expandedKeys.set(keys);
      });
    });

    // Sync selection input to internal state. Skip the write when the resulting set
    // is equivalent to the current one to avoid cascading recomputes.
    effect(() => {
      const selection = this.selection();
      const incoming = new Set<string>();

      if (selection) {
        if (Array.isArray(selection)) {
          for (const node of selection) {
            const key = this.getNodeKey(node);
            if (key) incoming.add(key);
          }
        } else {
          const key = this.getNodeKey(selection);
          if (key) incoming.add(key);
        }
      }

      untracked(() => {
        const current = this.selectedKeys();
        if (setsEqual(current, incoming)) return;
        this.selectedKeys.set(incoming);
      });
    });

    // Move DOM focus to the focused row so screen readers and keyboard navigation
    // stay in sync with the visual state.
    effect(() => {
      const key = this.focusedKey();
      if (!key) return;
      queueMicrotask(() => {
        const el = this.hostRef.nativeElement.querySelector<HTMLElement>(`[data-node-key="${cssEscape(key)}"]`);
        el?.focus({ preventScroll: false });
      });
    });
  }

  onFilterTextChange(text: string): void {
    this.filterText.set(text);
    const trimmed = text.toLowerCase().trim();
    if (trimmed) {
      this.filterChange.emit({
        filter: trimmed,
        matchedNodeCount: this.filterState().matchCount,
      });
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.resolvedConfig()?.keyboardNavigation) return;

    const flatNodes = this.flatNodes();
    const focusedKey = this.focusedKey();
    const focusedIndex = focusedKey ? flatNodes.findIndex((fn) => fn.node.key === focusedKey) : -1;

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
            this.focusedKey.set(this.getNodeKey(flatNodes[focusedIndex].parent!));
          }
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

    this.expandedKeys.update((keys) => {
      const newKeys = new Set(keys);
      newKeys.add(key);
      return newKeys;
    });
  }

  /** Check if node has children */
  hasChildren(node: TreeNode<T>): boolean {
    return !!node.children?.length || node.leaf === false;
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

  /**
   * Activate a row via Enter / Space. Ignored when the key event originates
   * inside an interactive descendant (button, checkbox) — those handle their
   * own activation.
   */
  onRowActivate(event: Event, node: TreeNode<T>): void {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.onNodeClick(event, node);
  }

  /** Handle node click */
  onNodeClick(event: Event, node: TreeNode<T>): void {
    if (node.selectable === false) return;

    const mode = this.selectionMode();
    if (!mode) return;

    if (mode === 'single' || mode === 'multiple') {
      if (this.isSelected(node)) {
        this.unselectNode(node, event);
      } else {
        this.selectNode(node, event);
      }
    } else if (mode === 'checkbox') {
      this.toggleCheckbox(node, event);
    }

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

  onDragStart(event: DragEvent, node: TreeNode<T>): void {
    if (!this.isDragDropEnabled() || node.draggable === false) return;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', this.getNodeKey(node) || '');
    }

    this.draggingNode.set(node);
    this.nodeDragStart.emit({
      originalEvent: event,
      node,
    });
  }

  onDragEnd(event: DragEvent, node: TreeNode<T>): void {
    this.draggingNode.set(null);
    this.dropTargetKey.set(null);
    this.dropPositionSignal.set(null);
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

    if (this.isDescendant(dragging, node)) return;

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    const key = this.getNodeKey(node);
    if (key) this.dropTargetKey.set(key);

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;
    const threshold = height * 0.25;

    let position: 'before' | 'after' | 'inside';
    if (y < threshold) {
      position = 'before';
    } else if (y > height - threshold) {
      position = 'after';
    } else if (!this.isDragDropSameLevel() && (this.hasChildren(node) || node.leaf !== true)) {
      position = 'inside';
    } else {
      position = y < height / 2 ? 'before' : 'after';
    }

    this.dropPositionSignal.set(position);
  }

  onDragLeave(_event: DragEvent, node: TreeNode<T>): void {
    const key = this.getNodeKey(node);
    if (this.dropTargetKey() === key) {
      this.dropTargetKey.set(null);
      this.dropPositionSignal.set(null);
    }
  }

  onDropOnNode(event: DragEvent, targetNode: TreeNode<T>): void {
    event.preventDefault();
    event.stopPropagation();

    const dragNode = this.draggingNode();
    const position = this.dropPositionSignal() ?? 'after';
    if (!dragNode || dragNode === targetNode) return;

    const parentMap = this.parentByNode();
    const roots = this.resolvedNodes();

    const dragParent = parentMap.get(dragNode) ?? null;
    const dropParent = position === 'inside' ? targetNode : (parentMap.get(targetNode) ?? null);
    const dragSiblings = dragParent ? dragParent.children! : roots;
    const dragIndex = dragSiblings.indexOf(dragNode);

    let dropIndex: number;
    if (position === 'inside') {
      dropIndex = targetNode.children?.length ?? 0;
    } else {
      const dropSiblings = dropParent ? dropParent.children! : roots;
      const targetIndex = dropSiblings.indexOf(targetNode);
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
    this.dropPositionSignal.set(null);
  }

  isDropTarget(node: TreeNode<T>): boolean {
    const key = this.getNodeKey(node);
    return key === this.dropTargetKey();
  }

  getDropPosition(): 'before' | 'after' | 'inside' | null {
    return this.dropPositionSignal();
  }

  isDragging(node: TreeNode<T>): boolean {
    return this.draggingNode() === node;
  }

  private toggleCheckbox(node: TreeNode<T>, event?: Event): void {
    const key = this.getNodeKey(node);
    if (!key) return;

    const isCurrentlySelected = this.isSelected(node);

    if (isCurrentlySelected) {
      this.selectedKeys.update((keys) => {
        const newKeys = new Set(keys);
        newKeys.delete(key);
        return newKeys;
      });

      if (this.propagateDown() && node.children) {
        this.unselectDescendants(node);
      }

      this.nodeUnselect.emit({ originalEvent: event || new Event('unselect'), node });
    } else {
      this.selectedKeys.update((keys) => {
        const newKeys = new Set(keys);
        newKeys.add(key);
        return newKeys;
      });

      if (this.propagateDown() && node.children) {
        this.selectDescendants(node);
      }

      this.nodeSelect.emit({ originalEvent: event || new Event('select'), node });
    }

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
    const parentMap = this.parentByNode();
    let parent = parentMap.get(node) ?? null;

    while (parent) {
      const parentKey = this.getNodeKey(parent);
      if (!parentKey || !parent.children) break;

      const selected = this.selectedKeys();
      const partial = this.partialSelectedKeys();

      let allSelected = true;
      let someSelected = false;

      for (const child of parent.children) {
        const childKey = this.getNodeKey(child);
        if (!childKey) continue;

        if (selected.has(childKey)) {
          someSelected = true;
        } else if (partial.has(childKey)) {
          someSelected = true;
          allSelected = false;
        } else {
          allSelected = false;
        }
      }

      this.selectedKeys.update((keys) => {
        const newKeys = new Set(keys);
        if (allSelected) newKeys.add(parentKey);
        else newKeys.delete(parentKey);
        return newKeys;
      });

      this.partialSelectedKeys.update((keys) => {
        const newKeys = new Set(keys);
        if (someSelected && !allSelected) newKeys.add(parentKey);
        else newKeys.delete(parentKey);
        return newKeys;
      });

      parent = parentMap.get(parent) ?? null;
    }
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
    const nodeMap = this.nodeByKey();
    const allNodes: TreeNode<T>[] = [];
    for (const key of selectedKeys) {
      const n = nodeMap.get(key);
      if (n) allNodes.push(n);
    }

    if (mode === 'single') {
      this.selectionChange.emit(allNodes[0] ?? null);
    } else {
      this.selectionChange.emit(allNodes);
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

  private isDescendant(ancestor: TreeNode<T>, node: TreeNode<T>): boolean {
    const parentMap = this.parentByNode();
    let current: TreeNode<T> | null | undefined = node;
    while (current) {
      const parent = parentMap.get(current);
      if (parent === ancestor) return true;
      current = parent ?? null;
    }
    return false;
  }
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const k of a) if (!b.has(k)) return false;
  return true;
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}
