# i18n System Analysis & Library Extraction Plan

> **Goal:** Move this entire i18n system into `@hakistack/ng-daisyui` so that a consumer
> app only writes translation definitions and calls a single `provideI18n(...)`. The library
> auto-generates the JSON files, wires Transloco internally as the translation engine, and
> exposes the type-safe key surface (`TK`, `translateSignal`, `*appTranslate`) — the consumer
> never touches Transloco directly.

---

## 1. What this system actually is

This is a **TypeScript-first, build-time-generated, type-safe i18n layer that sits on top of
Transloco**. Transloco is only the *runtime translation engine* (active language, interpolation,
fallback, missing-key handling). Everything a developer interacts with — authoring, key
generation, validation, autocomplete — is a custom layer the project built around it.

The defining idea: **translations are authored in `.ts` files, not `.json` files.** English is
the source of truth, other locales are optional, and every artifact (the JSON files, the typed
key object `TK`, the runtime tree) is *derived* from those `.ts` definitions. There is no
"JSON drifted from code" failure mode because JSON is an output, not an input.

```
 AUTHOR (*.i18n.ts)  ──scan──▶  ALL_TRANSLATIONS  ──┬─generate─▶  assets/i18n/*.json  (translators / optional HTTP loader)
   defineTranslations()         (registry tuple)    ├─buildTree─▶  runtime tree        (TranslocoRegistryLoader)
   t('Hello', { es: 'Hola' })                       ├─TK_CAMEL ─▶  TK (SCREAMING_CASE)  (typed keys for components)
                                                     └─validate─▶  errors / stubs report (CI gate)
```

---

## 2. File inventory

### 2.1 Core engine (`src/i18n/`) — **this is the reusable part**

| File | Role |
|------|------|
| `utils/define-translations.ts` | The heart. `defineTranslations()`, `t()`, key-object builder, `TK` case transform (`transformKeysToScreaming`), language config (`SUPPORTED_LANGUAGES`, `DEFAULT_LANGUAGE`), `buildTKFromModules()` + the type-level `MergeModules` machinery. |
| `utils/build-tree.ts` | Turns the in-memory registry into per-language string trees. Shared by the generator (writes JSON) **and** the runtime loader (serves the tree). Handles fallback-to-English, comment siblings, scope→filesystem path mapping. |
| `scripts/scan.ts` | Discovers every `*.i18n.ts` via regex, emits `definitions/index.generated.ts` (imports + re-exports + `ALL_TRANSLATIONS` tuple). |
| `scripts/generate.ts` | Reads the registry, writes `assets/i18n/<lang>.json` (root full tree) + per-scope `<scope>/<lang>.json` files. |
| `scripts/validate.ts` | Build-time gate: missing English (error), placeholder parity across locales (error), missing non-default locale (warning), English-only stubs (report). |
| `scripts/find-unused.ts` | Cleanup tool: finds defined keys with zero references in source. Informational. |
| `definitions/index.ts` | Hand-maps each module into `TK_CAMEL`, then `TK = transformKeysToScreaming(TK_CAMEL)`. **The one hand-maintained file.** |
| `definitions/index.generated.ts` | Auto-generated barrel (scan output). Never edited by hand. |
| `index.ts` | Public `@i18n` barrel: re-exports `TK`, `translateSignal`, `Language`, etc. |

### 2.2 Runtime wiring (`src/app/`) — **becomes `provideI18n()`**

| File | Role |
|------|------|
| `transloco.config.ts` | `provideTransloco(...)` config + **3 custom Transloco hooks**: `TranslocoRegistryLoader` (serves tree from registry, no HTTP), `TranslocoCommentInterceptor` (strips `.comment` siblings), `TranslocoVisibleMissingHandler` (`[key]` in dev). Also ships an unused-but-ready `TranslocoHttpLoader` for one-line swap. |
| `shared/directives/translate/translate.directive.ts` | `*appTranslate="let t"` structural directive — Proxy-based lazy typed translation access in templates, reactive to language changes. |
| `core/services/language/language.service.ts` | App-level active-language + localStorage persistence wrapper around `TranslocoService`. |

### 2.3 Tooling glue

| File | Role |
|------|------|
| `tools/scripts/i18n-watch.mjs` | chokidar watcher → re-runs `i18n:scan` on `*.i18n.ts` changes during `ng serve`. |
| `package.json` scripts | `postinstall`/`prestart`/`prebuild` chain `i18n:scan → i18n:generate → i18n:validate`. |
| `tsconfig.json` | `@i18n` path alias → `./src/i18n`. |
| `tsconfig.scripts.json` | ts-node project for the scripts (includes `**/i18n/**` + `*.i18n.ts`). |

