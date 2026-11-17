import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { CodeBlockComponent } from '../../shared/code-block.component';
import {
  ApiManifestService,
  KIND_LABELS,
  KIND_ORDER,
  apiIndexRoute,
  apiRoute,
  ownerPage,
  sourceUrl,
  symbolPackage,
  type ApiProduct,
} from '../api/api-manifest.service';
import { PRODUCT_BRANDS, PRODUCT_TITLES } from '../catalog/pages';
import type { ApiSymbol, ApiSymbolKind } from '../api/api-manifest.types';
import { DocsLocaleService, LocalizePipe, UI, localize } from '../i18n/docs-locale.service';
import { renderInline } from '../ui/rich-text';
import { handleInternalLink } from '../ui/content-blocks.component';

const T = {
  title: { en: 'API reference', es: 'Referencia de API' },
  lead: {
    en: 'Generated from `public-api.ts` with the TypeScript compiler on every `npm run extract-api-docs`. If it is exported, it is here.',
    es: 'Generada desde `public-api.ts` con el compilador de TypeScript en cada `npm run extract-api-docs`. Si se exporta, está aquí.',
  },
  filter: { en: 'Filter symbols', es: 'Filtrar símbolos' },
  all: { en: 'All', es: 'Todos' },
  results: { en: 'symbols', es: 'símbolos' },
  inputs: { en: 'Inputs', es: 'Inputs' },
  outputs: { en: 'Outputs', es: 'Outputs' },
  methods: { en: 'Methods', es: 'Métodos' },
  properties: { en: 'Properties', es: 'Propiedades' },
  members: { en: 'Members', es: 'Miembros' },
  name: { en: 'Name', es: 'Nombre' },
  type: { en: 'Type', es: 'Tipo' },
  default: { en: 'Default', es: 'Por defecto' },
  description: { en: 'Description', es: 'Descripción' },
  signature: { en: 'Signature', es: 'Firma' },
  documentedIn: { en: 'Documented in', es: 'Documentado en' },
  required: { en: 'required', es: 'requerido' },
  model: { en: 'two-way', es: 'bidireccional' },
  optional: { en: 'optional', es: 'opcional' },
  deprecated: { en: 'deprecated', es: 'obsoleto' },
  notFound: { en: 'No exported symbol is called', es: 'Ningún símbolo exportado se llama' },
  backToIndex: { en: 'All symbols', es: 'Todos los símbolos' },
  package: { en: 'Package', es: 'Paquete' },
  otherPackage: { en: 'Also in this repository:', es: 'También en este repositorio:' },
  noDescription: { en: 'No JSDoc description in the source yet.', es: 'Aún no tiene descripción JSDoc en el código.' },
  noMatches: { en: 'No symbols match.', es: 'Ningún símbolo coincide.' },
};

