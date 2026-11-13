/**
 * Docs catalog — the single editorial source for navigation, search, page
 * overviews and documentation coverage.
 *
 * Split in two on purpose:
 *  - `DocPageMeta` (catalog/pages.ts) is small and loaded eagerly: it drives
 *    the sidebar, the search index and the coverage check.
 *  - `ComponentDocContent` / `ArticleContent` (content/**) hold the long-form
 *    text and are lazy-loaded per page.
 *
 * API facts (inputs, outputs, types, signatures) are NOT written here — they
 * come from the generated API manifest. This file only holds what a compiler
 * cannot know: plain-language explanations, when to use what, guides.
 *
 * Pure data: no Angular imports, so Node scripts (coverage check) can load it.
 */

/** Text in every supported docs language. English is the source and the fallback. */
export interface Localized {
  readonly en: string;
  readonly es: string;
}

export type DocsLocale = keyof Localized;

export type DocSection = 'getting-started' | 'foundations' | 'components' | 'systems' | 'guides' | 'api' | 'architecture' | 'contributing';

export type ComponentGroup = 'forms' | 'data' | 'navigation' | 'feedback' | 'documents';

/**
 * Maturity of what the page documents. Derived from the code and roadmaps,
 * never aspirational: `planned` pages describe things that do not exist yet.
 */
export type DocStatus = 'stable' | 'beta' | 'experimental' | 'planned';

export interface DocExample {
  /** Route segment under the page route (e.g. `client` → `/datagrid/client`). */
  readonly id: string;
  readonly label: Localized;
}

export interface DocPageMeta {
  /** Stable id; also the key for lazy content. */
  readonly id: string;
  /** Absolute route of the page (no trailing slash). */
  readonly route: string;
  readonly section: DocSection;
  /** Sub-group inside the Components section. */
  readonly group?: ComponentGroup;
  readonly title: Localized;
  /** Lucide icon name. */
  readonly icon: string;
  /** One or two sentences in plain language ("en arroz y habichuelas"). */
  readonly summary: Localized;
  readonly status: DocStatus;
  /** Extra search terms: synonyms, tasks, common phrasings, both languages. */
  readonly keywords: readonly string[];
  /** Live example tabs (component demo pages). */
  readonly examples?: readonly DocExample[];
  /**
   * Public API ownership. Every exported symbol whose manifest `area` is listed
   * here is documented by this page (shown in its API tab, counted for coverage).
   */
  readonly areas?: readonly string[];
  /** Additional explicitly-owned symbols (for symbols whose area is shared). */
  readonly symbols?: readonly string[];
  /** Has a long-form content module in content/ (lazy). */
  readonly hasContent?: boolean;
  /** Hidden from the sidebar (still searchable and routable). */
  readonly hidden?: boolean;
}

// ── Long-form content ───────────────────────────────────────────────────

/**
 * Inline text supports a tiny, safe subset: `code`, **bold**, and
 * [label](/internal/route) links. Everything else is escaped.
 */
export type RichText = Localized;

export type ContentBlock =
  | { readonly kind: 'p'; readonly text: RichText }
  | { readonly kind: 'list'; readonly items: readonly RichText[]; readonly ordered?: boolean }
  | { readonly kind: 'code'; readonly lang: 'ts' | 'html' | 'css' | 'bash' | 'json'; readonly code: string; readonly title?: string }
  | { readonly kind: 'note'; readonly tone: 'info' | 'warning' | 'tip'; readonly text: RichText }
  | {
      readonly kind: 'table';
      readonly head: readonly Localized[];
      readonly rows: readonly (readonly RichText[])[];
    }
  | {
      /** A flow diagram as ordered steps (rendered as an accessible list with arrows). */
      readonly kind: 'flow';
      readonly steps: readonly { readonly label: Localized; readonly detail?: RichText }[];
    };

export interface ContentSection {
  /** Anchor id (used by the table of contents). */
  readonly id: string;
  readonly heading: Localized;
  readonly blocks: readonly ContentBlock[];
}

export interface KeyboardRow {
  readonly keys: string;
  readonly action: Localized;
}

/** Long-form content for a component page. Every field is optional but the coverage report counts them. */
export interface ComponentDocContent {
  /** Plain-language explanation (level 1). */
  readonly overview: readonly RichText[];
  readonly whenToUse: readonly RichText[];
  readonly whenNotToUse: readonly RichText[];
  /** Minimal compiling example: imports + template + required setup. */
  readonly quickStart?: { readonly ts: string; readonly note?: RichText };
  /** Technical deep dive (level 2), backed by the code. */
  readonly technical: readonly ContentSection[];
  readonly accessibility: {
    readonly keyboard: readonly KeyboardRow[];
    readonly notes: readonly RichText[];
  };
  readonly performance: readonly RichText[];
  readonly related: readonly { readonly id: string; readonly note: Localized }[];
}

/** Long-form content for guides, foundations, systems, architecture and contributing pages. */
export interface ArticleContent {
  /** Lead paragraph(s) — the goal before the implementation. */
  readonly intro: readonly RichText[];
  readonly sections: readonly ContentSection[];
  readonly related?: readonly { readonly id: string; readonly note: Localized }[];
}
