import { Type } from '@angular/core';
import { Routes } from '@angular/router';

type Loader = () => Promise<Type<unknown>>;

/**
 * A component page: `/x` opens the docs overview, `/x/:feature` opens a live
 * example tab. Both render the same demo component (the demo-page frame
 * decides which tab to show from the URL).
 */
function componentPage(path: string, load: Loader): Routes {
  return [
    { path, loadComponent: load },
    { path: `${path}/:feature`, loadComponent: load },
  ];
}

const article: Loader = () => import('@shared-demos/platform/pages/article-page.component').then((m) => m.ArticlePageComponent);
const api: Loader = () => import('@shared-demos/platform/pages/api-reference.component').then((m) => m.ApiReferenceComponent);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'getting-started' },

  // Getting started
  {
    path: 'getting-started',
    loadComponent: () => import('@shared-demos/demos/getting-started.component').then((m) => m.GettingStartedComponent),
  },
  { path: 'installation', loadComponent: () => import('@shared-demos/demos/installation.component').then((m) => m.InstallationComponent) },
  { path: 'key-patterns', loadComponent: () => import('@shared-demos/demos/key-patterns.component').then((m) => m.KeyPatternsComponent) },

  // Foundations
  { path: 'foundations/:slug', loadComponent: article },
  ...componentPage('icons', () => import('@shared-demos/demos/icons-demo.component').then((m) => m.IconsDemoComponent)),
  ...componentPage('motion', () => import('@shared-demos/demos/motion-demo.component').then((m) => m.MotionDemoComponent)),

  // Components — forms & inputs
  ...componentPage('forms', () => import('@shared-demos/demos/forms-demo.component').then((m) => m.FormsDemoComponent)),
  ...componentPage('wizard', () => import('@shared-demos/demos/wizard-demo.component').then((m) => m.WizardDemoComponent)),
  ...componentPage('input', () => import('@shared-demos/demos/input-demo.component').then((m) => m.InputDemoComponent)),
  ...componentPage('select', () => import('@shared-demos/demos/select-demo.component').then((m) => m.SelectDemoComponent)),
  ...componentPage('datepicker', () => import('@shared-demos/demos/datepicker-demo.component').then((m) => m.DatepickerDemoComponent)),
  ...componentPage('timepicker', () => import('@shared-demos/demos/timepicker-demo.component').then((m) => m.TimepickerDemoComponent)),
  ...componentPage('editor', () => import('@shared-demos/demos/editor-demo.component').then((m) => m.EditorDemoComponent)),

  // Components — data display
  ...componentPage('table', () => import('@shared-demos/demos/table-demo.component').then((m) => m.TableDemoComponent)),
  ...componentPage('datagrid', () => import('@shared-demos/demos/datagrid-demo.component').then((m) => m.DataGridDemoComponent)),
  ...componentPage('tree-table', () => import('@shared-demos/demos/tree-table-demo.component').then((m) => m.TreeTableDemoComponent)),
  ...componentPage('tree', () => import('@shared-demos/demos/tree-demo.component').then((m) => m.TreeDemoComponent)),
  ...componentPage('virtual-scroller', () =>
    import('@shared-demos/demos/virtual-scroller-demo.component').then((m) => m.VirtualScrollerDemoComponent),
  ),

  // Components — navigation
  ...componentPage('menu', () => import('@shared-demos/demos/menu-demo.component').then((m) => m.MenuDemoComponent)),
  ...componentPage('app-shell', () => import('@shared-demos/demos/app-shell-demo.component').then((m) => m.AppShellDemoComponent)),
  {
    path: 'breadcrumbs',
    data: { breadcrumb: 'Breadcrumbs' },
    loadComponent: () => import('@shared-demos/demos/breadcrumbs-demo.component').then((m) => m.BreadcrumbsDemoComponent),
  },
  {
    path: 'breadcrumbs/:feature',
    data: { breadcrumb: 'Breadcrumbs' },
    loadComponent: () => import('@shared-demos/demos/breadcrumbs-demo.component').then((m) => m.BreadcrumbsDemoComponent),
  },
  ...componentPage('tabs', () => import('@shared-demos/demos/tabs-demo.component').then((m) => m.TabsDemoComponent)),
  ...componentPage('command-palette', () =>
    import('@shared-demos/demos/command-palette-demo.component').then((m) => m.CommandPaletteDemoComponent),
  ),

  // Components — feedback
  ...componentPage('toast', () => import('@shared-demos/demos/toast-demo.component').then((m) => m.ToastDemoComponent)),
  ...componentPage('notification', () =>
    import('@shared-demos/demos/notification-demo.component').then((m) => m.NotificationDemoComponent),
  ),
  ...componentPage('alert', () => import('@shared-demos/demos/alert-demo.component').then((m) => m.AlertDemoComponent)),
  ...componentPage('dialog', () => import('@shared-demos/demos/dialog-demo.component').then((m) => m.DialogDemoComponent)),

  // Components — editors & documents
  ...componentPage('pdf-viewer', () => import('@shared-demos/demos/pdf-viewer-demo.component').then((m) => m.PdfViewerDemoComponent)),
  ...componentPage('document-viewer', () =>
    import('@shared-demos/demos/document-viewer-demo.component').then((m) => m.DocumentViewerDemoComponent),
  ),
  ...componentPage('document-editor', () =>
    import('@shared-demos/demos/document-editor-demo.component').then((m) => m.DocumentEditorDemoComponent),
  ),

  // Features & systems, guides, architecture, contributing (long-form articles)
  { path: 'systems/:slug', loadComponent: article },
  { path: 'guides/:slug', loadComponent: article },
  { path: 'architecture/:slug', loadComponent: article },
  { path: 'contributing', loadComponent: article },

  // API reference (generated)
  { path: 'api', loadComponent: api },
  { path: 'api/:name', loadComponent: api },

  // Lab — WASM engine validation (not in the sidebar)
  {
    path: 'engine-stress',
    loadComponent: () => import('@shared-demos/demos/engine-stress-demo.component').then((m) => m.EngineStressDemoComponent),
  },

  { path: '**', loadComponent: () => import('@shared-demos/platform/pages/not-found.component').then((m) => m.NotFoundComponent) },
];
