/**
 * Locale helpers built on the standard `Intl` APIs (no locale data shipped).
 *
 * A *language* is what the translations are written in (`es`); a *locale* is
 * the BCP 47 tag that drives formatting and `<html lang>` (`es-PR`). They
 * default to the same tag but are configured separately per language option.
 */

/** Scripts written right-to-left (ISO 15924). */
const RTL_SCRIPTS = new Set(['Arab', 'Hebr', 'Thaa', 'Syrc', 'Nkoo', 'Adlm', 'Rohg', 'Mand', 'Samr', 'Mend']);

type LocaleWithTextInfo = Intl.Locale & { getTextInfo?(): { direction?: string }; textInfo?: { direction?: string } };

/**
 * Text direction of a BCP 47 tag: `'rtl'` for Arabic, Hebrew, Persian, Urdu,
 * Sorani (`ckb`), `pa-Arab`… and `'ltr'` otherwise. Uses `Intl.Locale` text
 * info when the runtime has it, else the likely script (`maximize()`).
 */
export function textDirection(tag: string): 'ltr' | 'rtl' {
  try {
    const locale = new Intl.Locale(tag) as LocaleWithTextInfo;
    const direction = locale.getTextInfo?.().direction ?? locale.textInfo?.direction;
    if (direction === 'rtl' || direction === 'ltr') return direction;
    const script = locale.maximize().script;
    return script && RTL_SCRIPTS.has(script) ? 'rtl' : 'ltr';
  } catch {
    return 'ltr'; // not a valid tag
  }
}

/** Language tags of an `Accept-Language` header, most preferred first (`q=0` dropped). */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(',')
    .map((part, index) => {
      const [tag, ...attrs] = part.trim().split(';');
      const q = attrs.map((a) => a.trim()).find((a) => a.startsWith('q='));
      return { tag: tag.trim(), q: q ? Number(q.slice(2)) : 1, index };
    })
    .filter((entry) => entry.tag && entry.tag !== '*' && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((entry) => entry.tag);
}

/**
 * Best available language for a preference list: an exact tag match first
 * (case-insensitive), then the same base language (`fr-CA` → `fr`, `es` → `es-MX`).
 */
export function negotiateLanguage(preferred: readonly string[], available: readonly string[]): string | null {
  const base = (tag: string) => tag.toLowerCase().split('-')[0];
  for (const tag of preferred) {
    const exact = available.find((a) => a.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
    const sameBase = available.find((a) => base(a) === base(tag));
    if (sameBase) return sameBase;
  }
  return null;
}
