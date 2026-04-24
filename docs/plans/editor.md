# Rich Text Editor — Planning Document

> Status: **v1 — Draft / Proposal**
> Owner: @josedr
> Target library: `@hakistack/ng-daisyui`
> Last updated: 2026-04-23

---

## 1. Goal

Replace the current Quill-backed `<hk-editor>` with an editor that **themes cleanly against DaisyUI** (primary, base-100, base-content, radii, etc.) and matches the rest of the library's look without fighting vendor CSS. The editor must support both v4 and v5 DaisyUI themes, all ~40 DaisyUI presets, and remain a drop-in replacement at the component API level (CVA, form-field integration, reactive forms, dynamic form `field.richtext(...)` builder).

Success criteria:

1. **Native DaisyUI appearance** — toolbar buttons are DaisyUI buttons (`btn btn-ghost btn-sm` etc.), dropdowns are DaisyUI menus, focused editor surface matches `.input:focus` / `.textarea:focus` ring and colors.
2. **Zero CSS overrides to make it look right** — no selectors like `.ql-editor *` fighting library styles. If styling is needed, it's per-consumer via Tailwind utilities on the host.
3. **Same consumer API as today**: `<hk-editor formControlName="bio" [toolbar]="'full'|'minimal'|'custom'" [placeholder]="..." [readOnly]="true">`. No breaking change.
4. **Angular 21 idiomatic**: signals, `afterNextRender`, OnPush, standalone, SSR-safe, zoneless-compatible.
5. **Bundle-conscious**: total editor lazy chunk ≤ ~130 kB gzipped. (Quill currently ≈ 100 kB gzip stripped.)
6. **A11y**: keyboard accessible, ARIA roles on toolbar, announcements for formatting state changes.

Non-goals (v1):

- Real-time collaborative editing (Y.js / CRDT) — v2 story.
- File/image upload pipeline beyond raw paste-in. Consumers wire their own upload handler.
- Full Markdown export (optional nice-to-have; see §7).
- Math/LaTeX rendering, mermaid diagrams, embeds. Extensions for later.

---

## 2. Why Quill is not working out

Observed issues with the current Quill implementation (`editor.component.ts`, ~317 lines, 30 Quill references):

1. **Quill's `snow` / `bubble` themes carry their own CSS.** They assume light-mode defaults (dark text on white surfaces), don't read DaisyUI CSS vars, and override our card surfaces. On dark DaisyUI themes (`dark`, `dracula`, `night`) the editor surface looks out-of-place.
2. **Hard-coded icon SVGs** inside Quill toolbar. They don't swap with `lucide-angular` icons used elsewhere in the library.
3. **Toolbar markup is internal.** Can't style individual buttons as DaisyUI `btn btn-ghost` without monkey-patching `.ql-toolbar button` selectors — fragile across Quill versions.
4. **Class names (`ql-editor`, `ql-active`, `ql-picker`) leak into the consumer's DOM** — consumers have to write their own overrides to theme anything.
5. **Quill 2.x has a large-ish footprint for what we use** (~450 kB raw, ~100 kB gzip). Most consumers use ~5 toolbar features. Headless alternatives start smaller and grow only with enabled features.
6. **Not fully signal-friendly** — current wrapper uses manual DOM read/writes inside `afterNextRender` to bridge Quill state into signals. Works, but verbose and fragile.
7. **Quill's data model (Delta format)** is opinionated. Consumers wanting Markdown get nothing. Exporting clean HTML requires post-processing.

Bottom line: Quill is fine as an editor; it's a poor fit as a themed component in a design-system library.

---

## 3. Library / Approach catalog

Evaluated against: license, Angular compatibility, themability, bundle, activity, feature completeness, DaisyUI fit.

