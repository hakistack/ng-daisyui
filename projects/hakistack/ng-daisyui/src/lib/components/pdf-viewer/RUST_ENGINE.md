# Rust/WASM Engine for `hk-pdf-viewer`

> Goal: replace the JS-side full-document text search with a Rust/WASM kernel. Everything else (rendering, virtualization, DOM) stays in TS — PDF.js already does the rasterization in optimized C++/WASM.

---

## 1. Scope

### In scope (Rust)
| Stage | Current location | Why it moves |
|-------|------------------|--------------|
| Substring search across all pages | `pdf-viewer.component.ts:1553-1610` (`runSearch`) | O(N×M) per page × all pages on every keystroke; lowercases full haystacks each call |
| Text-index construction | `pdf-viewer.component.ts:1111-…` (`populateTextIndex`) | Per-page `itemOffsets` array build; can be done in parallel for bulk pre-index |
| Match grouping by page | `pdf-viewer.component.ts:1584-1592` | Cheap on its own, but folds naturally into the same Rust kernel |

### Out of scope (stays in TS)
- PDF.js itself — parsing, rasterization, `getTextContent()`, annotation layer
- Canvas + text-layer + annotation-layer rendering
- IntersectionObserver-based virtualization (`pdf-viewer.component.ts:271-286`)
- Highlight painting on DOM spans (`:1678-1710`) — DOM mutation is the cost, not the loop
- Toolbar, sidebar, thumbnails, form-field two-way binding
- Print/download/save orchestration

The boundary is intentional: PDF.js stays the source of text; we only own the *find-in-document* kernel.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│ PdfViewerComponent (Angular, signals)                    │
│ ─ owns: viewport, virtualization, DOM, controller API    │
│ ─ delegates: getTextContent() → PDF.js                   │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ PdfSearchService (TS, providedIn: 'root')                │
│ ─ builds the per-document text index                     │
│ ─ owns: hit cache, current-match index                   │
│ ─ JS fallback when WASM unavailable / SSR                │
└────────────────────────────┬─────────────────────────────┘
                             │  wasm-bindgen
                             ▼
┌──────────────────────────────────────────────────────────┐
│ @hakistack/engine (single .wasm, lazy-loaded)            │
│ ─ search-engine::pdf module: arena + offset map          │
│ ─ depends on engine-core for memmem + string folding     │
│ ─ Returns Uint32Array of (page, char_start, char_len)    │
└──────────────────────────────────────────────────────────┘
```

**Key principle: ingest text once.** PDF.js gives us page text via `getTextContent()` — we hand it to Rust on first read, then every search keystroke is just a query. The page text never re-crosses the boundary.

---

## 3. Data model

```rust
// hakistack-engine/crates/search-engine/src/pdf/index.rs
// Sibling of search-engine::fuzzy (used by command-palette + select);
// both modules share engine-core primitives (string folding, memmem, bitsets).

pub struct DocIndex {
    pages: Vec<PageEntry>,      // index = pageIndex
    case_folded: bool,
}

pub struct PageEntry {
    raw: Box<str>,              // original text content, joined
    folded: Box<str>,           // pre-lowercased (Unicode-aware)
    item_offsets: Vec<u32>,     // char-index → text-item index
    item_starts: Vec<u32>,      // text-item index → char-start
}
```

The two parallel buffers (`raw`, `folded`) cost ~2× the text size but eliminate per-keystroke lowercasing — currently the dominant cost on big PDFs.

`item_offsets` is what the highlight painter already uses (`:1678-1710`); we just compute and store it once in Rust.

---

## 4. Public WASM API

```rust
#[wasm_bindgen]
pub struct PdfIndex(/* opaque DocIndex */);

#[wasm_bindgen]
impl PdfIndex {
    /// Create empty index sized for the document.
    pub fn new(page_count: u32) -> PdfIndex;

    /// Push the text content for one page. Called as pages are read by PDF.js.
    /// `text_items` is a flat array of strings (already joined by PDF.js).
    pub fn add_page(&mut self, page_index: u32, text_items: JsValue);

    /// Run a search. Returns Uint32Array of triples (page, char_start, char_len).
    pub fn search(&self, query: JsValue /* SearchQuery */) -> Uint32Array;

    /// Resolve a hit to text-item indices (for highlight DOM work).
    /// Returns Uint32Array of (item_start, item_end, intra_start, intra_end).
    pub fn resolve_hit(&self, page: u32, char_start: u32, char_len: u32) -> Uint32Array;

