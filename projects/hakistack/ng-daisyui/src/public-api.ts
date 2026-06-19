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
export { ConditionEngine } from './lib/components/dynamic-form/condition-engine';
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
  DynamicFormLabels,
  provideDynamicFormLabels,
} from './lib/components/dynamic-form/dynamic-form.types';

// Table
export { TableComponent } from './lib/components/table/table.component';
export { HkCellTemplateDirective } from './lib/components/table/table-cell-template.directive';
export { HkFooterDirective } from './lib/components/table/table-footer-template.directive';
export { TablePaginationComponent } from './lib/components/table/table-pagination.component';
export { TableFilterComponent } from './lib/components/table/table-filter.component';
export { TableGlobalSearchComponent } from './lib/components/table/table-global-search.component';
export { TableColumnVisibilityComponent } from './lib/components/table/table-column-visibility.component';
export { createTable, exportToCsv, exportToJson, projectFields, clearHeaderFormatCache } from './lib/components/table/table.helpers';
export { computeAggregate, aggregate } from './lib/components/table/table-aggregates';

// Table — WASM engine bridge (lazy-loaded). Type names are prefixed with
// `Engine` where they would clash with existing table types in this barrel.
export {
  TableEngineService,
  TableHandle,
  HK_TABLE_ENGINE_WASM_URL,
  provideTableEngineWasmUrl,
  type ColumnKind as EngineColumnKind,
  type ColumnSchema as EngineColumnSchema,
  type FilterDef as EngineFilterDef,
  type SearchSpec as EngineSearchSpec,
  type SearchMode as EngineSearchMode,
  type SortDef as EngineSortDef,
  type AggFn as EngineAggFn,
  type AggResult as EngineAggResult,
  type GroupNode as EngineGroupNode,
  type GroupKey as EngineGroupKey,
  type TextOp as EngineTextOp,
  type NumberOp as EngineNumberOp,
  type BoolOp as EngineBoolOp,
  type DateOp as EngineDateOp,
  type SortDirection as EngineSortDirection,
  type NullsPosition as EngineNullsPosition,
} from './lib/components/table/engine';

// Tree — WASM engine bridge (lazy-loaded; shares the same engine_wasm bundle).
// Type names prefixed with `Engine` to avoid clashes with the existing
// `<hk-tree>` component types that are also exported from this barrel.
export {
  TreeEngineService,
  TreeHandle,
  type TreeFilterMode as EngineTreeFilterMode,
  type TreeFilterSpec as EngineTreeFilterSpec,
  type TreeFlatRow as EngineTreeFlatRow,
  type TreeNodeState as EngineTreeNodeState,
  type TreeCascadeEntry as EngineTreeCascadeEntry,
} from './lib/components/tree/engine';
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
  TableInstance,
  TableController,
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
export type { CountryCode } from 'libphonenumber-js';

// Select
export { SelectComponent } from './lib/components/select/select.component';
export type { SelectOption } from './lib/components/select/select.types';
export type { SelectSize, SelectColor, SelectValue, SelectOptionGroup } from './lib/components/select/select.component';

