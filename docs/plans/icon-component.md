# Icon Component (`hk-icon`) — Plan

Status: proposal
Owner: TBD
Related: `@lucide/angular` peer dep (currently `^1.7.0`), `lucide-static`

## 1. Why revisit this

We previously had an icon component and removed it, deferring icon rendering to the
consumer. The reason for bringing it back is real ergonomics: consumers keep
re-implementing the same "render an icon by name" wrapper, and our own config
objects (menu items, table actions, command palette, editor toolbar) already pass
icon **names** as strings and expect *something* to render them.

The original objection was **bundle size**, and it was correct — but it only applies
to one specific usage pattern. Let's be precise about it before choosing a design.

### The actual bundle problem

`@lucide/angular` ships two ways to render:

| Mechanism | Tree-shakable? | Dynamic name? | Cost |
|---|---|---|---|
| Per-icon directive `LucideHeart` (`<svg lucideHeart>`) | ✅ yes | ❌ no | ~1 icon's path data in JS, nothing else |
| `LucideDynamicIcon` + `provideLucideIcons(...)` | ✅ per registered icon | ✅ for registered names only | each registered icon is bundled into JS |

To let a **consumer** render *any* icon by an arbitrary runtime string, they must
`provideLucideIcons(...)` **all ~1500 icons** — which lands every icon's path data
in the **JavaScript bundle** (hundreds of KB to >1 MB). That is the bloat we
remember, and it is unavoidable with the JS-registry model when the name is dynamic.

### The static insight (this is the right call)

Lucide's static guide (https://lucide.dev/guide/static/getting-started) moves icon
data **out of JS and into a cacheable asset**. The name can then be fully dynamic
with **zero JS bundle cost**. Two static mechanisms are relevant:

- **SVG sprite** — one `sprite.svg` containing every icon as `<symbol id="name">`,
  referenced with `<svg><use href="sprite.svg#heart"></use></svg>`.
- **Individual SVG files** — `lucide-static/icons/heart.svg` etc., fetched on demand.

(Lucide also ships an icon **font** and **CSS background** approach — both rejected:
fonts have a11y/positioning issues and force "include all," background-image can't
inherit `currentColor` for stroke icons.)

## 2. Strategy comparison

| Strategy | JS bundle | Network | Dynamic names | Per-instance `strokeWidth` | Consumer setup |
|---|---|---|---|---|---|
| **A. SVG sprite** (`<use>`) | ~0 | one file (~1.3–1.5 MB full, or a built subset), cached forever | ✅ any | ⚠️ baked into symbol (CSS override unreliable) | copy sprite asset + `provideIconSprite({ url })` |
| **B. On-demand fetch** (MatIconRegistry-style) | ~0 | tiny per icon (~0.5–1 KB), cached in-memory + HTTP | ✅ any | ✅ full control (we own the markup) | copy `icons/` dir **or** point at CDN + `provideIconLoader({ baseUrl })` |
| **C. Bundled set** (`provideLucideIcons`) | grows with count | 0 | only registered | ✅ | import each icon |
| **D. Per-icon directive** (current internal usage) | tiny, tree-shaken | 0 | ❌ | ✅ | import directive |

### Trade-off notes

- **Sprite (A)** matches the "include everything, pay once" mental model. Best when an
  app uses *many* different icons. Color works (Lucide symbols use
  `stroke="currentColor"`); size works via width/height. **`strokeWidth` does not vary
  per instance** — the symbol hardcodes `stroke-width="2"` and that presentation
  attribute beats inherited CSS, so a per-call `[strokeWidth]` is effectively ignored.
  External `<use href>` is also **same-origin** in practice (cross-origin needs CORS
  and is flaky) → the sprite must be served from the app's own origin.
- **Fetch (B)** transfers only what's rendered, and because we parse the SVG and build
  the element ourselves we get **full per-instance control** of size/color/strokeWidth.
  Cost is async resolution (brief empty frame before first paint of a new icon) and N
  small requests (mitigated by HTTP cache + an in-memory registry signal). Can point at
  jsDelivr (`https://cdn.jsdelivr.net/npm/lucide-static/icons/{name}.svg`) for zero
  asset wiring, or a copied local folder for offline/CSP-strict apps.
- **C/D** stay relevant: **C** for a curated app icon set, **D** is what the library
  already uses internally and should keep using.

## 3. Recommended architecture

Do **not** hard-pick one transport. Ship an `hk-icon` component backed by a
**pluggable resolver** (injection token), with sensible providers. This keeps the lib
honest (single responsibility, DI-driven) and lets each consuming app choose the
trade-off that fits.

```
hk-icon (presentational)
   │ injects
   ▼
IconResolver (token)  ──default──▶ throws helpful error if no provider configured
   ├── SpriteIconResolver   ← provideIconSprite({ url })
   ├── LoaderIconResolver   ← provideIconLoader({ baseUrl, sanitize? })
   └── RegistryIconResolver ← provideIconRegistry({ icons })   // eager, for offline/CSP
```

### Default recommendation

- **Default story for consumers: SVG sprite (A).** It's the closest to the user's
  "include all" intent, one request, simplest CSP story, no async fl/FOUC. Document the
  `strokeWidth` limitation up front.
- **Document on-demand fetch (B) as the opt-in** for apps that care about transfer size
  or want per-instance stroke control, including a zero-setup CDN variant.
- **Internal library usage stays on per-icon directives (D).** Our ~30 internal icons
  are already tree-shaken and self-contained; routing them through a resolver would
  force every consumer to wire an icon asset just to render a table. Not acceptable.
  `hk-icon` is a **public convenience for consumers**, not an internal refactor.