    pub fn dispose(self);
}
```

```ts
type SearchQuery = {
  term: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;          // anchored Rust regex, not JS RegExp
  maxHits?: number;
};
```

`resolve_hit` is the critical one for staying compatible with the existing highlight painter — it gives the TS layer the same `(itemStart, itemEnd, intraStart, intraEnd)` it builds today, but in O(log n) via binary search instead of the current linear walk.

---

## 5. Algorithms

### 5.1 Substring search
- For literal queries: `memchr::memmem::Finder` per query (built once, used across all pages).
- For case-insensitive: search against the pre-folded buffer; results map back to `raw` 1-to-1 (folding preserves byte length for ASCII; for non-ASCII we store a byte-offset translation table).
- For whole-word: post-filter hits by checking byte before/after against Unicode word boundary.
- For regex: `regex` crate, anchored if user asked for it.

### 5.2 Bulk pre-index
When a search starts and not all pages have been added yet (the current code lazy-loads text per page on demand), the Rust side can request **a list of missing page indices** and the TS side feeds them in. With `web_sys::Promise::all` on the JS side, this happens in parallel — the bottleneck becomes PDF.js's `getTextContent` itself, not the indexer.

### 5.3 Match grouping by page
Already done by storing pages as separate entries — hits come back grouped by construction. The TS code at `:1584-1592` simplifies to a noop.

---

## 6. Angular integration

Drop-in replacement for the existing `runSearch` flow:

```ts
@Injectable({ providedIn: 'root' })
export class PdfSearchService {
  private modPromise = import('@hakistack/engine'); // single bundle, lazy-loaded
  private mod?: HakistackEngineModule;

  async createIndex(pageCount: number): Promise<PdfIndexHandle> {
    const m = await (this.mod ??= await this.modPromise);
    return new PdfIndexHandle(m.PdfIndex.new(pageCount));
  }
}
```

Inside `PdfViewerComponent`:
- On document load → `index = svc.createIndex(numPages)`
- `ensurePageTextIndex(p)` calls PDF.js, then `index.add_page(p, items)`
- `runSearch(q)` becomes `index.search({ term: q, caseSensitive, wholeWord })`
- Highlight painter uses `index.resolve_hit(...)` to drive the DOM tagging it already does

The component's existing controller methods (`search`, `nextMatch`, `prevMatch`, etc.) stay unchanged. Only their innards change.

### JS fallback
Keep the current `runSearch` as `js-fallback.ts`. Service auto-selects when `mod` fails to load (SSR, no-WASM browser, opt-out flag).

---

## 7. Performance targets

Indicative on a mid-tier laptop (M2 / Chrome) for a typical 200-page text PDF:

| Operation | JS today | Rust target | Speedup |
|-----------|---------:|------------:|--------:|
| Search "the" (~3000 hits) across all pages | ~120 ms | ~15 ms | 8× |
| Search a 12-char phrase | ~80 ms | ~8 ms | 10× |
| Whole-word search with regex backstops | ~200 ms | ~20 ms | 10× |
| First search after document load (incl. text fetch) | ~600 ms | ~250 ms | 2.4× — bound by PDF.js |
| Per-keystroke (fully indexed) | 60–150 ms | < 16 ms | many× |

The user-facing win is *typing in the search box stays at 60 fps even on 500-page PDFs*.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| WASM bundle size | Lazy-load; only fetched on first `search()` call. Regex is feature-gated and dropped if unused. |
| Unicode case-folding correctness | Use `unicode-case-mapping` crate. Test corpus from real-world PDFs in non-Latin scripts. |
| PDF.js text item structure varies by version | Pin `pdfjs-dist` peer range; treat the join as an opaque string in Rust. |
| Memory for large documents | Cap indexed pages at e.g. 5000; evict oldest when over budget. Already an issue today, made explicit. |
| SSR / Node | Same lazy import pattern; service degrades to JS fallback. |

---

## 9. What this does *not* solve

- PDF.js parsing itself — that's the floor on first-search latency.
- DOM highlight rendering — for documents with thousands of hits on one page, the bottleneck is browser layout, not search.
- Form-field interaction, annotation layer, print — pure UI/PDF.js territory.

The engine narrows the gap between *finding* matches and *showing* them. Show-time is bounded by the DOM.

---

## 10. Phased rollout

1. **Phase 0** — extract `runSearch` + `populateTextIndex` into pure functions in `engine/js-fallback.ts`. No behavior change.
2. **Phase 1** — `PdfSearchService` with only the JS path. Wire viewer through it.
3. **Phase 2** — Rust `PdfIndex` with literal substring + case-insensitive search. Parity tests against the JS fallback over a corpus of real PDFs.
4. **Phase 3** — whole-word, regex, bulk pre-index.
5. **Phase 4** — flip default to WASM with `provideTableEngine`-style `providePdfSearch({ mode: 'auto' })`.

Each phase ships independently; the JS fallback remains the reference implementation.
