# Performance Roadmap for `hk-pdf-viewer`

> Goal: enterprise-grade performance on top of PDF.js — smooth scrolling on
> 500-page documents, sub-second time-to-first-page, frame-rate-stable
> selection/search/annotation. The biggest wins are architectural, not
> language-level. This doc sequences them.
>
> Companion to [`RUST_ENGINE.md`](./RUST_ENGINE.md), which covers the
> search-kernel rewrite. Where Rust earns its keep beyond search, it is
> called out below.

---

## 1. Where time actually goes today

Profile of a 200-page mixed-content PDF, mid-tier laptop (M2 / Chrome):

| Stage | Where | Cost | Notes |
|-------|-------|------|-------|
| Document parse + first-page paint | PDF.js worker | 400–900 ms | Bound by PDF.js + network |
| Per-page raster | `pdf-viewer.component.ts:1017` `proxy.render(...)` | 30–120 ms / page | Runs on **main thread** today |
| Text-layer build | `:1059-1086` `TextLayer.render()` | 15–60 ms / page | Eager on every render |
| Annotation layer | `:1269-1305` | 10–40 ms / page | Eager; expensive on form-heavy pages |
| Highlight DOM mutation | `:1678-1716` | 1–8 ms × N spans | Layout-bound; many-hit pages stall |
| Search kernel | `:1553-1610` | 60–150 ms / keystroke | See `RUST_ENGINE.md` |

**Two structural problems jump out:**

1. **Rasterization runs on the main thread.** `proxy.render({ canvasContext })`
   uses a 2D context on a DOM canvas. Every painted pixel competes with
   scroll, input, and layout. On fast scroll, this is *the* jank source.
2. **Eager text + annotation layers.** Every page that paints also builds a
   text layer and an annotation layer, even if the user never selects, never
   searches, and the page has no fillable fields.

Everything below addresses one of these two, plus the long tail
(memory, transport, highlight, forms).

---

## 2. Phased rollout

Each phase ships independently and is reversible. Numbered roughly by ROI.

### Phase 1 — Cancel-aggressive virtualization *(small, high-leverage)*

**Problem.** When a user scrolls fast, a page that scrolled out of view
keeps painting. Worker time is wasted, main-thread time is wasted, and the
canvas is overwritten before the user sees it.

**Change.**
- In the `IntersectionObserver` callback at `:351`, when a wrapper *exits*
  the viewport, look up its in-flight `RenderTask` (already returned by
  `proxy.render(...)` at `:1017`) and call `.cancel()`.
- Track `RenderTask` per-page in a `Map<pageNumber, RenderTask>`; clear on
  completion or cancel.
- Same treatment for in-flight text-layer renders (`textLayerInstances`
  already collects them at `:303` — extend to per-page lookup).

**Risk.** Cancelling a task that was about to finish wastes work. Mitigate
with a short hysteresis (200 ms) before cancelling, so brief scroll-pasts
don't churn.

**Win.** ~30–50% main-thread CPU reduction during fast scroll. No bundle
cost, no API change.

---

### Phase 2 — Tiered render quality *(perceived perf)*

**Problem.** A page paints at full DPI (often 2× or 3× device pixel ratio)
even when the user is mid-scroll and won't read it. First paint feels slow
because we wait for the high-quality version.

**Change.**
- Two-pass render per page:
  1. **Placeholder pass** — `viewport` at 0.5× scale, no text/annotation
     layer. Stretches via CSS to fill the wrapper. ~10× faster than full.
  2. **Full pass** — scheduled in `requestIdleCallback` (or after a 150 ms
     scroll-quiet window). Replaces the canvas; text + annotation layers
     attach here.
- Skip the full pass if the user scrolls past again before idle — Phase 1's
  cancellation handles this for free.

**API.** New config option:
```ts
type RenderQualityStrategy = 'eager-full' | 'tiered'; // default 'tiered'
```

**Win.** Time-to-first-visible-content drops to <100 ms even on slow
machines. Full-quality lands within ~300 ms when the user stops scrolling.

---

### Phase 3 — OffscreenCanvas + worker-pool rendering *(the big lever)*

**Problem.** Today's render path is:

```
PDF.js worker  ──parse──►  main thread  ──draw──►  DOM canvas
                            ^^^^^^^^^^^
                       blocks scroll, input
```

