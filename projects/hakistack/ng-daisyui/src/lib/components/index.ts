// ============================================================================
// UI Components
// ============================================================================

// Datepicker
export { DatepickerComponent } from './datepicker/datepicker.component';
export { DatepickerUtilsService } from './datepicker/datepicker-utils.service';
export type {
  DatepickerConfig,
  DateSelection,
  DateRangeSelection,
  DatepickerEvent,
  DatepickerPosition,
  DatepickerStyleConfig,
  DayCell,
  WeekdayInfo,
  MonthInfo,
  YearInfo,
  ViewMode,
} from './datepicker/datepicker.types';

// Table
export { TableComponent } from './table/table.component';
export { TablePaginationComponent } from './table/table-pagination.component';
export { TableFilterComponent } from './table/table-filter.component';
export { TableGlobalSearchComponent } from './table/table-global-search.component';
export { TableColumnVisibilityComponent } from './table/table-column-visibility.component';
export { createTable, projectFields, clearHeaderFormatCache } from './table/table.helpers';
export type {
  FieldConfig,
  FieldConfiguration,
  ColumnDefinition,
  TableAction,
  TableBulkAction,
  Formatter,
  StringKey,
  CSSProperties,
  ActionType,
  TableConfig,
  GlobalSearchConfig,
  GlobalSearchMode,
  GlobalSearchChange,
  ColumnVisibilityConfig,
  FilterConfig,
  ColumnFilter,
  FilterOption,
  FilterChange,
  FilterOperator,
  FilterType,
  PaginationOptions,
  CursorPageChange,
  PageSizeChange,
  SortChange,
  SortDirection,
  SortConfig,
  CellDisplay,
} from './table/table.types';

// Select
export { SelectComponent } from './select/select.component';
export type { SelectOption } from './select/select.types';
export type { SelectSize, SelectColor } from './select/select.component';

// Stepper
export { StepperComponent } from './stepper/stepper.component';

// Dynamic Form
export { DynamicFormComponent } from './dynamic-form/dynamic-form.component';
export { createForm, field, step, validation, layout } from './dynamic-form/dynamic-form.helpers';
export type {
  FormConfig,
  FormFieldConfig,
  FormSubmissionData,
  FormSelectOption,
  FieldType,
  FormStep,
  StepperConfig,
  FieldValidation,
  ConditionalLogic,
  FormValues,
  StepChangeEvent,
  StepValidationResult,
  StepContext,
} from './dynamic-form/dynamic-form.types';

// Lucide Icon
export { LucideIconComponent } from './lucide-icon/lucide-icon.component';
export type { IconName, LowerCaseIconName } from './lucide-icon/lucide-icon.component';

// Tab
export { TabGroupComponent } from './tab/tab-group/tab-group.component';
export { TabPanelComponent } from './tab/tab-panel/tab-panel.component';

// Dialog Wrapper
export { DialogWrapperComponent } from './dialog-wrapper/dialog-wrapper.component';

// Organization Chart
export { OrganizationChartComponent } from './organization-chart/organization-chart.component';
export type {
  OrgChartSelectionMode,
  OrgChartNodeSelectEvent,
  OrgChartNodeUnselectEvent,
  OrgChartNodeExpandEvent,
  OrgChartNodeCollapseEvent,
  OrgChartNodeTemplateContext,
  OrgChartOrientation,
  OrgChartNodeColor,
} from './organization-chart/organization-chart.types';

// Toast
export { ToastComponent } from './toast/toast.component';
export { ToastService } from './toast/toast.service';
export { TOAST_CONFIG, DEFAULT_TOAST_CONFIG } from './toast/toast.config';
export type { ToastGlobalConfig } from './toast/toast.config';
export type { Toast, ToastOptions, ToastAction, ToastSeverity, ToastPosition } from './toast/toast.types';
