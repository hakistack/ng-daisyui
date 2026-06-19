# Workflow Platform — Implementation Plan (Elsa-backed)

> The backend & admin platform behind `hk-workflow-fab` (ticket ARV-280).
> **Elsa Workflows 3 is the engine; `HkWorkflow` is the product wrapper.**
> Design workflows in a central internal tool; run them locally inside each consumer app.
>
> Companion to [`workflow-fab.roadmap.md`](./workflow-fab.roadmap.md) (the Angular component).
>
> Stack: **.NET 10, Elsa Workflows 3.x, EF Core, SQL Server first** (PostgreSQL/MySQL later, only if needed).
> Note on the "Hangfire" analogy used previously: it referred **only** to the *setup ergonomics*
> (`AddX`/`UseX`, library self-wires). We are not using Hangfire. We are now using **Elsa** as the
> actual engine, wrapped so the consumer never sees it.

---

## Decision Summary

- **Engine vs product:** Elsa runs workflow execution/persistence; `HkWorkflow` is our product
  layer that owns the `/api/workflows` contract, locks, permissions, signatures, business audit,
  publish, and the connection registry. Elsa is an implementation detail.
- **Persistence — Option A (Elsa-native(we can have elsa tables named them wf_* the stay native but whti that rename?) + thin `wf_` projection).** Elsa owns its own tables
  (definitions, instances, bookmarks, execution logs) in the consumer DB. Our `wf_` tables exist
  for exactly four jobs: (1) the **publish contract** the control plane writes into, (2) the
  **business task projection** the FAB reads, (3) permissions / locks / signature+comment flags,
  (4) publish metadata + business-friendly audit. `wf_` is the **stable seam** between control
  plane and consumer; Elsa-internal tables are never hand-written. *(Stated once; referenced
  elsewhere.)*
- **Design-time topology:** the config app hosts a **design-time-only Elsa Server** so Elsa Studio
  has something to author against; the authored definition is **serialized into `wf_`** and written
  to the target consumer DB. Runtime Elsa instances in consumer apps are **separate** and register
  from their **local** `wf_`.
- **Publish path (chosen):** control plane → **direct DML into the consumer's `wf_` tables** via the
  connection registry (allowed because same-org ownership). Never DDL, never Elsa-internal tables.
- **Migration ownership:** the consumer's `HkWorkflow` package owns **all DDL** (both `wf_` and
  Elsa schema) via EF Core migrations, applied in a **release/ops step** (CLI/bundle), with startup
  auto-migrate available only for dev. The `wf_` schema must exist **before** first publish.
- **Biggest risk:** translating our `wf_` definition into a **runnable, registered Elsa workflow at
  runtime** (the `wf_`→Elsa step) — this is the load-bearing assumption and is the first thing the
  P0 spike must prove.

---

## 0. The big idea

**Elsa is the workflow engine; `HkWorkflow` is the product wrapper.** A consumer app installs
`HkWorkflow.AspNetCore`; internally the package registers Elsa against the app's own DB. The
consumer **never calls `UseElsa()`, never references Elsa, and never sees an Elsa type**:

```csharp
// consumer app — Program.cs
builder.Services.AddHkWorkflow(o =>
{
    o.UseSqlServer(builder.Configuration.GetConnectionString("AppDb")); // its OWN db — required
    o.UseUserContext<ClaimsPrincipalWorkflowUserContext>();             // default; override only if identity is non-standard
    // Elsa is wired internally by the package — not the consumer's concern.
    // Tables live in the DB's DEFAULT schema (dbo / public / the MySQL database);
    //   optionally isolate via o.UseSqlServer(conn, schema: "wf") — table NAMES stay wf_*.
});

var app = builder.Build();

app.MapHkWorkflowApi();        // /api/workflows — FROZEN contract — always
// app.MapHkWorkflowDesigner(); // OPTIONAL, admin-only — only if THIS app authors workflows locally
```

What the consumer gets: a self-contained runtime that registers Elsa locally, exposes the frozen
`/api/workflows`, and reads its workflow definitions from its **own** `wf_` tables. At execution
time it has **zero dependency on the control plane** (the real invariant — §runtime independence).

The control plane reaches a consumer DB **only at design/publish time**, and only to write `wf_`
(DML). Two clean halves with a stable seam (`wf_`) between them.

---

## 1. Decisions locked in