### 2.4 Authored translation modules (`*.i18n.ts`) — **stays in consumer app**

`shared/i18n/common.i18n.ts` (COMMON, LANGUAGES), `shared/i18n/errors.i18n.ts` (ERRORS),
`core/layouts/navigation.i18n.ts` (NAVIGATION), `features/home/home.i18n.ts` (HOME),
`features/authentication/authentication.i18n.ts` (AUTH),
`features/administration/i18n/*.i18n.ts` (ADMIN_BASE, ADMIN_USERS, ADMIN_ROLES,
ADMIN_CAPABILITIES, ADMIN_LOGS, ADMIN_AUDITS).

---

## 3. How it works, end to end

### 3.1 Authoring
```ts
// home.i18n.ts
export const HOME = defineTranslations('home', {
  welcome: t('Welcome, Admin!', { es: '¡Bienvenido, Administrador!' }),
}, { scoped: true });
```
- `t(en, others?, { comment? })` — English required, other locales optional, optional
  translator comment.
- Bare strings are shorthand for English-only (`reset: 'Reset'` ≡ `t('Reset')`); normalized to
  `{ en }` immediately.
- `{ scoped: true }` → the module gets its own `<scope>/<lang>.json` file (forward-compat for
  `provideTranslocoScope` lazy loading). Eager modules merge into the root JSON.
- `defineTranslations` returns `{ scope, translations (normalized), keys (typed dot-paths), scoped }`.
  `keys` is the type-derived companion: `HOME.keys.welcome === 'home.welcome'`.

### 3.2 Scan (codegen step 1)
`scan.ts` regex-discovers `export const NAME = defineTranslations(` in every `*.i18n.ts`,
sorts them, and writes `definitions/index.generated.ts` with imports, re-exports, and the
`ALL_TRANSLATIONS as const` tuple. Runs on `postinstall`, `prestart`, `prebuild`, and on file
changes via the watcher.

### 3.3 TK assembly
`definitions/index.ts` hand-maps each module into `TK_CAMEL` at its scope path (+ aliases like
`nav`, `auth`, `admin`), then `transformKeysToScreaming` produces the public `TK`
(`TK.HOME.WELCOME === 'home.welcome'`).

> ⚠️ **Why hand-mapped and not auto?** `buildTKFromModules()` + `MergeModules<T>` *do* build
> this automatically at runtime and at the type level under plain `tsc`. But Angular's strict
> **template** type-checker hits its recursive-instantiation limit at ~12+ modules and resolves
> `TK.X.Y` to `{}`, killing template autocomplete. The hand-mapped literal is the workaround —
> one line per module. **This is the single biggest friction point for a zero-config library.** (See §6.)
>
> 🟢 **Decision (see §6.2):** in the library, `TK` is **scanner-generated as a flat camelCase
> literal** with **no SCREAMING_CASE transform and no aliases**. `TK.HOME.WELCOME` becomes
> `TK.home.welcome` (which equals the actual key string `'home.welcome'`). This removes the
> hand-mapping *and* deletes the heaviest type-level code in the codebase.

### 3.4 Generate (codegen step 2)
`generate.ts` → `buildLanguageTree()` writes `assets/i18n/<lang>.json` (full tree) plus
per-scope files. Prints coverage stats. These JSON files are **translator-facing artifacts**,
not a runtime dependency (the registry loader is wired by default).

### 3.5 Runtime
`provideTransloco` uses `TranslocoRegistryLoader`, which calls `buildLanguageTree(ALL_TRANSLATIONS, lang)`
and returns it synchronously via `of(...)` — **no HTTP fetch**. Scoped requests (`home/en`)
return only that scope's subtree. The comment interceptor strips `.comment` keys before they
enter the store; the missing handler shows `[key]` in dev.

### 3.6 Consumption
```ts
// component
protected readonly welcome = translateSignal(TK.HOME.WELCOME);
```
```html
<!-- template, typed + reactive -->
<div *appTranslate="let t">{{ t.HOME.WELCOME() }}</div>
<p>{{ t.COMMON.validation.minLength({ min: 3 }) }}</p>
```

---

## 4. Reusable vs app-specific (the extraction line)

