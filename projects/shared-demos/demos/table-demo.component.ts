import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, map } from 'rxjs/operators';
import {
  TableComponent,
  createTable,
  ToastService,
  HkFooterDirective,
  CellEditEvent,
  RowReorderEvent,
  ColumnReorderEvent,
} from '@hakistack/ng-daisyui';
import {
  LucideDynamicIcon,
  LucideInfo,
  LucideX,
  LucideMousePointerClick,
  LucideUsers,
  LucideEye,
  LucidePencil,
  LucideTrash2,
  LucideDownload,
} from '@lucide/angular';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { DemoPageComponent } from '../shared/demo-page.component';
import { ApiDocEntry } from '../shared/api-table.types';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  department: string;
  salary: number;
  joinDate: Date;
}

interface OrderItem {
  itemId: number;
  sku: string;
  description: string;
  qty: number;
  price: number;
}

interface Order {
  orderId: number;
  product: string;
  quantity: number;
  unitPrice: number;
  orderDate: string;
  items: OrderItem[];
}

interface Employee {
  id: number;
  name: string;
  title: string;
  hireDate: string;
  orders: Order[];
}

interface Customer {
  customerId: number;
  customerName: string;
  companyName: string;
  contactTitle: string;
  country: string;
  orders: CustomerOrder[];
}

interface CustomerOrder {
  orderId: number;
  freight: number;
  shipName: string;
  shipCountry: string;
  shipAddress: string;
  orderDate: string;
}

type TableTab =
  | 'basic'
  | 'full'
  | 'filtering'
  | 'selectableRow'
  | 'sticky'
  | 'resizable'
  | 'virtualScroll'
  | 'editable'
  | 'footer'
  | 'expandable'
  | 'grouped'
  | 'reorderable'
  | 'keyboard'
  | 'hierarchy'
  | 'masterDetail'
  | 'nestedMasterDetail'
  | 'actionsPosition';
type ApiSubTab = 'hk-table' | 'sub-components' | 'builder' | 'filtering' | 'types';