| Decision | Choice |
|---|---|
| Tenancy | **Org × App** (control-plane catalog only) |
| Stack | **.NET 10, Elsa 3.x, EF Core; SQL Server first** |
| Engine | **Elsa Workflows 3**, isolated behind `HkWorkflow.Elsa` (the only package that references Elsa) |
| Persistence | **Option A** — Elsa-native + thin `wf_` projection/seam (see Decision Summary & §6) |
| Runtime independence | **Invariant:** consumer + FAB execute with the control plane offline |
| DDL | **Consumer-side** (`HkWorkflow` migrations create `wf_` + Elsa schema) — must precede publish |
| Publish | Control plane writes **DML only** into the consumer's `wf_` (never DDL, never Elsa tables) |
| FAB contract | **`/api/workflows` is frozen** — FAB never knows Elsa exists (see Appendix) |
| Designer | Centralized in the config app by default; **opt-in per consumer app** via `MapHkWorkflowDesigner()` |
| Schema knob | Default = DB's native default schema; optional custom schema; **table names + route fixed** |

---

## 2. Ownership split — every capability assigned

**Keep ours (`HkWorkflow` product layer):**

| Capability | Why ours |
|---|---|
| `/api/workflows` contract for the FAB | Frozen public surface; must survive Elsa swaps/upgrades |
| Per-step / per-action role & permission model | Business RBAC tied to our steps/actions; not Elsa's job // VERIFY whether Elsa 3 has any usable authorization hook |
| FAB **lock / unlock** semantics | UI-level concurrency on a business record — Elsa does not own this |
| **Signature-required / comment-required** flags | Business policy on actions, enforced before we resume Elsa |
| Business entity binding (`referenceId`/`referenceNumber`) | Domain coupling Elsa shouldn't carry |
| Consumer auth integration (identity resolved server-side) | Trust boundary; never from request body |
| Business-friendly **audit** (`wf_task_step`) | Stable, queryable, FAB-shaped; independent of Elsa's execution log |
| **Version pinning** per consumer app | Our publish/runtime policy, distinct from Elsa definition versions (§versioning) |
| **Publish records** | Auditable record of every `wf_` write |
| **Connection registry** | Our multi-tenant infra |

**Delegate to Elsa (engine layer):**

| Capability | Notes |
|---|---|
| Workflow **execution engine** | Core reason to adopt Elsa |
| Definition + instance + bookmark + execution-log **persistence** | Option A — Elsa owns these tables |
| **Long-running** workflows + wait states/resume | Elsa's strength; our `wf_task` is a projection over it |
| Activities / **custom activities** | Including our "user-task" step activity (§modeling) |
| **Designer foundation** | Elsa Studio, if embeddable/customizable enough (§design-time, risk-rated) |

**Ambiguous — flagged:**
- *Human-approval / user-task pattern:* Elsa 3 likely has an idiomatic HITL pattern; our step model
  must map onto it rather than reinvent. `// VERIFY Elsa 3 user-task / HITL activity`.
- *Authorization:* if Elsa exposes per-activity auth we still keep our model as source of truth and
  treat Elsa's as off. `// VERIFY`.

---

## 3. Architecture — "Elsa under the hood"

Three planes, clearly separated.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  CONFIG APP / CONTROL PLANE (Blazor, internal)                              │
│   • Catalog DB: Organization, App, AppDatabaseConnection (registry),        │
│     PublishRecord                                                           │
│   • DESIGN-TIME-ONLY Elsa Server + Elsa Studio (authoring sandbox)          │
│   • Does NOT execute business runtime                                       │
│   • PUBLISH = connect to consumer DB via registry, write wf_ (DML only)     │
└───────────────────────────────┬─────────────────────────────────────────────┘
            design/publish time only · DML into wf_ · never DDL · never Elsa tables
                                │
                                ▼
        ╔═════════════════ consumer app DB ═════════════════╗
        ║  wf_* (our seam/projection)   +   Elsa-native tables ║
        ║  DDL for BOTH created by the consumer's HkWorkflow    ║
        ╚════════▲═══════════════════════════════════▲════════╝
                 │ local read/write (same DB, local tx)
