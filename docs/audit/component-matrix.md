# Component matrix

## 1. Library components — status

Status: **Keep** (sound, incremental fixes only) · **Refactor** (internal restructuring needed, API stays) ·
**Consolidate** (share internals with a sibling) · **Extend** (missing expected capability) · **Deprecate**.

| Component | Purpose | Spec | Demo | a11y (see report) | Main debt | Status |
|---|---|---|---|---|---|---|
| `hk-input` | text/currency/phone/percentage/password with CVA | ✓ | ✓ | label via `ariaLabel` only | — (phone metadata lazy since 0.4.0) | Keep |
| `hk-select` | single/multi select, search, virtual scroll, CDK overlay | ✓ | ✓ | ids, disabled, search combobox, focus return **fixed** | two `SelectOption` types (WASM engine now only ≥ 200 options after first search) | Refactor (small) |
| `hk-datepicker` / `hk-timepicker` | date/range/time pickers | ✓ | ✓ | grid pattern good; timepicker focus restore **fixed** | `formControlName` input shadows forms directive | Keep |
| `hk-dynamic-form` | builder + declarative forms, wizard, conditions, auto-save | ✓ | ✓ | error association **fixed** | closed `FieldType` union (no custom field registry), no arrays/nested groups, no async validators | Extend |
| `hk-table` | feature-rich CRUD table (grouping, tree rows, editing, footers, export) | ✓ (190) | ✓ | grid focus model **fixed** | deprecated members until 0.5; virtual layout has no keyboard grid or column widths for unsized columns | Keep |
| `hk-datagrid` | enterprise grid: virtualization, multi-sort, serializable state, server source, AI | ✓ (7 files) | ✓ | good (APG grid) | uses grid-core only for predicates | Keep — new grid features go here |
| `hk-tree` | tree with selection, drag/drop, WASM engine | ✓ | ✓ | treeitem attributes **fixed** | duplicate drop-event types (X5) | Keep |
| `hk-toast` + `ToastService` | transient messages | ✓ | ✓ | LiveAnnouncer + focus pause **fixed** | shares nothing with Notification (X3) | Consolidate internals |
| `hk-notification-host` + service | rich notifications with refs/actions | ✓ | ✓ | single polite region **fixed** | | Consolidate internals |
| `AlertService` | SweetAlert-style blocking confirm/prompt | ✓ | ✓ | empty `aria-describedby`, hardcoded labels | own modal instead of CDK Dialog (HTML sanitized unless `trustedHtml`) | Consolidate internals |
| `DialogService` + `hk-dialog-wrapper` | CDK dialog wrapper | ✓ | ✓ | CDK handles | `animate__*` classes without animate.css | Keep |
| `hk-command-palette` | ⌘K palette | ✓ | ✓ | APG combobox **fixed** | | Keep |
| `hk-tab-group` / `hk-tab-panel` | tabs on `@angular/aria` | ✓ | ✓ | good | — (`icon` rendered via registry lookup since 0.4.0) | Keep |
| `hk-stepper` | CDK stepper, non-form | ✓ | ✗ | ids **fixed**; arrow keys open | "Step X of Y" hardcoded | Keep |
| `hk-menu`, `hk-navbar`, sidebar, app shell | navigation chrome | partial (menu, app shell) | ✓ | navigation vs menu semantics + APG keys **fixed** | | Keep |
| `hk-breadcrumbs` | manual + router-driven breadcrumbs | ✓ | ✓ | | | Keep |
| `hk-virtual-scroller` | list/grid virtualization | ✓ | ✓ | | | Keep |
| `hk-editor` (+toolbar, slash menu) | Tiptap rich text, lazy | ✗ | ✓ | | — (Tiptap optional peer, destroy guard since 0.4.0) | Keep |
| `hk-pdf-viewer` (+ workspace) | PDFium viewer/editor, forms, signatures | ✓ (25) | ✓ | axe-clean (workspace) | pool workers duplicate 6 MB Blob | Keep |
| `hk-document-viewer` (+ workspace) | multi-format viewer facade | ✓ (5) | ✓ | | eager renderer registry (D5), MIME detection by hints only | Refactor |
| `hk-document-editor` shell | editable facade (text/md/csv) | ✓ (4) | ✗ | | | Extend |
| Directives: motion-*, input-mask, auto-focus | behaviour | 2 | ✓ | reduced-motion honoured (outputs still fire) | `[appAutoFocus]` breaks `hk` prefix; mask writes slot chars into the control value | Keep / fix mask |

