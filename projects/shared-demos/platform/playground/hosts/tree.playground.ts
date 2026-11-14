import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createTree, TreeComponent, TreeNode, TreeSelectionMode, TreeSetup } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { pgProjectNodes, TREE_PLAYGROUND, TreePgState } from '../specs/tree';
import type { PlaygroundState } from '../playground.types';

@Component({
  selector: 'app-tree-playground',
  imports: [PlaygroundComponent, TreeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        <hk-tree
          [tree]="treeFor(raw)"
          (selectionChange)="log('selectionChange', keys($event))"
          (nodeSelect)="log('nodeSelect', $event.node.key)"
          (nodeUnselect)="log('nodeUnselect', $event.node.key)"
          (nodeExpand)="log('nodeExpand', $event.node.key)"
          (nodeCollapse)="log('nodeCollapse', $event.node.key)"
          (filterChange)="log('filterChange', $event)"
          (nodeDrop)="log('nodeDrop', { drag: $event.dragNode.key, drop: $event.dropNode?.key ?? null, position: $event.dropPosition })"
        />
      </ng-template>
    </app-playground>
  `,
})
export class TreePlaygroundComponent {
  protected readonly spec = TREE_PLAYGROUND;

  // The playground re-creates the preview on every state change; fresh nodes per state because the
  // tree records expansion and drag-drop moves on the node objects.
  private last: { raw: PlaygroundState; tree: TreeSetup } | null = null;

  protected treeFor(raw: PlaygroundState): TreeSetup {
    if (this.last?.raw !== raw) {
      const s = raw as TreePgState;
      const tree = createTree({
        nodes: pgProjectNodes(),
        selectionMode: (s.selectionMode || null) as TreeSelectionMode,
        propagateSelectionDown: s.propagateSelectionDown,
        propagateSelectionUp: s.propagateSelectionUp,
        filterable: s.filterable,
        filterMode: s.filterMode as 'lenient' | 'strict',
        showLines: s.showLines,
        indentSize: s.indentSize,
        dragDrop: s.dragDrop,
        expandAll: s.expandAll,
        ariaLabel: 'Project files',
      });
      this.last = { raw, tree };
    }
    return this.last.tree;
  }

  /** Selection → node keys (TreeNode objects hold parent references, so they are not logged whole). */
  protected keys(selection: TreeNode | TreeNode[] | null): (string | undefined)[] | string | null {
    if (selection === null) return null;
    return Array.isArray(selection) ? selection.map((n) => n.key) : (selection.key ?? null);
  }
}