┌────────────────┴────────────────────────────────┐         │
│  CONSUMER APP (runtime plane)                    │         │ HTTP, same origin
│   • installs HkWorkflow.AspNetCore               │         │
│   • OWNS DDL (wf_ + Elsa schema migrations)      │         │
│   • registers Elsa LOCALLY against AppDb         │         │
│   • translates wf_ → Elsa at startup / on publish│         │
│   • MapHkWorkflowApi() → /api/workflows          │         │
│   • runtime never needs the control plane        │         │
└────────────────▲─────────────────────────────────┘         │
                 │                                            │
        ┌────────┴────────────────────────────────────────────┴────────┐
        │  hk-workflow-fab (Angular) — embedded in each business form    │
        │   WorkflowDataAdapter → /api/workflows · knows nothing of Elsa │
        └───────────────────────────────────────────────────────────────┘
```

### Design-time vs runtime Elsa (explicit)

Elsa Studio is a Blazor client that needs an **Elsa Server** to author against. `// VERIFY Elsa
Studio ↔ Elsa Server contract and self-host options`.

- **Config app hosts a design-time-only Elsa Server** with its **own design store** (separate DB,
  the control-plane catalog DB or a sibling). Studio authors against it. On save/publish, the
  authored definition is **serialized into our `wf_` shape** and written to the target consumer DB.
  The design-time Elsa Server **never executes business processes** and is never the runtime.
- **Runtime Elsa lives in each consumer app**, registering from that app's **local `wf_`** — wholly
  separate instances from the design-time server. This separation is what preserves runtime
  independence and lets the same definition run in N apps.

### Designer placement

- **Default:** authoring is **centralized** in the config app; consumer apps have **no designer** and
  only receive published `wf_`.
- **Opt-in per app:** a consumer can call `app.MapHkWorkflowDesigner()` to light up Elsa Studio +
  the protected Elsa endpoints it needs (**admin-only**) inside that app. The public `/api/workflows`
  and the FAB are unaffected; the consumer still never references Elsa directly. **Never on by
  default.**

---

## 4. Deliverables

1. **`HkWorkflow` runtime wrapper over Elsa** — the consumer-facing product runtime.
2. **Elsa integration package** — the isolation boundary that wires/translates Elsa.
3. **FAB contract adapter** — maps `/api/workflows` operations onto Elsa concepts.
4. **Optional Elsa Studio designer** — centralized in the config app by default; opt-in per consumer
   app via `MapHkWorkflowDesigner()`.

### Package layout

```txt
HkWorkflow.Abstractions     // contracts, interfaces, DTOs — NO Elsa dependency
HkWorkflow.AspNetCore       // AddHkWorkflow, MapHkWorkflowApi, MapHkWorkflowDesigner — the public surface
HkWorkflow.Elsa             // the ONLY package that references Elsa — isolation boundary, wf_→Elsa translation
HkWorkflow.Persistence      // wf_ projection model, repositories, persistence abstractions
HkWorkflow.SqlServer        // SQL Server provider (first)
HkWorkflow.PostgreSql       // later
HkWorkflow.MySql            // later
HkWorkflow.Admin            // config-app-side catalog + designer integration + publish writer
HkWorkflow.FabContract      // the frozen /api/workflows DTOs + contract versioning
```

Rationale for the boundaries:
- `HkWorkflow.Abstractions` + `HkWorkflow.FabContract` carry the public types with **no Elsa
  reference**, so anything the consumer touches is Elsa-free by construction.
- **`HkWorkflow.Elsa` is the single chokepoint that references Elsa.** An Elsa upgrade or swap is
  contained to this package; nothing else recompiles against Elsa. This is the structural guarantee
  behind hard-constraint #5/#6.
- `HkWorkflow.Persistence` owns the `wf_` EF model + migrations (DDL); providers add dialect config.
- `HkWorkflow.Admin` is the only place that opens **outbound** connections to consumer DBs (publish).

---

## 5. The `wf_` schema (the seam) + Elsa schema

**`wf_` tables** (our model — DDL by the consumer's migrations; rows written by publish + runtime):

- **Publish contract / definition projection:** `wf_workflow`, `wf_workflow_version`, `wf_step`,
  `wf_action`, `wf_action_type`, `wf_step_permission`, plus `wf_schema_version` (single-row stamp,
  §publish drift guard).
- **Business task projection (FAB-facing):** `wf_task` (current step, status, `IsLocked`,
  `LockedByUserId`, `LockedAt`, `referenceId`, `referenceNumber`, **`elsa_instance_id`** linking to
  the Elsa instance), `wf_task_step` (append-only business audit incl. `WithSignature`, from/to step).

**Elsa-native tables:** Elsa's own definition/instance/bookmark/execution-log tables, created by
Elsa's EF Core migrations (`// VERIFY Elsa.Persistence.EFCore.SqlServer migration assembly + table
set`). **We never hand-write these.** The only cross-reference is `wf_task.elsa_instance_id`.

**Schema placement:** default = DB native schema (`dbo`/`public`/MySQL db); optional custom schema
recorded on `AppDatabaseConnection`. Table **names** fixed (`wf_*`). `// VERIFY Elsa supports a
configurable schema for its own tables; if not, Elsa tables sit in the default schema regardless`.

**Migration ownership (decided):** the consumer's `HkWorkflow` package ships **EF Core migrations**
that create **both** the `wf_` schema and trigger Elsa's schema setup, exposed as:
- **Primary — release/ops step:** an EF migrations **bundle** / `dotnet hkworkflow migrate` CLM run
  in the deploy pipeline. Explicit, auditable, fits government/enterprise change control.
- **Dev convenience — startup auto-migrate:** `o.AutoMigrateSchema = true` (off by default in prod).
- **Rollback story:** EF `down` migrations for `wf_`; Elsa schema rolled back via its own versioned
  migrations / DB restore. Because publish only writes `wf_` rows (data), a bad publish is undone by
  republishing the prior `wf_workflow_version`, not by schema rollback. `// VERIFY Elsa migration
  down-support`.

---

## 6. FAB-to-Elsa adapter

The public consumer API stays **ours** (`/api/workflows`); the adapter (in `HkWorkflow.Elsa`)
translates each operation to Elsa. The FAB reads our `wf_task` projection, **never Elsa state**.

| FAB operation (`/api/workflows`) | Elsa mapping | Notes / VERIFY |
|---|---|---|
| **Start** workflow/task | Resolve the registered Elsa definition for `workflowId`; start an instance; create `wf_task` with `elsa_instance_id` | `// VERIFY IWorkflowRuntime.StartWorkflowAsync / IWorkflowDispatcher start API` |
| **Get current task state** | Read our `wf_task` projection (kept current by adapter on Elsa events) | Never read Elsa tables for the FAB. `// VERIFY Elsa event/notification hook to update projection` |
| **Lock / Unlock** | **Ours only** — `wf_task.IsLocked`; Elsa untouched | Pure UI concurrency |
| **Execute action** | Enforce our permission/comment/signature first → resume the Elsa instance via the action **signal/bookmark** matching the chosen `WorkflowAction`; map Elsa outcome → next step → update `wf_task`/`wf_task_step` | `// VERIFY ResumeWorkflowAsync + bookmark/signal payload; outcome routing` |
| **Reassign** | **Ours** — transfer lock + write `wf_task_step`; advance Elsa only if the action models a transition | Usually no Elsa state change |
| **History** | Our `wf_task_step` is the source of truth; optionally enrich from Elsa execution log for diagnostics | `// VERIFY execution-log query API` |
| **Available actions / permissions** | Derived from active step (mapped from the current Elsa bookmark/activity) ∩ our `wf_step_permission` | `// VERIFY how to read the current waiting activity/bookmark` |
| **Comments / signature requirement** | **Ours** — policy flags on `wf_action`, enforced before resume | — |
| **Current step/action projection** | Map the active Elsa bookmark/activity → our `wf_step` (stored on `wf_task.currentStepId`) | `// VERIFY stable identifier from bookmark→step` |

