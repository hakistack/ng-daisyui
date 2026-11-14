import { ChangeDetectionStrategy, Component, Injector, inject, runInInjectionContext } from '@angular/core';
import { createTable, FieldConfiguration, TableComponent, TreeTableConfig } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { PgDepartment, pgDepartments, TREE_TABLE_PLAYGROUND, TreeTablePgState } from '../specs/tree-table';
import type { PlaygroundState } from '../playground.types';

@Component({
  selector: 'app-tree-table-playground',
  imports: [PlaygroundComponent, TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        @let p = previewFor(raw);
        <hk-table
          [data]="p.rows"
          [config]="p.table"
          (expansionChange)="log('expansionChange', { id: $event.row.id, expanded: $event.expanded })"
          (selectionChange)="log('selectionChange', ids($event))"
          (globalSearchChange)="log('globalSearchChange', $event)"
        />
      </ng-template>
    </app-playground>
  `,
})
export class TreeTablePlaygroundComponent {
  protected readonly spec = TREE_TABLE_PLAYGROUND;
  private readonly injector = inject(Injector);

  // The playground re-creates the preview on every state change, so one controller (and one copy of
  // the rows) per state is enough. createTable() calls inject(), hence runInInjectionContext().
  private last: { raw: PlaygroundState; preview: TreeTablePreview } | null = null;

  protected previewFor(raw: PlaygroundState): TreeTablePreview {
    if (this.last?.raw !== raw) {
      const s = raw as TreeTablePgState;
      const table = runInInjectionContext(this.injector, () =>
        createTable<PgDepartment>({
          columns: {
            name: { header: 'Department' },
            head: { header: 'Head' },
            employees: { header: 'Employees' },
          },
          pagination: { mode: 'offset', pageSize: 25 },
          globalSearch: s['globalSearch.enabled'] ? { enabled: true, placeholder: 'Search departments...' } : undefined,
          hasSelection: s.hasSelection,
          treeTable: {
            enabled: true,
            getRowKey: (row) => row.id,
            expandAll: s['treeTable.expandAll'],
            indentSize: s['treeTable.indentSize'],
            showIndentGuides: s['treeTable.showIndentGuides'],
            checkboxCascade: s['treeTable.checkboxCascade'] as NonNullable<TreeTableConfig<PgDepartment>['checkboxCascade']>,
            filterHierarchyMode: s['treeTable.filterHierarchyMode'] as NonNullable<TreeTableConfig<PgDepartment>['filterHierarchyMode']>,
          },
        }),
      );
      this.last = { raw, preview: { rows: pgDepartments(), table } };
    }
    return this.last.preview;
  }

  /** Selected rows → their ids (keeps the event log short). */
  protected ids(rows: readonly PgDepartment[]): string[] {
    return rows.map((r) => r.id);
  }
}

interface TreeTablePreview {
  readonly rows: readonly PgDepartment[];
  readonly table: FieldConfiguration<PgDepartment>;
}
