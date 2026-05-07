import type { ChainedCommands, Editor } from '@tiptap/core';
import type { LucideIcon } from '@lucide/angular';
import {
  LucideHeading1,
  LucideHeading2,
  LucideHeading3,
  LucideList,
  LucideListOrdered,
  LucideQuote,
  LucideSquareCode,
  LucideMinus,
} from '@lucide/angular';
import type { EditorSlashCommand, EditorSlashCommandConfig } from './editor.types';

/**
 * Built-in slash commands. Match Notion's defaults — heading, lists,
 * blockquote, code block, divider. Consumers can extend or replace via the
 * `slashCommands` input.
 *
 * Each command's `action` receives the editor and the document range that
 * covers the slash trigger (`/heading`, `/bullet`, etc.). Convention: call
 * `deleteRange(range)` first so the trigger text is replaced, not appended.
 */
export const BUILT_IN_SLASH_COMMANDS: readonly EditorSlashCommand[] = [
  {
    id: 'heading-1',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: LucideHeading1,
    keywords: ['h1', 'title'],
    group: 'Basic blocks',
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    id: 'heading-2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: LucideHeading2,
    keywords: ['h2', 'subtitle'],
    group: 'Basic blocks',
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    id: 'heading-3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: LucideHeading3,
    keywords: ['h3'],
    group: 'Basic blocks',
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    id: 'bullet-list',
    label: 'Bullet list',
    description: 'Simple bulleted list',
    icon: LucideList,
    keywords: ['ul', 'unordered'],
    group: 'Lists',
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: 'ordered-list',
    label: 'Numbered list',
    description: 'List with numbering',
    icon: LucideListOrdered,
    keywords: ['ol', 'numbered'],
    group: 'Lists',
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: 'blockquote',
    label: 'Quote',
    description: 'Block quote',
    icon: LucideQuote,
    keywords: ['blockquote'],
    group: 'Basic blocks',
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    id: 'code-block',
    label: 'Code block',
    description: 'Multi-line code with monospace font',
    icon: LucideSquareCode,
    keywords: ['pre', 'snippet'],
    group: 'Basic blocks',
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Horizontal rule',
    icon: LucideMinus,
    keywords: ['hr', 'separator', 'horizontal-rule'],
    group: 'Basic blocks',
    action: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

/**
 * Filter slash commands by query — case-insensitive substring match across
 * `label` and `keywords`. Empty query returns the full list.
 */
export function filterSlashCommands(items: readonly EditorSlashCommand[], query: string): readonly EditorSlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    if (item.label.toLowerCase().includes(q)) return true;
    if (item.id.toLowerCase().includes(q)) return true;
    return item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
  });
}

/**
 * Renderer hook contract — the editor component implements this and passes
 * an instance to `createSlashCommandExtension` so the popup state lives in
 * Angular signals while ProseMirror's Suggestion plugin drives the events.
 */
export interface SlashCommandRenderer {
  onStart(state: SlashCommandRenderState): void;
  onUpdate(state: SlashCommandRenderState): void;
  onKeyDown(event: KeyboardEvent): boolean;
  onExit(): void;
}

export interface SlashCommandRenderState {
  readonly editor: Editor;
  readonly query: string;
  readonly items: readonly EditorSlashCommand[];
  readonly range: { from: number; to: number };
  readonly clientRect: DOMRect | null;
  /** Commit a specific item — typically called by the renderer on Enter / click. */
  commit(item: EditorSlashCommand): void;
}

/**
 * Build the slash-command TipTap extension. Imports `@tiptap/core` and
 * `@tiptap/suggestion` dynamically so this whole module can be co-loaded
 * with the rest of the editor lazily.
 *
 * The renderer receives state changes; the extension itself is stateless.
 */