Explicit: **Elsa's native HTTP API is never exposed as the public contract.** Only our adapter is.

---

## 7. Modeling business steps/actions with Elsa

Our domain: `WorkflowStep` (a human-decision point), `WorkflowAction` (a choice that transitions),
`StepPermission` (who may do what).

**Recommended primary pattern — wait-state / signal (bookmark) per step.** Each `WorkflowStep` maps
to a **"user-task" activity that suspends** the instance, creating a bookmark; each `WorkflowAction`
is a **named signal/outcome** that resumes the instance and routes to the next step. The instance
parks on a bookmark until the FAB triggers `execute action`. This fits human approvals and
long-running flows and is exactly Elsa's wait/resume model. `// VERIFY Elsa 3 idiomatic user-task /
"Event"/"SignalReceived" activity, bookmark creation, and resume-by-signal-name`.

- `StepPermission` stays **ours**, checked in the adapter **before** resuming Elsa (Elsa is not asked
  to authorize).
- Comment/signature requirements are **ours**, enforced before resume.
- We ship a **custom `HkUserTaskActivity`** (in `HkWorkflow.Elsa`) so the `wf_`→Elsa translator emits
  one activity per step with our metadata (stepId, allowed actions). `// VERIFY custom activity
  authoring + JSON serialization round-trip`.

**Alternatives considered:** modeling steps as workflow variables + a single generic loop (rejected —
loses Elsa's native graph/history value); one Elsa workflow per step (rejected — fragments
instance/history). Recommend the wait-state pattern.

---

## 8. Publish pipeline

**Chosen path A** (given same-org ownership + connection registry):

1. Author in the config app's design-time Elsa Studio → save a **draft** `WorkflowVersion`.
2. **Serialize** the authored definition into our `wf_` shape (definition + version + steps/actions +
   permissions + business metadata).
3. Validate (graph integrity, cycle limits, orphan steps, action→step routing).
4. **Publish:** `HkWorkflow.Admin` opens the registry connection to the target consumer DB and
   **upserts the `wf_` rows (DML)**; records a `PublishRecord`.
5. The consumer runtime **reads `wf_` and (re)registers the Elsa definition locally** — at startup
   and/or on a publish signal. `// VERIFY runtime definition (re)registration API + whether a process
   restart is required or definitions can hot-register`.
6. New tasks bind to the latest published version; **in-flight instances stay pinned** (§versioning).

**Non-negotiable within A:** write **only `wf_`** (never Elsa-internal tables); stamp
`wf_schema_version` and **refuse to publish on mismatch** with the control-plane writer's expected
version.

**Alternatives (on record):**

| Option | How | Security (consumer-DB creds) | Drift | Simplicity | Coupling |
|---|---|---|---|---|---|
| **A (chosen)** | Control plane → direct DML into consumer `wf_` | Creds centralized in registry (least-priv, DML-only) | Must guard `wf_schema_version` | High (no consumer endpoint) | Design/publish-time only |
| B | Control plane → protected publish endpoint on the consumer app | No consumer-DB creds centrally | Endpoint owns its own schema → less drift | Needs an endpoint + auth in every app | Adds a runtime-ish surface |
| C | Export portable package; ops imports | No live connection | Import step validates | Most manual | Release-coupled |

A wins on simplicity/coupling for same-org code; its one real cost is **`wf_` schema drift**, which
the version stamp + refuse-on-mismatch handles. B is the fallback if a consumer DB is ever
network-unreachable from the control plane.

---

## 9. Security model

- **Elsa internals never publicly exposed**; FAB never reads Elsa tables/state.
- **`/api/workflows`** protected by the **consumer's existing auth**; acting identity resolved
  server-side (default `ClaimsPrincipalWorkflowUserContext`), never trusted from the request body.
- **Admin designer** (`MapHkWorkflowDesigner` + any Elsa endpoints it needs) is **admin-only**.
- **Connection registry** holds **encrypted** per-consumer DB credentials (Key Vault / ASP.NET
  DataProtection); secrets never reach the browser. The control plane's DB account is
  **least-privilege: DML on `wf_` only** — no DDL, no access to Elsa-internal tables.
- **Publish is auditable:** every write to a consumer's `wf_` produces a `PublishRecord`.
- Design-time Elsa Server is internal-only and never executes business runtime.

---

## 10. Versioning (keep the two separate)

- **Elsa's workflow-definition versioning** — Elsa versions its own definitions internally on publish/
  update. `// VERIFY Elsa 3 definition versioning + "publish" semantics + how a running instance is
  tied to a definition version`.
- **Our per-consumer-app version pinning** — `wf_workflow_version` is the unit the control plane
  publishes and the consumer registers. A consumer app runs the version currently in its `wf_`.

**In-flight behavior across a publish:** new instances use the newly registered version; **already
running instances stay on the version they started** (Elsa pins instances to a definition version).
We do **not** auto-migrate running instances. `// VERIFY Elsa pins instances to a version and that
re-registration does not disturb live instances`. If a definition must change for in-flight work,
that's an explicit, owned migration — out of scope for the default flow.

---

## 11. Build sequence

**P0 — Elsa spike (pass/fail gate; nothing else proceeds until these are answered with evidence):**
each as a yes/no + evidence —
1. EF Core **SQL Server** persistence provider for Elsa 3 works on .NET 10. `// VERIFY`
2. Elsa **Studio** can be hosted by our config app and authored against a self-hosted Elsa Server. `// VERIFY`
3. JSON **definition import/export** is stable and round-trips. `// VERIFY`
4. **Build/register a runnable Elsa workflow at runtime from our own `wf_` definition** (the
   translation step) — *the load-bearing test*. `// VERIFY`
