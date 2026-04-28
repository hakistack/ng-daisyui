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
  ConditionShorthand,
  ConditionalLogic,
  FormValues,
  StepChangeEvent,
  StepValidationResult,
  StepContext,
  OptionsFromConfig,
  BaseFieldOptions,
  TextFieldOptions,
  EmailFieldOptions,
  PasswordFieldOptions,
  TelFieldOptions,
  UrlFieldOptions,
  TextareaFieldOptions,
  NumberFieldOptions,
  RangeFieldOptions,
  SelectFieldOptions,
  MultiSelectFieldOptions,
  RadioFieldOptions,
  CheckboxFieldOptions,
  ToggleFieldOptions,
  DateFieldOptions,
  TimeFieldOptions,
  DatetimeFieldOptions,
  ColorFieldOptions,
  FileFieldOptions,
  HiddenFieldOptions,
} from './dynamic-form/dynamic-form.types';

// Tab
export { TabGroupComponent } from './tab/tab-group/tab-group.component';
export { TabPanelComponent } from './tab/tab-panel/tab-panel.component';

// Dialog Wrapper
export { DialogWrapperComponent } from './dialog-wrapper/dialog-wrapper.component';

// Input
export { InputComponent } from './input/input.component';
export type {
  InputVariant,
  InputSize,
  InputColor,
  CurrencyConfig,
  PhoneConfig,
  PercentageConfig,
  PasswordConfig,
} from './input/input.types';

// Virtual Scroller
export { VirtualScrollerComponent } from './virtual-scroller/virtual-scroller.component';
export type {
  VirtualScrollerOrientation,
  VirtualScrollerLazyLoadEvent,
  VirtualScrollerItemContext,
  VirtualScrollerLoaderContext,
  VirtualScrollerScrollEvent,
  VirtualScrollBehavior,
} from './virtual-scroller/virtual-scroller.types';

// Toast
export { ToastComponent } from './toast/toast.component';
export { ToastService } from './toast/toast.service';
export { TOAST_CONFIG, DEFAULT_TOAST_CONFIG } from './toast/toast.config';
export type { ToastGlobalConfig } from './toast/toast.config';
export type { Toast, ToastOptions, ToastAction, ToastSeverity, ToastPosition } from './toast/toast.types';

// Editor (TipTap-backed <hk-editor>; see docs/plans/editor.md)
export { EditorComponent } from './editor/editor.component';
export { EditorToolbarComponent } from './editor/editor-toolbar.component';
export { TOOLBAR_PRESETS, TOOLBAR_ICONS, TOOLBAR_LABELS } from './editor/editor.defaults';
export type {
  EditorToolbarConfig,
  EditorToolbarItem,
  EditorToolbarPreset,
  EditorTextChangeEvent,
  EditorImageUploader,
} from './editor/editor.types';
