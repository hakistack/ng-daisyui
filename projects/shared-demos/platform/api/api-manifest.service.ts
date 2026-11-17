import { Injectable, computed, signal } from '@angular/core';
import { DOC_PAGES, productOf } from '../catalog/pages';
import type { DocPageMeta, DocProduct } from '../catalog/catalog.types';
import type { ApiPackage, ApiSymbol, ApiSymbolKind } from './api-manifest.types';

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

/** Docs products that publish an API (each has its own manifest and `/api` namespace). */
export type ApiProduct = Exclude<DocProduct, 'hakistack'>;

/** The npm package a symbol is imported from. */
export function symbolPackage(symbol: Pick<ApiSymbol, 'package'>): ApiPackage {
  return symbol.package ?? '@hakistack/ng-daisyui';
}

/** Docs product of a symbol (`ng-daisyui` or `i18n`). Names are unique per product, not across products. */
export function symbolProduct(symbol: Pick<ApiSymbol, 'package'>): ApiProduct {
  return symbol.package === '@hakistack/i18n' ? 'i18n' : 'ng-daisyui';
}

/** Route of a symbol's reference page: `/api/<name>` (ng-daisyui) or `/api/i18n/<name>`. */
export function apiRoute(symbol: Pick<ApiSymbol, 'name' | 'package'>): string {
  return `${apiIndexRoute(symbolProduct(symbol))}/${symbol.name}`;
}

/** Route of a product's API index. */
export function apiIndexRoute(product: ApiProduct): string {
  return product === 'i18n' ? '/api/i18n' : '/api';
}

/**
 * Which docs page owns a symbol: explicit `symbols` first, then `areas`, searching only the pages of the
 * symbol's own product (so an i18n symbol never lands on an ng-daisyui page with the same name or area).
 * Shared with scripts/check-docs-coverage.mjs through the same catalog data.
 */
export function ownerPage(
  symbol: Pick<ApiSymbol, 'name' | 'area' | 'package'>,
  pages: readonly DocPageMeta[] = DOC_PAGES,
): DocPageMeta | undefined {
  const product = symbolProduct(symbol);
  const candidates = pages.filter((p) => (productOf(p) === 'i18n') === (product === 'i18n'));
  return candidates.find((p) => p.symbols?.includes(symbol.name)) ?? candidates.find((p) => p.areas?.includes(symbol.area));
}

/**
 * Lazy access to the generated API manifests (ng-daisyui ~600 symbols, i18n ~60). Each manifest is a
 * separate chunk, fetched the first time an API view or the search needs it.
 */
@Injectable({ providedIn: 'root' })
export class ApiManifestService {
  private readonly symbolsSignal = signal<readonly ApiSymbol[] | null>(null);
  private loading: Promise<readonly ApiSymbol[]> | null = null;

  /** Every symbol of every package (ng-daisyui first). */
  readonly symbols = this.symbolsSignal.asReadonly();
  /** ng-daisyui symbols by name (demo API tables and ng-daisyui links). */
  readonly byName = computed(() => this.index('ng-daisyui'));
  /** @hakistack/i18n symbols by name. */
  readonly i18nByName = computed(() => this.index('i18n'));

  load(): Promise<readonly ApiSymbol[]> {
    const ready = this.symbolsSignal();
    if (ready) return Promise.resolve(ready);
    this.loading ??= Promise.all([import('./api-manifest.generated'), import('./api-manifest.i18n.generated')]).then(([ui, i18n]) => {
      const all = [...ui.API_SYMBOLS, ...i18n.I18N_API_SYMBOLS];
      this.symbolsSignal.set(all);
      return all;
    });
    return this.loading;
  }

  /** Names resolve within one product. */
  find(name: string, product: ApiProduct = 'ng-daisyui'): ApiSymbol | undefined {
    return (product === 'i18n' ? this.i18nByName() : this.byName()).get(name);
  }

  /** Symbols documented by a page, components/services first. */
  forPage(page: DocPageMeta): ApiSymbol[] {
    const all = this.symbolsSignal() ?? [];
    return all
      .filter((s) => ownerPage(s) === page)
      .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.name.localeCompare(b.name));
  }

  private index(product: ApiProduct): Map<string, ApiSymbol> {
    return new Map((this.symbolsSignal() ?? []).filter((s) => symbolProduct(s) === product).map((s) => [s.name, s]));
  }
}

/** GitHub link for a manifest source ref. */
export function sourceUrl(path: string, line: number): string {
  return `https://github.com/hakistack/ng-daisyui/blob/main/${path}#L${line}`;
}