5. **Custom activities** (our `HkUserTaskActivity`) author + serialize + resume by signal. `// VERIFY`
6. **Long-running / wait-state** instances suspend on bookmarks and resume correctly. `// VERIFY`
7. **Persistence migration** strategy (apply Elsa + `wf_` DDL via our package) confirmed. `// VERIFY`

**P1 —** Blazor admin shell + catalog + connection registry (encrypted, DML-scoped).
**P2 —** Consumer runtime wrapper: Elsa registered locally; `MapHkWorkflowApi` facade; SQL Server only.
**P3 —** FAB-to-Elsa adapter: start / get / lock / unlock / execute / history.
**P4 —** Designer integration (Elsa Studio centralized; optional `MapHkWorkflowDesigner`).
**P5 —** Publish pipeline: control plane → consumer `wf_` via registry; consumer `wf_`→Elsa translation.
**P6 —** Permissions, signature hooks, comments, reassign, audit/reporting.
**P7 —** PostgreSQL/MySQL validation — only if needed.

Wire `hk-workflow-fab` against a P3 consumer for an end-to-end slice.

---

## 12. Risk section (likelihood × impact)

| Risk | L | I | Mitigation |
|---|---|---|---|
| **`wf_`→Elsa runtime registration** (P0 #4) doesn't work cleanly | Med | High | Gate everything on P0; fallback = keep our own minimal engine for the step/action model |
| Elsa persistence/internal coupling leaks past `HkWorkflow.Elsa` | Med | High | Single-package boundary; no Elsa types in public surface; contract tests |
| Migration ownership in consumer DBs (DDL for Elsa + `wf_`) | Med | Med | Package owns both via EF migrations; release-step apply; documented rollback |
| **`wf_` schema drift** (control-plane writer vs consumer migration version) | Med | High | `wf_schema_version` stamp; refuse-to-publish on mismatch |
| **Credential mgmt** for control-plane direct connections | Med | High | Encrypted registry; least-priv DML-only login; audited publish |
| Designer customization limits (Elsa Studio not flexible enough) | Med | Med | Spike in P0 #2; fallback = custom Blazor shell around Elsa APIs |
| Mapping business steps/actions onto generic workflow concepts | Med | Med | Custom `HkUserTaskActivity`; wait-state pattern; P0 #5 |
| Version pinning + in-flight migration complexity | Low | Med | No auto-migrate of running instances; explicit owned migrations only |
| Multi-engine DB cost (PG/MySQL) | Low | Med | SQL Server first; PG/MySQL only if needed (P7) |
| FAB contract stability across Elsa upgrades | Low | High | Frozen `FabContract` + adapter; Elsa confined to one package; contract tests in CI |
| Elsa Studio embeddable/customizable enough | Med | Med | P0 #2 decides; opt-in designer limits blast radius |

---

## 13. Fit-gap matrix

| Requirement | Native Elsa support | Wrapper/custom needed | Risk | Decision |
|---|---|---|---|---|
| Visual designer | Elsa Studio `// VERIFY` | Host + serialize to `wf_` | Med | Use Elsa Studio, validate in P0 |
| Runtime execution | Yes (core) | Thin | Low | Delegate to Elsa |
| Long-running workflows | Yes (bookmarks) `// VERIFY` | Projection upkeep | Low | Delegate to Elsa |
| Human approvals | Likely (HITL) `// VERIFY` | `HkUserTaskActivity` | Med | Custom activity over Elsa wait-state |
| Lock / unlock | No | Full (ours) | Low | Keep ours (`wf_task`) |
| Role/action permissions | Partial/unclear `// VERIFY` | Full (ours) | Med | Keep ours |
| Signature-required actions | No | Full (ours) | Low | Keep ours |
| Comment-required actions | No | Full (ours) | Low | Keep ours |
| Version pinning (our sense) | N/A (different concept) | Full (ours) | Med | Keep ours; separate from Elsa versions |
| Local-only consumer runtime | Yes | Wiring | Low | Elsa registered locally |
| Runtime independence (CP offline) | Yes (no CP at runtime) | Enforced by design | Low | Invariant upheld |
| Direct CP→consumer `wf_` publish | N/A | Full (ours) | High | Option A + version stamp |
| Publish to multiple apps | N/A | Per-`PublishRecord` writes | Med | Iterate registry entries |
| SQL Server first | Yes `// VERIFY .NET 10` | Provider | Low | P0/P2 |
| PostgreSQL/MySQL later | Yes `// VERIFY` | Providers | Low | P7 only if needed |
| FAB API compatibility | N/A | Frozen `FabContract` + adapter | High | Non-negotiable; contract tests |

---

## Appendix — FROZEN FAB contract (`/api/workflows`)

The whole rewrite must satisfy this surface unchanged. Derived from `workflow-fab.roadmap.md` and the
ARV-280 spec; the engine swap to Elsa must not alter it.

```
POST   /api/workflows/tasks                      → start workflow (create task)
GET    /api/workflows/tasks?referenceId&workflowId → get task by business reference (or null)
GET    /api/workflows/tasks/:taskId              → get task by id (state projection)
POST   /api/workflows/tasks/:taskId/lock         → lock (409 ALREADY_LOCKED on conflict)
POST   /api/workflows/tasks/:taskId/unlock       → unlock (403 NOT_LOCK_OWNER)
GET    /api/workflows/tasks/:taskId/actions       → available actions for current user
POST   /api/workflows/tasks/:taskId/actions       → execute action (comment/password/reassignTo)
POST   /api/workflows/tasks/:taskId/reassign      → reassign (required comment)
GET    /api/workflows/tasks/:taskId/history       → ordered audit timeline
POST   /api/auth/verify                            → digital-signature credential check
```

Response shapes (task state, available action, history step) are as defined in
`workflow-fab.roadmap.md` §types and the ARV-280 spec (TaskStatus, ActionType, lock fields,
`withSignature`, from/to step). **To fully lock this appendix I need from you:** (1) the exact JSON
body of each request/response as currently consumed by the FAB build, (2) the precise error codes +
payloads (`ALREADY_LOCKED`, `INVALID_PASSWORD` with `attemptsRemaining`, etc.), (3) whether
`/api/auth/verify` is in-scope of this contract or a separate consumer service. Until provided, treat
the list above as the frozen *surface* and the payloads as defined by the FAB roadmap.

---

## Open questions / decisions I must make

1. **P0 gate first** — do not commit to Elsa until P0 #1–#7 pass. If #4 (`wf_`→Elsa runtime
   registration) fails, do we keep our own minimal engine for steps/actions? (My recommendation: yes,
   fall back rather than fight Elsa internals.)
