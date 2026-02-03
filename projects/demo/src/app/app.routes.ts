import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'forms', pathMatch: 'full' },
  { path: 'forms', loadComponent: () => import('./demos/forms-demo.component').then((m) => m.FormsDemoComponent) },
  { path: 'wizard', loadComponent: () => import('./demos/wizard-demo.component').then((m) => m.WizardDemoComponent) },
  { path: 'table', loadComponent: () => import('./demos/table-demo.component').then((m) => m.TableDemoComponent) },
  { path: 'select', loadComponent: () => import('./demos/select-demo.component').then((m) => m.SelectDemoComponent) },
  { path: 'datepicker', loadComponent: () => import('./demos/datepicker-demo.component').then((m) => m.DatepickerDemoComponent) },
  { path: 'tabs', loadComponent: () => import('./demos/tabs-demo.component').then((m) => m.TabsDemoComponent) },
  { path: 'toast', loadComponent: () => import('./demos/toast-demo.component').then((m) => m.ToastDemoComponent) },
  { path: 'alert', loadComponent: () => import('./demos/alert-demo.component').then((m) => m.AlertDemoComponent) },
  { path: 'icons', loadComponent: () => import('./demos/icons-demo.component').then((m) => m.IconsDemoComponent) },
  { path: 'motion', loadComponent: () => import('./demos/motion-demo.component').then((m) => m.MotionDemoComponent) },
];