export async function createSlashCommandExtension(opts: { items: readonly EditorSlashCommand[]; renderer: SlashCommandRenderer }) {
  const [{ Extension }, { default: Suggestion }] = await Promise.all([import('@tiptap/core'), import('@tiptap/suggestion')]);

  return Extension.create({
    name: 'hkSlashCommand',
    addOptions() {
      return {
        suggestion: {
          char: '/',
          startOfLine: false,
          allowSpaces: false,
          // ProseMirror node types where the suggestion popup may open. Match
          // Notion: paragraph + heading. Skip code blocks (the slash is just
          // a literal character there) and lists (let the user keep typing).
          allow: ({ state, range }: { state: import('@tiptap/pm/state').EditorState; range: { from: number; to: number } }) => {
            const $from = state.doc.resolve(range.from);
            const node = $from.node($from.depth);
            return node.type.name === 'paragraph' || node.type.name === 'heading';
          },
          command: ({ editor, range, props }: { editor: Editor; range: { from: number; to: number }; props: EditorSlashCommand }) => {
            props.action({ editor, range });
          },
        },
      };
    },
    addProseMirrorPlugins() {
      const items = opts.items;
      const renderer = opts.renderer;
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
          items: ({ query }: { query: string }) => filterSlashCommands(items, query),
          render: () => {
            let lastProps: SuggestionProps | null = null;
            return {
              onStart: (props: SuggestionProps) => {
                lastProps = props;
                renderer.onStart({
                  editor: props.editor,
                  query: props.query,
                  items: props.items as readonly EditorSlashCommand[],
                  range: props.range,
                  clientRect: props.clientRect?.() ?? null,
                  commit: (item) => props.command(item),
                });
              },
              onUpdate: (props: SuggestionProps) => {
                lastProps = props;
                renderer.onUpdate({
                  editor: props.editor,
                  query: props.query,
                  items: props.items as readonly EditorSlashCommand[],
                  range: props.range,
                  clientRect: props.clientRect?.() ?? null,
                  commit: (item) => props.command(item),
                });
              },
              onKeyDown: (props: { event: KeyboardEvent }) => {
                if (!lastProps) return false;
                return renderer.onKeyDown(props.event);
              },
              onExit: () => {
                lastProps = null;
                renderer.onExit();
              },
            };
          },
        }),
      ];
    },
  });
}

interface SuggestionProps {
  editor: Editor;
  query: string;
  items: readonly EditorSlashCommand[];
  range: { from: number; to: number };
  clientRect?: () => DOMRect | null;
  command(item: EditorSlashCommand): void;
}

// ── Builder helpers ──────────────────────────────────────────────────────
//
// Mirrors the `field.text(...)` / `field.select(...)` ergonomics of
// `createForm`: factory functions that absorb the common boilerplate so
// consumer code stays declarative.
//
//   slash.snippet({ id, label, icon, html })          // most common: insert HTML
//   slash.command({ id, label, icon, run: chain => })  // run a chain command
//   slash.custom({...})                                // full-power escape hatch
//
// All three return the same `EditorSlashCommand` shape, so they compose
// freely in `slashCommands` config arrays.

/** Common option fields shared by every slash factory — everything except `action`. */
interface SlashCommandBaseOptions {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: LucideIcon;
  readonly keywords?: readonly string[];
  readonly group?: string;
}

/** `slash.snippet` options — declares HTML to insert at the trigger position. */
export interface SlashSnippetOptions extends SlashCommandBaseOptions {
  /**
   * HTML to insert. Three accepted shapes:
   *
   * - **literal string** — `'<p>Hi</p>'`. Inlined into the bundle.
   * - **sync function** — `() => MY_TEMPLATE`. Useful when the template is
   *   computed (e.g. interpolates the current date).
   * - **async function** — `() => fetch('/assets/sig.html').then(r => r.text())`.
   *   The popup closes immediately on commit and the snippet is inserted
   *   when the promise resolves.
   */
  readonly html: string | (() => string | Promise<string>);
}

/** `slash.snippetFromUrl` options — fetches HTML from a URL on commit. */
export interface SlashSnippetFromUrlOptions extends SlashCommandBaseOptions {
  /** Where to fetch the snippet HTML from. Same origin or CORS-enabled. */
  readonly url: string;
  /** Optional `fetch` init (headers, credentials, etc.). */
  readonly fetchInit?: RequestInit;
}

/** `slash.command` options — declares a chain command to run on the editor. */
export interface SlashChainCommandOptions extends SlashCommandBaseOptions {
  /** Receives a focused chain with `deleteRange(range)` already applied. Return the chain (don't call `.run()`). */
  readonly run: (chain: ChainedCommands) => ChainedCommands;
}

/**
 * Slash-command factory namespace. Use these helpers to declare custom
 * items with minimal boilerplate. Each helper returns a fully-formed
 * `EditorSlashCommand` ready to drop into the `slashCommands` config.
 */