| Option | License | Bundle (gzipped, minimal config) | Theming | Angular support | Notes |
|---|---|---|---|---|---|
| **TipTap** (ProseMirror-based) | MIT | ~80 kB core + ~20 kB per extension set | **Headless — zero default styles** | Works via bare TS API; no official Angular wrapper but examples exist | Built by Überdosis, used by Notion clones, GitLab. Extension-based. Active community. |
| **Milkdown** (ProseMirror + Markdown) | MIT | ~120 kB | Headless plugins | Framework-agnostic core | Markdown-first; stores content as MD. Good for note-taking / docs. |
| **Lexical** (Facebook/Meta) | MIT | ~70 kB core | Headless | React-first; Angular usage exists but non-trivial | Fast, modern. Complex mental model. Angular support is community-driven. |
| **ProseMirror** (raw) | MIT | ~60 kB core | Headless | Direct | What TipTap wraps. Use it only if TipTap is insufficient. |
| **Squire** (Fastmail) | MIT | ~20 kB | Minimal CSS, easy to override | Direct | Tiny, basic. No tables, no tree model. OK for simple needs. |
| **Editor.js** | Apache 2.0 | ~130 kB + per-block | Block-based; plugin-styled | Direct | Block UX (Notion-like). Different paradigm than inline-formatting. |
| **Trix** (Basecamp) | MIT | ~40 kB | Web component; limited theming hooks | Works | Simple. Shadow-DOM-ish isolation fights DaisyUI. |
| **Pell** | MIT | ~1 kB | Native contenteditable | Direct | Too minimal — no lists, no links, no undo grouping. |
| **Toast UI Editor** | MIT | ~400 kB | Has its own design system (dark/light) | Direct | Too heavy + opinionated visuals. |
| **CKEditor 5** | GPL / commercial | ~300 kB | Has its own themes | Has Angular wrapper | **Rejected** — commercial license required for internal use. |
| **Slate** | MIT | ~60 kB | Headless | React-only | **Rejected for Angular**. |
| **Build from scratch** (contenteditable + custom toolbar) | — | ~5–15 kB | 100% ours | Direct | Max control. Lots of edge cases (selection, clipboard, undo, IME). |

### Leading choice: **TipTap**

Why:

- **Headless** — no default CSS fights DaisyUI. We author every button, dropdown, and panel using library primitives (DaisyUI `btn`, `menu`, `dropdown`, `divider`).
- **ProseMirror under the hood** is battle-tested (Atlassian Confluence, GitLab, New York Times). Selection model, undo, clipboard, IME all handled.
- **Extension-based bundle** — ship only what you enable: StarterKit gets you bold/italic/headings/lists/code/blockquote/link for ~100 kB; each additional extension adds 5–15 kB.
- **Framework-agnostic core** — TipTap's Angular wrapper exists but is thin; we can author our own minimal Angular adapter that is fully signal-native.
- **Active** — weekly releases, responsive maintainers, large ecosystem of community extensions.

Risks:

- TipTap's config surface is large. We **must** wrap it in a builder similar to `createChart` / `createForm`; leaving consumers to author raw TipTap configs would duplicate Quill's problems.
- ProseMirror's schema is powerful but complex. Advanced consumer customization (custom nodes/marks) will need a documented escape hatch.
- Angular-specific gotcha: TipTap's `Editor` class mutates DOM outside Angular's zone. With zoneless CD + signals this is actually cleaner than it was in Zone.js world; change detection is driven entirely by signal writes in our wrapper.

### Runner-up: **Milkdown**

If consumers want **Markdown-first** editors (notes, docs, README editing), Milkdown stores content as Markdown natively with bi-directional sync. Same ProseMirror foundation, different UX affordance.

**Decision path:** ship with TipTap as the primary; if Markdown-first becomes a recurring ask, add a Milkdown-backed variant (`<hk-editor type="markdown">`) in a later phase rather than forking the component.

### Build-from-scratch as Plan C

Only if TipTap footprint or API proves a dealbreaker. Scope would be:

- `contenteditable` div with a minimum toolbar (bold/italic/underline/link/bulletList/orderedList/heading3).
- Manual selection tracking via `document.getSelection()`.
- Undo/redo stack wrapping `document.execCommand` (deprecated but still works for basic cases).
- Clipboard handling (strip-paste on paste).
- No tables, no math, no drag-and-drop images.

Estimated size: ~10 kB. Estimated effort: 2–3 weeks to reach the quality bar of TipTap out-of-the-box. Not worth it unless there's a strong constraint.

---

## 4. Decisions locked before implementation

