import { DOCUMENT } from '@angular/common';
import { Injectable, Pipe, PipeTransform, effect, inject, signal } from '@angular/core';
import type { DocsLocale, Localized } from '../catalog/catalog.types';

const STORAGE_KEY = 'hk-docs-locale';
export const DOCS_LOCALES: readonly { id: DocsLocale; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'es', label: 'Español', short: 'ES' },
];

/**
 * Docs-site language. Content is authored as `{ en, es }` records next to the
 * catalog, so switching language is a signal flip — no runtime translation
 * engine, no extra requests. English is the fallback.
 *
 * Why not @hakistack/i18n here: that package (Transloco + codegen) is built for
 * app UI strings keyed by id. Docs content is long-form prose that lives with
 * its page metadata and is checked for completeness by `docs:check`; keeping it
 * in typed records avoids a key indirection for every paragraph.
 */
@Injectable({ providedIn: 'root' })
export class DocsLocaleService {
  private readonly document = inject(DOCUMENT);
  readonly locale = signal<DocsLocale>(this.initial());

  constructor() {
    effect(() => {
      const locale = this.locale();
      this.document.documentElement.lang = locale;
      try {
        localStorage.setItem(STORAGE_KEY, locale);
      } catch {
        /* storage blocked: preference just isn't remembered */
      }
    });
  }

  set(locale: DocsLocale): void {
    this.locale.set(locale);
  }

  /** Resolve a localized record in the current language (English fallback). */
  t(value: Localized | string | undefined | null): string {
    return localize(value, this.locale());
  }

  private initial(): DocsLocale {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'es') return saved;
    } catch {
      /* ignore */
    }
    const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
    return nav?.toLowerCase().startsWith('es') ? 'es' : 'en';
  }
}

export function localize(value: Localized | string | undefined | null, locale: DocsLocale): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[locale] || value.en;
}

/** `{{ page.title | loc: lang() }}` — pure; pass the locale signal value so it re-evaluates on switch. */
@Pipe({ name: 'loc' })
export class LocalizePipe implements PipeTransform {
  transform(value: Localized | string | undefined | null, locale: DocsLocale): string {
    return localize(value, locale);
  }
}

/** Docs chrome strings (shell, tabs, API reference). */
export const UI = {
  skipToContent: { en: 'Skip to content', es: 'Saltar al contenido' },
  search: { en: 'Search docs', es: 'Buscar en la documentación' },
  searchPlaceholder: { en: 'Search components, guides, APIs…', es: 'Busca componentes, guías, APIs…' },
  openNavigation: { en: 'Open navigation', es: 'Abrir navegación' },
  closeNavigation: { en: 'Close navigation', es: 'Cerrar navegación' },
  mainNavigation: { en: 'Documentation', es: 'Documentación' },
  theme: { en: 'Theme', es: 'Tema' },
  language: { en: 'Language', es: 'Idioma' },
  onThisPage: { en: 'On this page', es: 'En esta página' },
  overview: { en: 'Overview', es: 'Resumen' },
  examples: { en: 'Examples', es: 'Ejemplos' },
  playground: { en: 'Playground', es: 'Playground' },
  api: { en: 'API', es: 'API' },
  accessibility: { en: 'Accessibility', es: 'Accesibilidad' },
  whenToUse: { en: 'When to use it', es: 'Cuándo usarlo' },
  whenNotToUse: { en: 'When not to use it', es: 'Cuándo no usarlo' },
  quickStart: { en: 'Quick start', es: 'Inicio rápido' },
  technical: { en: 'Technical deep dive', es: 'A fondo: cómo funciona' },
  performance: { en: 'Performance', es: 'Rendimiento' },
  related: { en: 'Related', es: 'Relacionados' },
  keyboard: { en: 'Keyboard', es: 'Teclado' },
  keys: { en: 'Keys', es: 'Teclas' },
  action: { en: 'Action', es: 'Acción' },
  noKeyboard: {
    en: 'No component-specific shortcuts — standard Tab / Shift+Tab focus order applies.',
    es: 'Sin atajos propios: aplica el orden de foco estándar con Tab / Shift+Tab.',
  },
  publicApi: { en: 'Public API on this page', es: 'API pública de esta página' },
  loading: { en: 'Loading…', es: 'Cargando…' },
  contentMissing: {
    en: 'This page has no written overview yet. The examples and the API tab are generated from the code.',
    es: 'Esta página aún no tiene un resumen escrito. Los ejemplos y la pestaña API se generan desde el código.',
  },
  status: { en: 'Status', es: 'Estado' },
  statusStable: { en: 'Stable', es: 'Estable' },
  statusBeta: { en: 'Beta', es: 'Beta' },
  statusExperimental: { en: 'Experimental', es: 'Experimental' },
  statusPlanned: { en: 'Planned', es: 'Planificado' },
  previous: { en: 'Previous', es: 'Anterior' },
  next: { en: 'Next', es: 'Siguiente' },
  pages: { en: 'Pages', es: 'Páginas' },
  examplesGroup: { en: 'Examples', es: 'Ejemplos' },
  apiGroup: { en: 'API', es: 'API' },
  editOnGithub: { en: 'View source', es: 'Ver código' },
  notFound: { en: 'Page not found', es: 'Página no encontrada' },
} satisfies Record<string, Localized>;
