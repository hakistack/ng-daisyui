# `hk-workflow-fab` — Implementation Plan

> A DaisyUI-native, Angular 21 (signals) reimagining of the Material `ng-workflow-fab`
> (ticket ARV-280). A host-agnostic, embeddable **workflow execution agent** rendered as a
> floating action button + expandable panel, for `@hakistack/ng-daisyui`.

---

## 1. Goals & what we improve over the Material version

The original spec is solid on *behavior* (lifecycle, locking, audit, polling, signatures,
reassign, history, toasts). We keep all of that. What we change is the *implementation
substrate* to fit this library and to make it better:

| Concern | Material spec | `hk-workflow-fab` |
|---|---|---|
| Framework API | `@Input()`/`@Output()` decorators, NgModule | `input()`/`output()`/`model()` signals, standalone, OnPush |
| State | RxJS `BehaviorSubject` soup | Signal-based state machine + `computed()` derivations |
| UI kit | Angular Material (`MatSnackBar`, `MatDialog`, `mat-*`) | DaisyUI semantic tokens + Tailwind v4, zero Material |
| Theming | `theme: 'light' \| 'dark'` input | **Dropped** — inherits the active DaisyUI theme via semantic tokens (`bg-base-100`, `text-base-content`, `badge-success`…). Theme-agnostic by construction. |
| Backend coupling | REST calls hardcoded in the component | **`WorkflowDataAdapter`** interface; default HttpClient adapter is configurable + fully swappable (GraphQL, mock, custom auth) |
| Notifications | `MatSnackBar` | Existing `ToastService` |
| User picker (reassign) | `mat-select` | Existing `SelectComponent` (fuzzy search built in) |
| Animations | Angular animations | Existing `hkAnimate` / motion directives (respects `prefers-reduced-motion`) |
| Polling | `setInterval` | RxJS `timer` + `switchMap`, Page Visibility pause, exponential backoff |
| Modals | `MatDialog` | Custom inline DaisyUI `<dialog>`-based child components (full layout control) |

**Design principles carried from this codebase**

- Standalone, `ChangeDetectionStrategy.OnPush`, `host: {}` bindings (no `@HostBinding`/`@HostListener`).
- `[class]` object/array bindings, never `ngClass`; derived classes via `computed()`.
- No template-method allocations bound to inputs (avoid NG0103) — precompute in `computed()`.
- DaisyUI semantic colors, no hardcoded hex; passes AXE / WCAG AA.
- Co-located `.types.ts` / `.helpers.ts`; barrel `index.ts`; exported from `public-api.ts`.

---

## 2. Naming & placement

