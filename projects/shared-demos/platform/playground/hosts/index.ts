import type { Type } from '@angular/core';

/** Lazy playground per docs page id. A page gets a Playground tab only if it is listed here. */
export const PLAYGROUNDS: Record<string, () => Promise<Type<unknown>>> = {
  dialog: () => import('./dialog.playground').then((m) => m.DialogPlaygroundComponent),
  input: () => import('./input.playground').then((m) => m.InputPlaygroundComponent),
  select: () => import('./select.playground').then((m) => m.SelectPlaygroundComponent),
  datepicker: () => import('./datepicker.playground').then((m) => m.DatepickerPlaygroundComponent),
  timepicker: () => import('./timepicker.playground').then((m) => m.TimepickerPlaygroundComponent),
  toast: () => import('./toast.playground').then((m) => m.ToastPlaygroundComponent),
  alert: () => import('./alert.playground').then((m) => m.AlertPlaygroundComponent),
  menu: () => import('./menu.playground').then((m) => m.MenuPlaygroundComponent),
  tabs: () => import('./tabs.playground').then((m) => m.TabsPlaygroundComponent),
  breadcrumbs: () => import('./breadcrumbs.playground').then((m) => m.BreadcrumbsPlaygroundComponent),
  'app-shell': () => import('./app-shell.playground').then((m) => m.AppShellPlaygroundComponent),
  'command-palette': () => import('./command-palette.playground').then((m) => m.CommandPalettePlaygroundComponent),
  table: () => import('./table.playground').then((m) => m.TablePlaygroundComponent),
  datagrid: () => import('./datagrid.playground').then((m) => m.DataGridPlaygroundComponent),
  tree: () => import('./tree.playground').then((m) => m.TreePlaygroundComponent),
  'tree-table': () => import('./tree-table.playground').then((m) => m.TreeTablePlaygroundComponent),
  'virtual-scroller': () => import('./virtual-scroller.playground').then((m) => m.VirtualScrollerPlaygroundComponent),
  notification: () => import('./notification.playground').then((m) => m.NotificationPlaygroundComponent),
  editor: () => import('./editor.playground').then((m) => m.EditorPlaygroundComponent),
  forms: () => import('./forms.playground').then((m) => m.FormsPlaygroundComponent),
  'pdf-viewer': () => import('./pdf-viewer.playground').then((m) => m.PdfViewerPlaygroundComponent),
  'document-viewer': () => import('./document-viewer.playground').then((m) => m.DocumentViewerPlaygroundComponent),
};