| Concern | Today | Target |
|---------|-------|--------|
| `defineTranslations`, `t`, key builder, case transform | `src/i18n/utils` | **→ library** |
| `build-tree` helpers | `src/i18n/utils` | **→ library** |
| scan / generate / validate / find-unused scripts | `src/i18n/scripts` | **→ library** (shipped as a CLI / Angular builder) |
| Transloco loader / interceptor / missing handler | `src/app/transloco.config.ts` | **→ library** (`provideI18n` internals) |
| `*appTranslate` directive | `src/app/shared/directives` | **→ library** |
| `LanguageService` (localStorage persistence) | `src/app/core/services` | **→ library** (optional, exported) |
| `SUPPORTED_LANGUAGES` / `DEFAULT_LANGUAGE` | hardcoded in `define-translations.ts` | **→ consumer config** (passed to `provideI18n`) |
| `TranslationValue` locale fields (`en`, `es?`) | hardcoded interface | **→ generic over consumer's locale union** |
| `*.i18n.ts` modules + `TK_CAMEL` hand-map | `src/app` + `definitions/index.ts` | **stays in consumer** (this is their content) |

**The clean split:** everything *mechanical* (the engine, scripts, runtime hooks, directive)
is library. Everything *content* (the actual strings, the locale list, the scope map) is
consumer. The hard problem is the **codegen handshake** between them (§6).

---

## 5. Proposed consumer-facing API

The end state the goal describes:

```ts
// app.config.ts (consumer)
import { provideI18n } from '@hakistack/ng-daisyui/i18n';
import { ALL_TRANSLATIONS } from './i18n/definitions'; // still scan-generated locally

export const appConfig: ApplicationConfig = {
  providers: [
    provideI18n({
      registry: ALL_TRANSLATIONS,        // the discovered modules
      languages: [
        { id: 'en', label: 'English' },
        { id: 'es', label: 'Español' },
      ],
      defaultLang: 'es',
      fallbackLang: 'en',
      missingKeyInDev: 'show',           // [key] in dev, '' in prod
      loader: 'registry',                // 'registry' (default) | 'http'
      persistLanguage: true,             // wires LanguageService localStorage
    }),
  ],
};
```

`provideI18n` returns the `provideTransloco(...)` config **plus** the comment interceptor and
missing handler — collapsing today's `translocoConfig` + `...translocoHooks` into one call.
The consumer still imports the directive (`TranslateDirective`) and `translateSignal`/`TK` from
the library barrel.

What the library owns internally:
- `provideTransloco` wiring with the registry loader (or HTTP loader).
- `TranslocoCommentInterceptor`, `TranslocoVisibleMissingHandler`.
- `TranslateDirective`, `LanguageService`, `translateSignal` re-export.
- The codegen CLI (`scan`, `generate`, `validate`, `find-unused`) as a binary the consumer
  runs from their `package.json` scripts (or an Angular builder).

---

## 6. The hard problems (must solve before extraction)

These are the reasons this isn't a simple file move.

### 6.1 Codegen needs to run in the *consumer's* repo — invisibly

`scan.ts` walks the **consumer's** `src/**/*.i18n.ts` and emits files into the **consumer's**
tree. A published library can't bake in `src/i18n/definitions/index.generated.ts` (or `TK`, or
the typed directive). So codegen *must* run in the consumer build.

**The hard constraint:** `provideI18n()` runs at **runtime**; `TK` and the typed directive are
**compile-time** artifacts that must exist before the consumer's code is type-checked. A runtime
provider cannot generate the types its own build depends on. **Therefore a build-time codegen
step is unavoidable** if we want type safety. The goal isn't to eliminate it — it's to make the
consumer never write or maintain it.

**Decision — deliver in layers; the zero-script DX is polish, not the critical path.** The
codegen ships as a **CLI binary inside the package** from day one. How the consumer invokes it
gets progressively more automatic (see §10):

- **MVP:** consumer adds npm scripts (`"i18n:scan": "ng-daisyui-i18n scan"`, etc.) + a
  `prestart`/`prebuild` chain — *the exact setup this repo runs today*, just pointed at the lib's
  binary. Works with an **already-installed** lib, no schematic, no `ng add`.
- **Fast-follow — `ng generate @hakistack/ng-daisyui:i18n-setup`:** a schematic that wires the
  above automatically. Runs **anytime on an installed lib** (`ng add` is only the install-time
  shortcut for the same schematic — not a requirement).