// Datepicker
export { DatepickerComponent } from './lib/components/datepicker/datepicker.component';
export { DatepickerUtilsService } from './lib/components/datepicker/datepicker-utils.service';
export type {
  DatepickerConfig,
  DatepickerLabels,
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
export type { ToastGlobalConfig, ToastLabels } from './lib/components/toast/toast.config';
export type { Toast, ToastOptions, ToastAction, ToastSeverity, ToastPosition } from './lib/components/toast/toast.types';

// Editor (TipTap-backed rich text editor; see docs/plans/editor.md)
export { EditorComponent } from './lib/components/editor/editor.component';
export { EditorToolbarComponent } from './lib/components/editor/editor-toolbar.component';
export { EditorSlashMenuComponent } from './lib/components/editor/editor-slash-menu.component';
export { TOOLBAR_PRESETS, TOOLBAR_ICONS, TOOLBAR_LABELS } from './lib/components/editor/editor.defaults';
export { BUILT_IN_SLASH_COMMANDS, filterSlashCommands, slash, createSlashCommands } from './lib/components/editor/slash-command.extension';
export type {
  EditorToolbarConfig,
  EditorToolbarItem,
  EditorToolbarPreset,
  EditorTextChangeEvent,
  EditorImageUploader,
  EditorSlashCommand,
  EditorSlashCommandConfig,
} from './lib/components/editor/editor.types';
export type {
  SlashSnippetOptions,
  SlashSnippetFromUrlOptions,
  SlashChainCommandOptions,
} from './lib/components/editor/slash-command.extension';

// Notification (richer overlay-events component, complementary to Toast)
export { NotificationHostComponent } from './lib/components/notification/notification-host.component';
export { NotificationService } from './lib/components/notification/notification.service';
export { NOTIFICATION_CONFIG, DEFAULT_NOTIFICATION_CONFIG, provideNotification } from './lib/components/notification/notification.config';
export {
  HK_NOTIFICATION_LABELS,
  provideHkNotificationLabels,
  DEFAULT_NOTIFICATION_LABELS,
} from './lib/components/notification/notification.labels';
export type { NotificationLabels, ResolvedNotificationLabels } from './lib/components/notification/notification.labels';
export type {
  Notification,
  NotificationConfig,
  NotificationAction,
  NotificationSeverity,
  NotificationLayout,
  NotificationPosition,
  NotificationDismissReason,
  NotificationRef,
  NotificationGlobalConfig,
  ResolvedNotificationGlobalConfig,
} from './lib/components/notification/notification.types';

// Dialog Wrapper
export { DialogWrapperComponent } from './lib/components/dialog-wrapper/dialog-wrapper.component';

// Command Palette
export { CommandPaletteComponent } from './lib/components/command-palette/command-palette.component';
export { createCommandPalette } from './lib/components/command-palette/command-palette.helpers';
export {
  HK_COMMAND_PALETTE_LABELS,
  provideHkCommandPaletteLabels,
  DEFAULT_COMMAND_PALETTE_LABELS,
} from './lib/components/command-palette/command-palette.labels';
export type { CommandPaletteLabels, ResolvedCommandPaletteLabels } from './lib/components/command-palette/command-palette.labels';
export type {
  CommandPaletteItem,
  CommandPaletteGroup,
  CommandPaletteMode,
  CommandPaletteFilter,
  CommandPaletteHotkey,
  CommandPaletteConfig,
  CommandPaletteController,
  CommandPaletteState,
} from './lib/components/command-palette/command-palette.types';

// Document Viewer — universal facade over format-specific renderers.
// Spreadsheet renderer is calamine-backed via the `document_wasm` bundle;
// other renderers (text, image, pdf) are lightweight JS-only.
export { DocumentViewerComponent } from './lib/components/document-viewer/document-viewer.component';
export { DocumentSpreadsheetRenderer } from './lib/components/document-viewer/renderers/spreadsheet.renderer';
export { DocumentTextRenderer } from './lib/components/document-viewer/renderers/text.renderer';
export { DocumentHtmlRenderer } from './lib/components/document-viewer/renderers/html.renderer';
export { DocumentRtfRenderer } from './lib/components/document-viewer/renderers/rtf.renderer';
export { DocumentDocxRenderer } from './lib/components/document-viewer/renderers/docx.renderer';
export { DocumentEmlRenderer } from './lib/components/document-viewer/renderers/eml.renderer';
export { DocumentMsgRenderer } from './lib/components/document-viewer/renderers/msg.renderer';
export { DocumentEpubRenderer } from './lib/components/document-viewer/renderers/epub.renderer';
export { DocumentImageRenderer } from './lib/components/document-viewer/renderers/image.renderer';
export { DocumentImageSpecialRenderer } from './lib/components/document-viewer/renderers/image-special.renderer';
export { DocumentPdfRenderer } from './lib/components/document-viewer/renderers/pdf.renderer';
export { DocumentUnsupportedRenderer } from './lib/components/document-viewer/renderers/unsupported.renderer';
export type { ParsedEmail } from './lib/components/document-viewer/renderers/eml.renderer';
export {
  resolveFormat,
  guessFilename,
  loadSourceAsBytes,
  getSupportedExtensions,
  getRenderableExtensions,
} from './lib/components/document-viewer/document-viewer.helpers';
export type {
  DocumentSource,
  DocumentFormat,
  ResolvedFormat,
  DocumentRendererInputs,
  DocumentRendererRegistration,
  DocumentViewerConfig,
} from './lib/components/document-viewer/document-viewer.types';
export {
  DocumentEngineService,
  HK_DOCUMENT_ENGINE_WASM_URL,
  provideDocumentEngineWasmUrl,
  type ParsedSpreadsheet,
  type SpreadsheetSheet,
  type SpreadsheetCell,
} from './lib/services/document-engine.service';
export { ImageEngineService, HK_IMAGE_ENGINE_WASM_URL, provideImageEngineWasmUrl } from './lib/services/image-engine.service';
export { LibheifService } from './lib/services/libheif.service';

// Document Editor — turns the viewer facade editable (mode="edit"). Phase 0:
// foundation + Text vertical slice. createDocumentEditor mirrors createPdfViewer.
export { createDocumentEditor } from './lib/components/document-editor/document-editor.helpers';
export { resolveEditor, resolveSerializer } from './lib/components/document-editor/document-editor.registry';
export { DocumentEditorShellComponent } from './lib/components/document-editor/document-editor-shell.component';
export {
  DocumentTextEditor,
  DocumentPlainTextEditor,
  DocumentMarkdownEditor,
  DocumentCsvEditor,
  BUILT_IN_EDITORS,
  loadTextSource,
  renderMarkdown,
  escapeHtml,
  sanitizeMarkdownHtml,
  parseCsv,
  serializeCsv,
  type ParsedCsv,
} from './lib/components/document-editor/editors';
export { serializeText, BUILT_IN_SERIALIZERS } from './lib/components/document-editor/serializers';
export type {
  DocumentEditorMode,
  ExportTarget,
  DocumentEditorController,
  DocumentEditorConfig,
  DocumentEditorInputs,
  DocumentEditorBridge,
  DocumentEditorRegistration,
  DocumentSerializerRegistration,
  DocumentSerialize,
} from './lib/components/document-editor/document-editor.types';
export { CommandStack, type EditorCommand } from './lib/utils/command-stack';
// Note: EditorToolbarComponent + toolbar types are exported above with the editor.

// PDF Viewer
export { PdfViewerComponent } from './lib/components/pdf-viewer/pdf-viewer.component';
export { createPdfViewer } from './lib/components/pdf-viewer/pdf-viewer.helpers';
export { HK_PDF_LABELS, provideHkPdfLabels, DEFAULT_PDF_VIEWER_LABELS } from './lib/components/pdf-viewer/pdf-viewer.labels';
export type { PdfViewerLabels, ResolvedPdfViewerLabels } from './lib/components/pdf-viewer/pdf-viewer.labels';
export { HK_PDF_DEFAULTS, provideHkPdfDefaults } from './lib/components/pdf-viewer/pdf-viewer.defaults';
export type { HkPdfDefaults } from './lib/components/pdf-viewer/pdf-viewer.defaults';
export { HkPdfService } from './lib/components/pdf-viewer/pdf.service';
export { HkPdfToolbarDirective } from './lib/components/pdf-viewer/pdf-viewer.directives';
export type { HkPdfToolbarContext } from './lib/components/pdf-viewer/pdf-viewer.directives';
export type {
  PdfDocumentSource,
  PdfZoom,
  PdfDisplayMode,
  PdfSidebarTab,
  PdfViewerLayout,
  PdfViewerConfig,
  PdfViewerController,
  PdfViewerState,
  PdfLoadedInfo,
  PdfViewerError,
  PdfSearchResult,
} from './lib/components/pdf-viewer/pdf-viewer.types';

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
  TreeLabels,
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

// Fuzzy search engine — WASM-backed, lazy-loaded; powers command-palette + select.
export { FuzzyEngineService, FuzzyHandle, type FuzzyMatch, type FuzzySearchOpts } from './lib/services/fuzzy-engine';

// Form engine — WASM-backed, lazy-loaded; condition / dependency-graph kernel for hk-dynamic-form.
export {
  FormEngineService,
  FormHandle,
  type FormEngineHandle,
  type EngineEvent as FormEngineEvent,
  type EngineEventKind as FormEngineEventKind,
} from './lib/services/form-engine';

// PDF search engine — WASM-backed, lazy-loaded; powers in-document search in pdf-viewer.
export { PdfSearchService, PdfSearchHandle, type PdfSearchHit, type PdfResolvedHit, type PdfSearchOpts } from './lib/services/pdf-search';

// Dialog Service
export { DialogService } from './lib/services/dialog/dialog.service';

// Alert Service
export { AlertService, provideAlert } from './lib/components/alert/alert.service';
export type { AlertConfig, AlertLabels } from './lib/components/alert/alert.service';
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
export { MotionPressDirective } from './lib/directives/motion-press/motion-press.directive';
export { MotionResizeDirective } from './lib/directives/motion-resize/motion-resize.directive';
export { MotionScrollDirective } from './lib/directives/motion-scroll/motion-scroll.directive';
export { animateSequence } from './lib/directives/motion-sequence';

// Motion shared types
export type {
  Easing,
  EasingFunction,
  AnimationPreset,
  MotionStaggerConfig,
  TriggerType,
  MotionAnimationOptions,
  MotionDirectiveOptions,
} from './lib/directives/motion.types';
export type { HoverKeyframes, HoverOptions } from './lib/directives/motion-hover/motion-hover.directive';
export type { PressKeyframes, PressOptions } from './lib/directives/motion-press/motion-press.directive';
export type { ResizeInfo } from './lib/directives/motion-resize/motion-resize.directive';
export type {
  ScrollAnimationKeyframes,
  ScrollOptions,
  ScrollAxis,
  ScrollOffset,
} from './lib/directives/motion-scroll/motion-scroll.directive';
export type { SequenceSegment, SequenceOptions } from './lib/directives/motion-sequence';

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