- **Selector:** `hk-workflow-fab` (library `hk-` prefix; the spec's `ng-` prefix is renamed).
- **Location:** `projects/hakistack/ng-daisyui/src/lib/components/workflow-fab/`
- **Public name:** `WorkflowFabComponent`.

---

## 3. Architecture overview

```
                 ┌─────────────────────────────────────────────┐
   Host          │            WorkflowFabComponent              │
 component  ───▶ │  inputs: config, workflowId, referenceId…    │
                 │  outputs: workflowStarted, beforeAction…     │
                 │                                              │
                 │   ┌──────────────────────────────────────┐   │
                 │   │   WorkflowStateStore (per-instance)   │   │ signals + computed
                 │   │   task, state, actions, history…      │   │ state machine (BL-001)
                 │   └──────────────────────────────────────┘   │
                 │   ┌──────────────────────────────────────┐   │
                 │   │   WorkflowPollingEngine                │   │ timer+switchMap+backoff+visibility
                 │   └──────────────────────────────────────┘   │
                 │   FAB ▸ Panel ▸ {Action|Signature|Reassign|  │
                 │                  History} inline modals       │
                 └──────────────────┬───────────────────────────┘
                                    │  WorkflowDataAdapter (DI token)
                                    ▼
        ┌──────────────────────────────────────────────────────┐
        │  HttpWorkflowDataAdapter (default)  │  custom adapter  │
        └──────────────────────────────────────────────────────┘
```

Three internal collaborators, all per-component-instance (provided in the component's
`providers: []` so each FAB has isolated state):

1. **`WorkflowStateStore`** — owns `task`, derived `WorkflowState`, available actions,
   history, loading/error flags. Pure signal store, no HTTP.
2. **`WorkflowPollingEngine`** — drives auto-refresh; calls the adapter; pushes into the store.
3. **`WorkflowDataAdapter`** — the only thing that touches the network.

The component is a thin orchestrator: wires inputs → store, renders state, opens modals,
emits outputs, and asks the adapter to perform mutations.

---

## 4. File structure

```
components/workflow-fab/
├── workflow-fab.component.ts            # orchestrator (FAB + panel shell)
├── workflow-fab.component.html
├── workflow-fab.component.css
├── workflow-fab.component.spec.ts
├── index.ts                             # barrel
│
├── workflow-fab.types.ts                # all interfaces/enums (Task, Step, events, config)
├── workflow-fab.helpers.ts              # determineState(), isCommentRequired(), action meta, color maps
│
├── workflow-state.store.ts              # signal state store (per-instance)
├── workflow-polling.engine.ts           # RxJS polling w/ backoff + Page Visibility
│
├── adapter/
│   ├── workflow-data-adapter.ts         # interface + WORKFLOW_DATA_ADAPTER token
│   ├── http-workflow-data.adapter.ts    # default HttpClient implementation
│   └── workflow-adapter.config.ts       # WORKFLOW_API_CONFIG token + provideWorkflowFab()
│
└── parts/                               # inline DaisyUI modal/panel children (presentational)
    ├── workflow-panel.component.ts       # the expandable card body (state-driven buttons)
    ├── action-modal.component.ts         # simple action: comment + next-step preview
    ├── signature-modal.component.ts      # digital signature: password + comment + attempts
    ├── reassign-modal.component.ts       # SelectComponent user picker + required comment
    └── history-panel.component.ts        # timeline (modal on desktop, full-screen on mobile)
```

---

## 5. Types (`workflow-fab.types.ts`)

Carry the spec's domain model over almost verbatim — it's well designed. Highlights:

```ts
export enum TaskStatus { PENDING = 1, COMPLETED = 2, CANCELLED = 3, REJECTED = 4, VOIDED = 5 }

export enum ActionType {
  START = 1, APPROVE = 100, COMPLETE = 200, RETURN = 300, REJECT = 400,
  CANCEL = 500, REASSIGN = 600, CONFIRM = 700, APPROVE_WITH_SIGNATURE = 800,
  ASSIGN_INVESTIGATOR = 900, REJECT_WITH_SIGNATURE = 1000, EXTEND = 1100, VOID = 1200,
}

export enum WorkflowState {
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  PENDING         = 'PENDING',
  LOCKED_BY_USER  = 'LOCKED_BY_USER',
  LOCKED_BY_OTHER = 'LOCKED_BY_OTHER',
  COMPLETED       = 'COMPLETED',
}

export interface WorkflowUser { id: number; name: string; email: string; roles?: string[]; }
export interface WorkflowTask { /* …as in spec: id, workflowId, currentStep, status, isLocked, lockedBy… */ }
export interface WorkflowTaskStep { /* audit record incl. withSignature, fromStep/toStep */ }
export interface WorkflowAvailableAction {
  actionId: number; actionType: ActionType; name: string; icon?: string;
  requiresSignature: boolean; requiresSelection: boolean;
  nextStep: { id: number | null; name: string | null; number: number | null };
}

// Single config object input (preferred over ~20 separate inputs) + a few required scalars.
export interface WorkflowFabConfig {
  position?: FabPosition;            // 'bottom-right' (default) | …
  offsetX?: number; offsetY?: number; width?: number;
  collapsed?: boolean;
  autoHide?: boolean;
  autoRefresh?: boolean;             // default true
  refreshInterval?: number;          // default 30000
  showHistory?: boolean;             // default true
  requireCommentFor?: ActionType[];  // default [REJECT, RETURN, CANCEL, VOID, REASSIGN…]
  maxSignatureAttempts?: number;     // default 3
}

// Event payloads (signals via output()): WorkflowStartedEvent, WorkflowCompletedEvent,
// BeforeActionEvent (with preventDefault()), AfterActionEvent, LockEvent, UnlockEvent,
// WorkflowErrorEvent, StateChangedEvent — copied from the spec.
```

`workflow-fab.helpers.ts` holds the pure functions the spec sketches: `determineState()`
(BL-001), `isCommentRequired()` (BL-003), `shouldMaintainLock()` (BL-004),
action→icon/label/DaisyUI-color maps (e.g. APPROVE→`text-success`, REJECT→`text-error`,
RETURN→`text-warning`, REASSIGN→`text-info`).

---

## 6. Data adapter (`adapter/`)

### Interface

```ts
export interface WorkflowDataAdapter {
  getTaskById(taskId: number): Observable<WorkflowTask | null>;
  getTaskByReference(workflowId: number, referenceId: number): Observable<WorkflowTask | null>;
  startWorkflow(req: StartWorkflowRequest): Observable<WorkflowTask>;
  lock(taskId: number, userId: number): Observable<LockResult>;          // 409 → ConcurrencyError
  unlock(taskId: number, userId: number): Observable<void>;              // 403 → NotLockOwnerError
  getAvailableActions(taskId: number, userId: number): Observable<WorkflowAvailableAction[]>;
  executeAction(taskId: number, req: ExecuteActionRequest): Observable<ExecuteActionResult>;
  reassign(taskId: number, req: ReassignRequest): Observable<ReassignResult>;
  getHistory(taskId: number): Observable<WorkflowTaskStep[]>;
  verifySignature(userId: number, password: string): Observable<VerifyResult>;  // POST /auth/verify
  getAssignableUsers?(taskId: number, excludeUserId: number): Observable<WorkflowUser[]>;
}

export const WORKFLOW_DATA_ADAPTER = new InjectionToken<WorkflowDataAdapter>('WORKFLOW_DATA_ADAPTER');
```

### Default HTTP adapter

`HttpWorkflowDataAdapter` maps each method to the spec's endpoints
(`POST /tasks`, `GET /tasks/:id`, `POST /tasks/:id/lock|unlock|actions|reassign`,
`GET /tasks/:id/history`, `GET /tasks/:id/actions`, `POST /auth/verify`). Reads a base URL
+ optional header factory from `WORKFLOW_API_CONFIG`. Normalizes HTTP errors into typed
errors (`ConcurrencyError` for 409, `InvalidPasswordError` for 401 with `attemptsRemaining`,
etc.) so the store/component never inspects status codes directly.

### Provider

```ts
provideWorkflowFab({
  apiBaseUrl: '/api/workflows',
  authVerifyUrl: '/api/auth/verify',
  headers?: () => Record<string,string>,         // e.g. auth token
  adapter?: Type<WorkflowDataAdapter>,            // swap the whole adapter
})
```

The component does `inject(WORKFLOW_DATA_ADAPTER, { optional: true })` and throws a clear
dev-time error if neither a provider nor a `[adapter]` input is supplied.

---

## 7. State store (`workflow-state.store.ts`)

Per-instance signal store (provided in component `providers`):

```ts
readonly task        = signal<WorkflowTask | null>(null);
readonly actions     = signal<WorkflowAvailableAction[]>([]);
readonly history     = signal<WorkflowTaskStep[]>([]);
readonly loading     = signal(false);
readonly error       = signal<WorkflowErrorEvent | null>(null);

// derived
readonly state       = computed(() => determineState(this.task(), this.currentUserId()));
readonly visibleButtons = computed(() => /* map state → button set per BL-001 table */);
readonly canPoll     = computed(() => {
  const s = this.state();
  return s === WorkflowState.PENDING || s === WorkflowState.LOCKED_BY_OTHER;
});
```

State→buttons mapping (BL-001):

| State | Buttons |
|---|---|
| `NOT_INITIALIZED` | **Comenzar Flujo** |
| `PENDING` | **Trabajar** |
| `LOCKED_BY_USER` | filtered action buttons + **Liberar** |
| `LOCKED_BY_OTHER` | none (read-only "trabajado por …") |
| `COMPLETED` | none (history only) |

Store emits `StateChangedEvent` (via a separate `effect` in the component) whenever `state()`
transitions, so the host gets `previousState → currentState`.

---

## 8. Polling engine (`workflow-polling.engine.ts`)

RF-009, done right:

- `timer(0, interval).pipe(switchMap(() => adapter.getTaskById(id)))` — cancels the in-flight
  request if the next tick fires (no pile-up).
- Only runs while `store.canPoll()` is true (no polling when I hold the lock or task is final).
- **Page Visibility API:** pause when `document.hidden`, resume + immediate refetch on focus.
- **Exponential backoff** on consecutive errors (e.g. 30s → 60s → 120s, capped), reset on success.
- On a detected change (lock owner / step / status), push to store and fire an `info` toast
  ("Estado actualizado", "Tarea bloqueada por …", "Tarea completada").
- Cleaned up via `takeUntilDestroyed()` / `DestroyRef` — no manual `clearInterval`.

---

## 9. UI — FAB shell, panel, modals

### FAB + panel shell (`workflow-fab.component.html` + `workflow-panel.component.ts`)

- **Fixed-position FAB** at `config.position` with `offsetX/offsetY` (CSS custom props bound
  via `[style]`), DaisyUI `btn btn-circle btn-primary shadow-lg`.
- Click toggles a `collapsed` signal; expanded view is a DaisyUI `card bg-base-100
  shadow-xl border border-base-300` at `width` px (responsive max-width on mobile).
- Entrance via `hkAnimate="fadeInUp"` (panel) / `zoomIn` (FAB); respects reduced-motion.
- The four ASCII states from the spec map to one panel template branching on `store.state()`
  with `@if`/`@switch` and `@for` over `store.visibleButtons()`.
- Header shows workflow name; body shows current step, assignee, lock owner + relative time
  ("hace 15 minutos" — via a small relative-time helper, no template `new Date()`).

### Modals — custom inline DaisyUI (native `<dialog>`)

Each is a small standalone presentational child, opened/closed via signal + `dialog.showModal()`.
All use DaisyUI `modal` / `modal-box` markup, focus-trapped, ESC-closable, AXE-clean.

1. **`action-modal`** (RF-005): title, optional/required comment `textarea`, next-step preview
   alert (`alert alert-info`), Cancelar / Continuar. Comment requiredness from
   `isCommentRequired()` + `config.requireCommentFor` + host `customValidators`.
2. **`signature-modal`** (RF-006): readonly user field, autofocused password input, comment,
   Cancelar / Autenticar. Calls `adapter.verifySignature`; tracks `attemptsRemaining`; locks
   out after `maxSignatureAttempts`; on success continues like RF-005.
3. **`reassign-modal`** (RF-007): `hk-select` (searchable) of assignable users (excludes self),
   **required** comment, info note, Cancelar / Asignar. Uses `getAssignableUsers` if provided.
4. **`history-panel`** (RF-008): vertical timeline, newest first, action-colored dots,
   🔐 badge when `withSignature`, comment bubbles. Modal on desktop, full-screen sheet on
   mobile (`modal-bottom`/full-height). `hkAnimate` fade-in stagger.

### Confirmations (BR-009)

Destructive actions (REJECT / CANCEL / VOID / REJECT_WITH_SIGNATURE) get a confirm step
inside the action modal (title + warning + typed confirm button label), driven by the
`CONFIRMATION_MESSAGES` map in helpers. No separate alert dependency needed, but
`ToastService` is used for all success/error/info/warning feedback (RF-010).

---

## 10. Event flow (host integration)

Mirrors the spec's `@Output` contract using `output()`:

- `init`, `destroy`
- `workflowStarted`, `workflowCompleted`
- `beforeAction` (carries `preventDefault()` — host can veto, e.g. "save the form first"),
  `afterAction`, `actionCancelled`
- `locked`, `unlocked`
- `error`, `stateChanged`

The `beforeAction` veto is implemented synchronously: the component builds the event with a
`preventDefault` closure flipping a local flag, emits, then checks the flag before proceeding
(matches the spec's double-validation: once before the modal opens, once on confirm).

---

## 11. Accessibility (WCAG AA / AXE)

- FAB: `aria-label`, `aria-expanded`, `aria-controls` → panel id.
- Panel: `role="region"`, labelled by header.
- Action buttons: `aria-label` "Ejecutar acción: {name}", `aria-describedby` for next-step.
- Modals: native `<dialog>` (built-in focus trap + ESC), `aria-modal`, labelled title,
  autofocus on the primary field (password / comment / select).
- Keyboard: ESC closes panel/modal; Enter on a focused action triggers it; arrow nav across
  action list. All via `host` listeners, not `@HostListener`.
- Color is never the only signal (icons + text accompany every action color).

---

## 12. Phased delivery

**Phase 0 — Foundation & types** *(no UI)*
- `workflow-fab.types.ts`, `workflow-fab.helpers.ts` (with unit tests for `determineState`,
  `isCommentRequired`, `shouldMaintainLock`, color/label maps).
- `WorkflowDataAdapter` interface, tokens, `provideWorkflowFab()`, `HttpWorkflowDataAdapter`,
  typed error classes.

**Phase 1 — State + read-only shell**
- `WorkflowStateStore`, `WorkflowPollingEngine`.
- `WorkflowFabComponent` shell: FAB + panel rendering all 4 read states (RF-001, RF-009).
- `ToastService` wiring (RF-010). No mutations yet.
- Outputs: `init`, `stateChanged`, `error`.

**Phase 2 — Lifecycle mutations (no signature)**
- Start (RF-002), Lock/Trabajar (RF-003) incl. 409 concurrency handling (BR-002),
  Unlock/Liberar (RF-004).
- `action-modal` + simple actions (RF-005): approve/reject/return/complete/cancel,
  auto-unlock (BR-003), comment requiredness, destructive confirm (BR-009).
- Outputs: `workflowStarted`, `before/afterAction`, `locked`, `unlocked`, `workflowCompleted`.

**Phase 3 — Signature + reassign + history**
- `signature-modal` (RF-006) with attempt limiting.
- `reassign-modal` (RF-007) using `hk-select` + lock transfer.
- `history-panel` (RF-008) timeline, responsive.

**Phase 4 — Polish & exports**
- Page Visibility pause, exponential backoff, `autoHide`.
- Motion entrance animations, reduced-motion checks.
- Full AXE pass; spec test (`.spec.ts`) covering state machine + modal flows.
- Export from `public-api.ts`; demo page in `projects/demo` with a mock adapter.
- README section + usage snippet.

---

## 13. Testing

- **Helpers:** pure-function unit tests (Vitest) — state machine truth table, comment-required
  matrix, lock-maintain matrix.
- **Store:** signal transitions given fed tasks.
- **Component:** a `MockWorkflowDataAdapter` (in-memory) drives full flows — start → lock →
  action → complete; concurrency 409; signature retry/lockout; reassign; polling change
  detection. No real HTTP in tests.
- **A11y:** AXE assertions on each visual state + open modals.

---

## 14. `public-api.ts` additions

```ts
// Workflow FAB
export { WorkflowFabComponent } from './lib/components/workflow-fab/workflow-fab.component';
export { provideWorkflowFab, WORKFLOW_API_CONFIG } from './lib/components/workflow-fab/adapter/workflow-adapter.config';
export { WORKFLOW_DATA_ADAPTER } from './lib/components/workflow-fab/adapter/workflow-data-adapter';
export { HttpWorkflowDataAdapter } from './lib/components/workflow-fab/adapter/http-workflow-data.adapter';
export type {
  WorkflowDataAdapter, WorkflowFabConfig, WorkflowTask, WorkflowTaskStep,
  WorkflowAvailableAction, WorkflowUser, FabPosition,
  WorkflowStartedEvent, WorkflowCompletedEvent, BeforeActionEvent, AfterActionEvent,
  LockEvent, UnlockEvent, WorkflowErrorEvent, StateChangedEvent,
} from './lib/components/workflow-fab/workflow-fab.types';
export { TaskStatus, ActionType, WorkflowState } from './lib/components/workflow-fab/workflow-fab.types';
```

---

## 15. Example host usage

```ts
// app config
provideWorkflowFab({ apiBaseUrl: '/api/workflows', headers: () => ({ Authorization: `Bearer ${token()}` }) })
```

```html
<hk-workflow-fab
  [currentUser]="currentUser()"
  [workflowId]="WORKFLOW_ID"
  [firstStepId]="FIRST_STEP_ID"
  [referenceId]="solicitudId()"
  [referenceNumber]="solicitudNumber()"
  [config]="{ position: 'bottom-right', autoRefresh: true, refreshInterval: 30000 }"
  (workflowStarted)="form.disable()"
  (beforeAction)="validateBeforeAction($event)"
  (afterAction)="reload()"
  (error)="toast.error($event.message)" />
```

---

## 16. Open questions / out of scope

- **Backend** is out of scope (this is the Angular component only). The default HTTP adapter
  assumes the spec's endpoint shapes; a host with a different API ships a custom adapter.
- **Signature auth (AD vs local)** is a backend concern; the component only calls
  `verifySignature` and reacts to the typed result.
- **i18n:** strings are Spanish-first (matching the spec). If multi-locale is needed, add a
  `WORKFLOW_FAB_LABELS` token following the `provideHk*Labels` pattern used elsewhere — flag
  this if required.
- Confirm whether `currentUser`/`workflowId`/`firstStepId`/`referenceId`/`referenceNumber`
  stay as discrete required inputs (recommended, matches host ergonomics) vs folding into the
  config object.
```