- **Polish — custom Angular builder:** wraps `application`/`dev-server`, runs
  scan → generate → validate pre-compile and watches in dev, removing the npm scripts entirely.

The generated `index.generated.ts`, `TK`, and typed `app-translate` wrapper land in the consumer
tree as build artifacts (gitignored or committed). The consumer never hand-edits them at any
layer.

### 6.2 `TK` hand-mapping vs zero-config — **DECIDED**

The goal says "consumer only uses it." But §3.3 shows `TK_CAMEL` must be hand-maintained for
template autocomplete to survive Angular's strict checker.

**Decision: keep the merged `TK` for ergonomics, but make the scanner emit it — flat,
camelCase, no transform, no aliases.** The scanner already knows every module's `scope` and
export name, so it emits a concrete literal:

```ts
// definitions/index.generated.ts (scanner output) — replaces hand-mapped TK_CAMEL + transform
export const TK = {
  home: HOME.keys,
  common: COMMON.keys,
  administration: { ...ADMIN_BASE.keys, users: ADMIN_USERS.keys, /* ... */ },
} as const;
```

Three things drop out of the current design:

- **No SCREAMING_CASE** — delete `transformKeysToScreaming` (runtime) and
  `CamelToScreamingSnake` / `TransformKeysToScreaming` (the char-by-char recursive string types,
  the heaviest type-level load in the repo). `TK.home.welcome` now equals the literal key
  string `'home.welcome'` — one mental model instead of two.
- **No hand-mapping** — the literal is generated, not maintained by hand.
- **No aliases** (`nav`, `auth`, `admin`, `breadcrumbs`) — back-compat debt a fresh library
  shouldn't carry.

Why this dodges the type-checker limit: the emitted literal is **concrete and shallow**
(`{ scope: Module.keys }`), so it never triggers the recursive instantiation that `MergeModules`
+ the SCREAMING transform do. `Module.keys` is independently typed per module and small.

**Migration cost:** every call site changes case — `TK.HOME.WELCOME` → `TK.home.welcome`,
`t.HOME.WELCOME()` → `t.home.welcome()`. Mechanical, codemod-able. Worktree experiment still
recommended to confirm template autocomplete holds at full module count.

### 6.3 Locale list is currently hardcoded
`SUPPORTED_LANGUAGES`/`DEFAULT_LANGUAGE` and `TranslationValue`'s `en`/`es?` fields are baked
into `define-translations.ts`. For a library, locales are a *consumer* decision. Make
`TranslationValue` generic over a locale union (e.g. `TranslationValue<L extends string>`),
or accept a const locale array and derive types from it. The validator, generator, and
build-tree already read `SUPPORTED_LANGUAGES`/`DEFAULT_LANGUAGE` from one place — route those
to consumer config.

### 6.4 `@i18n` path alias
Consumers import from `@i18n`. In a library world the engine comes from
`@hakistack/ng-daisyui/i18n`, but the *generated definitions* (`TK`, `ALL_TRANSLATIONS`) are
consumer-local. Decide the import surface: library exports the engine; a consumer-local barrel
(kept at `@i18n` or `src/i18n`) re-exports the generated `TK` + the library's `translateSignal`.

### 6.5 Build-step ordering — handled by the builder, not consumer scripts
scan → generate → validate must run before compilation, and the watcher must run during dev.
Per §6.1 this is owned by the **custom Angular builder**, not by consumer-maintained
`postinstall`/`prestart`/`prebuild` entries. The watcher (`i18n-watch.mjs`) folds into the
`dev-server` builder so HMR-time rescans are automatic. The consumer's `package.json` stays
clean — `ng build` / `ng serve` are unchanged commands that now do the codegen transparently.

### 6.6 Peer dependency
`@jsverse/transloco` (^8.4.0) becomes a **peerDependency** of the library, not a direct dep, so
the consumer controls the Transloco version and there's one Transloco instance.

### 6.7 The `*appTranslate` directive's `TK` coupling — **second hard problem**

The directive is as important as `TK` itself: it's the *template* consumption surface
(`<div *appTranslate="let t">{{ t.home.welcome() }}</div>`). But it's coupled to `TK` in two
distinct ways, and only one of them is easy.

