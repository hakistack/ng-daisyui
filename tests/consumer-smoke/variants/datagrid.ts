/**
 * Consumer smoke variant: hk-datagrid with a client-side data set (no AI, no server source).
 * `npm run test:consumer:datagrid` swaps this file in for src/main.ts.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { createDataGrid, DataGridComponent, type DataGridColumn } from '@hakistack/ng-daisyui';

interface Item {
  id: number;
  name: string;
  qty: number;
}

const columns: DataGridColumn<Item>[] = [
  { field: 'name', header: 'Name' },
  { field: 'qty', header: 'Qty', type: 'number' },
];

@Component({
  selector: 'app-root',
  imports: [DataGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<hk-datagrid [controller]="grid" height="400px" />`,
})
class AppComponent {
  readonly grid = createDataGrid<Item>({
    columns,
    data: Array.from({ length: 500 }, (_, i) => ({ id: i, name: `Item ${i}`, qty: i % 40 })),
    ariaLabel: 'Inventory',
  });
}

bootstrapApplication(AppComponent).catch((err: unknown) => console.error(err));
