import { Injectable, computed, signal } from '@angular/core';
import { DOC_PAGES } from '../catalog/pages';
import type { DocPageMeta } from '../catalog/catalog.types';
import type { ApiSymbol, ApiSymbolKind } from './api-manifest.types';

export const KIND_ORDER: readonly ApiSymbolKind[] = [
  'component',
  'directive',
  'pipe',
  'service',
  'provider',
  'token',
  'function',
  'class',
  'constant',
  'interface',
  'type',
  'enum',
];

export const KIND_LABELS: Record<ApiSymbolKind, { en: string; es: string }> = {
  component: { en: 'Components', es: 'Componentes' },
  directive: { en: 'Directives', es: 'Directivas' },
  pipe: { en: 'Pipes', es: 'Pipes' },
  service: { en: 'Services', es: 'Servicios' },
  provider: { en: 'Providers', es: 'Providers' },
  token: { en: 'Injection tokens', es: 'Tokens de inyección' },
  function: { en: 'Functions', es: 'Funciones' },
  class: { en: 'Classes', es: 'Clases' },
  constant: { en: 'Constants & builders', es: 'Constantes y builders' },
  interface: { en: 'Interfaces', es: 'Interfaces' },
  type: { en: 'Types', es: 'Tipos' },
  enum: { en: 'Enums', es: 'Enums' },
};

/**
 * Which docs page owns a symbol: explicit `symbols` first, then `areas`.
 * Shared with scripts/check-docs-coverage.mjs through the same catalog data.
 */
export function ownerPage(symbol: Pick<ApiSymbol, 'name' | 'area'>, pages: readonly DocPageMeta[] = DOC_PAGES): DocPageMeta | undefined {
  return pages.find((p) => p.symbols?.includes(symbol.name)) ?? pages.find((p) => p.areas?.includes(symbol.area));
}

/**
 * Lazy access to the generated API manifest (~600 symbols). The manifest is a
 * separate chunk, fetched the first time an API view or the search needs it.
 */
@Injectable({ providedIn: 'root' })
export class ApiManifestService {
  private readonly symbolsSignal = signal<readonly ApiSymbol[] | null>(null);
  private loading: Promise<readonly ApiSymbol[]> | null = null;

  readonly symbols = this.symbolsSignal.asReadonly();
  readonly byName = computed(() => new Map((this.symbolsSignal() ?? []).map((s) => [s.name, s])));

  load(): Promise<readonly ApiSymbol[]> {
    const ready = this.symbolsSignal();
    if (ready) return Promise.resolve(ready);
    this.loading ??= import('./api-manifest.generated').then((m) => {
      this.symbolsSignal.set(m.API_SYMBOLS);
      return m.API_SYMBOLS;
    });
    return this.loading;
  }

  /** Symbols documented by a page, components/services first. */
  forPage(page: DocPageMeta): ApiSymbol[] {
    const all = this.symbolsSignal() ?? [];
    return all
      .filter((s) => ownerPage(s) === page)
      .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.name.localeCompare(b.name));
  }
}

/** GitHub link for a manifest source ref. */
export function sourceUrl(path: string, line: number): string {
  return `https://github.com/hakistack/ng-daisyui/blob/main/${path}#L${line}`;
}
