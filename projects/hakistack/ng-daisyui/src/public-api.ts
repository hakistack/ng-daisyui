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
export { FormUtils } from './lib/components/dynamic-form/dynamic-form.utils';
export type {
  FormConfig,
  FormFieldConfig,
  FormSubmissionData,
  FormSelectOption,
  FieldType,
  FormStep,
  StepperConfig,
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
  OptionsFromConfig,
  // Type-narrowed field option interfaces
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
} from './lib/components/dynamic-form/dynamic-form.types';

// Table
export { TableComponent } from './lib/components/table/table.component';
export { HkCellTemplateDirective } from './lib/components/table/table-cell-template.directive';
export { HkFooterDirective } from './lib/components/table/table-footer-template.directive';
export { TablePaginationComponent } from './lib/components/table/table-pagination.component';
export { TableFilterComponent } from './lib/components/table/table-filter.component';
export { TableGlobalSearchComponent } from './lib/components/table/table-global-search.component';
export { TableColumnVisibilityComponent } from './lib/components/table/table-column-visibility.component';
export {
  createTable,
  projectFields,
  clearHeaderFormatCache,
  flattenTreeData,
  generateRowKey,
  getRowChildren,
  rowHasChildren,
  groupData,
  resolveFooterRows,
  resolveGroupAggregates,
  isColspanFooterRow,
  exportToCsv,
  exportToJson,
} from './lib/components/table/table.helpers';
export { computeAggregate, aggregate } from './lib/components/table/table-aggregates';
export type {
  ChildGridConfig,
  MasterDetailConfig,
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
  TreeTableConfig,
  FlattenedRow,
  VirtualScrollConfig,
  CellEditorConfig,
  CellEditEvent,
  CellEditErrorEvent,
  ColumnResizeEvent,
  FooterConfig,
  FooterRowDef,
  ColumnAlignedFooterRowDef,
  ColspanFooterRowDef,
  FooterCellDef,
  FooterColspanCellDef,
  ResolvedFooterRow,
  ResolvedColspanCell,
  RowExpandEvent,
  ColumnReorderEvent,
  RowReorderEvent,
  GroupConfig,
  RowGroup,
  GroupExpandEvent,
  ResolvedGroupAggregates,
} from './lib/components/table/table.types';
export type { AggregateFunction } from './lib/components/table/table-aggregates';

// Input
export { InputComponent } from './lib/components/input/input.component';
export type {
  InputVariant,
  InputSize,
  InputColor,
  CurrencyConfig,
  PhoneConfig,
  PercentageConfig,
  PasswordConfig,
} from './lib/components/input/input.types';
export type { InputVariantStrategy } from './lib/components/input/input-variant-strategies';

// Select
export { SelectComponent } from './lib/components/select/select.component';
export type { SelectOption } from './lib/components/select/select.types';
export type { SelectSize, SelectColor, SelectValue, SelectOptionGroup } from './lib/components/select/select.component';

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

// Timepicker
export { TimepickerComponent } from './lib/components/timepicker/timepicker.component';
export type { TimepickerEvent, TimepickerPosition, TimepickerView, ClockPosition } from './lib/components/timepicker/timepicker.types';

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
export { ICON_REGISTRY, provideIcons } from './lib/components/lucide-icon/icon-registry';
export type { IconRegistry } from './lib/components/lucide-icon/icon-registry';

// Dialog Wrapper
export { DialogWrapperComponent } from './lib/components/dialog-wrapper/dialog-wrapper.component';

// Organization Chart
export { OrganizationChartComponent } from './lib/components/organization-chart/organization-chart.component';
export type {
  OrgChartSelectionMode,
  OrgChartNodeSelectEvent,
  OrgChartNodeUnselectEvent,
  OrgChartNodeExpandEvent,
  OrgChartNodeCollapseEvent,
  OrgChartNodeTemplateContext,
  OrgChartOrientation,
  OrgChartNodeColor,
} from './lib/components/organization-chart/organization-chart.types';