## 4. Component API

```ts
// hk-icon
@Component({ selector: 'hk-icon', changeDetection: OnPush, ... })
```

| Input | Type | Default | Notes |
|---|---|---|---|
| `name` | `string` | — (required) | kebab-case Lucide name, e.g. `arrow-right` |
| `size` | `number \| string` | `24` | px number or any CSS length |
| `strokeWidth` | `number` | `2` | honored by loader/registry resolvers; **ignored by sprite** (documented) |
| `color` | `string` | `'currentColor'` | or use Tailwind `text-*` on host |
| `absoluteStrokeWidth` | `boolean` | `false` | loader/registry only |
| `class` | `string` | `''` | merged onto the rendered svg |
| `title` / `ariaLabel` | `string` | — | when set → `role="img"` + label; when absent → `aria-hidden="true"` |

Behavioral guarantees:
- **A11y:** decorative by default (`aria-hidden="true"`, `focusable="false"`); becomes
  a labelled image only when `ariaLabel`/`title` is provided. Must pass AXE.
- **Theme-agnostic:** color defaults to `currentColor` so it inherits DaisyUI semantic
  tokens (`text-primary`, `text-error`, …) with no extra config.
- **Missing icon:** render nothing (or an optional fallback) + `console.warn` once per
  name in dev; never throw at render.

### Provider functions (mirror the lib's existing `provide*` pattern)

```ts
provideIconSprite({ url: '/assets/lucide-sprite.svg' })
provideIconLoader({ baseUrl: '/assets/lucide-icons' })            // local
provideIconLoader({ baseUrl: 'https://cdn.jsdelivr.net/npm/lucide-static/icons' }) // CDN
provideIconRegistry({ icons: { heart: '<svg>…</svg>' } })         // eager/offline/CSP
```

## 5. Resolver contract

```ts
interface IconResolver {
  // returns sanitized inner SVG markup (or a sprite href fragment),
  // sync if cached, Promise/Observable on first miss
  resolve(name: string): SvgResult | Promise<SvgResult>;
}
```

- Resolved results cached in a `Map<string, signal<SvgResult>>` (or a single
  registry signal) so repeated renders are synchronous and change-detection-cheap.
- Sanitize fetched SVG through Angular `DomSanitizer` (bypass only after verifying it's
  an `<svg>` with no script/event handlers).
- Sprite resolver returns an `href`; `hk-icon` template branches: `<use [attr.href]>`
  vs `[innerHTML]` of sanitized markup.

## 6. Asset / build pipeline

- Add `lucide-static` as a **devDependency** (not a runtime dep — we ship docs +
  optional generated assets, not its JS).
- Build script `scripts/build-icon-sprite.mjs`:
  - copies `node_modules/lucide-static/sprite.svg` into the published package (or the
    demo's `assets/`), and
  - optionally generates a **subset sprite** from a name allowlist for apps that want
    "only what I use, but still one request."
- Provide a documented recipe for consumers to either (a) copy the sprite/icons folder
  into their `angular.json` `assets`, or (b) use the CDN loader (no copy).
- ng-packagr note: like the PDF worker, the sprite/icons are **assets, not bundleable**
  — wire them via the build script + document the consumer copy step (see
  `pdf-viewer` plan for the precedent).

## 7. Phases

1. **Resolver + token + `hk-icon`** with the **loader (B)** resolver first (it's the
   most testable and gives full control). CDN baseUrl default in the demo so it works
   with zero asset wiring.
2. **Sprite resolver (A)** + `provideIconSprite` + sprite build script. Make it the
   documented default for consumers.
3. **Registry resolver (C)** for offline/CSP-locked apps.
4. **Public API exports** (`hk-icon`, providers, `IconResolver`, types) in
   `public-api.ts`; rewrite `icons-demo.component.ts` to showcase `hk-icon` (it
   currently demos `@lucide/angular` directly).
5. **Docs:** update the `hakistack-ng-daisyui` skill + `CONSUMER-USAGE.md` with the
   sprite-vs-loader decision table and setup recipes.
6. **(Optional, later)** migrate config objects that take icon name strings (menu,
   table, command palette, editor) to render through `hk-icon` when a resolver is
   present, falling back gracefully when it isn't.

## 8. Testing & a11y

- Unit: resolver caching (one fetch per name), missing-icon warn-not-throw, sanitizer
  rejects script-bearing SVG, size/color/strokeWidth applied (loader path).
- A11y: AXE pass for decorative (aria-hidden) and labelled (`role="img"`) modes; verify
  `currentColor` inheritance against DaisyUI semantic tokens; contrast not applicable
  (inherits text color) but verify focus is never trapped on decorative icons.
- Render: sprite `<use href>` resolves same-origin in the demo build.

## 9. Open questions

1. **Default resolver when none is provided** — hard error with a setup hint, or a
   silent no-op? (Lean: dev-time `console.error` with the provider snippet, render
   nothing in prod.)
2. **Should `hk-icon` keep depending on `@lucide/angular` at all?** The dynamic/static
   component can be fully independent (sprite/loader don't need it). Keeping the dep is
   only justified by internal per-icon directive usage (D), which is unrelated. Likely:
   `hk-icon` has **no** `@lucide/angular` dependency; the lib keeps the peer dep solely
   for its internal directives.
3. **Ship the sprite inside the package** vs. require consumer copy vs. CDN-only — pick
   based on CSP/offline expectations of our consumers.
4. **Subset-sprite allowlist source** — manual list, or scan templates at build time?
```
