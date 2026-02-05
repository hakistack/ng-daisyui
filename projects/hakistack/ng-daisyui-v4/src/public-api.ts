/*
 * @hakistack/ui
 * Reusable Angular UI components with DaisyUI and Tailwind CSS
 */

// ============================================================================
// COMPONENTS
// ============================================================================

// Dynamic Form
export { DynamicFormComponent } from './lib/components/dynamic-form/dynamic-form.component';
export { createForm, field, step, validation, layout } from './lib/components/dynamic-form/dynamic-form.helpers';
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
  AutoSaveConfig,
  CreateFormInput,
  FormController,
  ResponsiveColSpan,
  FieldWidth,
} from './lib/components/dynamic-form/dynamic-form.types';

// Table
export { TableComponent } from './lib/components/table/table.component';
export { TablePaginationComponent } from './lib/components/table/table-pagination.component';
export { TableFilterComponent } from './lib/components/table/table-filter.component';
export { TableGlobalSearchComponent } from './lib/components/table/table-global-search.component';
export { TableColumnVisibilityComponent } from './lib/components/table/table-column-visibility.component';
export { createTable, projectFields, clearHeaderFormatCache } from './lib/components/table/table.helpers';
export type {
  FieldConfig,
  FieldConfiguration,
  ColumnDefinition,
  TableAction,
  TableBulkAction,
  BulkActionDropdownOption,
  ExportFormat,
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
} from './lib/components/table/table.types';

// Select
export { SelectComponent } from './lib/components/select/select.component';
export type { SelectOption } from './lib/components/select/select.types';
export type { SelectSize, SelectColor } from './lib/components/select/select.component';

// Datepicker
export { DatepickerComponent } from './lib/components/datepicker/datepicker.component';
export { DatepickerUtilsService } from './lib/components/datepicker/datepicker-utils.service';
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
} from './lib/components/datepicker/datepicker.types';

// Stepper
export { StepperComponent } from './lib/components/stepper/stepper.component';

// Tabs
export { TabGroupComponent } from './lib/components/tab/tab-group/tab-group.component';
export { TabPanelComponent } from './lib/components/tab/tab-panel/tab-panel.component';

// Toast
export { ToastComponent } from './lib/components/toast/toast.component';
export { ToastService } from './lib/components/toast/toast.service';
export { TOAST_CONFIG, DEFAULT_TOAST_CONFIG, provideToast } from './lib/components/toast/toast.config';
export type { ToastGlobalConfig } from './lib/components/toast/toast.config';
export type { Toast, ToastOptions, ToastAction, ToastSeverity, ToastPosition } from './lib/components/toast/toast.types';

// Lucide Icon
export { LucideIconComponent } from './lib/components/lucide-icon/lucide-icon.component';
export type { IconName, LowerCaseIconName } from './lib/components/lucide-icon/lucide-icon.component';

// Dialog Wrapper
export { DialogWrapperComponent } from './lib/components/dialog-wrapper/dialog-wrapper.component';

// ============================================================================
// SERVICES
// ============================================================================

export { FormStateService, provideFormState } from './lib/services/form-state.service';
export { PipeRegistryService } from './lib/services/pipe-registry.service';

// Dialog Service
export { DialogService } from './lib/services/dialog/dialog.service';

// Alert Service
export { AlertService, provideAlert } from './lib/services/alert/alert.service';
export type { AlertConfig } from './lib/services/alert/alert.service';
export type {
  AlertOptions,
  AlertResult,
  ConfirmOptions,
  DeleteConfirmOptions,
  LoadingOptions,
  AlertIcon,
  AlertPosition,
} from './lib/services/alert/alert.types';

// ============================================================================
// DIRECTIVES
// ============================================================================

export { AutoFocusDirective } from './lib/directives/auto-focus/auto-focus.directive';
export { MotionAnimateDirective } from './lib/directives/motion-animate/motion-animate.directive';
export { MotionHoverDirective } from './lib/directives/motion-hover/motion-hover.directive';
export { MotionScrollDirective } from './lib/directives/motion-scroll/motion-scroll.directive';


// ============================================================================
// TYPES
// ============================================================================

export {
  BUILTIN_PIPE_REGISTRY,
  fmt,
  type BuiltinPipeName,
  type DatePipeOptions,
  type CurrencyPipeOptions,
  type NumberPipeOptions,
  type PercentPipeOptions,
  type PipeFormatter,
  type PipeRegistry,
} from './lib/types/base-pipes.type';

export type { CurrencyCode } from './lib/types/currency-codes.types';
