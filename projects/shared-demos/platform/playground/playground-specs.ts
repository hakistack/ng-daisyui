import type { PlaygroundSpec } from './playground.types';
import { DIALOG_PLAYGROUND } from './specs/dialog';
import { ALERT_PLAYGROUND } from './specs/alert';
import { DATEPICKER_PLAYGROUND } from './specs/datepicker';
import { INPUT_PLAYGROUND } from './specs/input';
import { SELECT_PLAYGROUND } from './specs/select';
import { TIMEPICKER_PLAYGROUND } from './specs/timepicker';
import { TOAST_PLAYGROUND } from './specs/toast';
import { MENU_PLAYGROUND } from './specs/menu';
import { TABS_PLAYGROUND } from './specs/tabs';
import { BREADCRUMBS_PLAYGROUND } from './specs/breadcrumbs';
import { APP_SHELL_PLAYGROUND } from './specs/app-shell';
import { COMMAND_PALETTE_PLAYGROUND } from './specs/command-palette';
import { TABLE_PLAYGROUND } from './specs/table';
import { DATAGRID_PLAYGROUND } from './specs/datagrid';
import { TREE_PLAYGROUND } from './specs/tree';
import { TREE_TABLE_PLAYGROUND } from './specs/tree-table';
import { VIRTUAL_SCROLLER_PLAYGROUND } from './specs/virtual-scroller';
import { NOTIFICATION_PLAYGROUND } from './specs/notification';
import { EDITOR_PLAYGROUND } from './specs/editor';
import { FORMS_PLAYGROUND } from './specs/forms';
import { PDF_VIEWER_PLAYGROUND } from './specs/pdf-viewer';
import { DOCUMENT_VIEWER_PLAYGROUND } from './specs/document-viewer';

export { ALERT_PLAYGROUND, DATEPICKER_PLAYGROUND, INPUT_PLAYGROUND, SELECT_PLAYGROUND, TIMEPICKER_PLAYGROUND, TOAST_PLAYGROUND };

/**
 * Every playground spec, keyed by docs page id. One file per playground in
 * `specs/`, one host component per playground in `hosts/` (lazy).
 * `npm run docs:check` validates every spec against the API manifest.
 */
export const PLAYGROUND_SPECS: Record<string, PlaygroundSpec> = {
  dialog: DIALOG_PLAYGROUND,
  input: INPUT_PLAYGROUND,
  select: SELECT_PLAYGROUND,
  datepicker: DATEPICKER_PLAYGROUND,
  timepicker: TIMEPICKER_PLAYGROUND,
  toast: TOAST_PLAYGROUND,
  alert: ALERT_PLAYGROUND,
  menu: MENU_PLAYGROUND,
  tabs: TABS_PLAYGROUND,
  breadcrumbs: BREADCRUMBS_PLAYGROUND,
  'app-shell': APP_SHELL_PLAYGROUND,
  'command-palette': COMMAND_PALETTE_PLAYGROUND,
  table: TABLE_PLAYGROUND,
  datagrid: DATAGRID_PLAYGROUND,
  tree: TREE_PLAYGROUND,
  'tree-table': TREE_TABLE_PLAYGROUND,
  'virtual-scroller': VIRTUAL_SCROLLER_PLAYGROUND,
  notification: NOTIFICATION_PLAYGROUND,
  editor: EDITOR_PLAYGROUND,
  forms: FORMS_PLAYGROUND,
  'pdf-viewer': PDF_VIEWER_PLAYGROUND,
  'document-viewer': DOCUMENT_VIEWER_PLAYGROUND,
};