// Tree
export { TreeComponent } from './lib/components/tree/tree.component';
export {
  createTree,
  node,
  walkTree,
  findNode,
  findNodePath,
  mapTree,
  filterTree,
  flattenTree,
  countNodes,
  ensureKeys,
  buildTree,
} from './lib/components/tree/tree.helpers';
export type {
  TreeConfig,
  TreeNodeTemplateContext,
  TreeFilterEvent,
  TreeLazyLoadEvent,
  FlatTreeNode,
  TreeNodeState,
  CreateTreeInput,
  TreeSetup,
  FromDataOptions,
  BuildTreeOptions,
  TreeNodeSelectEvent as TreeSelectEvent,
  TreeNodeUnselectEvent as TreeUnselectEvent,
  TreeNodeExpandEvent as TreeExpandEvent,
  TreeNodeCollapseEvent as TreeCollapseEvent,
  TreeNodeDropEvent as TreeDropEvent,
  TreeNodeDragStartEvent as TreeDragStartEvent,
  TreeNodeDragEndEvent as TreeDragEndEvent,
} from './lib/components/tree/tree.types';

// Virtual Scroller
export { VirtualScrollerComponent } from './lib/components/virtual-scroller/virtual-scroller.component';
export type {
  VirtualScrollerOrientation,
  VirtualScrollerLazyLoadEvent,
  VirtualScrollerItemContext,
  VirtualScrollerLoaderContext,
  VirtualScrollerScrollEvent,
  VirtualScrollBehavior,
} from './lib/components/virtual-scroller/virtual-scroller.types';

// ============================================================================
// API (Core Types)
// ============================================================================

export type {
  TreeNode,
  TreeNodeSelectEvent,
  TreeNodeUnselectEvent,
  TreeNodeExpandEvent,
  TreeNodeCollapseEvent,
  TreeNodeDragStartEvent,
  TreeNodeDropEvent,
  TreeSelectionMode,
} from './lib/api/treenode';

// ============================================================================
// SERVICES
// ============================================================================

export { FormStateService, provideFormState } from './lib/services/form-state.service';
export type {
  FormStateOptions,
  FormStateApiOptions,
  FormStateLocalStorageOptions,
  FormStateStorageMode,
  FormState,
  FormStateMetadata,
} from './lib/services/form-state.service';
export { PipeRegistryService, providePipes } from './lib/services/pipe-registry.service';

// Dialog Service
export { DialogService } from './lib/services/dialog/dialog.service';

// Alert Service
export { AlertService, provideAlert } from './lib/components/alert/alert.service';
export type { AlertConfig } from './lib/components/alert/alert.service';
export type {
  AlertOptions,
  AlertResult,
  ConfirmOptions,
  CountdownOptions,
  DeleteConfirmOptions,
  LoadingOptions,
  AlertIcon,
  AlertPosition,
  AlertSize,
} from './lib/components/alert/alert.types';

// ============================================================================
// DIRECTIVES
// ============================================================================

export { AutoFocusDirective } from './lib/directives/auto-focus/auto-focus.directive';
export { InputMaskDirective } from './lib/directives/input-mask/input-mask.directive';
export type { MaskDefinition, MaskSlot, MaskChar } from './lib/directives/input-mask/input-mask.types';
export { MotionAnimateDirective } from './lib/directives/motion-animate/motion-animate.directive';
export { MotionHoverDirective } from './lib/directives/motion-hover/motion-hover.directive';
export { MotionScrollDirective } from './lib/directives/motion-scroll/motion-scroll.directive';

// Motion shared types
export type {
  Easing,
  EasingFunction,
  AnimationPreset,
  TriggerType,
  MotionAnimationOptions,
  MotionDirectiveOptions,
} from './lib/directives/motion.types';
export type { HoverKeyframes, HoverOptions } from './lib/directives/motion-hover/motion-hover.directive';
export type {
  ScrollAnimationKeyframes,
  ScrollOptions,
  ScrollAxis,
  ScrollOffset,
} from './lib/directives/motion-scroll/motion-scroll.directive';

// ============================================================================
// THEME
// ============================================================================

export { HK_THEME, provideHkTheme } from './lib/theme/theme.config';
export type { HkThemeConfig, HkThemeId } from './lib/theme/theme.config';

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
