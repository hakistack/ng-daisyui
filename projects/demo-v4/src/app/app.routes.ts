import { Routes } from '@angular/router';
import { SHOW_OVERVIEW } from '@shared-demos/config';

export const routes: Routes = [
  { path: '', redirectTo: SHOW_OVERVIEW ? 'getting-started' : 'forms/layouts', pathMatch: 'full' },
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
  // Forms
  { path: 'forms', redirectTo: 'forms/layouts', pathMatch: 'full' },
  { path: 'forms/:feature', loadComponent: () => import('@shared-demos/demos/forms-demo.component').then((m) => m.FormsDemoComponent) },
  { path: 'wizard', redirectTo: 'wizard/linear', pathMatch: 'full' },
  { path: 'wizard/:feature', loadComponent: () => import('@shared-demos/demos/wizard-demo.component').then((m) => m.WizardDemoComponent) },
  // Data Display
  { path: 'table', redirectTo: 'table/basic', pathMatch: 'full' },
  { path: 'table/:feature', loadComponent: () => import('@shared-demos/demos/table-demo.component').then((m) => m.TableDemoComponent) },
  { path: 'tree-table', redirectTo: 'tree-table/treenode', pathMatch: 'full' },
  {
    path: 'tree-table/:feature',
    loadComponent: () => import('@shared-demos/demos/tree-table-demo.component').then((m) => m.TreeTableDemoComponent),
  },
  { path: 'virtual-scroller', redirectTo: 'virtual-scroller/basic', pathMatch: 'full' },
  {
    path: 'virtual-scroller/:feature',
    loadComponent: () => import('@shared-demos/demos/virtual-scroller-demo.component').then((m) => m.VirtualScrollerDemoComponent),
  },
  { path: 'tree', redirectTo: 'tree/basic', pathMatch: 'full' },
  { path: 'tree/:feature', loadComponent: () => import('@shared-demos/demos/tree-demo.component').then((m) => m.TreeDemoComponent) },
  // Inputs
  { path: 'input', redirectTo: 'input/basic', pathMatch: 'full' },
  { path: 'input/:feature', loadComponent: () => import('@shared-demos/demos/input-demo.component').then((m) => m.InputDemoComponent) },
  { path: 'select', redirectTo: 'select/basic', pathMatch: 'full' },
  { path: 'select/:feature', loadComponent: () => import('@shared-demos/demos/select-demo.component').then((m) => m.SelectDemoComponent) },
  { path: 'datepicker', redirectTo: 'datepicker/basic', pathMatch: 'full' },
  {
    path: 'datepicker/:feature',
    loadComponent: () => import('@shared-demos/demos/datepicker-demo.component').then((m) => m.DatepickerDemoComponent),
  },
  { path: 'timepicker', redirectTo: 'timepicker/basic', pathMatch: 'full' },
  {
    path: 'timepicker/:feature',
    loadComponent: () => import('@shared-demos/demos/timepicker-demo.component').then((m) => m.TimepickerDemoComponent),
  },
  { path: 'editor', redirectTo: 'editor/basic', pathMatch: 'full' },
  { path: 'editor/:feature', loadComponent: () => import('@shared-demos/demos/editor-demo.component').then((m) => m.EditorDemoComponent) },
  // Navigation
  { path: 'tabs', redirectTo: 'tabs/basic', pathMatch: 'full' },
  { path: 'tabs/:feature', loadComponent: () => import('@shared-demos/demos/tabs-demo.component').then((m) => m.TabsDemoComponent) },
  // Feedback
  { path: 'toast', redirectTo: 'toast/basic', pathMatch: 'full' },
  { path: 'toast/:feature', loadComponent: () => import('@shared-demos/demos/toast-demo.component').then((m) => m.ToastDemoComponent) },
  { path: 'alert', redirectTo: 'alert/basic', pathMatch: 'full' },
  { path: 'alert/:feature', loadComponent: () => import('@shared-demos/demos/alert-demo.component').then((m) => m.AlertDemoComponent) },
  { path: 'dialog', redirectTo: 'dialog/basic', pathMatch: 'full' },
  { path: 'dialog/:feature', loadComponent: () => import('@shared-demos/demos/dialog-demo.component').then((m) => m.DialogDemoComponent) },
  // Utilities
  { path: 'motion', redirectTo: 'motion/animate', pathMatch: 'full' },
  { path: 'motion/:feature', loadComponent: () => import('@shared-demos/demos/motion-demo.component').then((m) => m.MotionDemoComponent) },
  // Charts
  { path: 'dashboard', loadComponent: () => import('@shared-demos/demos/dashboard-demo.component').then((m) => m.DashboardDemoComponent) },
];