export const slash = {
  /**
   * Insert raw HTML at the slash trigger. The most common shape — replaces
   * the slash text with whatever HTML you supply.
   *
   * @example
   * slash.snippet({
   *   id: 'signature',
   *   label: 'Signature',
   *   icon: LucidePencil,
   *   html: '<p>— <strong>Jose</strong></p>',
   * })
   */
  snippet(opts: SlashSnippetOptions): EditorSlashCommand {
    return {
      id: opts.id,
      label: opts.label,
      description: opts.description,
      icon: opts.icon,
      keywords: opts.keywords,
      group: opts.group,
      action: async ({ editor, range }) => {
        const html = typeof opts.html === 'function' ? await opts.html() : opts.html;
        editor.chain().focus().deleteRange(range).insertContent(html).run();
      },
    };
  },

  /**
   * Insert HTML loaded from a URL. Convenience wrapper around `snippet` for
   * the common case of storing template snippets as static `.html` assets
   * (e.g. `/assets/snippets/signature.html`). Network errors are silently
   * swallowed — drop down to `slash.custom({...})` if you need bespoke
   * error handling.
   *
   * @example
   * slash.snippetFromUrl({
   *   id: 'signature',
   *   label: 'Signature',
   *   icon: LucidePencil,
   *   url: '/assets/snippets/signature.html',
   * })
   */
  snippetFromUrl(opts: SlashSnippetFromUrlOptions): EditorSlashCommand {
    return {
      id: opts.id,
      label: opts.label,
      description: opts.description,
      icon: opts.icon,
      keywords: opts.keywords,
      group: opts.group,
      action: async ({ editor, range }) => {
        try {
          const response = await fetch(opts.url, opts.fetchInit);
          if (!response.ok) return;
          const html = await response.text();
          editor.chain().focus().deleteRange(range).insertContent(html).run();
        } catch {
          // Swallow — consumer can opt into custom error handling via slash.custom.
        }
      },
    };
  },

  /**
   * Run an arbitrary chain command. The chain is pre-focused and the slash
   * trigger range is already deleted — your `run` callback just calls the
   * editor command(s) you need (`toggleTaskList()`, `insertTable()`, etc.)
   * and returns the chain. The factory invokes `.run()` for you.
   *
   * @example
   * slash.command({
   *   id: 'todo',
   *   label: 'To-do list',
   *   icon: LucideCheckSquare,
   *   run: (chain) => chain.toggleTaskList(),
   * })
   */
  command(opts: SlashChainCommandOptions): EditorSlashCommand {
    return {
      id: opts.id,
      label: opts.label,
      description: opts.description,
      icon: opts.icon,
      keywords: opts.keywords,
      group: opts.group,
      action: ({ editor, range }) => {
        opts.run(editor.chain().focus().deleteRange(range)).run();
      },
    };
  },

  /**
   * Full-power escape hatch — pass through an `EditorSlashCommand` exactly.
   * Use when neither `snippet` nor `command` covers what you need (e.g. the
   * action wants to run async work or branch on editor state).
   */
  custom(item: EditorSlashCommand): EditorSlashCommand {
    return item;
  },
} as const;

/**
 * Type-safe builder for the `slashCommands` input value. Wraps the literal
 * config so TypeScript validates the shape at the call site (and gives you
 * IntelliSense) without forcing the consumer to remember a manual
 * `: EditorSlashCommandConfig` annotation.
 *
 * Mirrors the `createForm` / `createTable` ergonomics — the function is a
 * trivial passthrough; its job is purely to anchor type inference.
 *
 * @example
 * customSlashCommands = createSlashCommands({
 *   append: true,
 *   items: [
 *     slash.snippet({ id: 'sig', label: 'Signature', html: '<p>—</p>' }),
 *     slash.command({ id: 'todo', label: 'To-do', run: (c) => c.toggleTaskList() }),
 *   ],
 * });
 *
 * // Boolean form — enables the built-ins.
 * customSlashCommands = createSlashCommands(true);
 *
 * // Array form — replaces the built-ins entirely.
 * customSlashCommands = createSlashCommands([slash.snippet({...})]);
 */
export function createSlashCommands(config: EditorSlashCommandConfig): EditorSlashCommandConfig {
  return config;
}