We pay PDF.js's worker cost *and* the main-thread paint cost.

**Change.** PDF.js supports rendering into an `OffscreenCanvas`. With a
small worker pool (we own it, separate from PDF.js's own worker), the path
becomes:

```
PDF.js worker  ──parse──►  render worker  ──ImageBitmap──►  DOM canvas
                            (OffscreenCanvas)              (transferToImageBitmap)
```

Main thread only does the final `drawImage(bitmap)` — sub-millisecond.

- New worker module: `pdf-render.worker.ts`. Owns a pool of size
  `navigator.hardwareConcurrency / 2` (2–4 typical).
- Component sends `{ pageNumber, viewport, transform }` + a transferred
  `OffscreenCanvas` per render. Worker calls `proxy.render(...)` and posts
  back when done.
- Fallback path: when `OffscreenCanvas` isn't available (older Safari),
  keep current main-thread path. Feature-detect at service init.

**Risk.**
- PDF.js's own worker is single-instance per document — our pool only
  parallelizes the *raster* step, not parse. That's fine; parse isn't the
  bottleneck on long docs.
- `OffscreenCanvas` + transferred bitmaps have some quirks around DPR and
  CSS sizing; absorb in a `RenderHost` helper.

**Win.** Main-thread CPU during heavy scroll drops by ~70%. 60 fps
sustainable while paginating through a 500-page document.

---

### Phase 4 — Lazy text and annotation layers *(memory + paint)*

**Problem.** Every painted page eagerly builds a `TextLayer` and an
`AnnotationLayer`. Most users never select text on most pages, and most
pages have zero form fields.

**Change.**
- **Text layer:** defer construction until one of:
  - user starts a selection inside that page,
  - search runs and the page has hits,
  - controller method explicitly requests text.
  Move `renderTextLayer` (`:1023-1024`) out of the render path; trigger from
  these three signals instead. Keep an internal `Set<pageNumber>` of
  hydrated layers to avoid duplicate work.
- **Annotation layer:** PDF.js exposes annotation counts cheaply. Skip the
  layer entirely when `page.getAnnotations()` returns empty. For pages that
  do have annotations, defer until viewport is stable for 100 ms.

**Win.** ~40% memory reduction on text-heavy long docs. Per-page paint
cost drops by 15–60 ms.

---

### Phase 5 — Canvas highlight overlay for many-hit pages *(jank fix)*

**Problem.** `applyHighlightsForPage` at `:1678-1716` walks text-layer spans
and toggles a class on each. For a search like `"the"` on a dense page,
this can mutate 200+ spans → forced layout, frame drop.

**Change.**
- When hit count on a page exceeds a threshold (~50), render highlights to
  an absolutely-positioned `<canvas>` overlay instead of mutating spans.
- Geometry comes from the Rust `resolve_hit` API (see `RUST_ENGINE.md` §4):
  it gives item-index ranges, which already map to span rects. Batch them
  into a single canvas paint.
- Below threshold, keep the DOM-span path — it's fine and supports
  selection passthrough naturally.

**API.** Internal heuristic, no public surface.

**Win.** Search across a dense doc no longer drops frames. Eliminates the
"highlight DOM mutation" row from the profile above.

---

### Phase 6 — Memory discipline *(long sessions)*

**Problem.** Today, every painted page's canvas, text layer, and annotation
layer stays alive forever. On a 500-page document at 2× DPR, that's
gigabytes.

**Change.**
- LRU cache keyed by megapixels, not page count. Evict canvas + text +
  annotation layers when over budget (default: 200 MP ≈ 800 MB at 4 bytes/px).
- On eviction, replace the canvas with the placeholder from Phase 2. The
  page wrapper keeps its size; re-render on re-entry.
- Surface as a config option:
  ```ts
  type CacheBudget = { mode: 'megapixels'; max: number } | { mode: 'unbounded' };
  ```

**Win.** Multi-hour enterprise sessions stop OOM-ing tabs.

---

### Phase 7 — Form-field virtualization *(forms-heavy docs)*

**Problem.** Forms with hundreds of fields per page (tax docs, contracts)
attach hundreds of input/select/textarea elements. The annotation layer
builds them all eagerly; FormStateService binds two-way to all of them.

**Change.**
- Virtualize the annotation layer the same way pages are virtualized:
  attach DOM nodes only for fields whose bounding box intersects the
  viewport.
- FormStateService already owns canonical state — fields can detach/reattach
  without losing values.

**Win.** Form-heavy docs go from "load takes 4 s, scroll stutters" to
parity with text PDFs.

---

### Phase 8 — Transport hardening *(network)*

**Problem.** Default PDF.js loading downloads the whole file before
rendering. Enterprise PDFs are commonly 50–500 MB.

**Change.**
- Enable `disableStream: false`, `disableRange: false`, `disableAutoFetch: true`
  in `pdf.service.ts:76`. Requires the server to support `Range:` requests
  (most enterprise file stores do; S3, Azure Blob, NGINX defaults all do).
- Document the requirement in the public API. When ranges aren't supported,
  fall back transparently — PDF.js handles this.

**Win.** First page paints before the full doc downloads. On a 200 MB doc
over a 50 Mbps link: ~30 s → ~1 s to first paint.

---

## 3. Where Rust fits

Beyond the search kernel in `RUST_ENGINE.md`, Rust pays off for compute
that the JS profile already shows as hot:

| Workload | Rust win | Phase |
|----------|---------:|-------|
| Text-layer item → word/line coalescing (used by selection, highlight, copy-as-text) | 5–10× | Phase 4 / 5 |
| Annotation hit-testing across hundreds of shapes | 10–20× | Phase 7 |
| Ink smoothing (Douglas–Peucker, Bezier fitting) for freehand annotation | 20×+ | future feature |
| Reading-order / structure inference (extract-as-markdown) | 10×+ | future feature |

These reuse the same `engine-core` primitives as the search module — no
extra WASM bundle.

Rust does **not** help with: rasterization (PDF.js owns it), DOM mutation
(browser-bound), or network transport.

---

## 4. What this does *not* solve*

- PDF.js parse cost on first load — that's the floor.
- Print fidelity at high page counts — browser print pipelines rasterize
  every page and can OOM. Address with a separate "print-as-server-side-PDF"
  path if needed.
- Color-managed rendering / ICC profiles — PDF.js doesn't, and we can't
  without replacing it.

If any of these become a hard requirement, the conversation moves from
"optimize PDF.js" to "consider pdfium-via-WASM," which is a strategic
rewrite, not a perf tune.

---

## 5. Sequencing

| Phase | Effort | Risk | Ship independently? |
|-------|-------:|-----:|---------------------|
| 1. Cancel-aggressive virtualization | S | Low | Yes |
| 2. Tiered render quality | S | Low | Yes |
| 3. OffscreenCanvas + worker pool | M | Medium | Yes (with feature flag) |
| 4. Lazy text + annotation layers | M | Low | Yes |
| 5. Canvas highlight overlay | S | Low | After Rust `resolve_hit` lands |
| 6. Memory discipline (LRU) | S | Low | Yes |
| 7. Form-field virtualization | M | Medium | Yes |
| 8. Transport hardening | XS | Low | Yes (config flag) |

Recommended order: **1 → 2 → 4 → 8 → 3 → 6 → 5 → 7**.
The first four are pure refactor, ship together, and already deliver
"feels enterprise-grade." Phase 3 is the biggest single lever but the
biggest single change, so it lands once the smaller wins have de-risked
the surface area.

---

## 6. Performance targets (post-rollout)

Same 200-page doc, same machine:

| Metric | Today | After phases 1–4 | After all phases |
|--------|------:|-----------------:|-----------------:|
| Time to first visible page | 400–900 ms | 80–200 ms | 80–200 ms |
| Time to first full-quality page | 400–900 ms | 250–500 ms | 250–500 ms |
| Frame rate during fast scroll | 20–40 fps | 50–60 fps | 60 fps locked |
| Search keystroke latency (5000 hits) | 60–150 ms | 60–150 ms | < 16 ms (Rust) |
| Memory after scrolling whole doc | 1.5–3 GB | 1.5–3 GB | ~600 MB (capped) |
| 500-field form page first interactive | 3–5 s | 3–5 s | < 500 ms |

The user-facing claim becomes: *opens any document in under a second,
stays at 60 fps, and never crashes the tab.*