/** `/api` (index) and `/api/:name` (symbol detail) for ng-daisyui; `/api/i18n[/:name]` for @hakistack/i18n (route data `pkg`). */
@Component({
  selector: 'app-api-reference',
  imports: [RouterLink, CodeBlockComponent, LocalizePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(click)': 'onClick($event)' },
  template: `
    @if (!manifest.symbols()) {
      <p class="text-base-content/70" role="status">{{ ui.loading | loc: lang() }}</p>
    } @else if (name()) {
      @if (symbol(); as s) {
        <article class="space-y-6 max-w-4xl" [attr.aria-labelledby]="'api-' + s.name">
          <nav aria-label="Breadcrumb" class="text-sm breadcrumbs py-0">
            <ul>
              <li>
                <a [routerLink]="indexRoute()">{{ t.title | loc: lang() }} · {{ packageName() }}</a>
              </li>
              <li>{{ kindLabel(s.kind) }}</li>
            </ul>
          </nav>
          <header class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <h1 [id]="'api-' + s.name" class="text-3xl font-semibold font-mono tracking-tight break-all">{{ s.name }}</h1>
              <span class="badge badge-outline">{{ s.kind }}</span>
              <span class="badge badge-ghost font-mono"
                ><span class="sr-only">{{ t.package | loc: lang() }}: </span>{{ packageName() }}</span
              >
              @if (s.deprecated) {
                <span class="badge badge-warning">{{ t.deprecated | loc: lang() }}</span>
              }
            </div>
            @if (s.description) {
              <p class="text-base leading-relaxed text-base-content/80 max-w-3xl" [innerHTML]="inline(s.description)"></p>
            } @else {
              <p class="text-sm text-base-content/70 italic">{{ t.noDescription | loc: lang() }}</p>
            }
            <div class="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              @if (owner(); as page) {
                <span
                  >{{ t.documentedIn | loc: lang() }}:
                  <a class="link link-primary" [routerLink]="page.route">{{ page.title | loc: lang() }}</a></span
                >
              }
              @if (s.source; as src) {
                <a class="link" [href]="source(src.path, src.line)" target="_blank" rel="noopener noreferrer"
                  >{{ ui.editOnGithub | loc: lang() }} — {{ src.path.split('/').pop() }}:{{ src.line }}</a
                >
              }
            </div>
          </header>

          <app-code-block [code]="importLine(s)" />

          @if (s.selector) {
            <app-code-block [code]="selectorSnippet(s)" lang="angular-html" />
          }
          @if (s.signatures?.length) {
            <section aria-labelledby="sig">
              <h2 id="sig" class="docs-h2">{{ t.signature | loc: lang() }}</h2>
              <app-code-block [code]="s.signatures!.join('\\n')" />
              @if (s.params?.length) {
                <ul class="docs-list list-disc mt-3">
                  @for (p of s.params!; track p.name) {
                    <li>
                      <code class="hk-docs-code">{{ p.name }}</code> — <span [innerHTML]="inline(p.description)"></span>
                    </li>
                  }
                </ul>
              }
            </section>
          }
          @if (s.typeText && !s.signatures) {
            <app-code-block [code]="typeDecl(s)" />
          }

          @if (s.inputs?.length) {
            <section aria-labelledby="inputs">
              <h2 id="inputs" class="docs-h2">
                {{ t.inputs | loc: lang() }} <span class="badge badge-ghost badge-sm">{{ s.inputs!.length }}</span>
              </h2>
              <div
                class="overflow-x-auto rounded-box border border-base-content/10"
                tabindex="0"
                role="region"
                [attr.aria-label]="t.inputs | loc: lang()"
              >
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th scope="col">{{ t.name | loc: lang() }}</th>
                      <th scope="col">{{ t.type | loc: lang() }}</th>
                      <th scope="col">{{ t.default | loc: lang() }}</th>
                      <th scope="col">{{ t.description | loc: lang() }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (i of s.inputs!; track i.name) {
                      <tr>
                        <td class="align-top whitespace-nowrap">
                          <code class="font-semibold text-primary">{{ i.name }}</code>
                          @if (i.required) {
                            <span class="badge badge-sm badge-outline ml-1">{{ t.required | loc: lang() }}</span>
                          }
                          @if (i.model) {
                            <span class="badge badge-sm badge-outline ml-1">{{ t.model | loc: lang() }}</span>
                          }
                        </td>
                        <td class="align-top">
                          <code class="text-xs break-words">{{ i.type }}</code>
                        </td>
                        <td class="align-top">
                          <code class="text-xs">{{ i.default ?? '—' }}</code>
                        </td>
                        <td class="align-top text-sm" [innerHTML]="inline(i.description ?? '')"></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }
          @if (s.outputs?.length) {
            <section aria-labelledby="outputs">
              <h2 id="outputs" class="docs-h2">
                {{ t.outputs | loc: lang() }} <span class="badge badge-ghost badge-sm">{{ s.outputs!.length }}</span>
              </h2>
              <div
                class="overflow-x-auto rounded-box border border-base-content/10"
                tabindex="0"
                role="region"
                [attr.aria-label]="t.outputs | loc: lang()"
              >
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th scope="col">{{ t.name | loc: lang() }}</th>
                      <th scope="col">{{ t.type | loc: lang() }}</th>
                      <th scope="col">{{ t.description | loc: lang() }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (o of s.outputs!; track o.name) {
                      <tr>
                        <td class="align-top whitespace-nowrap">
                          <code class="font-semibold text-primary">{{ o.name }}</code>
                        </td>
                        <td class="align-top">
                          <code class="text-xs break-words">{{ o.type }}</code>
                        </td>
                        <td class="align-top text-sm" [innerHTML]="inline(o.description ?? '')"></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }
          @if (s.methods?.length) {
            <section aria-labelledby="methods">
              <h2 id="methods" class="docs-h2">{{ t.methods | loc: lang() }}</h2>
              <dl class="space-y-3">
                @for (m of s.methods!; track m.name + $index) {
                  <div class="rounded-box border border-base-content/10 p-3">
                    <dt>
                      <code class="text-sm break-words">{{ m.signature }}</code>
                    </dt>
                    @if (m.description) {
                      <dd class="text-sm text-base-content/80 mt-1" [innerHTML]="inline(m.description)"></dd>
                    }
                  </div>
                }
              </dl>
            </section>
          }
          @for (group of memberGroups(s); track group.key) {
            <section [attr.aria-labelledby]="group.key">
              <h2 [id]="group.key" class="docs-h2">
                {{ group.title | loc: lang() }} <span class="badge badge-ghost badge-sm">{{ group.items.length }}</span>
              </h2>
              <div
                class="overflow-x-auto rounded-box border border-base-content/10"
                tabindex="0"
                role="region"
                [attr.aria-label]="group.title | loc: lang()"
              >
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th scope="col">{{ t.name | loc: lang() }}</th>
                      <th scope="col">{{ t.type | loc: lang() }}</th>
                      <th scope="col">{{ t.description | loc: lang() }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (m of group.items; track m.name) {
                      <tr>
                        <td class="align-top whitespace-nowrap">
                          <code class="font-semibold">{{ m.name }}{{ m.optional ? '?' : '' }}</code>
                          @if (m.deprecated) {
                            <span class="badge badge-sm badge-warning ml-1">{{ t.deprecated | loc: lang() }}</span>
                          }
                        </td>
                        <td class="align-top">
                          <code class="text-xs break-words">{{ m.type }}</code>
                        </td>
                        <td class="align-top text-sm" [innerHTML]="inline(m.description ?? '')"></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }
          <p>
            <a class="link" [routerLink]="indexRoute()">← {{ t.backToIndex | loc: lang() }}</a>
          </p>
        </article>
      } @else {
        <div class="space-y-3">
          <h1 class="text-2xl font-semibold">{{ ui.notFound | loc: lang() }}</h1>
          <p>
            {{ t.notFound | loc: lang() }} <code>{{ name() }}</code
            >.
          </p>
          <a class="link link-primary" [routerLink]="indexRoute()">{{ t.backToIndex | loc: lang() }}</a>
        </div>
      }
    } @else {
      <div class="space-y-6">
        <header class="space-y-2">
          <h1 class="text-3xl font-semibold tracking-tight">{{ t.title | loc: lang() }}</h1>
          <p class="font-mono text-sm text-base-content/70">{{ packageName() }}</p>
          <p class="text-base-content/80 max-w-3xl" [innerHTML]="inline(t.lead | loc: lang())"></p>
          <p class="text-sm">
            {{ t.otherPackage | loc: lang() }}
            <a class="link link-primary font-mono" [routerLink]="otherIndex().route">{{ otherIndex().name }}</a>
          </p>
        </header>
        <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
          <label class="input input-bordered flex items-center gap-2 w-full sm:max-w-sm">
            <span class="sr-only">{{ t.filter | loc: lang() }}</span>
            <input
              type="search"
              class="grow bg-transparent outline-none"
              [placeholder]="t.filter | loc: lang()"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
          </label>
          <label class="flex items-center gap-2 text-sm">
            <span>{{ t.type | loc: lang() }}</span>
            <select class="select select-bordered select-sm" [value]="kind()" (change)="kind.set($any($event.target).value)">
              <option value="">{{ t.all | loc: lang() }}</option>
              @for (k of kinds; track k) {
                <option [value]="k">{{ kindLabel(k) }}</option>
              }
            </select>
          </label>
          <span class="text-sm text-base-content/70" role="status" aria-live="polite"
            >{{ filtered().length }} {{ t.results | loc: lang() }}</span
          >
        </div>
        @for (group of grouped(); track group.kind) {
          <section [attr.aria-labelledby]="'kind-' + group.kind">
            <h2 [id]="'kind-' + group.kind" class="docs-h2">
              {{ kindLabel(group.kind) }} <span class="badge badge-ghost badge-sm">{{ group.items.length }}</span>
            </h2>
            <ul class="grid gap-x-6 gap-y-1 md:grid-cols-2">
              @for (s of group.items; track s.name) {
                <li class="min-w-0 py-1">
                  <a class="link link-hover font-mono text-sm text-primary" [routerLink]="route(s)">{{ s.name }}</a>
                  @if (s.description) {
                    <span class="block text-xs text-base-content/70 truncate">{{ firstSentence(s.description) }}</span>
                  }
                </li>
              }
            </ul>
          </section>
        } @empty {
          <p>{{ t.noMatches | loc: lang() }}</p>
        }
      </div>
    }
  `,
})
export class ApiReferenceComponent {
  /** Route param (component input binding). */
  readonly name = input<string>();
  /** Route data: `'i18n'` on the @hakistack/i18n routes, absent for ng-daisyui. */
  readonly pkg = input<string>();

  protected readonly manifest = inject(ApiManifestService);
  protected readonly lang = inject(DocsLocaleService).locale;
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  protected readonly ui = UI;
  protected readonly t = T;
  protected readonly kinds = KIND_ORDER;
  protected readonly query = signal('');
  protected readonly kind = signal<ApiSymbolKind | ''>('');

  protected readonly product = computed<ApiProduct>(() => (this.pkg() === 'i18n' ? 'i18n' : 'ng-daisyui'));
  protected readonly packageName = computed(() => PRODUCT_TITLES[this.product()]);
  protected readonly indexRoute = computed(() => apiIndexRoute(this.product()));
  protected readonly otherIndex = computed(() => {
    const other: ApiProduct = this.product() === 'i18n' ? 'ng-daisyui' : 'i18n';
    return { route: apiIndexRoute(other), name: PRODUCT_TITLES[other] };
  });
  protected readonly route = apiRoute;

  protected readonly symbol = computed(() => {
    this.manifest.symbols();
    const name = this.name();
    return name ? this.manifest.find(name, this.product()) : undefined;
  });
  protected readonly owner = computed(() => {
    const s = this.symbol();
    return s ? ownerPage(s) : undefined;
  });

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const k = this.kind();
    const pkg = this.packageName();
    return (this.manifest.symbols() ?? []).filter(
      (s) =>
        symbolPackage(s) === pkg &&
        (!k || s.kind === k) &&
        (!q || s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q)),
    );
  });

  protected readonly grouped = computed(() => {
    const list = this.filtered();
    return KIND_ORDER.map((kind) => ({ kind, items: list.filter((s) => s.kind === kind) })).filter((g) => g.items.length);
  });

  constructor() {
    void this.manifest.load();
    effect(() => {
      const s = this.symbol();
      const brand = PRODUCT_BRANDS[this.product()];
      this.title.setTitle(s ? `${s.name} — API · ${brand}` : `API reference · ${brand}`);
    });
  }

  protected kindLabel(kind: ApiSymbolKind): string {
    return localize(KIND_LABELS[kind], this.lang());
  }
  protected inline(text: string): string {
    // Link symbol names written as `Name` when this package exports them.
    const product = this.product();
    const names = product === 'i18n' ? this.manifest.i18nByName() : this.manifest.byName();
    return renderInline(text).replace(/<code class="hk-docs-code">([A-Za-z_][\w]*)<\/code>/g, (m, n: string) => {
      const target = names.get(n);
      return target && n !== this.name()
        ? `<a class="link link-primary" href="${apiRoute(target)}" data-internal="true"><code class="hk-docs-code">${n}</code></a>`
        : m;
    });
  }
  protected firstSentence(text: string): string {
    const plain = text.replace(/`/g, '');
    const m = /^(.+?[.!?])(\s|$)/.exec(plain);
    return m ? m[1] : plain;
  }
  protected source(path: string, line: number): string {
    return sourceUrl(path, line);
  }
  protected importLine(s: ApiSymbol): string {
    const typeOnly = s.kind === 'interface' || s.kind === 'type';
    const line = (from: string) => `import ${typeOnly ? 'type ' : ''}{ ${s.name} } from '${from}';`;
    const main = line(symbolPackage(s));
    // The authoring engine is also its own Angular-free entry point (what *.i18n.ts files and the CLI load).
    return s.area === 'i18n-engine' ? `${main}\n// or, without Angular (*.i18n.ts files, Node):\n${line('@hakistack/i18n/engine')}` : main;
  }
  protected selectorSnippet(s: ApiSymbol): string {
    const sel = s.selector ?? '';
    const required = (s.inputs ?? [])
      .filter((i) => i.required)
      .map((i) => ` [${i.name}]="…"`)
      .join('');
    if (s.kind === 'directive' || sel.startsWith('[') || sel.includes('[')) return `<!-- selector: ${sel} -->`;
    const tag = sel.split(',')[0].trim();
    return `<${tag}${required} />`;
  }
  protected typeDecl(s: ApiSymbol): string {
    if (s.kind === 'token') return `const ${s.name}: ${s.typeText};`;
    if (s.kind === 'constant') return `const ${s.name}: ${s.typeText};`;
    return `type ${s.name}${s.typeParams ?? ''} = ${s.typeText};`;
  }
  protected memberGroups(s: ApiSymbol) {
    const groups: { key: string; title: { en: string; es: string }; items: NonNullable<ApiSymbol['members']> }[] = [];
    if (s.properties?.length) groups.push({ key: 'properties', title: T.properties, items: s.properties });
    if (s.members?.length) groups.push({ key: 'members', title: T.members, items: s.members });
    return groups;
  }
  protected onClick(event: MouseEvent): void {
    handleInternalLink(event, this.router);
  }
}