**Runtime coupling (easy).** Today the directive does
`import { TK } from '../../../../i18n/definitions'` at module load and builds its lazy Proxy
over that object. In a library, `TK` is consumer-generated, so the directive can't import it.
Fix: **provide `TK` via DI.** `provideI18n({...})` registers an injection token (e.g.
`I18N_KEYS`) holding the consumer's `TK`; the directive does `inject(I18N_KEYS)` instead of
importing. The Proxy logic is unchanged — it reads string leaves and calls
`transloco.translate(leaf)` regardless of key casing, so the camelCase decision (§6.2) needs
**no runtime change** here (`t.home.welcome()` resolves exactly as `t.HOME.WELCOME()` did).

**Type coupling (hard — same flavor as §6.2).** The template context is typed as
`TypedTranslations = TranslatedKeys<typeof TK>` — a concrete type baked into the directive
file. A library directive can't reference the consumer's `TK` type. Options:

- **(a) Generated consumer wrapper directive (recommended).** The scanner emits a ~10-line
  `app-translate` directive in the consumer that extends the library's `TranslateDirectiveBase`
  and pins the context type to *their* `typeof TK`. Full autocomplete, zero hand-work, and the
  type is concrete (dodges the checker limit the same way the generated `TK` literal does).
- **(b) Module augmentation.** Library exports an open `TypedTranslations` interface; the
  consumer's generated barrel augments it with their `TK` shape. Fewer files, but declaration
  merging is fiddlier to generate reliably.
- **(c) Generic directive + `ngTemplateContextGuard`.** Make the directive generic over the
  keys type. Cleanest in theory, but Angular's structural-directive context inference through a
  DI-provided generic is brittle — least reliable for template autocomplete.

**Recommendation: (a).** It reuses the exact pattern we already chose for `TK` (scanner emits a
concrete artifact in the consumer), keeps the heavy/typed surface concrete rather than computed,
and leaves the library shipping only a `TranslateDirectiveBase` (untyped/generic core) +
`I18N_KEYS` token. Validate alongside the `TK` worktree experiment — they share the same
type-checker risk.

---

## 7. Suggested extraction phases

1. **Parameterize the engine** — make `define-translations.ts` / `build-tree.ts` locale-agnostic
   (config object instead of hardcoded `SUPPORTED_LANGUAGES`). No behavior change in this app.
2. **Make scripts config-driven** — replace `__dirname`-relative path resolution with an
   `i18n.config.{json,ts}` (srcRoot, outputDir, definitionsDir, locales). Verify the current
   app still builds with the config pointing at today's paths.
3. **Teach the scanner to emit `TK` (and the typed directive wrapper)** — generate a flat
   camelCase `TK` literal (no SCREAMING transform, no aliases) so §6.2 is solved and
   `definitions/index.ts` no longer needs hand-editing; **also emit the consumer-side
   `app-translate` wrapper** (§6.7 option a) that pins the directive context to `typeof TK`.
   Delete `transformKeysToScreaming` + the SCREAMING type machinery. Codemod call sites
   (`TK.HOME.WELCOME` → `TK.home.welcome`, `t.HOME.WELCOME()` → `t.home.welcome()`). Validate
   template autocomplete for **both** `TK` and `*appTranslate` in one worktree — they share the
   same type-checker risk.
4. **Extract the engine + runtime into the library** — `provideI18n` (+ `I18N_KEYS` token),
   loader, interceptor, missing handler, **`TranslateDirectiveBase`** (untyped/generic core that
   injects `I18N_KEYS`), `LanguageService`, `translateSignal` re-export. Transloco → peer dep.
   Note: the *typed* directive (`app-translate`) is generated in the consumer (step 3), not
   shipped by the library.
5. **Ship the codegen as a package binary** (`scan`/`generate`/`validate`/`find-unused` +
   watcher), config-driven. This is the engine the builder calls — and an escape hatch for
   non-CLI pipelines (Nx, custom).
6. **Build the custom Angular builder + `ng add` schematic** (the core "no setup" mechanism,
   §6.1). Builder wraps `application`/`dev-server`, runs codegen pre-compile, watches in dev.
   Schematic wires `angular.json`, injects `provideI18n`, installs deps. **This is what makes
   `provideI18n` + writing `*.i18n.ts` the consumer's entire job.**
7. **Convert this app to the consumer model** — run the schematic against this repo, replace
   `transloco.config.ts` with `provideI18n(...)`, delete the hand-mapped `definitions/index.ts`
   and the `package.json` i18n scripts. Keep only `*.i18n.ts`. This repo becomes the reference
   consumer / integration test that proves the zero-setup claim.