Six binary decisions that unblock work. Ratify defaults or amend, then mark ✅.

| # | Decision | Default position | Alternatives | Status |
|---|---|---|---|---|
| 1 | **Engine** | TipTap (StarterKit + our DaisyUI toolbar layer). | Milkdown (markdown-first), or build from scratch. | ✅ 2026-04-23 |
| 2 | **Content model** | HTML string as the CVA value (matches Quill's current behavior → zero migration for consumers). | Delta / ProseMirror JSON / Markdown. Rejected unless consumers ask. | ✅ 2026-04-23 |
| 3 | **Toolbar API** | `toolbar: 'full' \| 'minimal' \| 'none' \| readonly ToolbarItem[]` where `ToolbarItem` is a typed union. Matches `createForm` ergonomics. | Free-form template projection. Rejected — too easy to break theming. | ✅ 2026-04-23 |
| 4 | **Extension surface** | Public `extensions?: readonly TipTapExtension[]` escape hatch on the config. Documented as "expect breaking changes across minor versions of TipTap." | No escape hatch. Rejected — limits real-world use. | ✅ 2026-04-23 |
| 5 | **Image / file upload** | Consumer-owned via `onImageUpload?: (file: File) => Promise<string>` callback that returns the final URL. No default upload endpoint, no default storage. | Ship an upload widget. Rejected — storage is consumer-specific. | ✅ 2026-04-23 |
| 6 | **Bundle budget** | Main fesm: **+3 kB brotli max** for the editor wrapper. Editor lazy chunk (TipTap core + StarterKit + our toolbar): **<130 kB gzipped transfer**. | Tighter budget. Deferred — validate via spike. | ✅ 2026-04-23 |

**Ratified 2026-04-23 by @josedr — all six defaults accepted.** Phase 0 spike unblocked.

---

## 5. Architecture (post-ratification)

### 5.1 Directory layout

```
projects/hakistack/ng-daisyui/src/lib/components/editor/
├── editor.component.ts          # <hk-editor> — signal-native TipTap wrapper
├── editor.component.html
├── editor.component.css
├── editor.builder.ts            # createEditor(), typed toolbar config
├── editor.types.ts              # EditorConfig, ToolbarItem, etc.
├── toolbar/
│   ├── editor-toolbar.component.ts   # renders DaisyUI-styled toolbar
│   ├── editor-toolbar-button.ts      # <button class="btn btn-ghost btn-sm">
│   └── built-in-items.ts             # bold, italic, heading menu, etc.
├── extensions/
│   ├── index.ts                 # re-export TipTap extensions we ship
│   └── placeholder.ts           # DaisyUI-styled placeholder
├── a11y/
│   └── announce-formatting.ts   # aria-live for screen readers
└── editor.component.spec.ts
```

### 5.2 Engine loading strategy

TipTap is lazy-loaded via dynamic imports, mirroring the chart component's approach:

- `@tiptap/core` and `@tiptap/starter-kit` are **optional peer dependencies** (not bundled with the library).
- Component's `afterNextRender` dynamically imports them. Consumers who don't render `<hk-editor>` pay nothing.
- Document that consumers using `<hk-editor>` must `npm install @tiptap/core @tiptap/starter-kit`.

### 5.3 Theming — how it works WITHOUT fighting vendor CSS

Unlike Quill, TipTap ships **no default CSS**. That means:

- The editor surface is a bare `<div contenteditable>` — we style it directly with Tailwind/DaisyUI (`class="textarea textarea-bordered focus:outline-primary min-h-[200px]"`).
- Headings, lists, blockquotes inside the editor render as plain semantic HTML (`<h1>`, `<ul>`, `<blockquote>`). We style them with Tailwind's `prose` or a small scoped rule set under `.hk-editor-content`.
- **Placeholder** is rendered via TipTap's Placeholder extension using `::before` with `content: attr(data-placeholder)` — readable from DaisyUI CSS vars.
- **Selection highlight** uses `::selection` styled against `--color-primary`.
- **Active state on toolbar buttons** reads TipTap's `editor.isActive('bold')` signal → toggles `btn-active` or `bg-primary/20` classes — pure DaisyUI.
- **Focus ring** inherits from DaisyUI `input` focus styles by applying the same `focus:outline-2 focus:outline-primary` we use on inputs.

No more `:host ::ng-deep .ql-toolbar` hacks. The entire chrome is our code using library primitives.

### 5.4 Public API (draft)

```typescript
// Builder mirrors createForm / createChart
const editor = createEditor({
  initialValue: '<p>Hello</p>',
  toolbar: 'full',           // 'full' | 'minimal' | 'none' | ToolbarItem[]
  placeholder: 'Tell us about yourself…',
  readOnly: false,
  autofocus: false,
  onImageUpload: async (file) => await uploadToS3(file),
  extensions: [],            // escape hatch — raw TipTap extensions
});

// Component
<hk-editor [config]="editor.config()" (valueChange)="onChange($event)" />
```

Controller shape:

```typescript
export interface EditorController {
  readonly config: Signal<EditorConfig>;
  readonly html: Signal<string>;
  readonly isEmpty: Signal<boolean>;
  setValue(html: string): void;
  focus(): void;
  blur(): void;
  clear(): void;
}
```

Toolbar item types (typed discriminated union):

```typescript
export type ToolbarItem =
  | { kind: 'bold' }
  | { kind: 'italic' }
  | { kind: 'underline' }
  | { kind: 'strike' }
  | { kind: 'code' }
  | { kind: 'heading'; levels?: readonly (1 | 2 | 3 | 4 | 5 | 6)[] }
  | { kind: 'bulletList' }
  | { kind: 'orderedList' }
  | { kind: 'blockquote' }
  | { kind: 'link' }
  | { kind: 'image' }
  | { kind: 'table' }
  | { kind: 'divider' }              // visual separator in toolbar
  | { kind: 'custom'; id: string; button: ToolbarButtonDef };
```

### 5.5 ControlValueAccessor & reactive forms

`<hk-editor>` implements CVA exactly as the current Quill wrapper does — writing HTML out, accepting HTML in. Zero breaking change for consumers using `formControlName="bio"` or `[(ngModel)]`.

Validation:
- `required` check — consult `editor.isEmpty()` signal.
- Custom max-length validator operates on plain-text, not HTML. Ship `editorMaxLength(n)` helper.

### 5.6 DynamicForm integration

Add a `field.richtext()` builder:

```typescript
const form = createForm({
  fields: [
    field.richtext('bio', 'Biography', {
      toolbar: 'minimal',
      placeholder: 'Introduce yourself',
      required: true,
    }),
  ],
});
```

### 5.7 Accessibility

- Toolbar is `role="toolbar"` with `aria-label="Formatting"` and keyboard navigation via ArrowLeft/Right between buttons.
- Each toolbar button has `aria-pressed="true"` when its mark is active on current selection.
- Editor surface has `role="textbox"` + `aria-multiline="true"`.
- Announce formatting toggles (bold on/off, etc.) via a visually hidden `aria-live="polite"` region, rate-limited to 1/500ms.
- Keyboard shortcuts (`Cmd/Ctrl+B`, `I`, `U`, `K`) are preserved from TipTap defaults.
- Tested with VoiceOver + NVDA before Phase 1 ships.

### 5.8 SSR

- Render a static placeholder during SSR — the current rendered HTML inside a `<div role="textbox" aria-readonly="true">` so it's searchable / scraped by crawlers.
- TipTap init happens in `afterNextRender` (browser-only).
- No `@defer` internally; document the pattern for consumers who want it.

---

## 6. Phased rollout

### Phase 0 — Foundation spike (1 week)

- Ratify §4 decisions.
- Install `@tiptap/core`, `@tiptap/starter-kit` as optional peer deps.
- Build `<hk-editor>` shell with lazy engine loader.
- Render a plain editable surface (no toolbar) with DaisyUI focus styles.
- Prove bundle delta (fesm + lazy chunk) fits §4.6.
- Prove theme switching (kaizen / dark / cupcake) recolors the editor chrome live.

**Exit criteria:**
- Plain editable surface works, signals emit HTML on change.
- fesm delta under budget; lazy chunk under 130 kB gzip transfer.
- Three-theme visual test passes.

### Phase 1 — Toolbar + core formatting (2–3 weeks)

- Typed `ToolbarItem` union + `createEditor()` builder.
- Toolbar component using DaisyUI `btn btn-ghost btn-sm` + `dropdown` for heading/list menus.
- Core marks: bold, italic, underline, strike, code.
- Core blocks: paragraph, heading (1–3 by default), bulletList, orderedList, blockquote, codeBlock, horizontalRule, link.
- Keyboard shortcuts verified.
- CVA + DynamicForm integration.
- Unit tests for builder + HTML-round-trip (import / export).

**Exit criteria:** existing Quill demo pages work with `<hk-editor>` swap-in, no visual regressions beyond the intentional DaisyUI chrome change.

### Phase 2 — Tables, images, custom extensions (2 weeks)

- Table extension with DaisyUI-styled row/column menus.
- Image extension with `onImageUpload` callback wiring.
- Public escape hatch via `extensions` config.
- Docs + demos for advanced usage.

### Phase 3 — Polish (1 week)

- A11y audit (NVDA + VoiceOver smoke test).
- Storybook-style demo covering each toolbar config.
- Bundle-size CI enforcement.

### Phase 4+ — Future (separate plans)

- Markdown variant (Milkdown-backed).
- Real-time collaboration (Y.js).
- Mentions (`@user`, `#topic`).
- Slash commands (Notion-style).

---

## 7. Open questions

1. **Migration path for existing Quill consumers.** If internal projects have Quill Delta stored somewhere, they'll need to convert to HTML first. Document the one-liner (`quill.root.innerHTML`). Don't ship a conversion utility — too niche.
2. **Quill removal timing.** Plan: ship `<hk-editor>` on TipTap behind a feature flag / alt component name for one minor release, then flip the default in the next major. No abrupt breakage.
3. **Markdown export.** Optional follow-up using `turndown` or TipTap's own markdown serializer. Adds ~20 kB gzip. Defer until a consumer asks.
4. **Collaborative editing.** Y.js + TipTap integration is well-documented. Adds 60–100 kB gzip. Explicit v2 scope.
5. **Theme bridge reuse.** Editor has less theming-surface than charts (no series palettes, no axis colors). The existing `DaisyUIThemeService.tokens` signal is still useful for computing selection color / placeholder alpha. Reuse, don't duplicate.
6. **Peer-dep version pinning.** Pin to a minor range (`^2.x`) and document upgrade paths per TipTap minor. TipTap 3.x (whenever it lands) would trigger a library major.
7. **License — TipTap extensions marketplace.** Some advanced extensions (AI autocomplete, PDF export) are PRO / paid. We ship only MIT-licensed extensions by default; PRO extensions can be added via the escape hatch by consumers who license them separately.

---

## 8. First concrete tasks (after ratification)

1. Hold §4 decision review. Record all six as ✅.
2. Phase 0 spike: add TipTap peer deps, minimal `<hk-editor>` rendering an editable surface, measure bundle delta + theme switch.
3. If spike meets exit criteria, move to Phase 1.
4. If spike fails budget or theming proves harder than expected, escalate — revisit Milkdown or build-from-scratch.

---

## Appendix A — Rejected approaches

- **Keep Quill, write exhaustive CSS overrides.** Tried in the current impl; fragile across Quill versions, fights DaisyUI, not aligned with the library's design-system ethos.
- **CKEditor 5.** Commercial license required for any non-personal use.
- **Trix.** Web-component isolation makes DaisyUI theming harder, not easier. Feature set is also limited.
- **Toast UI Editor.** Heavyweight, opinionated visuals that don't blend with DaisyUI surfaces.
- **Slate.** React-only.
- **Build on raw contenteditable with `document.execCommand`.** `execCommand` is deprecated and has cross-browser inconsistencies (Firefox vs Chromium vs Safari). Hand-rolling selection + undo is ~2–3 weeks of error-prone work to reach feature parity with TipTap's "just import it and go."

---

## Appendix B — Change log

- **v1 (2026-04-23):** Initial draft. Recommends TipTap; Milkdown as runner-up; build-from-scratch as Plan C. Six locked decisions pending ratification.
