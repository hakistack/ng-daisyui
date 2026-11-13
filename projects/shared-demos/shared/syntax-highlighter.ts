import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>;

export type CodeLang = 'typescript' | 'angular-html' | 'css' | 'json' | 'bash';

let highlighter: Highlighter | null = null;
let initPromise: Promise<Highlighter> | null = null;

/** Grammars beyond TS/HTML are loaded on first use so pages that never show CSS don't download it. */
const EXTRA_LANGS: Record<Exclude<CodeLang, 'typescript' | 'angular-html'>, () => Promise<unknown>> = {
  css: () => import('@shikijs/langs/css'),
  json: () => import('@shikijs/langs/json'),
  bash: () => import('@shikijs/langs/bash'),
};
const loaded = new Set<CodeLang>(['typescript', 'angular-html']);

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

export async function highlightCode(code: string, lang: CodeLang = 'typescript'): Promise<string> {
  const h = await getHighlighter();
  if (!loaded.has(lang)) {
    const mod = (await EXTRA_LANGS[lang as keyof typeof EXTRA_LANGS]()) as { default: Parameters<Highlighter['loadLanguage']>[0] };
    await h.loadLanguage(mod.default);
    loaded.add(lang);
  }
  return h.codeToHtml(code.trim(), { lang, theme: 'dark-plus' });
}
