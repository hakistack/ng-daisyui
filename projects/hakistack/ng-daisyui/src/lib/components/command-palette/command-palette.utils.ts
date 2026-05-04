/**
 * Command palette internal utilities — pure functions used by the component.
 * Separated so the component class doesn't get cluttered with parsing logic.
 */

/** Parsed hotkey spec — `'Mod+K'` → `{ mod: true, key: 'k' }`. */
export interface ParsedHotkey {
  /** True when the spec includes `Mod`, `Cmd`, or `Ctrl`. Matches `event.metaKey || event.ctrlKey`. */
  readonly mod: boolean;
  /** True when the spec includes `Shift`. */
  readonly shift: boolean;
  /** True when the spec includes `Alt` / `Option`. */
  readonly alt: boolean;
  /** Lowercase main key (e.g. `'k'`, `'/'`, `'enter'`). */
  readonly key: string;
}

/** Parse a hotkey string like `'Mod+K'`, `'Ctrl+Shift+P'`, `'/'`. Case-insensitive. */
export function parseHotkey(spec: string): ParsedHotkey {
  const parts = spec
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);
  const key = parts.pop() ?? '';
  return {
    mod: parts.includes('mod') || parts.includes('cmd') || parts.includes('ctrl') || parts.includes('meta'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
    key,
  };
}

/** True when a `KeyboardEvent` matches the parsed hotkey. */
export function matchesHotkey(event: KeyboardEvent, parsed: ParsedHotkey): boolean {
  const eventMod = event.metaKey || event.ctrlKey;
  if (parsed.mod !== eventMod) return false;
  if (parsed.shift !== event.shiftKey) return false;
  if (parsed.alt !== event.altKey) return false;
  return event.key.toLowerCase() === parsed.key;
}

/**
 * True when the event target is a text-entry surface where we should NOT
 * intercept the hotkey (the user is typing into a field). Lets consumers
 * preserve native typing while we still grab the global shortcut.
 *
 * Excludes: `<input>`, `<textarea>`, `<select>`, contenteditable elements.
 * Note: we DO intercept inside our own search input (handled at component level).
 */
export function isInTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

/** Substring filter — case-insensitive `includes()` over label, description, and keywords. */
export function substringFilter<T extends { label: string; description?: string; keywords?: readonly string[] }>(
  query: string,
  items: readonly T[],
): T[] {
  const q = query.toLowerCase();
  return items.filter((item) => {
    if (item.label.toLowerCase().includes(q)) return true;
    if (item.description?.toLowerCase().includes(q)) return true;
    if (item.keywords?.some((k) => k.toLowerCase().includes(q))) return true;
    return false;
  });
}
