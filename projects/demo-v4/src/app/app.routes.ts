import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'getting-started', pathMatch: 'full' },
  {
    path: 'getting-started',
    loadComponent: () => import('@shared-demos/demos/getting-started-v4.component').then((m) => m.GettingStartedV4Component),
  },
  {
    path: 'installation',
    loadComponent: () => import('@shared-demos/demos/installation-v4.component').then((m) => m.InstallationV4Component),
  },
  {
    path: 'key-patterns',
    loadComponent: () => import('@shared-demos/demos/key-patterns-v4.component').then((m) => m.KeyPatternsV4Component),
  },
  { path: 'forms', loadComponent: () => import('@shared-demos/demos/forms-demo.component').then((m) => m.FormsDemoComponent) },
  { path: 'wizard', loadComponent: () => import('@shared-demos/demos/wizard-demo.component').then((m) => m.WizardDemoComponent) },
  { path: 'table', loadComponent: () => import('@shared-demos/demos/table-demo.component').then((m) => m.TableDemoComponent) },
  {
    path: 'tree-table',
    loadComponent: () => import('@shared-demos/demos/tree-table-demo.component').then((m) => m.TreeTableDemoComponent),
  },
  {
    path: 'virtual-scroller',
    loadComponent: () => import('@shared-demos/demos/virtual-scroller-demo.component').then((m) => m.VirtualScrollerDemoComponent),
  },
  { path: 'tree', loadComponent: () => import('@shared-demos/demos/tree-demo.component').then((m) => m.TreeDemoComponent) },
  { path: 'org-chart', loadComponent: () => import('@shared-demos/demos/org-chart-demo.component').then((m) => m.OrgChartDemoComponent) },
  { path: 'input', loadComponent: () => import('@shared-demos/demos/input-demo.component').then((m) => m.InputDemoComponent) },
  { path: 'select', loadComponent: () => import('@shared-demos/demos/select-demo.component').then((m) => m.SelectDemoComponent) },
  {
    path: 'datepicker',
    loadComponent: () => import('@shared-demos/demos/datepicker-demo.component').then((m) => m.DatepickerDemoComponent),
  },
  {
    path: 'timepicker',
    loadComponent: () => import('@shared-demos/demos/timepicker-demo.component').then((m) => m.TimepickerDemoComponent),
  },
  { path: 'editor', loadComponent: () => import('@shared-demos/demos/editor-demo.component').then((m) => m.EditorDemoComponent) },
  { path: 'tabs', loadComponent: () => import('@shared-demos/demos/tabs-demo.component').then((m) => m.TabsDemoComponent) },
  { path: 'toast', loadComponent: () => import('@shared-demos/demos/toast-demo.component').then((m) => m.ToastDemoComponent) },
  { path: 'alert', loadComponent: () => import('@shared-demos/demos/alert-demo.component').then((m) => m.AlertDemoComponent) },
  { path: 'dialog', loadComponent: () => import('@shared-demos/demos/dialog-demo.component').then((m) => m.DialogDemoComponent) },
  { path: 'icons', loadComponent: () => import('@shared-demos/demos/icons-demo.component').then((m) => m.IconsDemoComponent) },
  { path: 'motion', loadComponent: () => import('@shared-demos/demos/motion-demo.component').then((m) => m.MotionDemoComponent) },
];