---

## 8. Risks / open questions

- **Angular strict template type-checker limit (§3.3 / §6.2):** the whole "type-safe TK"
  promise depends on emitting a concrete literal. If the generated literal also blows the limit
  at very large module counts, may need to chunk/namespace `TK`. Prototype first.
- **Scoped JSON duplication:** `generate.ts` intentionally writes scoped data both in root and
  per-scope files. Fine today; revisit if/when `provideTranslocoScope` route loading is adopted
  (swap `buildLanguageTree`→`buildEagerTree` for the root file).
- **Regex-based scan** assumes the `export const UPPER = defineTranslations(` convention. A
  drifting consumer convention silently misses modules. Library should document the convention
  loudly (or move to a TS AST parse if robustness matters at scale).
- **HMR story:** the watcher + `import.meta.hot.accept` in `transloco.config.ts` must be
  reproduced/documented for consumers, or value edits won't hot-reload.
- **SSR:** registry loader is SSR-safe by design (no HTTP); the HTTP fallback needs absolute
  URLs — document this trade-off in `provideI18n({ loader })`.

---

## 9. TL;DR

The system is a **custom type-safe authoring + codegen layer over Transloco**. ~80% of it
(engine, scripts, runtime hooks, directive) is already cleanly separable and library-ready.

**Consumer's entire job in the target state:** `ng add` once → write `*.i18n.ts` → add
`provideI18n(...)`. Nothing else — no scripts, no hand-mapped `TK`, no Transloco wiring.

The 20% that makes this real comes down to four things: **(1)** codegen must run in the
consumer build, but invisibly — delivered via an **`ng add` schematic + custom Angular builder**,
not consumer-maintained npm scripts (note: `provideI18n` runs at *runtime* and physically cannot
generate the *compile-time* `TK`/directive types, so a build-time step is unavoidable — the win
is hiding it); **(2)** the locale list must become consumer config instead of hardcoded
constants; **(3)** the scanner must *emit* the flat camelCase `TK` literal so the consumer never
hand-maps it; and **(4)** the `*appTranslate` directive must take `TK` via a DI token at runtime
and via a generated consumer-side typed wrapper at compile time. (3) and (4) share the same
Angular-template type-checker risk and should be prototyped together in a worktree first.

---

## 10. Release strategy — ship in layers (the schematic/builder are NOT blockers)

The lib is **already installed** in consumers, so `ng add` is irrelevant for them — and the
zero-script DX (schematic, builder) is *polish that ships later*. It does not gate the feature.
Each layer is additive; existing consumers adopt the next layer whenever it lands.

| Layer | What ships | Consumer one-time setup | Removes |
|-------|-----------|------------------------|---------|
| **MVP (tomorrow)** | Runtime API (`provideI18n`, loader, interceptor, missing handler, `TranslateDirectiveBase` + `I18N_KEYS`, `translateSignal`, `LanguageService`) **+ codegen CLI binary** | Add npm scripts pointing at the lib's binary + `prestart`/`prebuild` chain; add `provideI18n(...)`; import generated barrel | hand-mapped `TK`, manual Transloco wiring |
| **Fast-follow** | `ng generate @hakistack/ng-daisyui:i18n-setup` schematic | Run the schematic once (works on installed lib — no reinstall, no `ng add`) | the manual npm-script copy-paste |
| **Polish** | Custom Angular builder | none (schematic swaps `angular.json`) | the npm scripts entirely |

**Why the MVP is low-risk for a 1-day turnaround:** the manual npm-script path is *literally
what this repo runs today* (`prestart`/`prebuild` → `scan→generate→validate`). Extracting the
scripts into the lib's `bin` and re-pointing the consumer's `package.json` at them is a
near-mechanical change to a proven flow — not new infrastructure.

**The one thing that still must work tomorrow:** items (3) generated `TK` and (4) the typed
directive wrapper — they're the autocomplete payload the CLI emits, and they carry the Angular
template type-checker risk. **Spike these today** (worktree, full module count) before locking
the date. Everything else in the MVP is plumbing we already trust.

### MVP scope vs. deferred (maps to §7 phases)

- **In tomorrow's MVP:** phases 1–5 (parameterize engine, config-driven scripts, emit `TK` +
  typed directive, extract runtime to lib, ship CLI binary).
- **Deferred fast-follow / polish:** phase 6 (schematic + builder), phase 7 (convert this repo
  to pure consumer model).
