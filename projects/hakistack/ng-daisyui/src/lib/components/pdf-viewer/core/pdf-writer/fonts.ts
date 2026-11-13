import { registerCustomFont } from './standard-fonts';
import { TrueTypeFont } from './truetype';

/** A TrueType font for text the standard fonts can't show (Greek, Cyrillic, CJK, …). */
export interface PdfFontSource {
  /** Name it's registered and shown under (used as its CSS family on screen). */
  readonly name: string;
  /** Where to fetch the `.ttf` from… */
  readonly url?: string;
  /** …or its bytes. */
  readonly data?: ArrayBuffer | Uint8Array;
}

const loaded = new Map<string, Promise<TrueTypeFont | null>>();

/**
 * Register a TrueType font (glyf outlines; `.otf` with CFF and `.ttc` aren't
 * supported) for text outside WinAnsi: annotation and form appearances
 * embed a subset of it, and on screen it's added to the page's fonts. Fonts
 * are global (shared by every viewer); registering a name again replaces it.
 */
export function registerPdfFont(name: string, bytes: ArrayBuffer | Uint8Array): TrueTypeFont {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const font = TrueTypeFont.parse(name, data);
  registerCustomFont(font);
  if (typeof document !== 'undefined' && typeof FontFace !== 'undefined') {
    try {
      const face = new FontFace(name, data.slice().buffer as ArrayBuffer);
      document.fonts.add(face);
      void face.load().catch(() => undefined);
    } catch {
      /* display falls back to the system's fonts */
    }
  }
  return font;
}

/** Load and register fonts (each source once); failures are skipped and reported to `onError`. */
export async function loadPdfFonts(
  sources: readonly PdfFontSource[],
  onError?: (source: PdfFontSource, err: unknown) => void,
): Promise<void> {
  await Promise.all(
    sources.map((source) => {
      const key = `${source.name}|${source.url ?? ''}|${source.data ? source.data.byteLength : ''}`;
      let pending = loaded.get(key);
      if (!pending) {
        pending = (async () => {
          try {
            const data = source.data ?? (source.url ? await (await fetch(source.url)).arrayBuffer() : null);
            return data ? registerPdfFont(source.name, data) : null;
          } catch (err) {
            onError?.(source, err);
            loaded.delete(key);
            return null;
          }
        })();
        loaded.set(key, pending);
      }
      return pending;
    }),
  );
}