2. **Design-time Elsa Server store** — own DB, the catalog DB, or a sibling? (Lean: sibling DB to keep
   the catalog clean.)
3. **`wf_`→Elsa registration timing** — startup-only, or hot re-register on publish signal (and is a
   process restart acceptable on publish)?
4. **Frozen contract payloads** — the three items listed in the Appendix.
5. **Custom schema for Elsa tables** — is configurable Elsa schema required, or are Elsa tables always
   in the DB default schema (only `wf_` follows the schema knob)?
6. **Designer opt-in scope** — any consumer app that will author locally, or centralized-only for v1?
7. **PostgreSQL/MySQL** — confirm "later, only if needed," so P7 stays optional.

## Acceptance criteria (plan is implementable as written if all true)

- [ ] **FAB contract unchanged** — `/api/workflows` surface + payloads identical; FAB never references Elsa.
- [ ] **Runtime independence holds** — consumer app + FAB execute fully with the control plane offline.
- [ ] **Publish writes only `wf_`** via the connection registry — DML only, never DDL, never Elsa tables.
- [ ] **Consumer owns DDL** — `HkWorkflow` migrations create `wf_` + Elsa schema before any publish.
- [ ] **`wf_`→Elsa translation** proven: a `wf_` definition registers as a runnable Elsa workflow (P0 #4).
- [ ] **SQL Server runs end-to-end** (.NET 10, Elsa 3) — start → lock → execute action → history.
- [ ] **Persistence = Option A** and **migration ownership** decided (consumer package, release-step apply, rollback documented).
- [ ] **Elsa confined to `HkWorkflow.Elsa`** — no Elsa types in any public/consumer-facing package.
- [ ] **`wf_schema_version` drift guard** — publish refuses on mismatch.
- [ ] **All P0 spike questions answerable** with evidence before P1.
```