@Component({
  selector: 'app-table-demo',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableComponent,
    LucideDynamicIcon,
    HkFooterDirective,
    DocSectionComponent,
    ApiTableComponent,
    CodeBlockComponent,
    DemoPageComponent,
  ],
  template: `
    <app-demo-page
      title="Table"
      description="Enterprise-grade data table with sorting, filtering, pagination, and more"
      icon="table"
      category="Data Display"
      importName="TableComponent, createTable"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'basic') {
          <app-doc-section title="Basic Table" description="Simple table with sorting" [codeExample]="basicCode">
            <hk-table [data]="users()" [config]="basicConfig" (sortChange)="onSort($event)" />
          </app-doc-section>
        }

        @if (activeTab() === 'full') {
          <app-doc-section
            title="Full Featured Table"
            description="Selection, actions, filters, global search, pagination"
            [codeExample]="fullCode"
          >
            <hk-table
              [data]="users()"
              [config]="fullConfig"
              [paginationOptions]="paginationOptions"
              (selectionChange)="onSelection($event)"
              (sortChange)="onSort($event)"
              (filterChange)="onFilter($event)"
              (globalSearchChange)="onSearch($event)"
              (pageChange)="onPageChange($event)"
            />
          </app-doc-section>

          @if (selectedUsers().length > 0) {
            <div class="alert alert-info">
              <svg [lucideIcon]="infoIcon" [size]="20"></svg>
              <span>{{ selectedUsers().length }} user(s) selected</span>
            </div>
          }
        }

        @if (activeTab() === 'filtering') {
          <app-doc-section
            title="All Filter Types"
            description="Column-header filter dropdowns for every supported FilterType. Click the filter icon next to any header to try text, number, date, select, multi-select, boolean, date range, and number range filters."
            [codeExample]="filteringCode"
          >
            <hk-table [data]="users()" [config]="filteringConfig" (filterChange)="onFilter($event)" />
          </app-doc-section>

          <app-doc-section
            title="Grid-Style Filter Bar (Top Panel)"
            description="Compose a reactive filter form above the table and drive it through the controller returned by createTable(). No viewChild, no template refs — just call filterGridConfig.applyColumnFilter(...) directly. Column header filter icons are hidden via enableFiltering: false while filter configs remain registered for programmatic use."
            [codeExample]="filterGridCode"
          >
            <form [formGroup]="filterGridForm" class="bg-base-200/40 border border-base-content/10 rounded-box p-4 mb-4">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div class="form-control">
                  <label class="label py-1"><span class="label-text text-xs font-semibold">Buscar</span></label>
                  <input type="text" class="input input-bordered input-sm w-full" placeholder="Nombre..." formControlName="name" />
                </div>
                <div class="form-control">
                  <label class="label py-1"><span class="label-text text-xs font-semibold">Oficina</span></label>
                  <select class="select select-bordered select-sm w-full" formControlName="dept">
                    <option value="">Seleccione</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
                <div class="form-control lg:col-span-2">
                  <label class="label py-1"><span class="label-text text-xs font-semibold">Fecha</span></label>
                  <div class="flex gap-2">
                    <input type="date" class="input input-bordered input-sm flex-1" aria-label="Desde" formControlName="dateFrom" />
                    <input type="date" class="input input-bordered input-sm flex-1" aria-label="Hasta" formControlName="dateTo" />
                  </div>
                </div>
              </div>
              <div class="mt-3 flex justify-end">
                <button type="button" class="btn btn-ghost btn-sm" (click)="clearFilterGrid()">
                  <svg [lucideIcon]="xIcon" [size]="14"></svg>
                  Limpiar filtros
                </button>
              </div>
            </form>

            <hk-table [data]="users()" [config]="filterGridConfig" (filterChange)="onFilter($event)" />
          </app-doc-section>

          <div class="alert alert-info">
            <svg [lucideIcon]="infoIcon" [size]="20"></svg>
            <span>Each column below demonstrates a different filter type. Open the dev console to see filterChange events.</span>
          </div>
        }

        @if (activeTab() === 'selectableRow') {
          <app-doc-section
            title="Single Selectable Row"
            description="Click any row to highlight it. Click again to deselect. Useful for visual guidance — the active row gets a primary tint. Supports conditional rowClass for per-row styling."
            [codeExample]="selectableRowCode"
          >
            <hk-table [data]="users()" [config]="selectableRowConfig" (activeRowChange)="onActiveRowChange($event)" />
          </app-doc-section>

          @if (activeUser()) {
            <div class="alert alert-info">
              <svg [lucideIcon]="mousePointerClickIcon" [size]="20"></svg>
              <span
                >Active row: <strong>{{ activeUser()!.name }}</strong> ({{ activeUser()!.role }})</span
              >
            </div>
          }

          <app-doc-section
            title="Multi Selectable Rows"
            description="Click multiple rows to highlight them. Click a highlighted row to deselect it. Great for batch visual guidance without checkbox columns."
            [codeExample]="multiSelectableRowCode"
          >
            <hk-table [data]="users()" [config]="multiSelectableRowConfig" (activeRowsChange)="onActiveRowsChange($event)" />
          </app-doc-section>

          @if (activeUsers().length > 0) {
            <div class="alert alert-info">
              <svg [lucideIcon]="mousePointerClickIcon" [size]="20"></svg>
              <span
                >{{ activeUsers().length }} row(s) selected: <strong>{{ activeUserNames() }}</strong></span
              >
            </div>
          }
        }

        @if (activeTab() === 'actionsPosition') {
          <app-doc-section
            title="Actions at End (Default)"
            description="By default, the actions column renders as the last column."
            [codeExample]="actionsPositionEndCode"
          >
            <hk-table [data]="users()" [config]="actionsEndConfig" />
          </app-doc-section>

          <app-doc-section
            title="Actions at Start"
            description="Set actionsPosition: 'start' to render the actions column as the first data column (after selection/expand)."
            [codeExample]="actionsPositionStartCode"
          >
            <hk-table [data]="users()" [config]="actionsStartConfig" />
          </app-doc-section>

          <app-doc-section
            title="Actions at Start + Selection + Sticky"
            description="Combines with selection and sticky columns — the action column auto-sticks to the start."
            [codeExample]="actionsPositionStickyCode"
          >
            <div style="max-width: 700px;">
              <hk-table [data]="users()" [config]="actionsStartStickyConfig" />
            </div>
          </app-doc-section>

          <app-doc-section
            title="Per-Action Placement (Split Columns)"
            description="Set position: 'start' | 'end' on individual actions to render them in two separate columns — one before the data, one after."
            [codeExample]="actionsPositionSplitCode"
          >
            <hk-table [data]="users()" [config]="actionsSplitConfig" />
          </app-doc-section>
        }

        @if (activeTab() === 'sticky') {
          <app-doc-section
            title="Sticky Columns"
            description="Pin columns to start/end during horizontal scroll. Selection and actions columns auto-stick."
            [codeExample]="stickyCode"
          >
            <div style="max-width: 600px;">
              <hk-table [data]="users()" [config]="stickyConfig" />
            </div>
          </app-doc-section>
        }

        @if (activeTab() === 'resizable') {
          <app-doc-section
            title="Resizable Columns"
            description="Drag column borders to resize. Supports min/max width constraints."
            [codeExample]="resizableCode"
          >
            <hk-table [data]="users()" [config]="resizableConfig" (columnResize)="onColumnResize($event)" />
          </app-doc-section>
        }

        @if (activeTab() === 'virtualScroll') {
          <app-doc-section
            title="Virtual Scrolling"
            description="Efficiently render large datasets with CDK virtual scroll. Pagination is disabled."
            [codeExample]="virtualScrollCode"
          >
            <hk-table [data]="virtualScrollUsers()" [config]="virtualScrollConfig" />
          </app-doc-section>
        }

        @if (activeTab() === 'editable') {
          <app-doc-section
            title="Inline Cell Editing"
            description="Double-click a cell to edit. Supports text, number, select, and toggle editors."
            [codeExample]="editableCode"
          >
            <hk-table [data]="editableUsers()" [config]="editableConfig" (cellEdit)="onCellEdit($event)" />
          </app-doc-section>
        }

        @if (activeTab() === 'footer') {
          <app-doc-section
            title="Multi-Row Summary Footer"
            description="Display multiple footer rows with different aggregates per row (totals, averages, min/max)."
            [codeExample]="footerCode"
          >
            <hk-table [data]="users()" [config]="footerConfig" />
          </app-doc-section>

          <app-doc-section
            title="Colspan Footer Rows"
            description="Footer cells that span multiple columns. Use the cells array instead of columns to freely control layout."
            [codeExample]="colspanFooterCode"
          >
            <hk-table [data]="users()" [config]="colspanFooterConfig" />
          </app-doc-section>

          <app-doc-section
            title="Custom Footer Template (hkFooter)"
            description="Full layout freedom inside the footer using an Angular template. The component wraps your content in a full-width row automatically."
            [codeExample]="customFooterCode"
          >
            <hk-table [data]="users()" [config]="customFooterConfig">
              <ng-template hkFooter let-data let-columns="columns">
                <div class="flex items-center justify-between px-2 py-1">
                  <div class="flex items-center gap-2 text-sm text-base-content/70">
                    <svg [lucideIcon]="usersIcon" class="h-4 w-4"></svg>
                    <span>{{ data.length }} employees across {{ uniqueDepartments(data).length }} departments</span>
                  </div>
                  <div class="flex items-center gap-4">
                    <span class="badge badge-success badge-sm">Total: {{ salaryTotal() | currency: 'USD' : 'symbol' : '1.0-0' }}</span>
                    <span class="badge badge-info badge-sm">Avg: {{ salaryAvg() | currency: 'USD' : 'symbol' : '1.0-0' }}</span>
                  </div>
                </div>
              </ng-template>
            </hk-table>
          </app-doc-section>
        }

        @if (activeTab() === 'expandable') {
          <app-doc-section
            title="Expandable Row Detail"
            description="Click the chevron to expand a row and reveal additional detail content."
            [codeExample]="expandableCode"
          >
            <hk-table [data]="users()" [config]="expandableConfig" (detailExpansionChange)="onDetailExpand($event)">
              <ng-template #rowDetail let-row>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <h4 class="font-semibold mb-2">Contact Information</h4>
                    <p class="text-sm">Email: {{ row.email }}</p>
                    <p class="text-sm">Department: {{ row.department }}</p>
                  </div>
                  <div>
                    <h4 class="font-semibold mb-2">Employment Details</h4>
                    <p class="text-sm">Role: {{ row.role }}</p>
                    <p class="text-sm">Status: {{ row.status }}</p>
                    <p class="text-sm">Salary: {{ row.salary | number: '1.0-0' }}</p>
                  </div>
                </div>
              </ng-template>
            </hk-table>
          </app-doc-section>
        }

        @if (activeTab() === 'grouped') {
          <app-doc-section
            title="Row Grouping"
            description="Group rows by a field with caption aggregates in headers and column-aligned multi-row group footers."
            [codeExample]="groupedCode"
          >
            <hk-table [data]="users()" [config]="groupedConfig" (groupExpandChange)="onGroupExpand($event)" />
          </app-doc-section>
        }

        @if (activeTab() === 'reorderable') {
          <app-doc-section
            title="Reorderable Columns & Rows"
            description="Drag column headers to reorder columns. Drag row handles to reorder rows."
            [codeExample]="reorderableCode"
          >
            <hk-table
              [data]="reorderableUsers()"
              [config]="reorderableConfig"
              (columnReorder)="onColumnReorder($event)"
              (rowReorder)="onRowReorder($event)"
            />
          </app-doc-section>
        }

        @if (activeTab() === 'keyboard') {
          <app-doc-section
            title="Keyboard Navigation"
            description="Use arrow keys to navigate cells. Enter to edit or expand. Space to toggle selection. Escape to clear focus."
            [codeExample]="keyboardCode"
          >
            <hk-table
              [data]="editableUsers()"
              [config]="keyboardConfig"
              [paginationOptions]="keyboardPaginationOptions"
              (cellEdit)="onCellEdit($event)"
              (selectionChange)="onSelection($event)"
            />
          </app-doc-section>
        }

        @if (activeTab() === 'hierarchy') {
          <app-doc-section
            title="Hierarchy Grid"
            description="Expanding a parent row reveals a fully-featured nested child table with its own sorting and pagination. Multi-level nesting is supported."
            [codeExample]="hierarchyCode"
          >
            <hk-table [data]="employees()" [config]="hierarchyConfig" />
          </app-doc-section>
        }

        @if (activeTab() === 'masterDetail') {
          <app-doc-section
            title="Master-Detail Grid"
            description="Click a row in the master table to display its related detail data in a separate table below. The first row is auto-selected on load."
            [codeExample]="masterDetailCode"
          >
            <hk-table [data]="customers()" [config]="masterDetailConfig" />
          </app-doc-section>
        }

        @if (activeTab() === 'nestedMasterDetail') {
          <app-doc-section
            title="Nested Master-Detail"
            description="The detail table can itself be a master with its own detail below it, enabling multi-level drill-down. Click an employee to see their orders, then click an order to see its line items."
            [codeExample]="nestedMasterDetailCode"
          >
            <hk-table [data]="employees()" [config]="nestedMasterDetailConfig" />
          </app-doc-section>
        }
      </div>
      <div api class="space-y-6">
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'hk-table'" (click)="apiTab.set('hk-table')">hk-table</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'sub-components'" (click)="apiTab.set('sub-components')">
            Sub-Components
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'builder'" (click)="apiTab.set('builder')">Builder</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'filtering'" (click)="apiTab.set('filtering')">Filtering</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>

        <!-- hk-table sub-tab -->
        @if (apiTab() === 'hk-table') {
          <div class="space-y-6">
            <app-api-table title="hk-table Inputs" [entries]="tableInputDocs" />
            <app-api-table title="Outputs" [entries]="tableOutputDocs" />
            <app-api-table title="Public Methods" [entries]="tableMethodDocs" />
            <app-api-table title="Content Projection" [entries]="tableContentDocs" />
          </div>
        }

        <!-- Sub-Components sub-tab -->
        @if (apiTab() === 'sub-components') {
          <div class="space-y-6">
            <div>
              <h2 class="text-2xl font-bold mb-1">TablePaginationComponent</h2>
              <p class="text-base-content/70 text-sm mb-4">
                Selector: <code class="text-xs">hk-table-pagination</code> — Rendered automatically by
                <code class="text-xs">hk-table</code> when <code class="text-xs">paginationOptions</code> is provided. Can also be used
                standalone.
              </p>
            </div>
            <app-api-table title="TablePaginationComponent — Inputs" [entries]="paginationInputDocs" />
            <app-api-table title="TablePaginationComponent — Outputs" [entries]="paginationOutputDocs" />

            <div class="divider"></div>
            <div>
              <h2 class="text-2xl font-bold mb-1">TableFilterComponent</h2>
              <p class="text-base-content/70 text-sm mb-4">
                Selector: <code class="text-xs">hk-table-filter</code> — Rendered inside column header dropdowns by
                <code class="text-xs">hk-table</code> when filtering is enabled.
              </p>
            </div>
            <app-api-table title="TableFilterComponent — Inputs" [entries]="filterInputDocs" />
            <app-api-table title="TableFilterComponent — Outputs" [entries]="filterOutputDocs" />

            <div class="divider"></div>
            <div>
              <h2 class="text-2xl font-bold mb-1">TableGlobalSearchComponent</h2>
              <p class="text-base-content/70 text-sm mb-4">
                Selector: <code class="text-xs">hk-table-global-search</code> — Rendered above the table by
                <code class="text-xs">hk-table</code> when <code class="text-xs">globalSearch.enabled</code> is true.
              </p>
            </div>
            <app-api-table title="TableGlobalSearchComponent — Inputs" [entries]="globalSearchInputDocs" />
            <app-api-table title="TableGlobalSearchComponent — Outputs" [entries]="globalSearchOutputDocs" />

            <div class="divider"></div>
            <div>
              <h2 class="text-2xl font-bold mb-1">TableColumnVisibilityComponent</h2>
              <p class="text-base-content/70 text-sm mb-4">
                Selector: <code class="text-xs">hk-table-column-visibility</code> — Rendered in the toolbar by
                <code class="text-xs">hk-table</code> when <code class="text-xs">columnVisibility.enabled</code> is true.
              </p>
            </div>
            <app-api-table title="TableColumnVisibilityComponent — Inputs" [entries]="colVisInputDocs" />
            <app-api-table title="TableColumnVisibilityComponent — Outputs" [entries]="colVisOutputDocs" />
          </div>
        }

        <!-- Builder sub-tab -->
        @if (apiTab() === 'builder') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">createTable() Usage</h3>
                <p class="text-sm text-base-content/70">
                  The <code>createTable()</code> factory function converts a flat <code>FieldConfig&lt;T&gt;</code> into a resolved
                  <code>FieldConfiguration&lt;T&gt;</code> used by the table input.
                </p>
                <app-code-block [code]="builderCode" />
              </div>
            </div>

            <app-api-table title="FieldConfig Properties (Column Definition)" [entries]="builderFieldConfigDocs" />
            <app-api-table title="PaginationOptions" [entries]="builderPaginationDocs" />
          </div>
        }

        <!-- Filtering sub-tab -->
        @if (apiTab() === 'filtering') {
          <div class="space-y-6">
            <app-api-table title="FilterType Enum Values" [entries]="filterTypeEnumDocs" />
            <app-api-table title="FilterOperator Enum Values" [entries]="filterOperatorEnumDocs" />
            <app-api-table title="ColumnFilter Interface" [entries]="columnFilterInterfaceDocs" />
            <app-api-table title="GlobalSearchConfig Interface" [entries]="globalSearchConfigDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Filtering Setup Example</h3>
                <app-code-block [code]="filteringExampleCode" />
              </div>
            </div>
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">FieldConfig</h3>
                <app-code-block [code]="fieldConfigType" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ColumnDefinition</h3>
                <app-code-block [code]="columnDefinitionType" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">PaginationOptions</h3>
                <app-code-block [code]="paginationOptionsType" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">FilterConfig &amp; ColumnFilter</h3>
                <app-code-block [code]="filterTypes" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">GlobalSearchConfig</h3>
                <app-code-block [code]="globalSearchConfigType" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ColumnVisibilityConfig</h3>
                <app-code-block [code]="columnVisibilityConfigType" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">VirtualScrollConfig</h3>
                <app-code-block [code]="virtualScrollConfigType" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">GroupConfig</h3>
                <app-code-block [code]="groupConfigType" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">TreeTableConfig</h3>
                <app-code-block [code]="treeTableConfigType" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">ChildGridConfig</h3>
                <app-code-block [code]="childGridConfigType" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">MasterDetailConfig</h3>
                <app-code-block [code]="masterDetailConfigType" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">TableAction &amp; TableBulkAction</h3>
                <app-code-block [code]="actionTypes" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Event Types</h3>
                <app-code-block [code]="eventTypes" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Footer Types</h3>
                <app-code-block [code]="footerTypes" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">AggregateFunction</h3>
                <app-code-block [code]="aggregateFunctionType" />
              </div>
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class TableDemoComponent {
  readonly infoIcon = LucideInfo;
  readonly xIcon = LucideX;
  readonly mousePointerClickIcon = LucideMousePointerClick;
  readonly usersIcon = LucideUsers;
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'basic') as TableTab);
  apiTab = signal<ApiSubTab>('hk-table');

  // Sample data
  users = signal<User[]>([
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      status: 'active',
      department: 'Engineering',
      salary: 120000,
      joinDate: new Date('2022-01-15'),
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'editor',
      status: 'active',
      department: 'Marketing',
      salary: 95000,
      joinDate: new Date('2022-03-20'),
    },
    {
      id: 3,
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'viewer',
      status: 'inactive',
      department: 'Sales',
      salary: 75000,
      joinDate: new Date('2021-11-10'),
    },
    {
      id: 4,
      name: 'Alice Brown',
      email: 'alice@example.com',
      role: 'editor',
      status: 'active',
      department: 'Engineering',
      salary: 110000,
      joinDate: new Date('2023-02-01'),
    },
    {
      id: 5,
      name: 'Charlie Wilson',
      email: 'charlie@example.com',
      role: 'admin',
      status: 'pending',
      department: 'HR',
      salary: 130000,
      joinDate: new Date('2020-06-15'),
    },
    {
      id: 6,
      name: 'Diana Prince',
      email: 'diana@example.com',
      role: 'viewer',
      status: 'active',
      department: 'Finance',
      salary: 85000,
      joinDate: new Date('2023-05-20'),
    },
    {
      id: 7,
      name: 'Edward Stone',
      email: 'edward@example.com',
      role: 'editor',
      status: 'active',
      department: 'Engineering',
      salary: 105000,
      joinDate: new Date('2022-08-10'),
    },
    {
      id: 8,
      name: 'Fiona Green',
      email: 'fiona@example.com',
      role: 'viewer',
      status: 'inactive',
      department: 'Marketing',
      salary: 70000,
      joinDate: new Date('2021-04-05'),
    },
  ]);

  selectedUsers = signal<User[]>([]);
  activeUser = signal<User | null>(null);
  activeUsers = signal<readonly User[]>([]);
  activeUserNames = computed(() =>
    this.activeUsers()
      .map((u) => u.name)
      .join(', '),
  );

  basicConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'status'],
    headers: {
      id: 'ID',
      name: 'Full Name',
      email: 'Email Address',
      role: 'Role',
      status: 'Status',
    },
    formatters: {
      role: (value) => String(value).charAt(0).toUpperCase() + String(value).slice(1),
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
  });

  selectableRowConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'department', 'status'],
    headers: {
      id: 'ID',
      name: 'Full Name',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      status: 'Status',
    },
    selectableRows: true,
    formatters: {
      role: (value) => `<span class="capitalize">${value}</span>`,
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
    rowClass: (row) => ({
      'bg-error/10': row.status === 'inactive',
      'bg-warning/10': row.status === 'pending',
    }),
  });

  multiSelectableRowConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'department', 'status'],
    headers: {
      id: 'ID',
      name: 'Full Name',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      status: 'Status',
    },
    selectableRows: 'multi',
    selectedRowClass: 'bg-accent/20',
    formatters: {
      role: (value) => `<span class="capitalize">${value}</span>`,
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
  });

  private readonly commonActions = [
    {
      type: 'view' as const,
      label: 'View',
      icon: LucideEye.icon,
      action: (row: User) => this.toast.info(`Viewing ${row.name}`),
    },
    {
      type: 'edit' as const,
      label: 'Edit',
      icon: LucidePencil.icon,
      action: (row: User) => this.toast.info(`Editing ${row.name}`),
    },
    {
      type: 'delete' as const,
      label: 'Delete',
      icon: LucideTrash2.icon,
      action: (row: User) => this.toast.warning(`Delete ${row.name}?`),
    },
  ];

  actionsEndConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'status'],
    headers: { id: 'ID', name: 'Name', email: 'Email', role: 'Role', status: 'Status' },
    hasActions: true,
    actions: this.commonActions,
  });

  actionsStartConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'status'],
    headers: { id: 'ID', name: 'Name', email: 'Email', role: 'Role', status: 'Status' },
    hasActions: true,
    actionsPosition: 'start',
    actions: this.commonActions,
  });

  actionsStartStickyConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status', 'joinDate'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      salary: 'Salary',
      status: 'Status',
      joinDate: 'Join Date',
    },
    hasSelection: true,
    hasActions: true,
    actionsPosition: 'start',
    actions: this.commonActions,
  });

  actionsSplitConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'status'],
    headers: { id: 'ID', name: 'Name', email: 'Email', role: 'Role', status: 'Status' },
    hasActions: true,
    startActionsLabel: 'Quick',
    endActionsLabel: 'Manage',
    actions: [
      {
        type: 'view',
        label: 'View',
        icon: LucideEye.icon,
        position: 'start',
        action: (row) => this.toast.info(`Viewing ${row.name}`),
      },
      {
        type: 'edit',
        label: 'Edit',
        icon: LucidePencil.icon,
        action: (row) => this.toast.info(`Editing ${row.name}`),
      },
      {
        type: 'delete',
        label: 'Delete',
        icon: LucideTrash2.icon,
        action: (row) => this.toast.warning(`Delete ${row.name}?`),
      },
    ],
  });

  fullConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status', 'joinDate'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      salary: 'Salary',
      status: 'Status',
      joinDate: 'Join Date',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
      joinDate: (value) => new Date(value as Date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
      role: (value) => {
        return `<span class="capitalize">${value}</span>`;
      },
    },
    hasSelection: true,
    hasActions: true,
    actions: [
      {
        type: 'view',
        label: 'View',
        icon: LucideEye.icon,
        action: (row) => this.toast.info(`Viewing ${row.name}`),
      },
      {
        type: 'edit',
        label: 'Edit',
        icon: LucidePencil.icon,
        action: (row) => this.toast.info(`Editing ${row.name}`),
      },
      {
        type: 'delete',
        label: 'Delete',
        icon: LucideTrash2.icon,
        action: (row) => this.toast.warning(`Delete ${row.name}?`),
      },
    ],
    bulkActions: [
      {
        type: 'delete',
        label: 'Delete Selected',
        icon: LucideTrash2.icon,
        action: (rows) => this.toast.warning(`Delete ${rows.length} users?`),
      },
      {
        type: 'export',
        label: 'Export',
        icon: LucideDownload.icon,
        action: (rows, option) => this.toast.success(`Exporting ${rows.length} users as ${option?.label ?? 'file'}`),
      },
    ],
    filters: [
      {
        field: 'role',
        type: 'select',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Editor', value: 'editor' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
      {
        field: 'status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
          { label: 'Pending', value: 'pending' },
        ],
      },
      {
        field: 'department',
        type: 'select',
        options: [
          { label: 'Engineering', value: 'Engineering' },
          { label: 'Marketing', value: 'Marketing' },
          { label: 'Sales', value: 'Sales' },
          { label: 'HR', value: 'HR' },
          { label: 'Finance', value: 'Finance' },
        ],
      },
    ],
    globalSearch: {
      enabled: true,
      mode: 'fuzzy',
      placeholder: 'Search users...',
      debounceTime: 300,
    },
    columnVisibility: {
      enabled: true,
      alwaysVisible: ['name'],
      defaultVisible: ['id', 'name', 'email', 'role', 'status'],
    },
  });

  paginationOptions = {
    mode: 'offset' as const,
    pageSize: 5,
    pageSizeOptions: [5, 10, 25],
    totalItems: 8,
  };

  // --- Filtering Showcase Config (one filter of every FilterType) ---
  filteringConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status', 'joinDate'],
    headers: {
      id: 'ID',
      name: 'Name (text)',
      email: 'Email (text)',
      role: 'Role (multiselect)',
      department: 'Dept (select)',
      salary: 'Salary (numberRange)',
      status: 'Active (boolean)',
      joinDate: 'Joined (dateRange)',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
      joinDate: (value) => new Date(value as Date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
    enableFiltering: true,
    filters: [
      // number filter (with comparison operators)
      { field: 'id', type: 'number', placeholder: 'Filter by ID...' },
      // text filter (contains/startsWith/endsWith/equals/isEmpty...)
      { field: 'name', type: 'text', placeholder: 'Search name...' },
      // text filter with restricted operator set
      { field: 'email', type: 'text', operators: ['contains', 'startsWith', 'endsWith'], placeholder: 'Search email...' },
      // multiselect filter (in operator, checkbox list)
      {
        field: 'role',
        type: 'multiselect',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Editor', value: 'editor' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
      // single-value select
      {
        field: 'department',
        type: 'select',
        options: [
          { label: 'Engineering', value: 'Engineering' },
          { label: 'Marketing', value: 'Marketing' },
          { label: 'Sales', value: 'Sales' },
          { label: 'HR', value: 'HR' },
          { label: 'Finance', value: 'Finance' },
        ],
      },
      // numberRange filter (between operator, min/max inputs)
      { field: 'salary', type: 'numberRange' },
      // boolean-style filter (mapped via select → Yes/No)
      {
        field: 'status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
          { label: 'Pending', value: 'pending' },
        ],
      },
      // dateRange filter (between operator, two date inputs)
      { field: 'joinDate', type: 'dateRange' },
    ],
  });

  // --- Grid Filter Bar (top panel) ---
  // Controller returned by createTable() — we drive it directly, no viewChild required.
  filterGridConfig = createTable<User>({
    visible: ['name', 'department', 'joinDate', 'role', 'status'],
    headers: {
      name: 'Nombre',
      department: 'Oficina',
      joinDate: 'Inicio',
      role: 'Rol',
      status: 'Estatus',
    },
    formatters: {
      joinDate: (value) => new Date(value as Date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
    // enableFiltering: false hides the column-header filter icons while keeping
    // the filter configs registered so applyColumnFilter() still works.
    enableFiltering: false,
    filters: [
      { field: 'name', type: 'text' },
      {
        field: 'department',
        type: 'select',
        options: [
          { label: 'Engineering', value: 'Engineering' },
          { label: 'Marketing', value: 'Marketing' },
          { label: 'Sales', value: 'Sales' },
          { label: 'HR', value: 'HR' },
          { label: 'Finance', value: 'Finance' },
        ],
      },
      { field: 'joinDate', type: 'dateRange' },
    ],
  });

  filterGridForm = inject(FormBuilder).nonNullable.group({
    name: '',
    dept: '',
    dateFrom: '',
    dateTo: '',
  });

  // --- Sticky Columns Config ---
  stickyConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status', 'joinDate'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      salary: 'Salary',
      status: 'Status',
      joinDate: 'Join Date',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
      joinDate: (value) => new Date(value as Date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    },
    hasSelection: true,
    hasActions: true,
    actions: [
      { type: 'view', label: 'View', icon: LucideEye.icon, action: (row) => this.toast.info(`Viewing ${row.name}`) },
      { type: 'edit', label: 'Edit', icon: LucidePencil.icon, action: (row) => this.toast.info(`Editing ${row.name}`) },
    ],
    stickyColumns: {
      stickySelection: true,
      stickyActions: true,
    },
  });

  // --- Resizable Columns Config ---
  resizableConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
    },
    enableColumnResizing: true,
    resizeMode: 'expand',
  });

  // --- Virtual Scroll Config ---
  virtualScrollUsers = signal<User[]>(this.generateVirtualScrollData(1000));

  virtualScrollConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
    },
    virtualScroll: {
      enabled: true,
      itemHeight: 48,
      viewportHeight: '400px',
    },
  });

  // --- Editable Cells Config ---
  editableUsers = signal<User[]>([...this.users()]);

  editableConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
    enableInlineEditing: true,
    cellEditors: {
      name: { type: 'text' },
      email: { type: 'text' },
      salary: { type: 'number', validator: (v) => Number(v) > 0 || 'Salary must be positive' },
      role: {
        type: 'select',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Editor', value: 'editor' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
    },
  });

  // --- Footer Config (multi-row) ---
  footerConfig = createTable<User>({
    visible: ['id', 'name', 'department', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      department: 'Department',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: ['currency', 'USD'],
    },
    footerRows: [
      {
        columns: {
          salary: { fn: 'sum', label: 'Total' },
          id: { fn: 'count', label: 'Rows' },
        },
      },
      {
        columns: {
          salary: { fn: 'avg', label: 'Average' },
          id: { fn: 'max', label: 'Max ID' },
        },
      },
      {
        columns: {
          salary: { fn: 'median', label: 'Median' },
          department: { fn: 'distinctCount', label: 'Departments' },
        },
      },
    ],
  });

  // --- Colspan Footer Config ---
  colspanFooterConfig = createTable<User>({
    visible: ['id', 'name', 'department', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      department: 'Department',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: ['currency', 'USD'],
    },
    footerRows: [
      {
        cells: [
          { colspan: 3 },
          { colspan: 1, fn: 'sum', field: 'salary', label: 'Total', format: (v) => `$${v.toLocaleString()}` },
          { colspan: 1, fn: 'count', field: 'id', label: 'Rows' },
        ],
      },
      {
        cells: [
          { colspan: 3, label: 'Statistics', class: 'text-right font-bold' },
          { colspan: 1, fn: 'avg', field: 'salary', label: 'Avg', format: (v) => `$${Math.round(v).toLocaleString()}` },
          { colspan: 1, fn: 'distinctCount', field: 'department', label: 'Depts' },
        ],
      },
    ],
  });

  // --- Custom Footer Template Config (hkFooter) ---
  customFooterConfig = createTable<User>({
    visible: ['id', 'name', 'department', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      department: 'Department',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: ['currency', 'USD'],
    },
  });

  /** Get unique departments from data */
  uniqueDepartments(data: User[]): string[] {
    return [...new Set(data.map((u) => u.department))];
  }

  /** Compute salary total for custom footer template */
  salaryTotal = computed(() => this.users().reduce((sum, u) => sum + u.salary, 0));

  /** Compute salary average for custom footer template */
  salaryAvg = computed(() => {
    const data = this.users();
    return data.length ? Math.round(this.salaryTotal() / data.length) : 0;
  });

  // --- Expandable Config ---
  expandableConfig = createTable<User>({
    visible: ['id', 'name', 'role', 'department', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      role: 'Role',
      department: 'Department',
      status: 'Status',
    },
    formatters: {
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
    expandableDetail: true,
    expandMode: 'multi',
  });

  // --- Grouped Config ---
  groupedConfig = createTable<User>({
    visible: ['id', 'name', 'role', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      role: 'Role',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: ['currency', 'USD'],
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
    grouping: {
      groupBy: 'department',
      initiallyExpanded: true,
      groupHeaderLabel: (value, rows) => `${value} (${rows.length} employees)`,
      captionAggregates: {
        columns: {
          salary: { fn: 'min', label: 'Min' },
        },
      },
      groupFooterRows: [
        { columns: { salary: { fn: 'sum', label: 'Total' }, id: { fn: 'count', label: 'Count' } } },
        { columns: { salary: { fn: 'avg', label: 'Average' } } },
      ],
    },
  });

  // --- Reorderable Config ---
  reorderableUsers = signal<User[]>([...this.users()]);

  reorderableConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'department', 'salary'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      salary: 'Salary',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
    },
    enableColumnReorder: true,
    enableRowReorder: true,
    showDragHandle: true,
  });

  // --- Keyboard Navigation Config ---
  keyboardConfig = createTable<User>({
    visible: ['id', 'name', 'email', 'role', 'salary', 'status'],
    headers: {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      salary: 'Salary',
      status: 'Status',
    },
    formatters: {
      salary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
      status: (value) => {
        const colors: Record<string, string> = {
          active: 'badge-success',
          inactive: 'badge-error',
          pending: 'badge-warning',
        };
        return `<span class="badge badge-sm ${colors[String(value)] || ''}">${value}</span>`;
      },
    },
    hasSelection: true,
    enableKeyboardNavigation: true,
    enableInlineEditing: true,
    cellEditors: {
      name: { type: 'text' },
      email: { type: 'text' },
      salary: { type: 'number', validator: (v) => Number(v) > 0 || 'Salary must be positive' },
      role: {
        type: 'select',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Editor', value: 'editor' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
    },
  });

  keyboardPaginationOptions = {
    mode: 'offset' as const,
    pageSize: 8,
    pageSizeOptions: [5, 8, 10],
    totalItems: 8,
  };

  // --- Hierarchy Grid Config (3-level: Employee → Order → OrderItem) ---
  orderItemChildConfig = createTable<OrderItem>({
    visible: ['itemId', 'sku', 'description', 'qty', 'price'],
    headers: { itemId: 'Item ID', sku: 'SKU', description: 'Description', qty: 'Qty', price: 'Price' },
    formatters: { price: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)) },
  });

  orderChildConfig = createTable<Order>({
    visible: ['orderId', 'product', 'quantity', 'unitPrice', 'orderDate'],
    headers: { orderId: 'Order ID', product: 'Product', quantity: 'Qty', unitPrice: 'Price', orderDate: 'Date' },
    formatters: { unitPrice: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)) },
    childGrid: {
      config: this.orderItemChildConfig,
      childDataProperty: 'items',
      bordered: true,
    },
  });

  hierarchyConfig = createTable<Employee>({
    visible: ['id', 'name', 'title', 'hireDate'],
    headers: { id: 'ID', name: 'Name', title: 'Title', hireDate: 'Hire Date' },
    childGrid: {
      config: this.orderChildConfig,
      childDataProperty: 'orders',
      pagination: { mode: 'offset', pageSize: 5, pageSizeOptions: [3, 5, 10] },
      bordered: true,
    },
  });

  employees = signal<Employee[]>([
    {
      id: 1,
      name: 'Alice Martin',
      title: 'Senior Engineer',
      hireDate: '2020-03-15',
      orders: [
        {
          orderId: 101,
          product: 'Laptop Pro 16"',
          quantity: 1,
          unitPrice: 2499,
          orderDate: '2024-01-10',
          items: [{ itemId: 1, sku: 'LP16-SLV', description: 'Laptop Pro 16" Silver', qty: 1, price: 2499 }],
        },
        {
          orderId: 102,
          product: 'Mechanical Keyboard',
          quantity: 2,
          unitPrice: 159,
          orderDate: '2024-02-05',
          items: [
            { itemId: 1, sku: 'KB-RED', description: 'Cherry MX Red Switch', qty: 1, price: 159 },
            { itemId: 2, sku: 'KB-BLU', description: 'Cherry MX Blue Switch', qty: 1, price: 159 },
          ],
        },
        {
          orderId: 103,
          product: 'USB-C Hub',
          quantity: 1,
          unitPrice: 79,
          orderDate: '2024-03-12',
          items: [{ itemId: 1, sku: 'HUB-7P', description: 'USB-C Hub 7-Port', qty: 1, price: 79 }],
        },
        {
          orderId: 104,
          product: '4K Monitor',
          quantity: 1,
          unitPrice: 599,
          orderDate: '2024-04-20',
          items: [{ itemId: 1, sku: 'MON-27', description: '27" 4K IPS Monitor', qty: 1, price: 599 }],
        },
        {
          orderId: 105,
          product: 'Webcam HD',
          quantity: 1,
          unitPrice: 129,
          orderDate: '2024-05-15',
          items: [{ itemId: 1, sku: 'WC-1080', description: '1080p Webcam', qty: 1, price: 129 }],
        },
        {
          orderId: 106,
          product: 'Desk Lamp',
          quantity: 1,
          unitPrice: 45,
          orderDate: '2024-06-01',
          items: [{ itemId: 1, sku: 'LAMP-LED', description: 'LED Desk Lamp', qty: 1, price: 45 }],
        },
      ],
    },
    {
      id: 2,
      name: 'Bob Chen',
      title: 'Product Manager',
      hireDate: '2019-07-01',
      orders: [
        {
          orderId: 201,
          product: 'Whiteboard Markers',
          quantity: 12,
          unitPrice: 3,
          orderDate: '2024-01-20',
          items: [
            { itemId: 1, sku: 'WBM-BLK', description: 'Black Marker', qty: 4, price: 3 },
            { itemId: 2, sku: 'WBM-RED', description: 'Red Marker', qty: 4, price: 3 },
            { itemId: 3, sku: 'WBM-BLU', description: 'Blue Marker', qty: 4, price: 3 },
          ],
        },
        {
          orderId: 202,
          product: 'Notebook Set',
          quantity: 5,
          unitPrice: 12,
          orderDate: '2024-02-18',
          items: [
            { itemId: 1, sku: 'NB-A4', description: 'A4 Lined Notebook', qty: 3, price: 12 },
            { itemId: 2, sku: 'NB-A5', description: 'A5 Grid Notebook', qty: 2, price: 12 },
          ],
        },
        {
          orderId: 203,
          product: 'Standing Desk',
          quantity: 1,
          unitPrice: 899,
          orderDate: '2024-03-05',
          items: [{ itemId: 1, sku: 'DSK-EL', description: 'Electric Standing Desk 60"', qty: 1, price: 899 }],
        },
        {
          orderId: 204,
          product: 'Ergonomic Chair',
          quantity: 1,
          unitPrice: 749,
          orderDate: '2024-04-10',
          items: [{ itemId: 1, sku: 'CHR-ERG', description: 'Ergonomic Mesh Chair', qty: 1, price: 749 }],
        },
        {
          orderId: 205,
          product: 'Presentation Remote',
          quantity: 1,
          unitPrice: 49,
          orderDate: '2024-05-22',
          items: [{ itemId: 1, sku: 'RMT-LS', description: 'Laser Presentation Remote', qty: 1, price: 49 }],
        },
      ],
    },
    {
      id: 3,
      name: 'Carol Davis',
      title: 'UX Designer',
      hireDate: '2021-11-10',
      orders: [
        {
          orderId: 301,
          product: 'Drawing Tablet',
          quantity: 1,
          unitPrice: 349,
          orderDate: '2024-01-15',
          items: [{ itemId: 1, sku: 'TAB-MED', description: 'Drawing Tablet Medium', qty: 1, price: 349 }],
        },
        {
          orderId: 302,
          product: 'Color Calibrator',
          quantity: 1,
          unitPrice: 199,
          orderDate: '2024-02-28',
          items: [{ itemId: 1, sku: 'CAL-PRO', description: 'Display Calibrator Pro', qty: 1, price: 199 }],
        },
        {
          orderId: 303,
          product: 'Design Book Bundle',
          quantity: 3,
          unitPrice: 45,
          orderDate: '2024-03-20',
          items: [
            { itemId: 1, sku: 'BK-UX', description: 'UX Design Handbook', qty: 1, price: 45 },
            { itemId: 2, sku: 'BK-TYP', description: 'Typography Essentials', qty: 1, price: 45 },
            { itemId: 3, sku: 'BK-CLR', description: 'Color Theory Guide', qty: 1, price: 45 },
          ],
        },
        {
          orderId: 304,
          product: 'Stylus Pen Set',
          quantity: 2,
          unitPrice: 29,
          orderDate: '2024-04-05',
          items: [
            { itemId: 1, sku: 'PEN-FN', description: 'Fine Tip Stylus', qty: 1, price: 29 },
            { itemId: 2, sku: 'PEN-BRD', description: 'Broad Tip Stylus', qty: 1, price: 29 },
          ],
        },
        {
          orderId: 305,
          product: 'Monitor Arm',
          quantity: 1,
          unitPrice: 119,
          orderDate: '2024-05-10',
          items: [{ itemId: 1, sku: 'ARM-DL', description: 'Dual Monitor Arm', qty: 1, price: 119 }],
        },
        {
          orderId: 306,
          product: 'Headphones Pro',
          quantity: 1,
          unitPrice: 299,
          orderDate: '2024-06-15',
          items: [{ itemId: 1, sku: 'HP-ANC', description: 'ANC Headphones', qty: 1, price: 299 }],
        },
        {
          orderId: 307,
          product: 'Mouse Pad XL',
          quantity: 1,
          unitPrice: 25,
          orderDate: '2024-07-01',
          items: [{ itemId: 1, sku: 'MP-XL', description: 'Extended Mouse Pad', qty: 1, price: 25 }],
        },
      ],
    },
    {
      id: 4,
      name: 'David Kim',
      title: 'DevOps Lead',
      hireDate: '2018-05-20',
      orders: [
        {
          orderId: 401,
          product: 'Server Rack Mount',
          quantity: 2,
          unitPrice: 189,
          orderDate: '2024-01-08',
          items: [
            { itemId: 1, sku: 'RCK-2U', description: '2U Rack Mount', qty: 1, price: 189 },
            { itemId: 2, sku: 'RCK-4U', description: '4U Rack Mount', qty: 1, price: 189 },
          ],
        },
        {
          orderId: 402,
          product: 'Network Switch',
          quantity: 1,
          unitPrice: 459,
          orderDate: '2024-02-14',
          items: [{ itemId: 1, sku: 'SW-48', description: '48-Port Managed Switch', qty: 1, price: 459 }],
        },
        {
          orderId: 403,
          product: 'SSD 2TB',
          quantity: 4,
          unitPrice: 149,
          orderDate: '2024-03-25',
          items: [{ itemId: 1, sku: 'SSD-NVM', description: 'NVMe SSD 2TB', qty: 4, price: 149 }],
        },
        {
          orderId: 404,
          product: 'KVM Switch',
          quantity: 1,
          unitPrice: 89,
          orderDate: '2024-04-18',
          items: [{ itemId: 1, sku: 'KVM-4P', description: '4-Port KVM Switch', qty: 1, price: 89 }],
        },
        {
          orderId: 405,
          product: 'Cable Management Kit',
          quantity: 3,
          unitPrice: 35,
          orderDate: '2024-05-30',
          items: [
            { itemId: 1, sku: 'CBL-VLC', description: 'Velcro Cable Ties', qty: 2, price: 15 },
            { itemId: 2, sku: 'CBL-TRY', description: 'Cable Tray', qty: 1, price: 35 },
          ],
        },
      ],
    },
    {
      id: 5,
      name: 'Eva Lopez',
      title: 'QA Engineer',
      hireDate: '2022-01-05',
      orders: [
        {
          orderId: 501,
          product: 'Testing Device Pack',
          quantity: 1,
          unitPrice: 799,
          orderDate: '2024-02-01',
          items: [
            { itemId: 1, sku: 'DEV-AND', description: 'Android Test Device', qty: 1, price: 399 },
            { itemId: 2, sku: 'DEV-IOS', description: 'iOS Test Device', qty: 1, price: 400 },
          ],
        },
        {
          orderId: 502,
          product: 'Dual Monitor Stand',
          quantity: 1,
          unitPrice: 139,
          orderDate: '2024-03-15',
          items: [{ itemId: 1, sku: 'STD-DL', description: 'Dual Monitor Stand', qty: 1, price: 139 }],
        },
        {
          orderId: 503,
          product: 'USB Hub 7-Port',
          quantity: 2,
          unitPrice: 45,
          orderDate: '2024-04-22',
          items: [{ itemId: 1, sku: 'HUB-7U', description: 'USB 3.0 Hub 7-Port', qty: 2, price: 45 }],
        },
        {
          orderId: 504,
          product: 'Noise-Cancelling Earbuds',
          quantity: 1,
          unitPrice: 179,
          orderDate: '2024-05-08',
          items: [{ itemId: 1, sku: 'EB-ANC', description: 'ANC Wireless Earbuds', qty: 1, price: 179 }],
        },
        {
          orderId: 505,
          product: 'Laptop Stand',
          quantity: 1,
          unitPrice: 59,
          orderDate: '2024-06-20',
          items: [{ itemId: 1, sku: 'STD-AL', description: 'Aluminum Laptop Stand', qty: 1, price: 59 }],
        },
        {
          orderId: 506,
          product: 'Portable Charger',
          quantity: 2,
          unitPrice: 39,
          orderDate: '2024-07-10',
          items: [
            { itemId: 1, sku: 'CHG-10K', description: '10000mAh Charger', qty: 1, price: 29 },
            { itemId: 2, sku: 'CHG-20K', description: '20000mAh Charger', qty: 1, price: 49 },
          ],
        },
        {
          orderId: 507,
          product: 'Screen Protector',
          quantity: 3,
          unitPrice: 15,
          orderDate: '2024-08-01',
          items: [
            { itemId: 1, sku: 'SP-13', description: '13" Screen Protector', qty: 2, price: 15 },
            { itemId: 2, sku: 'SP-16', description: '16" Screen Protector', qty: 1, price: 15 },
          ],
        },
        {
          orderId: 508,
          product: 'Cleaning Kit',
          quantity: 1,
          unitPrice: 22,
          orderDate: '2024-09-05',
          items: [{ itemId: 1, sku: 'CLN-KIT', description: 'Electronics Cleaning Kit', qty: 1, price: 22 }],
        },
      ],
    },
  ]);

  // --- Nested Master-Detail Grid Config (3-level: Employee → Order → OrderItem) ---
  nestedMasterDetailItemConfig = createTable<OrderItem>({
    visible: ['itemId', 'sku', 'description', 'qty', 'price'],
    headers: { itemId: 'Item ID', sku: 'SKU', description: 'Description', qty: 'Qty', price: 'Price' },
    formatters: { price: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)) },
  });

  nestedMasterDetailOrderConfig = createTable<Order>({
    visible: ['orderId', 'product', 'quantity', 'unitPrice', 'orderDate'],
    headers: { orderId: 'Order ID', product: 'Product', quantity: 'Qty', unitPrice: 'Price', orderDate: 'Date' },
    formatters: { unitPrice: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)) },
    masterDetail: {
      config: this.nestedMasterDetailItemConfig,
      detailDataProperty: 'items',
      headerText: (row) => `Line items for Order #${row.orderId} — ${row.product}`,
    },
  });

  nestedMasterDetailConfig = createTable<Employee>({
    visible: ['id', 'name', 'title', 'hireDate'],
    headers: { id: 'ID', name: 'Name', title: 'Title', hireDate: 'Hire Date' },
    masterDetail: {
      config: this.nestedMasterDetailOrderConfig,
      detailDataProperty: 'orders',
      headerText: (row) => `Orders for ${row.name} — ${row.title}`,
      pagination: { mode: 'offset', pageSize: 5, pageSizeOptions: [3, 5, 10] },
    },
  });

  // --- Master-Detail Grid Config ---
  masterDetailOrderConfig = createTable<CustomerOrder>({
    visible: ['orderId', 'freight', 'shipName', 'shipCountry', 'shipAddress', 'orderDate'],
    headers: {
      orderId: 'Order ID',
      freight: 'Freight',
      shipName: 'Ship Name',
      shipCountry: 'Ship Country',
      shipAddress: 'Ship Address',
      orderDate: 'Order Date',
    },
    formatters: {
      freight: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
    },
  });

  masterDetailConfig = createTable<Customer>({
    visible: ['customerId', 'customerName', 'companyName', 'contactTitle', 'country'],
    headers: { customerId: 'ID', customerName: 'Customer Name', companyName: 'Company', contactTitle: 'Title', country: 'Country' },
    masterDetail: {
      config: this.masterDetailOrderConfig,
      detailDataProperty: 'orders',
      headerText: (row) => `Orders for ${row.customerName} — ${row.companyName}`,
      pagination: { mode: 'offset', pageSize: 5, pageSizeOptions: [3, 5, 10] },
    },
  });

  customers = signal<Customer[]>([
    {
      customerId: 1,
      customerName: 'Maria Anders',
      companyName: 'Alfreds Futterkiste',
      contactTitle: 'Sales Rep',
      country: 'Germany',
      orders: [
        {
          orderId: 10643,
          freight: 29.46,
          shipName: 'Alfreds Futterkiste',
          shipCountry: 'Germany',
          shipAddress: 'Obere Str. 57',
          orderDate: '2024-01-15',
        },
        {
          orderId: 10692,
          freight: 61.02,
          shipName: 'Alfreds Futterkiste',
          shipCountry: 'Germany',
          shipAddress: 'Obere Str. 57',
          orderDate: '2024-02-20',
        },
        {
          orderId: 10702,
          freight: 23.94,
          shipName: 'Alfreds Futterkiste',
          shipCountry: 'Germany',
          shipAddress: 'Obere Str. 57',
          orderDate: '2024-03-10',
        },
        {
          orderId: 10835,
          freight: 69.53,
          shipName: 'Alfreds Futterkiste',
          shipCountry: 'Germany',
          shipAddress: 'Obere Str. 57',
          orderDate: '2024-04-05',
        },
        {
          orderId: 10952,
          freight: 40.42,
          shipName: 'Alfreds Futterkiste',
          shipCountry: 'Germany',
          shipAddress: 'Obere Str. 57',
          orderDate: '2024-05-18',
        },
        {
          orderId: 11011,
          freight: 1.21,
          shipName: 'Alfreds Futterkiste',
          shipCountry: 'Germany',
          shipAddress: 'Obere Str. 57',
          orderDate: '2024-06-22',
        },
      ],
    },
    {
      customerId: 2,
      customerName: 'Ana Trujillo',
      companyName: 'Emparedados y helados',
      contactTitle: 'Owner',
      country: 'Mexico',
      orders: [
        {
          orderId: 10308,
          freight: 1.61,
          shipName: 'Ana Trujillo',
          shipCountry: 'Mexico',
          shipAddress: 'Avda. de la Constitución 2222',
          orderDate: '2024-01-22',
        },
        {
          orderId: 10625,
          freight: 43.9,
          shipName: 'Ana Trujillo',
          shipCountry: 'Mexico',
          shipAddress: 'Avda. de la Constitución 2222',
          orderDate: '2024-03-01',
        },
        {
          orderId: 10759,
          freight: 11.99,
          shipName: 'Ana Trujillo',
          shipCountry: 'Mexico',
          shipAddress: 'Avda. de la Constitución 2222',
          orderDate: '2024-04-15',
        },
        {
          orderId: 10926,
          freight: 39.92,
          shipName: 'Ana Trujillo',
          shipCountry: 'Mexico',
          shipAddress: 'Avda. de la Constitución 2222',
          orderDate: '2024-05-20',
        },
      ],
    },
    {
      customerId: 3,
      customerName: 'Antonio Moreno',
      companyName: 'Antonio Moreno Taquería',
      contactTitle: 'Owner',
      country: 'Mexico',
      orders: [
        {
          orderId: 10365,
          freight: 22.0,
          shipName: 'Antonio Moreno',
          shipCountry: 'Mexico',
          shipAddress: 'Mataderos 2312',
          orderDate: '2024-02-10',
        },
        {
          orderId: 10507,
          freight: 47.45,
          shipName: 'Antonio Moreno',
          shipCountry: 'Mexico',
          shipAddress: 'Mataderos 2312',
          orderDate: '2024-03-25',
        },
        {
          orderId: 10535,
          freight: 15.64,
          shipName: 'Antonio Moreno',
          shipCountry: 'Mexico',
          shipAddress: 'Mataderos 2312',
          orderDate: '2024-05-05',
        },
        {
          orderId: 10573,
          freight: 84.84,
          shipName: 'Antonio Moreno',
          shipCountry: 'Mexico',
          shipAddress: 'Mataderos 2312',
          orderDate: '2024-06-10',
        },
        {
          orderId: 10677,
          freight: 4.03,
          shipName: 'Antonio Moreno',
          shipCountry: 'Mexico',
          shipAddress: 'Mataderos 2312',
          orderDate: '2024-07-18',
        },
      ],
    },
    {
      customerId: 4,
      customerName: 'Thomas Hardy',
      companyName: 'Around the Horn',
      contactTitle: 'Sales Rep',
      country: 'UK',
      orders: [
        {
          orderId: 10355,
          freight: 41.95,
          shipName: 'Around the Horn',
          shipCountry: 'UK',
          shipAddress: '120 Hanover Sq.',
          orderDate: '2024-01-08',
        },
        {
          orderId: 10383,
          freight: 34.24,
          shipName: 'Around the Horn',
          shipCountry: 'UK',
          shipAddress: '120 Hanover Sq.',
          orderDate: '2024-02-28',
        },
        {
          orderId: 10453,
          freight: 25.36,
          shipName: 'Around the Horn',
          shipCountry: 'UK',
          shipAddress: '120 Hanover Sq.',
          orderDate: '2024-04-12',
        },
      ],
    },
    {
      customerId: 5,
      customerName: 'Christina Berglund',
      companyName: 'Berglunds snabbköp',
      contactTitle: 'Order Admin',
      country: 'Sweden',
      orders: [
        {
          orderId: 10278,
          freight: 92.69,
          shipName: 'Berglunds snabbköp',
          shipCountry: 'Sweden',
          shipAddress: 'Berguvsvägen 8',
          orderDate: '2024-01-30',
        },
        {
          orderId: 10280,
          freight: 8.98,
          shipName: 'Berglunds snabbköp',
          shipCountry: 'Sweden',
          shipAddress: 'Berguvsvägen 8',
          orderDate: '2024-03-05',
        },
        {
          orderId: 10384,
          freight: 168.64,
          shipName: 'Berglunds snabbköp',
          shipCountry: 'Sweden',
          shipAddress: 'Berguvsvägen 8',
          orderDate: '2024-04-22',
        },
        {
          orderId: 10444,
          freight: 3.5,
          shipName: 'Berglunds snabbköp',
          shipCountry: 'Sweden',
          shipAddress: 'Berguvsvägen 8',
          orderDate: '2024-05-15',
        },
        {
          orderId: 10524,
          freight: 244.79,
          shipName: 'Berglunds snabbköp',
          shipCountry: 'Sweden',
          shipAddress: 'Berguvsvägen 8',
          orderDate: '2024-06-28',
        },
        {
          orderId: 10572,
          freight: 116.43,
          shipName: 'Berglunds snabbköp',
          shipCountry: 'Sweden',
          shipAddress: 'Berguvsvägen 8',
          orderDate: '2024-07-20',
        },
        {
          orderId: 10626,
          freight: 138.69,
          shipName: 'Berglunds snabbköp',
          shipCountry: 'Sweden',
          shipAddress: 'Berguvsvägen 8',
          orderDate: '2024-08-10',
        },
      ],
    },
  ]);

  private generateVirtualScrollData(count: number): User[] {
    const roles: ('admin' | 'editor' | 'viewer')[] = ['admin', 'editor', 'viewer'];
    const statuses: ('active' | 'inactive' | 'pending')[] = ['active', 'inactive', 'pending'];
    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Helen'];
    const lastNames = ['Doe', 'Smith', 'Johnson', 'Brown', 'Wilson', 'Prince', 'Stone', 'Green', 'Taylor', 'White'];

    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      email: `user${i + 1}@example.com`,
      role: roles[i % roles.length],
      status: statuses[i % statuses.length],
      department: departments[i % departments.length],
      salary: 60000 + Math.floor(Math.random() * 80000),
      joinDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
    }));
  }

  onSelection(users: readonly User[]) {
    this.selectedUsers.set([...users]);
  }

  onActiveRowChange(user: User | null) {
    this.activeUser.set(user);
  }

  onActiveRowsChange(users: readonly User[]) {
    this.activeUsers.set(users);
  }

  onSort(event: unknown) {
    console.log('Sort:', event);
  }

  onFilter(event: unknown) {
    console.log('Filter:', event);
  }

  // --- Grid Filter Bar: one subscription pushes form values into the table controller ---
  private _wireFilterGrid = this.filterGridForm.valueChanges
    .pipe(debounceTime(200), takeUntilDestroyed())
    .subscribe(({ name, dept, dateFrom, dateTo }) => {
      // Scalar values: applyColumnFilter treats '' / null as "remove filter" automatically.
      this.filterGridConfig.applyColumnFilter('name', name ?? '', 'contains');
      this.filterGridConfig.applyColumnFilter('department', dept ?? '', 'equals');

      // Range values need an explicit remove when both bounds are empty.
      if (dateFrom || dateTo) {
        this.filterGridConfig.applyColumnFilter('joinDate', [dateFrom, dateTo], 'between');
      } else {
        this.filterGridConfig.removeFilter('joinDate');
      }
    });

  clearFilterGrid(): void {
    this.filterGridForm.reset();
    this.filterGridConfig.clearAllFilters();
  }

  onSearch(event: unknown) {
    console.log('Search:', event);
  }

  onPageChange(event: unknown) {
    console.log('Page:', event);
  }

  onColumnResize(event: unknown) {
    console.log('Column resized:', event);
  }

  onCellEdit(event: CellEditEvent<User>) {
    console.log('Cell edit:', event);
    // Apply the edit to the data
    this.editableUsers.update((users) =>
      users.map((u) => {
        if (u === event.row) {
          return { ...u, [event.field]: event.newValue };
        }
        return u;
      }),
    );
    this.toast.success(`Updated ${event.field} for ${event.row.name}`);
  }

  onDetailExpand(event: { row: User; expanded: boolean }) {
    console.log('Detail expand:', event);
  }

  onGroupExpand(event: { groupValue: unknown; expanded: boolean }) {
    console.log('Group expand:', event);
  }

  onColumnReorder(event: ColumnReorderEvent) {
    console.log('Column reorder:', event);
    this.toast.info(`Column moved from position ${event.previousIndex + 1} to ${event.currentIndex + 1}`);
  }

  onRowReorder(event: RowReorderEvent<User>) {
    console.log('Row reorder:', event);
    // Apply the reorder to the data
    this.reorderableUsers.update((users) => {
      const arr = [...users];
      const [moved] = arr.splice(event.previousIndex, 1);
      arr.splice(event.currentIndex, 0, moved);
      return arr;
    });
    this.toast.info(`Row moved from position ${event.previousIndex + 1} to ${event.currentIndex + 1}`);
  }

  // --- Code examples ---
  basicCode = `// TypeScript
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'status'],
  headers: { id: 'ID', name: 'Full Name' },
  formatters: {
    status: (v) => \`<span class="badge">\${v}</span>\`,
  },
});

// Template
<hk-table [data]="users()" [config]="config" />`;

  selectableRowCode = `// TypeScript
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'status'],
  selectableRows: true,              // click-to-highlight
  // selectedRowClass: 'bg-accent/20', // custom highlight (default: 'bg-primary/10')
  rowClass: (row) => ({              // conditional per-row styling
    'bg-error/10': row.status === 'inactive',
    'bg-warning/10': row.status === 'pending',
  }),
});

// Template
<hk-table
  [data]="users()"
  [config]="config"
  (activeRowChange)="onActiveRowChange($event)" />

// Handler
onActiveRowChange(user: User | null) {
  console.log('Active row:', user);
}`;

  multiSelectableRowCode = `// TypeScript
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'status'],
  selectableRows: 'multi',            // click to toggle multiple rows
  selectedRowClass: 'bg-accent/20',   // custom highlight color
});

// Template
<hk-table
  [data]="users()"
  [config]="config"
  (activeRowsChange)="onActiveRowsChange($event)" />

// Handler
onActiveRowsChange(users: readonly User[]) {
  console.log('Selected rows:', users);
}`;

  actionsPositionEndCode = `// Default: actions render as the last column
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'status'],
  hasActions: true,
  actions: [
    { type: 'view', label: 'View', icon: LucideEye.icon, action: (row) => {} },
    { type: 'edit', label: 'Edit', icon: LucidePencil.icon, action: (row) => {} },
    { type: 'delete', label: 'Delete', icon: LucideTrash2.icon, action: (row) => {} },
  ],
});`;

  actionsPositionStartCode = `// Render actions as the first data column
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'status'],
  hasActions: true,
  actionsPosition: 'start',           // 'start' | 'end' (default: 'end')
  actions: [
    { type: 'view', label: 'View', icon: LucideEye.icon, action: (row) => {} },
    { type: 'edit', label: 'Edit', icon: LucidePencil.icon, action: (row) => {} },
    { type: 'delete', label: 'Delete', icon: LucideTrash2.icon, action: (row) => {} },
  ],
});`;

  actionsPositionStickyCode = `// Actions at start combine with selection and auto-stick
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status', 'joinDate'],
  hasSelection: true,
  hasActions: true,
  actionsPosition: 'start',           // actions become the leftmost data column
  actions: [
    { type: 'view', label: 'View', icon: LucideEye.icon, action: (row) => {} },
    { type: 'edit', label: 'Edit', icon: LucidePencil.icon, action: (row) => {} },
  ],
  // stickyColumns.stickyActions defaults to true → sticks to the left when position is 'start'
});`;

  actionsPositionSplitCode = `// Per-action placement — each action has its own position
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'status'],
  hasActions: true,
  // Custom column header labels. Falls back to actionsLabel, then 'Actions'.
  startActionsLabel: 'Quick',
  endActionsLabel: 'Manage',
  actions: [
    // position: 'start' renders this action in a column before the data columns
    { type: 'view', label: 'View', icon: LucideEye.icon, position: 'start', action: (row) => {} },
    // omitting position falls back to actionsPosition (default 'end')
    { type: 'edit', label: 'Edit', icon: LucidePencil.icon, action: (row) => {} },
    { type: 'delete', label: 'Delete', icon: LucideTrash2.icon, action: (row) => {} },
  ],
});`;

  fullCode = `// TypeScript
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'salary', 'status'],
  hasSelection: true,
  hasActions: true,
  actions: [
    { type: 'view', label: 'View', icon: LucideEye.icon, action: (row) => {} },
  ],
  bulkActions: [
    { type: 'delete', label: 'Delete', icon: LucideTrash2.icon, action: (rows) => {} },
  ],
  filters: [
    { field: 'role', type: 'select', options: [...] },
  ],
  globalSearch: { enabled: true, mode: 'fuzzy' },
  columnVisibility: { enabled: true },
});

// Template
<hk-table
  [data]="users()"
  [config]="config"
  [paginationOptions]="{ mode: 'offset', pageSize: 10 }"
  (selectionChange)="onSelection($event)"
  (sortChange)="onSort($event)"
/>`;

  filteringCode = `// TypeScript — showcase all FilterType values
const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status', 'joinDate'],
  enableFiltering: true,
  filters: [
    // number — equals, notEquals, gt, lt, gte, lte, isEmpty, isNotEmpty
    { field: 'id', type: 'number' },

    // text — contains, equals, startsWith, endsWith, isEmpty, isNotEmpty
    { field: 'name', type: 'text', placeholder: 'Search name...' },

    // text with a restricted operator list
    {
      field: 'email',
      type: 'text',
      operators: ['contains', 'startsWith', 'endsWith'],
    },

    // multiselect — uses 'in' operator (checkbox list)
    {
      field: 'role',
      type: 'multiselect',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Viewer', value: 'viewer' },
      ],
    },

    // select — single-value dropdown (equals)
    {
      field: 'department',
      type: 'select',
      options: [
        { label: 'Engineering', value: 'Engineering' },
        { label: 'Sales', value: 'Sales' },
      ],
    },

    // numberRange — min/max inputs (between)
    { field: 'salary', type: 'numberRange' },

    // boolean — Yes/No dropdown (equals)
    { field: 'isActive', type: 'boolean' },

    // dateRange — from/to date pickers (between)
    { field: 'joinDate', type: 'dateRange' },
  ],
});

// Template
<hk-table
  [data]="users()"
  [config]="config"
  (filterChange)="onFilter($event)"
/>

// Handler
onFilter(event: FilterChange<User>) {
  console.log('changed field:', event.field);
  console.log('all active filters:', event.filters);
}`;

  filterGridCode = `// Controller returned by createTable() — drive the table imperatively
// with no viewChild and no template refs.
import { createTable, TableController } from '@hakistack/ng-daisyui';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs/operators';

@Component({
  imports: [ReactiveFormsModule, TableComponent],
  template: \`
    <form [formGroup]="form">
      <input formControlName="name" placeholder="Buscar" />
      <select formControlName="dept">
        <option value="">Oficina</option>
        <option value="Engineering">Engineering</option>
      </select>
      <input type="date" formControlName="dateFrom" />
      <input type="date" formControlName="dateTo" />
      <button type="button" (click)="clear()">Limpiar</button>
    </form>

    <hk-table [data]="users()" [config]="table" />
  \`,
})
class GridFilterBar {
  // createTable() returns a TableController<T> — same object is the [config] binding
  // AND the imperative handle.
  table: TableController<User> = createTable<User>({
    visible: ['name', 'department', 'joinDate'],
    enableFiltering: false,   // hide column-header filter icons
    filters: [                 // still registered so applyColumnFilter() works
      { field: 'name', type: 'text' },
      { field: 'department', type: 'select', options: [/* ... */] },
      { field: 'joinDate', type: 'dateRange' },
    ],
  });

  form = inject(FormBuilder).nonNullable.group({
    name: '', dept: '', dateFrom: '', dateTo: '',
  });

  constructor() {
    this.form.valueChanges
      .pipe(debounceTime(200), takeUntilDestroyed())
      .subscribe(({ name, dept, dateFrom, dateTo }) => {
        // Empty scalar values are treated as "remove filter" by applyColumnFilter.
        this.table.applyColumnFilter('name', name, 'contains');
        this.table.applyColumnFilter('department', dept, 'equals');

        // Range values need an explicit remove when both bounds are empty.
        if (dateFrom || dateTo) {
          this.table.applyColumnFilter('joinDate', [dateFrom, dateTo], 'between');
        } else {
          this.table.removeFilter('joinDate');
        }
      });
  }

  clear() {
    this.form.reset();
    this.table.clearAllFilters();
  }
}`;

  builderCode = `import { createTable } from '@hakistack/ng-daisyui';

const config = createTable<User>({
  visible: ['id', 'name', 'email', 'status'],
  headers: { id: 'ID', name: 'Full Name' },
  formatters: {
    status: (value) => \`<span class="badge">\${value}</span>\`,
  },
  hasSelection: true,
  hasActions: true,
  actions: [
    { type: 'edit', label: 'Edit', icon: LucidePencil.icon, action: (row) => {} },
  ],
  bulkActions: [
    { type: 'delete', label: 'Delete', icon: LucideTrash2.icon, action: (rows) => {} },
  ],
  filters: [
    { field: 'status', type: 'select', options: [{ label: 'Active', value: 'active' }] },
  ],
  globalSearch: { enabled: true, mode: 'fuzzy', debounceTime: 300 },
  columnVisibility: { enabled: true, alwaysVisible: ['name'] },
});`;

  stickyCode = `const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary', 'status', 'joinDate'],
  hasSelection: true,
  hasActions: true,
  actions: [...],
  stickyColumns: {
    stickySelection: true,  // auto-pin checkbox column
    stickyActions: true,     // auto-pin actions column
  },
});

// Template — wrap in a constrained container to trigger horizontal scroll
<div style="max-width: 600px;">
  <hk-table [data]="users()" [config]="config" />
</div>`;

  resizableCode = `const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary'],
  enableColumnResizing: true,
  resizeMode: 'expand',  // 'fit' adjusts neighbor
});

<hk-table
  [data]="users()"
  [config]="config"
  (columnResize)="onResize($event)"
/>`;

  virtualScrollCode = `const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary'],
  virtualScroll: {
    enabled: true,
    itemHeight: 48,       // row height in px (required)
    viewportHeight: '400px',
  },
});

// Pagination is automatically hidden when virtual scroll is enabled
<hk-table [data]="thousandRows()" [config]="config" />`;

  editableCode = `const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'salary'],
  enableInlineEditing: true,
  cellEditors: {
    name: { type: 'text' },
    email: { type: 'text' },
    salary: {
      type: 'number',
      validator: (v) => Number(v) > 0 || 'Must be positive',
    },
    role: {
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Viewer', value: 'viewer' },
      ],
    },
  },
});

// Double-click a cell to edit. Enter to confirm, Escape to cancel.
<hk-table
  [data]="users()"
  [config]="config"
  (cellEdit)="onCellEdit($event)"
/>`;

  footerCode = `import { createTable } from '@hakistack/ng-daisyui';

const config = createTable<User>({
  visible: ['id', 'name', 'department', 'salary', 'status'],
  formatters: { salary: ['currency', 'USD'] },
  footerRows: [
    {
      columns: {
        salary: { fn: 'sum', label: 'Total' },
        id: { fn: 'count', label: 'Rows' },
      },
    },
    {
      columns: {
        salary: { fn: 'avg', label: 'Average' },
        id: { fn: 'max', label: 'Max ID' },
      },
    },
    {
      columns: {
        salary: { fn: 'median', label: 'Median' },
        department: { fn: 'distinctCount', label: 'Departments' },
      },
    },
  ],
});

// Legacy single-row footer (still supported):
// showFooter: true,
// footers: { salary: { fn: 'sum', label: 'Total' }, id: 'count' }

<hk-table [data]="users()" [config]="config" />`;

  colspanFooterCode = `import { createTable } from '@hakistack/ng-daisyui';

const config = createTable<User>({
  visible: ['id', 'name', 'department', 'salary', 'status'],
  formatters: { salary: ['currency', 'USD'] },
  footerRows: [
    {
      // Use 'cells' array instead of 'columns' for colspan layout
      cells: [
        { colspan: 3 },  // empty spacer spanning 3 columns
        { colspan: 1, fn: 'sum', field: 'salary', label: 'Total',
          format: (v) => \`$\${v.toLocaleString()}\` },
        { colspan: 1, fn: 'count', field: 'id', label: 'Rows' },
      ],
    },
    {
      cells: [
        { colspan: 3, label: 'Statistics', class: 'text-right font-bold' },
        { colspan: 1, fn: 'avg', field: 'salary', label: 'Avg',
          format: (v) => \`$\${Math.round(v).toLocaleString()}\` },
        { colspan: 1, fn: 'distinctCount', field: 'department', label: 'Depts' },
      ],
    },
  ],
});

<hk-table [data]="users()" [config]="config" />`;

  customFooterCode = `import { HkFooterDirective } from '@hakistack/ng-daisyui';

// No footer config needed — the template handles everything
const config = createTable<User>({
  visible: ['id', 'name', 'department', 'salary', 'status'],
  formatters: { salary: ['currency', 'USD'] },
});

// Template — use hkFooter for full layout freedom inside <tfoot>
<hk-table [data]="users()" [config]="config">
  <ng-template hkFooter let-data let-columns="columns">
    <div class="flex items-center justify-between px-2 py-1">
      <span>{{ data.length }} employees</span>
      <div class="flex gap-4">
        <span class="badge badge-success">Total: {{ salaryTotal() }}</span>
        <span class="badge badge-info">Avg: {{ salaryAvg() }}</span>
      </div>
    </div>
  </ng-template>
</hk-table>`;

  expandableCode = `const config = createTable<User>({
  visible: ['id', 'name', 'role', 'department', 'status'],
  expandableDetail: true,
  expandMode: 'multi',  // 'single' collapses others
});

// Template — provide a #rowDetail template
<hk-table [data]="users()" [config]="config" (detailExpansionChange)="onExpand($event)">
  <ng-template #rowDetail let-row>
    <div>
      <p>Email: {{ row.email }}</p>
      <p>Salary: {{ row.salary | number }}</p>
    </div>
  </ng-template>
</hk-table>`;

  groupedCode = `const config = createTable<User>({
  visible: ['id', 'name', 'role', 'salary', 'status'],
  formatters: { salary: ['currency', 'USD'] },
  grouping: {
    groupBy: 'department',
    initiallyExpanded: true,
    groupHeaderLabel: (value, rows) =>
      \`\${value} (\${rows.length} employees)\`,
    // Inline caption aggregates in group header
    captionAggregates: {
      columns: { salary: { fn: 'min', label: 'Min' } },
    },
    // Column-aligned multi-row group footers
    groupFooterRows: [
      { columns: {
          salary: { fn: 'sum', label: 'Total' },
          id: { fn: 'count', label: 'Count' },
      }},
      { columns: { salary: { fn: 'avg', label: 'Average' } } },
    ],
    // Legacy single-row footer (still supported):
    // aggregates: { salary: 'sum' },
    // showGroupFooter: true,
  },
});

<hk-table [data]="users()" [config]="config"
  (groupExpandChange)="onGroupExpand($event)" />`;

  reorderableCode = `const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'salary'],
  enableColumnReorder: true,   // drag column headers
  enableRowReorder: true,      // drag row handles
  showDragHandle: true,        // show grip icon
});

// Row reorder is auto-disabled when sort/filter/search is active
<hk-table [data]="users()" [config]="config"
  (columnReorder)="onColumnReorder($event)"
  (rowReorder)="onRowReorder($event)" />`;

  keyboardCode = `const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'salary', 'status'],
  hasSelection: true,
  enableKeyboardNavigation: true,
  enableInlineEditing: true,
  cellEditors: {
    name: { type: 'text' },
    salary: { type: 'number' },
  },
});

// Arrow keys: navigate cells
// Enter: start editing / toggle expand
// Space: toggle selection
// Home/End: jump to first/last column (Ctrl for row)
// Escape: clear focus
<hk-table [data]="users()" [config]="config"
  (cellEdit)="onCellEdit($event)"
  (selectionChange)="onSelection($event)" />`;

  hierarchyCode = `// Level 3: Order Items (deepest)
const itemConfig = createTable<OrderItem>({
  visible: ['itemId', 'sku', 'description', 'qty', 'price'],
  formatters: { price: ['currency', 'USD'] },
});

// Level 2: Orders — with its own childGrid pointing to items
const orderConfig = createTable<Order>({
  visible: ['orderId', 'product', 'quantity', 'unitPrice', 'orderDate'],
  formatters: { unitPrice: ['currency', 'USD'] },
  childGrid: {
    config: itemConfig,
    childDataProperty: 'items',
    bordered: true,
  },
});

// Level 1: Employees — parent table
const config = createTable<Employee>({
  visible: ['id', 'name', 'title', 'hireDate'],
  childGrid: {
    config: orderConfig,
    childDataProperty: 'orders',
    pagination: { mode: 'offset', pageSize: 5 },
    bordered: true,
  },
});

// N-level deep: each childGrid.config can itself have a childGrid
<hk-table [data]="employees()" [config]="config" />`;

  masterDetailCode = `// Detail table config
const detailConfig = createTable<Order>({
  visible: ['orderId', 'freight', 'shipName', 'shipCountry', 'orderDate'],
  formatters: { freight: ['currency', 'USD'] },
});

// Master table config with masterDetail
const config = createTable<Customer>({
  visible: ['customerId', 'customerName', 'companyName', 'country'],
  masterDetail: {
    config: detailConfig,
    detailDataProperty: 'orders',
    headerText: (row) => \`Orders for \${row.customerName}\`,
    pagination: { mode: 'offset', pageSize: 5 },
    autoSelectFirst: true,    // default: true
  },
});

// Template — single component, detail rendered automatically
<hk-table [data]="customers()" [config]="config" />

// You can also listen to row clicks:
<hk-table [data]="customers()" [config]="config"
  (rowClick)="onRowClick($event)"
  (masterDetailRowChange)="onMasterRowChange($event)" />`;

  nestedMasterDetailCode = `// Level 3: Line Items (deepest detail)
const itemConfig = createTable<OrderItem>({
  visible: ['itemId', 'sku', 'description', 'qty', 'price'],
  formatters: { price: ['currency', 'USD'] },
});

// Level 2: Orders — itself a master with line items as detail
const orderConfig = createTable<Order>({
  visible: ['orderId', 'product', 'quantity', 'unitPrice', 'orderDate'],
  formatters: { unitPrice: ['currency', 'USD'] },
  masterDetail: {
    config: itemConfig,
    detailDataProperty: 'items',
    headerText: (row) => \`Items for Order #\${row.orderId}\`,
  },
});

// Level 1: Employees — top-level master
const config = createTable<Employee>({
  visible: ['id', 'name', 'title', 'hireDate'],
  masterDetail: {
    config: orderConfig,
    detailDataProperty: 'orders',
    headerText: (row) => \`Orders for \${row.name}\`,
    pagination: { mode: 'offset', pageSize: 5 },
  },
});

// Each detail table is itself a master — drill down N levels deep
<hk-table [data]="employees()" [config]="config" />`;

  // =========================================================================
  // API Documentation
  // =========================================================================

  // --- TableComponent ---
  tableInputDocs: ApiDocEntry[] = [
    {
      name: 'data',
      type: 'readonly T[] | null',
      default: 'null',
      description: 'Array of data rows to render in the table. Accepts flat arrays or hierarchical data for tree tables.',
    },
    {
      name: 'config',
      type: 'FieldConfiguration<T> | null',
      default: 'null',
      description:
        'Table configuration object produced by the createTable() builder. Controls columns, formatters, actions, filters, grouping, and all feature flags.',
    },
    {
      name: 'paginationOptions',
      type: 'PaginationOptions | null',
      default: 'null',
      description:
        'Pagination configuration. Supports offset (page number) and cursor (opaque token) modes. When null, pagination is hidden.',
    },
    {
      name: 'showFirstLastButtons',
      type: 'boolean',
      default: 'true',
      description: 'Show the "jump to first page" and "jump to last page" buttons in the pagination bar.',
    },
    {
      name: 'hidePageSize',
      type: 'boolean',
      default: 'false',
      description: 'When true, hides the page-size selector in the pagination footer.',
    },
    {
      name: 'showPageSizeOptions',
      type: 'boolean',
      default: 'true',
      description: 'When true, renders the page-size dropdown with the configured pageSizeOptions.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'Disables all interactive elements: sorting, filtering, pagination, selection, editing, and drag operations.',
    },
  ];

  tableOutputDocs: ApiDocEntry[] = [
    {
      name: 'selectionChange',
      type: 'readonly T[]',
      description: 'Emits the current set of selected rows whenever a checkbox is toggled or "select all" is used.',
    },
    {
      name: 'pageChange',
      type: 'PageSizeChange',
      description: 'Emits { pageIndex, pageSize } when the user changes page or page size in offset mode.',
    },
    {
      name: 'cursorChange',
      type: 'CursorPageChange',
      description: 'Emits { cursor, direction } when the user clicks next/previous in cursor pagination mode.',
    },
    {
      name: 'sortChange',
      type: 'SortChange',
      description:
        'Emits { field, direction } when a column header is clicked to toggle sorting. Direction cycles: Ascending -> Descending -> none.',
    },
    {
      name: 'sortFieldChange',
      type: 'string',
      description: 'Emits the currently sorted field name (or empty string when sort is cleared). Useful for two-way binding scenarios.',
    },
    {
      name: 'sortDirectionChange',
      type: "'Ascending' | 'Descending' | ''",
      description: 'Emits the current sort direction. Companion to sortFieldChange for granular sort state tracking.',
    },
    {
      name: 'filterChange',
      type: 'FilterChange<T>',
      description:
        'Emits when any column filter is applied, removed, or cleared. Payload includes the changed field plus all active filters.',
    },
    {
      name: 'globalSearchChange',
      type: 'GlobalSearchChange',
      description: 'Emits { searchTerm, mode } when the global search input value changes (after debounce).',
    },
    {
      name: 'expansionChange',
      type: '{ row: T; expanded: boolean }',
      description: 'Emits when a tree-table row is expanded or collapsed via the toggle chevron.',
    },
    {
      name: 'columnResize',
      type: 'ColumnResizeEvent',
      description: 'Emits { field, width, previousWidth } when a column resize operation completes.',
    },
    {
      name: 'cellEdit',
      type: 'CellEditEvent<T>',
      description: 'Emits { row, field, oldValue, newValue } when an inline cell edit is confirmed (Enter or blur).',
    },
    { name: 'cellEditCancel', type: '{ row: T; field: string }', description: 'Emits when an inline cell edit is cancelled via Escape.' },
    {
      name: 'cellEditError',
      type: 'CellEditErrorEvent<T>',
      description: 'Emits { row, field, value, error } when a cell edit fails the column validator.',
    },
    {
      name: 'detailExpansionChange',
      type: 'RowExpandEvent<T>',
      description: 'Emits { row, expanded } when an expandable detail row is expanded or collapsed.',
    },
    {
      name: 'columnReorder',
      type: 'ColumnReorderEvent',
      description: 'Emits { previousIndex, currentIndex, columns } when a column is dragged to a new position.',
    },
    {
      name: 'rowReorder',
      type: 'RowReorderEvent<T>',
      description: 'Emits { row, previousIndex, currentIndex, data } when a row is dragged to a new position.',
    },
    {
      name: 'groupExpandChange',
      type: 'GroupExpandEvent',
      description: 'Emits { groupValue, expanded } when a row group header is toggled.',
    },
    {
      name: 'rowClick',
      type: 'T',
      description: 'Emits the row object when any data row is clicked. Fires for all click interactions regardless of selectableRows mode.',
    },
    {
      name: 'masterDetailRowChange',
      type: 'T',
      description: 'Emits the row object when the selected row in a master-detail layout changes.',
    },
    {
      name: 'activeRowChange',
      type: 'T | null',
      description: 'Emits the active row (or null on deselect) when selectableRows is true or "single". Only one row is active at a time.',
    },
    {
      name: 'activeRowsChange',
      type: 'readonly T[]',
      description: 'Emits the full array of active rows when selectableRows is "multi". Users toggle rows by clicking.',
    },
  ];

  tableMethodDocs: ApiDocEntry[] = [
    {
      name: 'firstPage()',
      type: 'void',
      description: 'Navigate to the first page (offset mode). No-op if already on first page or disabled.',
    },
    {
      name: 'previousPage()',
      type: 'void',
      description: 'Navigate to the previous page (offset mode). No-op if on first page or disabled.',
    },
    { name: 'nextPage()', type: 'void', description: 'Navigate to the next page (offset mode). No-op if on last page or disabled.' },
    {
      name: 'lastPage()',
      type: 'void',
      description: 'Navigate to the last page (offset mode). No-op if already on last page or disabled.',
    },
    {
      name: 'gotoPage(pageNumber)',
      type: 'void',
      description: 'Jump to a specific page by 1-based page number. Bounds-checked and no-op if disabled.',
    },
    { name: 'clearSelection()', type: 'void', description: 'Deselect all rows and emit an empty selectionChange event.' },
    {
      name: 'sort(field)',
      type: 'void',
      description:
        'Programmatically toggle sorting on the given field. Cycles: Ascending -> Descending -> none. Resets to first page in offset mode.',
    },
    {
      name: 'applyColumnFilter(field, value, operator)',
      type: 'void',
      description: 'Programmatically apply a filter to a column. Replaces any existing filter on the same field and resets to first page.',
    },
    {
      name: 'removeFilter(field)',
      type: 'void',
      description: 'Remove the active filter for a specific column field and reset to first page.',
    },
    {
      name: 'clearAllFilters()',
      type: 'void',
      description: 'Remove all active column filters, close filter dropdowns, and reset to first page.',
    },
    { name: 'clearGlobalSearch()', type: 'void', description: 'Clear the global search term and any pending debounce timeout.' },
    {
      name: 'toggleColumnVisibility(field)',
      type: 'void',
      description:
        'Toggle a column between visible/hidden. Respects alwaysVisible and minimum-one-column rules. Persists to localStorage if storageKey is set.',
    },
    { name: 'showAllColumns()', type: 'void', description: 'Make all columns visible. Persists to localStorage if storageKey is set.' },
    {
      name: 'hideAllColumns()',
      type: 'void',
      description: 'Hide all optional columns, keeping alwaysVisible columns and at least one column shown. Persists to localStorage.',
    },
    {
      name: 'resetColumnVisibility()',
      type: 'void',
      description: 'Reset column visibility to defaultVisible (if configured) or show all. Persists to localStorage.',
    },
    { name: 'expandAllDetails()', type: 'void', description: 'Expand all expandable detail rows (expandableDetail mode).' },
    { name: 'collapseAllDetails()', type: 'void', description: 'Collapse all expandable detail rows.' },
    { name: 'expandAllGroups()', type: 'void', description: 'Expand all row groups (grouping mode).' },
    { name: 'collapseAllGroups()', type: 'void', description: 'Collapse all row groups.' },
    { name: 'expandAllRows()', type: 'void', description: 'Expand all tree-table rows at every level (tree-table mode).' },
    { name: 'collapseAllRows()', type: 'void', description: 'Collapse all tree-table rows.' },
    {
      name: 'expandToLevel(level)',
      type: 'void',
      description: 'Expand tree rows down to the given depth (0 = roots only, 1 = roots + first children, etc.).',
    },
    {
      name: 'collapseToLevel(level)',
      type: 'void',
      description: 'Collapse tree rows below the given depth, keeping higher levels expanded.',
    },
    { name: 'startEdit(row, field)', type: 'void', description: 'Programmatically enter inline edit mode for a specific cell.' },
    {
      name: 'confirmEdit()',
      type: 'void',
      description: 'Confirm the currently active inline edit, running validation and emitting cellEdit or cellEditError.',
    },
    { name: 'cancelEdit()', type: 'void', description: 'Cancel the currently active inline edit without saving, emitting cellEditCancel.' },
    { name: 'toggleRowExpand(row)', type: 'void', description: 'Toggle tree-table row expand/collapse state for a specific row.' },
    {
      name: 'toggleDetailExpand(row)',
      type: 'void',
      description: 'Toggle expandable detail row state for a specific row. Respects expandMode (single/multi).',
    },
    {
      name: 'toggleGroupExpand(groupValue)',
      type: 'void',
      description: 'Toggle expand/collapse state of a specific row group by its group value.',
    },
  ];

  tableContentDocs: ApiDocEntry[] = [
    {
      name: '#rowDetail',
      type: 'TemplateRef<{ $implicit: T }>',
      description:
        'Template for the expandable detail row content. The row object is available via let-row. Required when expandableDetail is true.',
    },
    {
      name: '#tableFooter',
      type: 'TemplateRef<{ $implicit: readonly T[]; columns: readonly ColumnDefinition<T>[] }>',
      description:
        'Custom footer template rendered between the table body and pagination. Receives all data rows and column definitions as context.',
    },
  ];

  // --- TablePaginationComponent ---
  paginationInputDocs: ApiDocEntry[] = [
    {
      name: 'paginationOptions',
      type: 'PaginationOptions | null',
      default: 'null',
      description: 'Full pagination configuration object. Controls mode, cursors, page size, size options, and total items.',
    },
    {
      name: 'totalItems',
      type: 'number',
      default: '0',
      description: 'Total number of items (fallback when paginationOptions.totalItems is not set).',
    },
    {
      name: 'showFirstLastButtons',
      type: 'boolean',
      default: 'true',
      description: 'Show the first-page and last-page navigation buttons (offset mode only).',
    },
    { name: 'hidePageSize', type: 'boolean', default: 'false', description: 'When true, hides the page-size selector entirely.' },
    { name: 'showPageSizeOptions', type: 'boolean', default: 'true', description: 'When true, renders the page-size dropdown.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables all pagination buttons and the page-size selector.' },
    { name: 'pageIndex', type: 'number', default: '0', description: 'Current 0-based page index (offset mode).' },
    {
      name: 'pageSize',
      type: 'number',
      default: '10',
      description: 'Current page size (fallback when paginationOptions.pageSize is not set).',
    },
  ];

  paginationOutputDocs: ApiDocEntry[] = [
    {
      name: 'pageChange',
      type: 'PageSizeChange',
      description: 'Emits { pageIndex, pageSize } when the user navigates to a different page or changes page size (offset mode).',
    },
    {
      name: 'cursorChange',
      type: 'CursorPageChange',
      description: 'Emits { cursor, direction } when the user clicks next/previous in cursor mode.',
    },
  ];

  // --- TableFilterComponent ---
  filterInputDocs: ApiDocEntry[] = [
    { name: 'column', type: 'ColumnDefinition<T>', description: 'The column definition that this filter applies to. Required.' },
    {
      name: 'filterConfig',
      type: 'ColumnFilter<T>',
      description:
        'Filter configuration specifying the filter type (text, number, select, multiselect, boolean, date, numberRange, dateRange), available options, and default operator. Required.',
    },
    {
      name: 'activeFilter',
      type: 'FilterConfig<T>',
      description: 'The currently active filter state for this column, used to pre-populate the filter UI on open.',
    },
  ];

  filterOutputDocs: ApiDocEntry[] = [
    {
      name: 'apply',
      type: 'FilterApplyEvent',
      description: 'Emits { value, operator } when the user clicks Apply or presses Enter. Value is null when the filter is cleared.',
    },
    { name: 'closeFilter', type: 'void', description: 'Emits when the filter dropdown should close (after apply, clear, or cancel).' },
  ];

  // --- TableGlobalSearchComponent ---
  globalSearchInputDocs: ApiDocEntry[] = [
    { name: 'searchTerm', type: 'string', default: "''", description: 'Current search term value, used for controlled binding.' },
    {
      name: 'placeholder',
      type: 'string',
      default: "'Search all columns...'",
      description: 'Placeholder text displayed inside the search input.',
    },
    { name: 'showIcon', type: 'boolean', default: 'true', description: 'Show the magnifying glass icon before the input.' },
    { name: 'showClearButton', type: 'boolean', default: 'true', description: 'Show the X clear button when a search term is present.' },
    {
      name: 'hasSearchTerm',
      type: 'boolean',
      default: 'false',
      description: 'Whether a search term is currently active. Controls clear button visibility.',
    },
  ];

  globalSearchOutputDocs: ApiDocEntry[] = [
    { name: 'searchChange', type: 'string', description: 'Emits the new search term on every keystroke.' },
    { name: 'clear', type: 'void', description: 'Emits when the user clicks the clear (X) button.' },
  ];

  // --- TableColumnVisibilityComponent ---
  colVisInputDocs: ApiDocEntry[] = [
    {
      name: 'columns',
      type: 'ColumnDefinition<T>[]',
      description: 'Array of all column definitions to display in the visibility toggle dropdown. Required.',
    },
    {
      name: 'visibilityState',
      type: 'Map<string, boolean>',
      description: 'Map of field name to visibility boolean. Columns not in the map default to visible. Required.',
    },
    {
      name: 'alwaysVisibleColumns',
      type: 'Set<string>',
      default: 'new Set()',
      description: 'Set of field names that cannot be hidden. Shown with a lock icon in the dropdown.',
    },
  ];

  colVisOutputDocs: ApiDocEntry[] = [
    { name: 'toggleColumn', type: 'string', description: 'Emits the field name when a column checkbox is toggled.' },
    { name: 'showAll', type: 'void', description: 'Emits when the "Show All" quick action is clicked.' },
    { name: 'hideAll', type: 'void', description: 'Emits when the "Hide All" quick action is clicked.' },
    { name: 'resetEmitter', type: 'void', description: 'Emits when the "Reset" quick action is clicked to restore default visibility.' },
  ];

  // =========================================================================
  // Builder Sub-tab Docs
  // =========================================================================

  builderFieldConfigDocs: ApiDocEntry[] = [
    {
      name: 'visible',
      type: 'StringKey<T>[]',
      description: 'Columns to display, in order. Each entry maps to a property key on the data object.',
    },
    { name: 'hidden', type: 'StringKey<T>[]', default: '[]', description: 'Columns to exclude from the table.' },
    {
      name: 'headers',
      type: 'Partial<Record<StringKey<T>, string>>',
      description: 'Custom header labels. Keys not specified default to the field name.',
    },
    {
      name: 'formatters',
      type: 'Partial<Record<StringKey<T>, Formatter<T>>>',
      description:
        "Cell formatters per column. Can be a function (value, row) => string, or a PipeFormatter tuple like ['currency', 'USD'].",
    },
    {
      name: 'fallbacks',
      type: 'Partial<Record<StringKey<T>, string>>',
      description: 'Fallback text displayed when a cell value is null or undefined.',
    },
    { name: 'hasSelection', type: 'boolean', default: 'false', description: 'Show a checkbox column for row selection.' },
    { name: 'hasActions', type: 'boolean', default: 'false', description: 'Show an actions column with per-row action buttons.' },
    {
      name: 'selectableRows',
      type: "boolean | 'single' | 'multi'",
      default: 'false',
      description: "Enable click-to-highlight rows. true or 'single' highlights one row at a time; 'multi' allows toggling multiple rows.",
    },
    { name: 'selectedRowClass', type: 'string', default: "'bg-primary/10'", description: 'CSS class applied to the active/selected row.' },
    {
      name: 'rowClass',
      type: '(row: T) => Record<string, boolean>',
      description: 'Callback to apply conditional CSS classes per row. Returns an ngClass-style object.',
    },
    {
      name: 'actions',
      type: 'TableAction<T>[]',
      description: 'Array of per-row action button definitions (type, label, icon, action handler, etc.).',
    },
    {
      name: 'bulkActions',
      type: 'TableBulkAction<T>[]',
      description: 'Bulk action buttons shown when rows are selected. Can render as dropdown with dropdownOptions.',
    },
    {
      name: 'filters',
      type: 'ColumnFilter<T>[]',
      description: 'Column filter definitions. Each entry specifies field, type, options, and default operator.',
    },
    { name: 'enableFiltering', type: 'boolean', description: 'Master toggle for enabling/disabling column filtering.' },
    {
      name: 'globalSearch',
      type: 'GlobalSearchConfig<T>',
      description: 'Global search configuration. Set enabled: true to activate the search bar above the table.',
    },
    {
      name: 'columnVisibility',
      type: 'ColumnVisibilityConfig',
      description: 'Column visibility toggle configuration. Allows users to show/hide columns via a dropdown.',
    },
    {
      name: 'treeTable',
      type: 'TreeTableConfig<T>',
      description: 'Tree table configuration for hierarchical data with expand/collapse, indent guides, and checkbox cascade.',
    },
    {
      name: 'stickyColumns',
      type: '{ stickySelection?: boolean; stickyActions?: boolean }',
      description: 'Pin the selection checkbox and/or actions column during horizontal scroll.',
    },
    { name: 'enableColumnResizing', type: 'boolean', default: 'false', description: 'Enable column resize handles on column borders.' },
    { name: 'columnWidths', type: 'Partial<Record<StringKey<T>, number>>', description: 'Initial column widths in pixels.' },
    {
      name: 'resizeMode',
      type: "'fit' | 'expand'",
      default: "'expand'",
      description: "'fit' adjusts the neighboring column; 'expand' changes the table width.",
    },
    {
      name: 'virtualScroll',
      type: 'VirtualScrollConfig',
      description: 'Virtual scrolling configuration for large datasets. Pagination is automatically hidden.',
    },
    { name: 'enableInlineEditing', type: 'boolean', default: 'false', description: 'Enable double-click inline cell editing.' },
    {
      name: 'cellEditors',
      type: 'Partial<Record<StringKey<T>, CellEditorConfig>>',
      description: 'Per-field editor configuration (type, options, validator).',
    },
    { name: 'showFooter', type: 'boolean', default: 'false', description: 'Show a legacy single-row footer with aggregate values.' },
    {
      name: 'footers',
      type: 'Partial<Record<StringKey<T>, AggregateFunction | FooterConfig<T>>>',
      description: 'Legacy single-row footer aggregates per column. Use footerRows for multi-row footers.',
    },
    {
      name: 'footerRows',
      type: 'FooterRowDef<T>[]',
      description: 'Multi-row footer definitions. Each entry defines one footer row with per-column aggregates.',
    },
    {
      name: 'expandableDetail',
      type: 'boolean',
      default: 'false',
      description: 'Enable expandable detail rows. Requires a #rowDetail template in the table content.',
    },
    {
      name: 'expandMode',
      type: "'single' | 'multi'",
      default: "'multi'",
      description: "'single' collapses others when one row expands; 'multi' allows many expanded.",
    },
    {
      name: 'enableKeyboardNavigation',
      type: 'boolean',
      default: 'false',
      description: 'Enable arrow key cell navigation, Enter to edit, Space to toggle selection.',
    },
    { name: 'enableColumnReorder', type: 'boolean', default: 'false', description: 'Enable drag-and-drop column header reordering.' },
    { name: 'enableRowReorder', type: 'boolean', default: 'false', description: 'Enable drag-and-drop row reordering.' },
    { name: 'showDragHandle', type: 'boolean', default: 'true', description: 'Show a grip icon column for row drag-and-drop reordering.' },
    {
      name: 'grouping',
      type: 'GroupConfig<T>',
      description: 'Row grouping configuration with group headers, caption aggregates, and multi-row group footers.',
    },
    { name: 'childGrid', type: 'ChildGridConfig<T>', description: 'Hierarchy grid configuration for expandable nested child tables.' },
    {
      name: 'masterDetail',
      type: 'MasterDetailConfig<T>',
      description: 'Master-detail layout configuration for stacked master/detail tables.',
    },
  ];

  builderPaginationDocs: ApiDocEntry[] = [
    {
      name: 'mode',
      type: "'cursor' | 'offset'",
      description: "Pagination strategy. 'offset' uses page numbers; 'cursor' uses opaque tokens for next/prev navigation.",
    },
    { name: 'pageSize', type: 'number', description: 'Number of items displayed per page.' },
    {
      name: 'pageSizeOptions',
      type: 'number[]',
      default: '[5, 10, 25, 50, 100]',
      description: 'Dropdown options for changing the page size.',
    },
    { name: 'totalItems', type: 'number', description: 'Total item count used for calculating total pages in offset mode.' },
    {
      name: 'nextCursor',
      type: 'string | null',
      description: 'Next page cursor token (cursor mode only). Set to null when no more pages.',
    },
    {
      name: 'prevCursor',
      type: 'string | null',
      description: 'Previous page cursor token (cursor mode only). Set to null on the first page.',
    },
    { name: 'showQuickJumper', type: 'boolean', default: 'false', description: 'Show a "go to page" input for quick navigation.' },
    { name: 'showSizeChanger', type: 'boolean', default: 'false', description: 'Show the page size changer dropdown.' },
    {
      name: 'showTotal',
      type: 'boolean | ((total, range) => string)',
      description: 'Show the total item count. Can be a boolean or a function returning a custom string.',
    },
  ];

  // =========================================================================
  // Filtering Sub-tab Docs
  // =========================================================================

  filterTypeEnumDocs: ApiDocEntry[] = [
    {
      name: 'text',
      type: 'FilterType',
      description: 'Free-text input filter with string operators (contains, startsWith, endsWith, equals, etc.).',
    },
    {
      name: 'number',
      type: 'FilterType',
      description: 'Numeric input filter with comparison operators (equals, gt, lt, gte, lte, between).',
    },
    { name: 'date', type: 'FilterType', description: 'Date picker filter with date comparison operators.' },
    { name: 'select', type: 'FilterType', description: 'Single-select dropdown filter. Requires options array.' },
    { name: 'multiselect', type: 'FilterType', description: "Multi-select dropdown filter. Uses 'in' operator by default." },
    { name: 'boolean', type: 'FilterType', description: 'Toggle/checkbox filter for boolean fields.' },
    { name: 'dateRange', type: 'FilterType', description: "Date range picker filter. Uses 'between' operator." },
    { name: 'numberRange', type: 'FilterType', description: "Numeric range filter with min/max inputs. Uses 'between' operator." },
  ];

  filterOperatorEnumDocs: ApiDocEntry[] = [
    { name: 'equals', type: 'FilterOperator', description: 'Exact match comparison.' },
    { name: 'notEquals', type: 'FilterOperator', description: 'Not equal comparison.' },
    { name: 'contains', type: 'FilterOperator', description: 'String contains (case-insensitive by default).' },
    { name: 'notContains', type: 'FilterOperator', description: 'String does not contain.' },
    { name: 'startsWith', type: 'FilterOperator', description: 'String starts with the given value.' },
    { name: 'endsWith', type: 'FilterOperator', description: 'String ends with the given value.' },
    { name: 'gt', type: 'FilterOperator', description: 'Greater than (numeric/date).' },
    { name: 'lt', type: 'FilterOperator', description: 'Less than (numeric/date).' },
    { name: 'gte', type: 'FilterOperator', description: 'Greater than or equal (numeric/date).' },
    { name: 'lte', type: 'FilterOperator', description: 'Less than or equal (numeric/date).' },
    { name: 'between', type: 'FilterOperator', description: 'Value is between two bounds (inclusive). Used by dateRange and numberRange.' },
    { name: 'in', type: 'FilterOperator', description: 'Value is one of the given set. Used by multiselect filter.' },
    { name: 'notIn', type: 'FilterOperator', description: 'Value is not in the given set.' },
    { name: 'isEmpty', type: 'FilterOperator', description: 'Field is null, undefined, or empty string.' },
    { name: 'isNotEmpty', type: 'FilterOperator', description: 'Field has a non-empty value.' },
  ];

  columnFilterInterfaceDocs: ApiDocEntry[] = [
    {
      name: 'type',
      type: 'FilterType',
      description: 'UI widget type for the filter (text, number, date, select, multiselect, boolean, dateRange, numberRange).',
    },
    { name: 'field', type: 'StringKey<T>', description: 'Column field this filter applies to.' },
    {
      name: 'operators',
      type: 'FilterOperator[]',
      description: 'Available operators the user can choose from. Defaults vary by filter type.',
    },
    {
      name: 'options',
      type: 'FilterOption[]',
      description: 'Options for select and multiselect filter types. Each option has a label and value.',
    },
    { name: 'placeholder', type: 'string', description: 'Placeholder text for the filter input.' },
    { name: 'defaultOperator', type: 'FilterOperator', description: 'Initial operator selected when the filter is opened.' },
  ];

  globalSearchConfigDocs: ApiDocEntry[] = [
    { name: 'enabled', type: 'boolean', description: 'Enable the global search feature. Shows a search bar above the table.' },
    {
      name: 'mode',
      type: 'GlobalSearchMode',
      default: "'contains'",
      description: "Search strategy: 'contains', 'startsWith', 'exact', or 'fuzzy' (Fuse.js powered).",
    },
    { name: 'placeholder', type: 'string', default: "'Search all columns...'", description: 'Placeholder text in the search input.' },
    { name: 'debounceTime', type: 'number', default: '300', description: 'Debounce delay in milliseconds before search is executed.' },
    {
      name: 'caseSensitive',
      type: 'boolean',
      default: 'false',
      description: 'Enable case-sensitive search. Only applies to non-fuzzy modes.',
    },
    { name: 'showIcon', type: 'boolean', default: 'true', description: 'Show the magnifying glass icon in the search input.' },
    { name: 'showClearButton', type: 'boolean', default: 'true', description: 'Show the clear (X) button when a search term is present.' },
    { name: 'excludeFields', type: 'StringKey<T>[]', description: 'Fields to exclude from the global search.' },
    {
      name: 'customSearch',
      type: '(row: T, searchTerm: string) => boolean',
      description: 'Custom search predicate. When provided, overrides the built-in search logic.',
    },
    { name: 'fuseOptions', type: 'IFuseOptions<T>', description: 'Fuse.js configuration options for fuzzy search mode.' },
  ];

  filteringExampleCode = `import { createTable } from '@hakistack/ng-daisyui';

const config = createTable<User>({
  visible: ['id', 'name', 'email', 'role', 'department', 'status'],
  // Column-specific filters
  filters: [
    {
      field: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Viewer', value: 'viewer' },
      ],
    },
    {
      field: 'status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
    {
      field: 'department',
      type: 'multiselect',
      options: [
        { label: 'Engineering', value: 'Engineering' },
        { label: 'Marketing', value: 'Marketing' },
      ],
    },
  ],
  // Global search across all columns
  globalSearch: {
    enabled: true,
    mode: 'fuzzy',
    placeholder: 'Search users...',
    debounceTime: 300,
    excludeFields: ['id'],
  },
});

// Template
<hk-table
  [data]="users()"
  [config]="config"
  (filterChange)="onFilter($event)"
  (globalSearchChange)="onSearch($event)"
/>`;

  // =========================================================================
  // Types Reference (code blocks)
  // =========================================================================

  fieldConfigType = `// FieldConfig<T> — passed to createTable()
interface FieldConfig<T> {
  visible: StringKey<T>[];               // Columns to display (order matters)
  hidden?: StringKey<T>[];               // Columns to exclude
  headers?: Partial<Record<StringKey<T>, string>>;       // Custom header labels
  formatters?: Partial<Record<StringKey<T>, Formatter<T>>>;  // Cell formatters (fn or PipeFormatter)
  fallbacks?: Partial<Record<StringKey<T>, string>>;     // Fallback text for null/undefined values
  hasSelection?: boolean;                // Show checkbox column
  hasActions?: boolean;                  // Show actions column
  selectableRows?: boolean | 'single' | 'multi';  // Click-to-highlight rows
  selectedRowClass?: string;             // CSS class for active rows (default: 'bg-primary/10')
  rowClass?: (row: T) => Record<string, boolean>;  // Conditional per-row CSS classes
  clearSelectionText?: string;           // Custom "Clear selection" label
  selectionHintText?: string;            // Custom selection hint text
  actions?: TableAction<T>[];            // Per-row action buttons
  bulkActions?: TableBulkAction<T>[];    // Bulk action buttons (shown when rows selected)
  filters?: ColumnFilter<T>[];           // Column filter definitions
  enableFiltering?: boolean;             // Master toggle for column filtering
  globalSearch?: GlobalSearchConfig<T>;  // Global search configuration
  columnVisibility?: ColumnVisibilityConfig;  // Column show/hide toggle
  treeTable?: TreeTableConfig<T>;        // Tree table (hierarchical data) configuration
  stickyColumns?: {
    stickySelection?: boolean;           // Pin checkbox column (default: true)
    stickyActions?: boolean;             // Pin actions column (default: true)
  };
  enableColumnResizing?: boolean;        // Enable column resize handles
  columnWidths?: Partial<Record<StringKey<T>, number>>;  // Initial column widths (px)
  resizeMode?: 'fit' | 'expand';         // 'fit' adjusts neighbor, 'expand' grows table
  virtualScroll?: VirtualScrollConfig;   // Virtual scrolling for large datasets
  enableInlineEditing?: boolean;         // Enable double-click cell editing
  cellEditors?: Partial<Record<StringKey<T>, CellEditorConfig>>;  // Editor config per field
  showFooter?: boolean;                  // Show footer row with aggregates
  footers?: Partial<Record<StringKey<T>, AggregateFunction | FooterConfig<T>>>;  // Legacy single-row footer
  footerRows?: FooterRowDef<T>[];        // Multi-row footer definitions
  expandableDetail?: boolean;            // Enable expandable detail rows
  expandMode?: 'single' | 'multi';      // One or many expanded details (default: 'multi')
  enableKeyboardNavigation?: boolean;    // Arrow key cell navigation
  enableColumnReorder?: boolean;         // Drag-and-drop column reordering
  enableRowReorder?: boolean;            // Drag-and-drop row reordering
  showDragHandle?: boolean;              // Show grip icon for row reorder (default: true)
  grouping?: GroupConfig<T>;             // Row grouping configuration
  childGrid?: ChildGridConfig<T>;        // Hierarchy grid (expandable child tables)
  masterDetail?: MasterDetailConfig<T>;  // Master-detail layout (stacked tables)
}`;

  columnDefinitionType = `// ColumnDefinition<T> — generated by createTable(), can also be customized
interface ColumnDefinition<T> {
  field: StringKey<T>;       // Property key on the data object
  header: string;            // Display header text
  format?: (value: unknown, row: T) => string | Observable<string>;  // Cell formatter
  fallback?: string;         // Fallback for null/undefined cell values
  filter?: ColumnFilter<T>;  // Inline filter config (alternative to FieldConfig.filters)
  sticky?: 'start' | 'end'; // Pin column during horizontal scroll
  resizable?: boolean;       // Whether this column can be resized (default: true)
  minWidth?: number;         // Minimum width in px during resize
  maxWidth?: number;         // Maximum width in px during resize
  editable?: boolean;        // Whether this column supports inline editing
  editType?: 'text' | 'number' | 'select' | 'date' | 'toggle';  // Editor widget type
  editOptions?: { label: string; value: unknown }[];  // Options for select editor
  editValidator?: (value: unknown, row: T) => boolean | string;  // Validation fn
  footer?: (data: readonly T[]) => string | number;  // Legacy footer aggregate fn
  reorderable?: boolean;     // Whether this column can be reordered (default: true)
}`;

  paginationOptionsType = `// PaginationOptions
interface PaginationOptions {
  mode: 'cursor' | 'offset';            // Pagination strategy
  nextCursor?: string | null;            // Next page cursor token (cursor mode)
  prevCursor?: string | null;            // Previous page cursor token (cursor mode)
  pageSize: number;                      // Items per page
  pageSizeOptions?: number[];            // Dropdown options (default: [5, 10, 25, 50, 100])
  totalItems?: number;                   // Total item count for page calculations
  showQuickJumper?: boolean;             // Show "go to page" input
  showSizeChanger?: boolean;             // Show page size changer
  showTotal?: boolean | ((total: number, range: [number, number]) => string);
}`;

  filterTypes = `// Filter Types
type FilterType = 'text' | 'number' | 'date' | 'select'
  | 'multiselect' | 'boolean' | 'dateRange' | 'numberRange';

type FilterOperator = 'equals' | 'notEquals' | 'contains' | 'notContains'
  | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte'
  | 'between' | 'in' | 'notIn' | 'isEmpty' | 'isNotEmpty';

interface ColumnFilter<T> {
  type: FilterType;                      // UI widget type
  field: StringKey<T>;                   // Column field to filter
  operators?: FilterOperator[];          // Allowed operators
  options?: FilterOption[];              // Options for select/multiselect
  placeholder?: string;                  // Input placeholder text
  defaultOperator?: FilterOperator;      // Initial operator
}

interface FilterConfig<T> {
  field: StringKey<T>;                   // Filtered field
  value: unknown;                        // Current filter value
  operator: FilterOperator;              // Active operator
  type?: FilterType;                     // Filter type
}

interface FilterChange<T> {
  field: string;                         // Changed field ('' for clearAll)
  value: unknown;                        // New value (null for clear)
  operator: FilterOperator;              // Applied operator
  filters: FilterConfig<T>[];            // All active filters
}

interface FilterOption {
  label: string;
  value: unknown;
}`;

  globalSearchConfigType = `// GlobalSearchConfig<T>
type GlobalSearchMode = 'contains' | 'startsWith' | 'exact' | 'fuzzy';

interface GlobalSearchConfig<T> {
  enabled: boolean;                      // Enable global search
  mode?: GlobalSearchMode;               // Search strategy (default: 'contains')
  placeholder?: string;                  // Input placeholder
  debounceTime?: number;                 // Debounce in ms (default: 300)
  caseSensitive?: boolean;               // Case-sensitive (default: false, N/A for fuzzy)
  showIcon?: boolean;                    // Show search icon
  showClearButton?: boolean;             // Show clear button
  excludeFields?: StringKey<T>[];        // Fields to skip during search
  customSearch?: (row: T, searchTerm: string) => boolean;  // Custom predicate
  fuseOptions?: IFuseOptions<T>;         // Fuse.js config for fuzzy mode
}

interface GlobalSearchChange {
  searchTerm: string;
  mode: GlobalSearchMode;
}`;

  columnVisibilityConfigType = `// ColumnVisibilityConfig
interface ColumnVisibilityConfig {
  enabled?: boolean;                     // Enable column visibility toggle
  storageKey?: string;                   // localStorage key for persistence
  defaultVisible?: string[];             // Default visible columns (all if omitted)
  alwaysVisible?: string[];              // Columns that cannot be hidden
}`;

  treeTableConfigType = `// TreeTableConfig<T>
interface TreeTableConfig<T> {
  enabled: boolean;                      // Enable tree table mode
  childrenProperty?: string;             // Property holding children (default: 'children')
  initialExpandedKeys?: string[];        // Row keys to expand on init
  expandAll?: boolean;                   // Expand all on init (default: false)
  getRowKey?: (row: T) => string;        // Custom row key function
  indentSize?: number;                   // Indent px per level (default: 24)
  treeColumnIndex?: number;              // Which visible[] column shows the toggle (default: 0)
  showIndentGuides?: boolean;            // Show vertical indent guide lines (default: true)
  filterHierarchyMode?: 'ancestors' | 'descendants' | 'both' | 'none';  // Filter behavior (default: 'ancestors')
  initialExpandLevel?: number;           // Auto-expand to depth (1 = roots expanded)
  checkboxCascade?: 'none' | 'downward' | 'upward' | 'both';  // Checkbox selection cascade (default: 'none')
}`;

  virtualScrollConfigType = `// VirtualScrollConfig
interface VirtualScrollConfig {
  enabled: boolean;                      // Enable virtual scrolling
  itemHeight: number;                    // Row height in px (required for CDK)
  viewportHeight: string;               // Viewport height CSS value (e.g. '400px', '60vh')
  bufferSize?: number;                   // Extra items above/below viewport
}`;

  groupConfigType = `// GroupConfig<T>
interface GroupConfig<T> {
  groupBy: StringKey<T>;                 // Field to group rows by
  aggregates?: Partial<Record<StringKey<T>, AggregateFunction>>;  // Legacy group footer aggregates
  initiallyExpanded?: boolean;           // Groups expanded on init (default: true)
  showGroupFooter?: boolean;             // Show legacy aggregate footer per group
  groupHeaderLabel?: (groupValue: unknown, rows: T[]) => string;  // Custom group header text
  groupSortFn?: (a: unknown, b: unknown) => number;  // Custom group ordering
  captionAggregates?: FooterRowDef<T>;   // Inline aggregates in group header row
  groupFooterRows?: FooterRowDef<T>[];   // Multi-row footer per group (column-aligned)
}

interface GroupExpandEvent {
  groupValue: unknown;
  expanded: boolean;
}`;

  childGridConfigType = `// ChildGridConfig<TParent> — Hierarchy Grid (expandable nested tables)
interface ChildGridConfig<TParent> {
  config: FieldConfiguration<any>;       // Column config for the child table (from createTable)
  childDataProperty?: string;            // Property on parent holding child array
  childDataFn?: (parentRow: TParent) => readonly unknown[];  // Function to resolve child data
  pagination?: PaginationOptions;        // Child table pagination
  expandMode?: 'single' | 'multi';      // One or many expanded (default: 'multi')
  bordered?: boolean;                    // Show left border for hierarchy (default: true)
  containerClass?: string;               // Additional CSS class for child container
}`;

  masterDetailConfigType = `// MasterDetailConfig<TParent> — stacked master/detail tables
interface MasterDetailConfig<TParent> {
  config: FieldConfiguration<any>;       // Column config for the detail table (from createTable)
  detailDataProperty?: string;           // Property on master holding detail array
  detailDataFn?: (masterRow: TParent) => readonly unknown[];  // Function to resolve detail data
  pagination?: PaginationOptions;        // Detail table pagination
  headerText?: string | ((masterRow: TParent) => string);  // Detail section header
  autoSelectFirst?: boolean;             // Select first row on data change (default: true)
  containerClass?: string;               // Additional CSS class for detail container
}`;

  actionTypes = `// TableAction<T> — per-row action button
type ActionType = 'view' | 'edit' | 'delete' | 'upload'
  | 'download' | 'print' | (string & {});

interface TableAction<T> {
  type: ActionType;                      // Action identifier (determines default styling)
  label: string;                         // Button text
  action: (row: T) => void;             // Click handler
  hidden?: (row: T) => boolean;          // Conditionally hide per row
  disabled?: (row: T) => boolean;        // Conditionally disable per row
  icon?: IconName;                       // Lucide icon name
  tooltip?: string | ((row: T) => string);  // Tooltip text
  buttonClass?: string;                  // Additional CSS class
  buttonClasses?: string[];              // Additional CSS classes array
  buttonStyle?: CSSProperties;           // Inline styles
}

// TableBulkAction<T> — shown when rows are selected
interface TableBulkAction<T> {
  type: ActionType;
  label: string;
  action: (rows: T[], option?: BulkActionDropdownOption) => void;
  hidden?: (rows: T[]) => boolean;
  disabled?: (rows: T[]) => boolean;
  icon?: IconName;
  tooltip?: string | ((rows: T[]) => string);
  buttonClass?: string;
  buttonClasses?: string[];
  buttonStyle?: CSSProperties;
  dropdownOptions?: BulkActionDropdownOption[];  // Render as dropdown
  useDefaultExportOptions?: boolean;     // Auto-generate CSV/Excel/PDF/JSON options
}

interface BulkActionDropdownOption {
  label: string;
  value: string;
  icon?: IconName;
  disabled?: boolean;
}`;

  eventTypes = `// Event Types
interface SortChange {
  field: string;
  direction: 'Ascending' | 'Descending' | '';
}

interface PageSizeChange {
  pageIndex: number;     // 0-based page index
  pageSize: number;      // Items per page
}

interface CursorPageChange {
  cursor: string;        // Opaque cursor token
  direction: 'next' | 'prev';
}

interface ColumnResizeEvent {
  field: string;
  width: number;
  previousWidth: number;
}

interface CellEditEvent<T> {
  row: T;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface CellEditErrorEvent<T> {
  row: T;
  field: string;
  value: unknown;
  error: string;         // Validation error message
}

interface RowExpandEvent<T> {
  row: T;
  expanded: boolean;
}

interface ColumnReorderEvent {
  previousIndex: number;
  currentIndex: number;
  columns: string[];     // New column order
}

interface RowReorderEvent<T> {
  row: T;
  previousIndex: number;
  currentIndex: number;
  data: readonly T[];    // Full data array after reorder
}`;

  footerTypes = `// Footer Types
interface FooterRowDef<T> {
  columns: Partial<Record<StringKey<T>, AggregateFunction | FooterCellDef<T>>>;
  class?: string;                        // CSS class for the footer row
}

interface FooterCellDef<T> {
  fn: AggregateFunction;                 // Aggregate function to compute
  label?: string;                        // Label prefix (default: auto from fn)
  field?: StringKey<T>;                  // Aggregate a different field than the column
  format?: (value: number) => string;    // Custom value formatter
  class?: string;                        // Per-cell CSS class
  custom?: (data: readonly T[]) => string | number;  // Full override
}

interface FooterConfig<T> {
  fn: AggregateFunction;
  label?: string;
  field?: StringKey<T>;
}

// CellEditorConfig — per-field editor
interface CellEditorConfig {
  type: 'text' | 'number' | 'select' | 'date' | 'toggle';
  options?: { label: string; value: unknown }[];
  validator?: (value: unknown, row: unknown) => boolean | string;
}`;

  aggregateFunctionType = `// AggregateFunction
type AggregateFunction =
  | 'sum'            // Numeric sum
  | 'avg'            // Numeric average
  | 'count'          // Row count
  | 'min'            // Minimum value
  | 'max'            // Maximum value
  | 'trueCount'      // Count of truthy values
  | 'falseCount'     // Count of falsy values
  | 'median'         // Numeric median
  | 'distinctCount'; // Count of unique values`;
}
