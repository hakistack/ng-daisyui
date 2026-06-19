# PDFium Rendering Engine for `hk-pdf-viewer`

> **Goal:** replace pdf.js with **PDFium (Google's Chrome PDF engine) compiled to
> WASM, driven from Rust**, as the rendering + parsing backend — for full control,
> higher fidelity, and **correct off-main-thread rendering** (the thing pdf.js
> fundamentally can't do — see §1).
>
> **Strategy:** **completely replace and remove pd​f.js.** PDFium becomes the sole
> rendering/parsing engine — `pdfjs-dist` and all pd​f.js-specific code are
> deleted once PDFium reaches parity. There is **no pd​f.js fallback**. The
> component, controller (`createPdfViewer`), toolbar, sidebar, virtualization,
> zoom math, and search-highlight overlay are **kept as-is** — only the *engine*
> (raster, text, outline, annotations, forms) changes, behind a thin engine
> interface kept purely as a testing/mocking seam (one production impl: PDFium).
>
> Status: **proposal / planning**. Milestones 0–3 reach feature parity (then
> pd​f.js is deleted); 4–5 go beyond (interactive forms, save round-trip,
> print/export).

---

## 1. Why PDFium (the motivation, concretely)

pd​f.js rasterizes text using the **main-thread document's font machinery**
(`FontFace`/`document.fonts`). Inside a Web Worker there is no `document`, so
glyphs fall back to `.notdef` boxes — we hit this exactly when wiring the
OffscreenCanvas worker pool (Phase B of `PERFORMANCE.md`): thumbnails rendered on
the main thread were crisp, worker-rendered pages were tofu. That makes truly
off-thread rendering **impossible** with pd​f.js.

**PDFium rasterizes glyph outlines itself, entirely inside WASM** — no DOM, no
`FontFace`. So it renders correct text **in a worker**, freeing the main thread.
That single property is why this is worth the effort. Secondary wins:

- **Control:** one engine we own end-to-end (raster, text, forms, save) instead
  of pd​f.js's DOM-coupled layers we have to wrap and fight.
- **Fidelity:** PDFium is the renderer shipping in Chrome — reference-grade.
- **Fits the repo:** we already compile Rust→WASM (`hakistack-engine/`:
  calamine, image, the fuzzy/search kernels) with `wasm-pack` +
  `scripts/build-wasm.mjs`. PDFium is one more engine in that pipeline.

**Licensing:** PDFium is **BSD-3-Clause + Apache-2.0** — **not AGPL**, so it
passes the project's hard no-AGPL rule (unlike MuPDF, which is AGPL and blocked).
`pdfium-render` (the Rust wrapper) is **MIT/Apache-2.0**.

---

## 2. Goals / non-goals

**Goals**
- PDFium render backend reaching **pd​f.js parity** (see the matrix in §5): load,
  raster, virtualization, zoom, text selection, search, thumbnails, outline,
  links, attachments, annotation display.
- **Off-thread by default** (the payoff): parse + raster + text extraction run in
  a worker; the main thread only blits `ImageBitmap`s and positions overlays.
- Then **beyond parity**: interactive AcroForm fill-in + save round-trip, print,
  export.

**Explicit goal: remove pd​f.js**
- Once parity lands (end of M3), **delete `pdfjs-dist`** (dependency + peer),
  `pdf.service.ts`, `pdf-render.worker.ts`, `pdf-render-pool.ts`,
  `scripts/build-render-worker.mjs`, the shipped worker asset + its package
  export, and every pd​f.js code path in the component (`renderTextLayer`,
  `renderAnnotationLayer`, the pd​f.js render calls, `GlobalWorkerOptions` setup).
  PDFium is the only engine — **no fallback**.

**Non-goals (initially)**
- Building PDFium from source (use a vendored prebuilt `pdfium.wasm` first; a
  custom build is a later optimization — §6).
- Annotation *editing* (drawing new highlights/ink) — display + form fill first.

---

## 3. Architecture

Keep everything in `hk-pdf-viewer` that isn't engine-specific; isolate the engine
behind a backend interface.

```
┌─ hk-pdf-viewer (TS, UNCHANGED) ───────────────────────────────────────┐
│  component · createPdfViewer controller · toolbar · sidebar           │
│  virtualization (IntersectionObserver + liveBuffer) · zoom math       │
│  search-highlight overlay · text-selection overlay · a11y             │
│                              │ calls                                   │
│                              ▼                                         │
│  PdfEngine (TS interface — single PDFium impl; mockable for tests)     │
└──────────────────────────────┼────────────────────────────────────────┘
                               │ postMessage (transferables)
┌─ pdfium.worker (Web Worker) ─▼──────────────────────────────────────────┐
│  wasm-bindgen glue  ─►  Rust `pdf-engine` crate (pdfium-render)          │
│                          │ FFI                                          │
│                          ▼                                              │
│  pdfium.wasm (prebuilt PDFium engine, lazy-loaded, ~3–8 MB)             │
│  renders glyphs itself → ImageBitmap; extracts text rects; outline;     │
│  annotations; forms; save                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.1 `PdfEngine` (new TS interface)
A thin boundary between the component and the PDFium worker — **one production
implementation** (`PdfiumEngine`); the interface exists only so the component
stays unit-testable with a mock. Not a fallback/registry. Roughly:

```ts
interface PdfEngine {
  open(src: ArrayBuffer, opts: { password?: string }): Promise<PdfDocHandle>;
  pageCount(doc): number;
  pageSize(doc, page): { width: number; height: number };           // PDF points
  renderPage(doc, page, scale, dpr, signal): Promise<ImageBitmap>;   // off-thread
  textRects(doc, page): Promise<TextRun[]>;                          // selection/search
  outline(doc): Promise<OutlineNode[]>;
  links(doc, page): Promise<PdfLink[]>;
  annotations(doc, page): Promise<PdfAnnotation[]>;
  attachments(doc): Promise<PdfAttachment[]>;
  form?: PdfFormApi;                                                 // phase 4
  save?(doc): Promise<Uint8Array>;                                   // phase 4
  dispose(doc): void;
}
```

The component already speaks in pages/scales/rects — this interface mirrors what
it needs.

### 3.2 Worker model
One **document worker** owns the PDFium instance for a document (PDFium is not
thread-safe across documents). It handles `open / renderPage / text / outline /
annotations / form / save`. Optionally a small **render pool** (2 workers, each
its own PDFium doc) for parallel raster — but **unlike the pd​f.js attempt this
actually works**, because PDFium renders text correctly off-thread. Cancellation,
epoch, and the `{ cancel, promise }` handle shape reuse the machinery we already
built in `pdf-render-pool.ts`.

### 3.3 Text + overlays (reused)
- **Selection:** PDFium gives per-char/҂run bounding boxes (`FPDFText_*`). We build
  a transparent, absolutely-positioned text overlay from those rects — same idea
  as pd​f.js's text layer, but the geometry comes from PDFium. The existing
  search-highlight painter (`applyHighlightsForPage`, span walking) adapts to
  these rects.
- **Search:** feed PDFium's extracted page text into the **existing Rust search
  engine** (`engine-wasm`'s pdf-search kernel — see `RUST_ENGINE.md`), or use
  PDFium's own `FPDFText_FindStart`. Either way the highlight overlay + next/prev
  controller methods are unchanged.

---

## 4. Crate & toolchain decision

| Option | What | Verdict |
|---|---|---|
| **`pdfium-render`** (recommended) | Mature Rust wrapper over PDFium's C API; documents a **WASM target** where Rust (wasm32) calls into a separately-loaded `pdfium.wasm`. MIT/Apache. | **Use this.** Safe Rust API (PdfDocument/PdfPage/PdfPageText/PdfBookmarks/PdfForm…), WASM path documented, actively maintained. |
| `pdfium` crate (the docs.rs link) | Lower-level binding. | Note it exists; `pdfium-render` is higher-level + WASM-proven. |
| Raw `bindgen` FFI to a custom PDFium build | Max control, max effort. | Later, only if `pdfium-render`'s WASM seam proves limiting. |

**PDFium WASM binary:** start with a **maintained prebuilt** (e.g. paulocoutinhox
`pdfium-lib` releases, or an npm `@…/pdfium` wasm build) **vendored** into the
repo and shipped as a library asset — exactly how the render worker `.mjs` is
shipped (`scripts/build-render-worker.mjs` → `workers/` + package `exports`).
Building PDFium from source (emscripten) is deferred (§6 risk).

**Pipeline:** new crate `hakistack-engine/crates/pdf-engine` (wasm-bindgen API) +
`pdfium-render`; extend `scripts/build-wasm.mjs` to emit `pdf_engine` →
`src/lib/wasm/pdf_engine/` with the same `*_glue.ts` + `*_inline.ts` pattern; the
prebuilt `pdfium.wasm` ships as an asset (lazy-loaded, like the other engines).

---

## 5. Feature-parity matrix (pd​f.js → PDFium)

| Feature (current `hk-pdf-viewer`) | PDFium / pdfium-render | Milestone |
|---|---|---|
| Load URL / `Uint8Array` / `Blob` | `PdfDocument` from bytes | M0/M1 |
| Password-protected docs | `open(bytes, password)` | M1 |
| Page count + size (points) | `pages().len()`, `page.width/height` | M1 |
| Raster page → canvas, DPR-aware | `page.render(width,height,…)` → RGBA → `ImageBitmap` | M0/M1 |
| Continuous / single mode | TS only (unchanged) | M1 |
| Zoom fit-width/page/auto/numeric + ResizeObserver | TS `computeScale` (unchanged; uses page points) | M1 |
| Virtualization (live buffer, evict, cancel) | TS (unchanged); backend just renders requested page | M1 |
| Thumbnails (lazy) | same raster path at small scale | M1 |
| Rotation, page nav | `page.rotation`; TS nav (unchanged) | M1 |
| **Text selection / copy** | `page.text().chars()/segments()` rects → overlay | M2 |
| **Search** (substring/word/case, highlight, next/prev) | Rust search engine over PDFium text *or* `FPDFText_FindStart` | M2 |
| Outline / bookmarks | `document.bookmarks()` → tree + destinations | M3 |
| Links (web + internal dest) | `page.links()` / annotations → clickable overlay | M3 |
| Attachments | `document.attachments()` | M3 |
| Annotation **display** | `page.annotations()` (subtype, rect, contents) | M3 |
| **AcroForm interactivity** (fill) | `PdfForm` + form fill env; widget overlay | M4 |
| **Save round-trip** (form edits) | `document.save()` (`FPDF_SaveAsCopy`) | M4 |
| Print | render pages → print, or print original bytes | M5 |
| Download / export | original bytes or saved copy | M5 |
| a11y (roles/aria/focus/keys) | TS (unchanged) | every M |
| SSR / no-WASM browser | clear "unsupported" state (no pd​f.js fallback); SSR shows a placeholder, hydrates client-side | every M |

---

## 6. Phases

### Phase 0 — Toolchain spike *(make-or-break; do this before committing)*
Prove the hard part end-to-end and nothing else:
- New `pdf-engine` crate + `pdfium-render`; vendor a prebuilt `pdfium.wasm`.
- Extend `build-wasm.mjs`; wire a loader (`pdfium-loader.ts`) + a minimal worker.
- **Deliverable:** in a throwaway demo route, open the tracemonkey PDF **in a
  worker** and render page 1 to a canvas with **correct, crisp text** (the exact
  thing pd​f.js failed at off-thread). Measure: `pdfium.wasm` size, time-to-first-
  page, memory. **Decision gate:** if the WASM seam + size are acceptable, proceed.

### Phase 1 — Core render parity (the engine)
- Define `PdfEngine`; implement `PdfiumEngine` (open, pageCount, pageSize,
  renderPage, dispose). No second backend.
- Route the component's raster through the engine; **keep** virtualization, zoom,
  modes, thumbnails, rotation, nav, ResizeObserver, cancellation/epoch.
- pd​f.js still present *during* development (not yet wired) so the viewer keeps
  working until parity; it is **not** a runtime fallback.
- **Done when:** continuous + single, fit modes, thumbnails, and fast-scroll all
  work via PDFium, with correct text, off-thread.

### Phase 2 — Text selection + search
- Build the text-selection overlay from PDFium char/segment rects.
- Wire search: PDFium text → existing Rust search index (or `FPDFText_FindStart`);
  reuse the highlight overlay + `nextMatch/prevMatch/clearSearch` controller API.
- **Done when:** select/copy works, find-bar highlights + navigates matches.

### Phase 3 — Outline, links, attachments, annotation display
- `outline()` → bookmarks tab (reuse the tree template + `goToDestination`).
- `links()` → clickable overlay (web `<a target=_blank>` + internal dest nav via
  the existing link-service navigation).
- `attachments()` → attachments tab + download.
- `annotations()` → annotations sidebar list + static display layer.
- **Done when:** all four sidebar tabs + links work on PDFium. **← pd​f.js parity.**

### Phase 3.5 — Delete pd​f.js *(the point of all this)*
Parity is reached, so rip it out completely:
- Remove `pdfjs-dist` from root deps + the library peerDependency.
- Delete `pdf.service.ts`, `pdf-render.worker.ts`, `pdf-render-pool.ts`,
  `scripts/build-render-worker.mjs`, the shipped `workers/pdf-render.worker.mjs`
  asset + its package `exports` entry, and the demo's copy.
- Strip every pd​f.js code path from the component (`renderTextLayer`,
  `renderAnnotationLayer`, the `proxy.render` calls, `GlobalWorkerOptions`,
  `HkPdfService` usage) and the `renderPoolSize`/`renderWorkerSrc` config.
- **Done when:** `grep -ri pdfjs` over the lib is clean, build + tests green, and
  the viewer runs **PDFium-only**.

### Phase 4 — Interactive forms + save *(beyond pd​f.js's current read-only forms)*
- Init PDFium form-fill environment; render form field appearances; overlay
  interactive widgets (text/checkbox/radio/choice) wired to PDFium form state.
- `save()` via `FPDF_SaveAsCopy` so `download`/`saveAndDownload` round-trip edits.
- **Done when:** users fill a form and download a PDF with their values embedded.

### Phase 5 — Print, export, a11y, polish
- Print (render-to-print or original), export saved copy, a11y audit on overlays,
  perf tuning (render pool sizing, bitmap eviction/`close()`, memory caps), the
  "unsupported browser" state, docs + demo. (pd​f.js is already gone after 3.5.)

---

## 7. Risks & mitigations

- **PDFium WASM size (~3–8 MB).** Lazy-load only when a PDF opens (asset, not in
  base bundle) — same lazy seam as the other engines. Vendor a size-optimized
  build later.
- **WASM toolchain seam (`pdfium-render` + prebuilt pdfium.wasm).** The #1
  unknown → that's *all* Phase 0 is. Don't commit further until it's proven.
- **Building PDFium from source** is heavy (emscripten). **Avoid initially** —
  vendor a prebuilt; revisit only for size/customization.
- **Text-selection geometry** must match the raster exactly (scale/DPR/rotation).
  Mitigate with a visual overlay-alignment harness in Phase 2.
- **Form interactivity** is the hardest parity-plus piece (PDFium gives field
  state, not DOM widgets — we render widgets + bridge events). Scoped to Phase 4,
  after parity ships.
- **No fallback (pd​f.js removed).** PDFium is the only engine, so robustness is
  on us: SSR / no-WASM browsers show a clear "PDF viewing isn't supported here"
  state (not a crash); engine-load failure surfaces a recoverable error + retry.
  This is the deliberate trade for owning one engine. The target floor is any
  browser with WASM + Worker (effectively all current browsers).
- **Memory** (PDFium doc + bitmaps) on long docs → reuse virtualization eviction;
  `close()` bitmaps on evict; cap rendered pages.

---

## 8. What we reuse vs. build

**Reuse (no change):** `hk-pdf-viewer` component shell, `createPdfViewer`
controller + all its methods, toolbar (incl. custom-toolbar slot), sidebar tabs
UI, virtualization (`IntersectionObserver` + `liveBuffer` + hysteresis), zoom
math (`computeScale`), search-highlight painter, the cancellation/epoch model and
`{cancel,promise}` handle shape from `pdf-render-pool.ts`, the WASM build pipeline
(`build-wasm.mjs`, `*_glue/_inline` pattern, loaders), and the asset-shipping
pattern from `build-render-worker.mjs`.

**Build new:** `PdfEngine` interface + single `PdfiumEngine` impl;
`hakistack-engine/crates/pdf-engine` (Rust, `pdfium-render`, wasm-bindgen API);
vendored `pdfium.wasm` asset + `pdfium-loader.ts`; `pdfium.worker.ts`; the text-
selection overlay built from PDFium rects; form-widget overlay (Phase 4).

**Delete (Phase 3.5):** `pdfjs-dist` (dep + peer), `pdf.service.ts`,
`pdf-render.worker.ts`, `pdf-render-pool.ts`, `scripts/build-render-worker.mjs`,
the shipped worker asset + export, and all pd​f.js code paths/config in the
component. **No pd​f.js remains.**

---

## 9. Open decisions (confirm before Phase 1)

1. **Crate:** `pdfium-render` (recommended) vs the lower-level `pdfium` crate.
2. **PDFium binary:** vendored prebuilt (recommended to start) vs build-from-source.
3. ~~Backend strategy~~ — **decided: full replacement, remove pd​f.js, no fallback.**
4. **Workers:** single document worker vs a small render pool (2).
5. **Search:** reuse the Rust search engine vs PDFium's native text search.

---

## 9a. Phase 0 — status (2026-06-19)

**✅ Compile/build seam PROVEN** (the #1 make-or-break unknown):
- Crate `hakistack-engine/crates/pdf-engine` scaffolded (added to the workspace),
  depending on `pdfium-render 0.8.37` (`default-features = false`,
  `features = ["pdfium_latest"]` → **PDFium API 7543**) + wasm-bindgen/js-sys.
- `lib.rs` exposes `probe_open(bytes, password) -> [pageCount, w, h]` and
  `probe_render(bytes, index, targetWidth) -> RGBA bytes` using the real
  pdfium-render API (`load_pdf_from_byte_vec`, `pages().get`, `width()/height()`,
  `render_with_config().set_target_width`, `as_rgba_bytes`).
- `cargo build -p pdf-engine --target wasm32-unknown-unknown` → **compiles.**
- `wasm-pack build crates/pdf-engine --target web` → **emits `pdf_engine_bg.wasm`
  + `pdf_engine.js` glue + `pdf_engine.d.ts`** (same shape as the other engines).
- Wired into `scripts/build-wasm.mjs` (bundle `pdf_engine` → `src/lib/wasm/pdf/`).

So the Rust ↔ pdfium-render ↔ wasm32 ↔ wasm-bindgen toolchain works in this repo.

**⏳ Remaining Phase 0 (runtime spike — needs a browser + the binary; do on a dev
machine):**
1. **Vendor `pdfium.wasm`** matching API 7543 from **paulocoutinhox/pdfium-lib**
   releases (its WASM has a *growable* heap — bblanchon's OOMs on multi-page
   docs). Ship it as a library asset (same approach as the render-worker asset).
2. **Load order:** pdfium-render's `Pdfium::default()` binds to the PDFium
   emscripten `Module` on the JS side, so the worker must load the pdfium JS+wasm
   **before** calling our `pdf_engine` glue's `init()` — follow pdfium-render's
   WASM example: <https://github.com/ajrcarey/pdfium-render/tree/master/examples>.
3. **Spike harness:** a throwaway worker that imports the pdfium module + the
   `pdf_engine` glue, runs `probe_open` + `probe_render` on the tracemonkey PDF,
   transfers the RGBA back, and blits to a canvas. **Decision gate:** confirm the
   page renders with **crisp text** (the exact thing pd​f.js failed at off-thread)
   and check `pdfium.wasm` size + time-to-first-page. If good → Phase 1.

**Run it:** `npm run build:wasm` (needs network for the Rust deps the first time)
rebuilds all engines incl. `pdf_engine`; artifacts land in
`projects/hakistack/ng-daisyui/src/lib/wasm/pdf/`.

## 9b. Phase 1 — harness scaffold (2026-06-19)

Scaffolded the engine boundary + worker harness (builds clean; nothing wired
into the component yet):

- `engine/pdf-engine.types.ts` — `PdfEngine` interface + worker message protocol
  + handle/result types. (types only; lib-safe)
- `engine/pdfium-engine.ts` — main-thread `PdfEngine` impl over the worker
  (request-id correlation, transferable bytes, cancellable render tasks).
  **Zero-config:** constructor takes no args; it builds the worker from the
  inlined source via `createPdfiumWorker()` (Blob URL), and revokes it on
  `destroy()`.
- `engine/pdfium-worker.loader.ts` — turns the inlined `PDFIUM_WORKER_SRC` into a
  Blob + module `Worker` at runtime. Nothing fetched, no served asset. Throws a
  clear "not built" error while the placeholder is in place.
- `engine/pdfium.worker.ts` — worker harness with the **confirmed pdfium-render
  bootstrap contract**: `initialize_pdfium_render(pdfiumModule, ourModule,
  debug)` after loading the emscripten PDFium module + our `pdf_engine` glue.
  Self-contained: imports both `.wasm` via esbuild's `binary` loader and feeds
  them in (`createPdfiumModule({ wasmBinary })`, `initPdfEngine(bytes)`) — no
  fetch. Excluded from ng-packagr (`**/*.worker.ts`); built by the dedicated
  esbuild step `scripts/build-pdfium-worker.mjs`.

**Compile vs runtime (important):** the native libs in
`external/pdfium/runtimes/*/native/*` (`.so/.dylib/.dll`, chromium-7891) and
`pdfium_loader.rs` are the **native** path (`bind_to_library`) — they are **NOT
used to compile to wasm** (already proven — the wasm builds with no binary
present) and **cannot run in a browser**. pdfium-render binds at *runtime*. The
browser viewer needs an **emscripten `pdfium.wasm` + `pdfium.js`** loaded in the
worker; keep the native libs only if a native/Node path is also wanted.

**PDFium load = MODULARIZE/ES6 (decided).** The first vendored `pdfium.js` was a
**non-MODULARIZE** emscripten build (global `Module`, auto-`run()`, no ES export)
— that can't be cleanly `import`ed in a `{type:'module'}` worker. Decision:
re-vendor a `-sMODULARIZE -sEXPORT_ES6` build so the worker stays clean ESM.
`loadPdfiumModule()` is wired for it: `createPdfiumModule({ wasmBinary })`.

**Packaging = fully inlined, zero consumer setup (decided).** No served asset,
no `workerUrl` injection — the whole worker (its code + the PDFium and
`pdf_engine` `.wasm`) is bundled into the library and instantiated from a Blob
URL at runtime. `scripts/build-pdfium-worker.mjs` (esbuild, in the `npm run
build` chain, **skip-safe** until inputs exist):
- bundles `pdfium.worker.ts` + `pdf_engine.js` + `pdfium.js`, embedding both
  `.wasm` via the `binary` loader → one self-contained worker module;
- writes it to `engine/pdfium/pdfium_worker_inline.ts` as `PDFIUM_WORKER_SRC`
  (a committed empty placeholder ships until built);
- the loader makes `new Worker(URL.createObjectURL(blob), { type: 'module' })`;
- runs **before** `ng build` in the `build` chain so ng-packagr bundles the
  generated source into the FESM.

Trade-off: a large **lazy** chunk (~9 MB, only loaded when a PDF first opens)
and a `worker-src blob:` CSP allowance. Accepted in exchange for zero setup.

**⚠️ Vendoring location.** Put the vendored `pdfium.js`/`pdfium.wasm` under
`components/pdf-viewer/engine/pdfium/` — **NOT** `src/lib/wasm/`. `npm run
engine:build` does `rm -rf src/lib/wasm` (the `engine_wasm` bundle uses
`libSubdir: '.'`), so anything placed under `wasm/` is destroyed on the next
engine build. The `pdf_engine` glue legitimately lives under `wasm/pdf/`
(it's an engine-build output, regenerated each run); the vendored pdfium binary
is an input and must persist, hence `engine/pdfium/`.

**Remaining inputs to make the harness run — see §11 for the exact checklist.**

**Component wiring — DONE (2026-06-19).** `pdf-viewer.component.ts` now drives
PDFium as its rasterizer behind the existing render-pool seam:
- fields `pdfiumEngine: PdfEngine | null` + `pdfiumDoc: PdfDocHandle | null`;
- `ensurePdfiumEngine()` lazily builds one `PdfiumEngine` (reused across docs),
  gated on `isPdfiumEngineAvailable()` — false until the worker is built, so the
  path is **dormant** today and the pd​f.js raster runs unchanged;
- `loadDocument` opens the doc in the engine (skipping the legacy pd​f.js render
  pool when active; doc-swap-guarded; falls back to pd​f.js raster if `open`
  throws);
- `renderPageOnto`'s **first branch** rasterizes via the engine (0-based page) →
  `drawImage(bitmap)`, reusing the epoch/cancel/`renderTasksByPage` machinery;
- `destroyDocument` releases the open doc (keeps the engine); `teardown`
  destroys the engine/worker.

So the moment a real PDFium binary is vendored + built, the viewer renders
through PDFium with **zero further code changes** — flip is automatic via
`isPdfiumEngineAvailable()`. Transitional: pd​f.js still serves text/search/
outline/annotations/thumbnails until Phases 2–3; M3.5 deletes it. **Still needs
a browser to verify** page-1 raster shows crisp text (can't run here).

## 9c. Phase 2 — persistent handle + text/search (2026-06-19)

**Rust: stateless → persistent document registry.** `crates/pdf-engine/src/lib.rs`
dropped `probe_open`/`probe_render` (re-parsed bytes every call) for a handle
API: `open(bytes, password) → u32`, `close(h)`, `page_count(h)`,
`page_size(h, i) → [wPt, hPt]`, `render(h, i, targetWidth) → [wPx, hPx, RGBA]`,
`page_text(h, i) → [[text, x, y, w, h], …]`. Open `PdfDocument`s live in a
`thread_local! HashMap<u32, PdfDocument<'static>>`; the `Pdfium` instance is
`Box::leak`'d to `'static` (sound — wasm is single-threaded) so documents can
borrow the bindings across calls. PDFium parses **once** per document.
`render` returns the bitmap's real px dims (no JS-side aspect-ratio guess).
`page_text` returns segments in reading order with rects already Y-flipped to a
top-left origin in PDF points. Compiles to `wasm32-unknown-unknown` clean.

**Worker/engine/protocol.** The `PdfDocHandle` is now the Rust handle directly —
the worker keeps **no** bytes (Rust owns the doc). Added `pageText` to the
`PdfEngine` interface, the worker protocol, and `PdfiumEngine`. `PdfTextSegment`
(`{text,x,y,w,h}`) is the shared text shape.

**Component: text + search off PDFium (gated, dormant).** When the engine is
active:
- `pdfiumSegments(page)` fetches + caches `page_text` (cleared on doc swap);
- `populateTextIndex` was refactored to a shared `populateTextIndexFromStrings`
  so both engines feed the **same** search index + WASM mirror — search "just
  works" off PDFium (segment index ≡ span index, the highlighter's invariant);
- `ensurePageTextIndex` and `renderTextLayer` branch to PDFium;
- `renderPdfiumTextLayer` builds the selectable/searchable text layer itself —
  one transparent `<span>` per segment, positioned in CSS px (points × render
  scale), each `scaleX`-stretched to its segment box (width reads batched into
  one layout pass). Reuses the existing `.hk-pdf-text-layer` CSS +
  `applyHighlightsForPage` unchanged.

Still dormant until the binary lands (1426 tests green). **Needs a browser to
tune:** segment span vertical alignment / font metrics for selection feel
(visual only — text is transparent; search correctness is independent of it).

## 9d. Phase 3 — outline / links / annotations / thumbnails (2026-06-19)

The last pd​f.js-only responsibilities now have PDFium implementations (gated,
dormant). pd​f.js is no longer needed for any read path once the binary lands.

**Rust additions** (`crates/pdf-engine/src/lib.rs`, compiles to wasm32 clean):
- `outline(h) → [title, pageIndex, children[]]` tree (recursive `bookmark_node`,
  `bookmarks().root()` + `next_sibling()` walk; destination → 0-based page).
- `page_links(h, i) → [x, y, w, h, pageIndex, uri]` (top-left points; internal
  jump *or* external URI; non-actionable links skipped).
- `document_annotations(h) → [pageIndex, subtype, contents]` across all pages,
  filtered to displayable subtypes (`annotation_type_str` maps PDFium enum →
  pd​f.js-style names, `""` = skip).
- `attachments(h) → [name, bytes]` (`save_to_bytes`).
- `render` now sets `.render_annotations(true).render_form_data(true)` so
  annotation + form-widget *appearances* bake into the raster — only links stay
  a DOM overlay (they must be clickable).

**Component (all gated on `pdfiumEngine && pdfiumDoc`):**
- `fetchOutline` builds the template node shape (`{title, items, pageIndex}`)
  from the engine tree; `outlineGoto` jumps via `pageIndex` (vs pd​f.js `dest`).
- `fetchAttachments` / `fetchAnnotations` project engine rows into the existing
  `PdfAttachmentEntry` / `PdfAnnotationEntry` view-models.
- `renderAnnotationLayer` → `renderPdfiumLinkLayer`: transparent positioned
  `<a target=_blank>` (URI) / `<button>` (internal `goToPage`) hit targets, each
  with an `aria-label` (AXE). New `.hk-pdf-link` CSS mirrors the old link style.
- `renderOneThumbnail` renders off-thread via `engine.renderPage` at width 180.

1429 tests green. **Browser-tune later:** link-rect alignment + annotation
appearance fidelity vs pd​f.js; verify outline jumps land on the right page.

## 10. Definition of done (parity)

Milestones 0–3 complete: PDFium opens/renders/zooms/virtualizes/thumbnails,
selection + search work, all four sidebar tabs (thumbnails/bookmarks/annotations/
attachments) + links work — **all off the main thread with correct text**. Then
**M3.5 deletes pd​f.js entirely** (`grep -ri pdfjs` clean). The viewer runs on
PDFium alone — an engine we fully control — ready for forms/save/print in 4–5.

## 11. Vendor + verify checklist (do this before Phase 4)

Everything that can be validated without a browser is green: the Rust crate
compiles to wasm, `npm run engine:build` emits the `pdf_engine` glue with all
Phase 1–3 exports (`open/close/page_count/page_size/render/page_text/outline/
page_links/document_annotations/attachments` + `initialize_pdfium_render`), the
worker imports resolve against it, and `initialize_pdfium_render(pdfiumModule,
ourModule, debug)`'s second arg = the wasm-bindgen `init()` return (raw exports),
confirmed against the crate source. The only missing input is the PDFium binary.

**Steps**

1. **Get a MODULARIZE/ES6 PDFium wasm build.** From paulocoutinhox/pdfium-lib,
   the emscripten target built with `-sMODULARIZE -sEXPORT_ES6
   -sENVIRONMENT=web,worker`, **API 7543** (matches the crate's `pdfium_latest`),
   growable heap. You need exactly two files: `pdfium.js` (ES-module factory,
   `export default createPdfiumModule`) and `pdfium.wasm`.
   - Sanity-check `pdfium.js` is modularize/ES6: it should `export default` a
     factory and have **no** top-level `var Module` / auto-`run()`. The non-
     modularize files in `external/pdfium/runtimes/wasm/native/` will NOT work.

2. **Place them** at `projects/hakistack/ng-daisyui/src/lib/components/pdf-viewer/engine/pdfium/`
   (next to the committed `pdfium_worker_inline.ts` placeholder). NOT under
   `src/lib/wasm/` (see §9b warning).

3. `npm run engine:build` — regenerates `src/lib/wasm/pdf/` (the `pdf_engine`
   glue + `pdf_engine_bg.wasm`). Safe to run any time; it does NOT touch
   `engine/pdfium/`.

4. `npm run build` — `build-pdfium-worker.mjs` now finds all inputs, esbuild-
   bundles the self-contained worker (~9 MB), writes `pdfium_worker_inline.ts`,
   and ng-packagr bundles it into the FESM. Watch for `✓ Bundled PDFium worker`
   instead of `⏭ skipped`.

5. **Verify in a browser** (`npm start`, open a PDF). `isPdfiumEngineAvailable()`
   now returns true, so the engine path is live. Confirm, in order:
   - a page renders with **crisp text** (the whole point — proves off-thread
     glyph raster works);
   - **thumbnails** paint (engine raster at width 180);
   - **find** (Ctrl/Cmd-F) highlights matches and next/prev navigates — proves
     `page_text` → index → highlight;
   - **text selection** drags sensibly (text-layer span alignment — tune
     `renderPdfiumTextLayer` font metrics here if selection feels off);
   - **bookmarks** tab lists the outline and clicking a node jumps to the page;
   - **links** in the page are clickable (internal jump + external URI open);
   - **annotations**/**attachments** tabs populate.
   - DevTools: ensure CSP allows `worker-src blob:` (the worker is a Blob URL).

6. Only after the raster + text verify cleanly: build **Phase 4** (interactive
   forms + save) on top, then **M3.5** (delete pd​f.js — `grep -ri pdfjs` clean).

**Things most likely to need a tweak in the browser (none block correctness):**
text-layer span vertical alignment / `scaleX` fit, link-rect alignment, and
annotation appearance fidelity. The data paths (search index, outline targets,
attachment bytes) are deterministic and already unit-safe.
