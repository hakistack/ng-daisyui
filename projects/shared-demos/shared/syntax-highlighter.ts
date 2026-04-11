import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>;

let highlighter: Highlighter | null = null;
let initPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (highlighter) return Promise.resolve(highlighter);
  if (initPromise) return initPromise;

  initPromise = createHighlighterCore({
    themes: [import('@shikijs/themes/dark-plus')],
    langs: [import('@shikijs/langs/typescript'), import('@shikijs/langs/angular-html')],
    engine: createJavaScriptRegexEngine(),
  }).then((h) => {
    highlighter = h;
    return h;
  });

  return initPromise;
}

export async function highlightCode(code: string, lang: 'typescript' | 'angular-html' = 'typescript'): Promise<string> {
  const h = await getHighlighter();
  return h.codeToHtml(code.trim(), {
    lang,
    theme: 'dark-plus',
  });
}