## 2. daisyUI v5 catalogue vs. this library

Rule (see [component-guidelines](../architecture/component-guidelines.md)): wrap a daisyUI component only when Angular
adds behaviour — state, forms integration, keyboard/focus, overlay positioning, data. Otherwise document the HTML.

| daisyUI component | Verdict | Library |
|---|---|---|
| Button, Badge, Card, Avatar, Divider, Kbd, Link, Mask, Indicator, Stat, Hero, Footer, Join, Skeleton, Status, Loading, Progress, Radial progress, Mockup-* | **Native CSS is sufficient** — use HTML + classes | — |
| Alert (static banner) | Native CSS | (`AlertService` is a *modal* dialog, not the static banner) |
| Input, Textarea, File input, Checkbox, Radio, Toggle, Range, Rating, Fieldset/Label, Validator | Native CSS for plain use; **Angular adds value** for masks, currency/phone, CVA | `hk-input`, input-mask, dynamic-form |
| Select | **Angular adds value** (search, multi, virtual scroll, overlay, a11y) | `hk-select` |
| Calendar (Cally / pikaday styling) | **Angular adds value** | `hk-datepicker` |
| Dropdown, Popover API | Native works for menus; positioning/focus handled by CDK overlay in `hk-select` | partial — no generic `hk-dropdown`/`hk-popover` |
| Modal | Native `<dialog>` is fine for simple cases; **Angular adds value** for programmatic dialogs | `DialogService`, `AlertService` |
| Toast | **Angular adds value** (queue, timers, live region) | `hk-toast`, notification |
| Tabs | **Angular adds value** (APG keyboard model) | `hk-tab-group` |
| Steps | Native for display; **Angular adds value** for wizard | `hk-stepper`, dynamic-form steps |
| Menu, Navbar, Drawer, Dock, Breadcrumbs | Native for static; Angular adds value for router-aware state | `hk-menu`, `hk-navbar`, sidebar, `hk-breadcrumbs` |
| Table | **Angular adds value** | `hk-table`, `hk-datagrid` |
| Collapse / Accordion | Native (`<details>` / radio) is accessible enough | — (document, don't wrap) |
| Carousel, Chat bubble, Countdown, Diff, Swap, Theme controller, Timeline, Tooltip, Filter, List, Hover 3D/Gallery, Text rotate, FAB | Native CSS sufficient | — |

## 3. Candidate new components (hypotheses evaluated)

| Candidate | Exists? | Value over HTML + daisyUI | Decision |
|---|---|---|---|
| Autocomplete / Combobox | partially (`hk-select` with search) | free-text + suggestions is a different pattern | **Missing high-value** — build on `hk-select` internals, after its combobox a11y fixes |
| Multi Select | yes (`hk-select multiple`) | — | Existing |
| Date Range Picker | yes (`hk-datepicker` range mode) | — | Existing |
| Tree Select | no | tree inside overlay + CVA | Medium value; compose `hk-tree` + CDK overlay when a consumer needs it |
| Menu / Context menu | menu yes, context menu no | CDK `cdkContextMenuTriggerFor` already exists | Document CDK usage; no wrapper |
| Popover / Tooltip | no | daisyUI tooltip is CSS-only and not keyboard/touch accessible | **Missing high-value**: one small `hkTooltip` directive (focus + hover, `aria-describedby`) |
| File Upload | form field only | drag-drop, progress, validation | Medium; build only with a consumer use case |
| Pagination | inside table/datagrid | standalone pagination is plain buttons | Not necessary as a separate component |
| Accessible Accordion | no | `<details>` is accessible | Not necessary — document |
| Splitter / resizable panels | inside mesa workspace | | Extract only if a second consumer appears |
| Color picker | `field.color` uses native input | | Not necessary |
| Drag and drop | table/tree use CDK DnD | | Use CDK directly |
| Command palette improvements | exists | a11y pattern | Done (APG combobox, 0.4.0) |

No new components were added in this pass: the remaining open correctness/a11y items (table, menu, toast, select
search focus — see the accessibility report) take priority over catalogue growth.
