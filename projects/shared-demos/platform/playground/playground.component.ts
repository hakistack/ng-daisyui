import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  contentChild,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CodeBlockComponent } from '../../shared/code-block.component';
import { DocsLocaleService, LocalizePipe } from '../i18n/docs-locale.service';
import { decodeState, encodeState, generatePlaygroundCode } from './playground-codegen';
import type { PlaygroundEvent, PlaygroundSpec, PlaygroundState, PlaygroundValue } from './playground.types';

const T = {
  properties: { en: 'Properties', es: 'Propiedades' },
  preview: { en: 'Preview', es: 'Vista previa' },
  events: { en: 'Events', es: 'Eventos' },
  noEvents: { en: 'Interact with the component to see its outputs here.', es: 'Interactúa con el componente para ver aquí sus outputs.' },
  clear: { en: 'Clear', es: 'Limpiar' },
  reset: { en: 'Reset', es: 'Restablecer' },
  share: { en: 'Copy link', es: 'Copiar enlace' },
  copied: { en: 'Link copied', es: 'Enlace copiado' },
  code: { en: 'Generated code', es: 'Código generado' },
  codeHint: {
    en: 'Only the values you changed are written. The snippet is a complete standalone component.',
    es: 'Solo se escriben los valores que cambiaste. El fragmento es un componente standalone completo.',
  },
};

export interface PlaygroundPreviewContext<S extends PlaygroundState = PlaygroundState> {
  $implicit: S;
  /** Record an output in the event inspector. */
  log: (name: string, payload: unknown) => void;
}

/**
 * Reusable playground shell: controls ↔ state signal ↔ live preview, plus an
 * event inspector, generated code, reset and a shareable URL (`?pg=`).
 *
 * The component under test is projected as an `<ng-template let-s let-log="log">`,
 * so each playground stays a tiny, typed file that only knows its own component.
 */
@Component({
  selector: 'app-playground',
  imports: [NgTemplateOutlet, CodeBlockComponent, LocalizePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section class="rounded-box border border-base-content/10 bg-base-100 min-w-0" [attr.aria-label]="t.preview | loc: lang()">
        <div class="px-4 py-2 border-b border-base-content/10 text-xs font-semibold uppercase tracking-wider text-base-content/70">
          {{ t.preview | loc: lang() }}
        </div>
        <div class="p-6 min-h-40 flex items-center justify-center">
          <div class="w-full max-w-md">
            <!-- Keyed on the state so every change re-creates the component from scratch:
                 what you see is exactly what the generated code would render. -->
            @for (key of [stateKey()]; track key) {
              <ng-container *ngTemplateOutlet="preview(); context: context()" />
            }
          </div>
        </div>
      </section>

      <form
        class="rounded-box border border-base-content/10 bg-base-100 p-4 space-y-3 h-fit"
        (submit)="$event.preventDefault()"
        [attr.aria-label]="t.properties | loc: lang()"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-base-content/70">{{ t.properties | loc: lang() }}</h3>
          <div class="flex gap-1">
            <button type="button" class="btn btn-ghost btn-xs" (click)="reset()">{{ t.reset | loc: lang() }}</button>
            <button type="button" class="btn btn-ghost btn-xs" (click)="share()">
              {{ (copied() ? t.copied : t.share) | loc: lang() }}
            </button>
          </div>
        </div>
        @for (c of spec().controls; track c.key) {
          @switch (c.kind) {
            @case ('boolean') {
              <label class="flex items-center justify-between gap-3 cursor-pointer">
                <span class="text-sm flex flex-wrap items-baseline gap-x-2"
                  ><code class="text-xs">{{ c.key }}</code
                  ><span class="text-base-content/70">{{ c.label | loc: lang() }}</span></span
                >
                <input
                  type="checkbox"
                  class="toggle toggle-sm toggle-primary"
                  [checked]="value(c.key)"
                  (change)="set(c.key, $any($event.target).checked)"
                />
              </label>
            }
            @case ('select') {
              <label class="block space-y-1">
                <span class="text-sm flex flex-wrap items-baseline gap-x-2"
                  ><code class="text-xs">{{ c.key }}</code
                  ><span class="text-base-content/70">{{ c.label | loc: lang() }}</span></span
                >
                <select class="select select-bordered select-sm w-full" (change)="set(c.key, $any($event.target).value)">
                  @for (o of options(c); track o) {
                    <option [value]="o" [selected]="value(c.key) === o">{{ o }}</option>
                  }
                </select>
              </label>
            }
            @case ('number') {
              <label class="block space-y-1">
                <span class="text-sm flex flex-wrap items-baseline gap-x-2"
                  ><code class="text-xs">{{ c.key }}</code
                  ><span class="text-base-content/70">{{ c.label | loc: lang() }}</span></span
                >
                <input
                  type="number"
                  class="input input-bordered input-sm w-full"
                  [value]="value(c.key)"
                  [attr.min]="bounds(c).min"
                  [attr.max]="bounds(c).max"
                  [attr.step]="bounds(c).step"
                  (change)="setNumber(c.key, $any($event.target).value)"
                />
              </label>
            }
            @default {
              <label class="block space-y-1">
                <span class="text-sm flex flex-wrap items-baseline gap-x-2"
                  ><code class="text-xs">{{ c.key }}</code
                  ><span class="text-base-content/70">{{ c.label | loc: lang() }}</span></span
                >
                <input
                  type="text"
                  class="input input-bordered input-sm w-full"
                  [value]="value(c.key)"
                  (change)="set(c.key, $any($event.target).value)"
                />
              </label>
            }
          }
        }
      </form>
    </div>

    @if (spec().events?.length) {
      <section class="mt-4 rounded-box border border-base-content/10" [attr.aria-label]="t.events | loc: lang()">
        <div class="flex items-center justify-between px-4 py-2 border-b border-base-content/10">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-base-content/70">{{ t.events | loc: lang() }}</h3>
          <button type="button" class="btn btn-ghost btn-xs" (click)="events.set([])">{{ t.clear | loc: lang() }}</button>
        </div>
        <ol class="max-h-48 overflow-y-auto font-mono text-xs p-3 space-y-1" aria-live="polite" tabindex="0">
          @for (e of events(); track e.id) {
            <li>
              <span class="text-base-content/60">{{ e.at }}</span> <span class="text-primary">{{ e.name }}</span> {{ e.payload }}
            </li>
          } @empty {
            <li class="font-sans text-base-content/70">{{ t.noEvents | loc: lang() }}</li>
          }
        </ol>
      </section>
    }

    <section class="mt-4 space-y-2" [attr.aria-label]="t.code | loc: lang()">
      <div class="flex items-baseline justify-between gap-3">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-base-content/70">{{ t.code | loc: lang() }}</h3>
        <span class="text-xs text-base-content/70">{{ t.codeHint | loc: lang() }}</span>
      </div>
      <app-code-block [code]="code()" />
    </section>
  `,
})
export class PlaygroundComponent {
  readonly spec = input.required<PlaygroundSpec>();
  protected readonly preview = contentChild.required<TemplateRef<PlaygroundPreviewContext>>(TemplateRef);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly lang = inject(DocsLocaleService).locale;
  protected readonly t = T;

  /** Re-derived when the spec changes; seeded from `?pg=` so shared links reproduce the state. */
  protected readonly state = linkedSignal<PlaygroundState>(() => decodeState(this.spec(), this.route.snapshot.queryParamMap.get('pg')));
  protected readonly events = signal<PlaygroundEvent[]>([]);
  protected readonly copied = signal(false);
  private eventId = 0;

  protected readonly stateKey = computed(() => JSON.stringify(this.state()));
  protected readonly code = computed(() => generatePlaygroundCode(this.spec(), this.state()));
  protected readonly context = computed<PlaygroundPreviewContext>(() => ({ $implicit: this.state(), log: this.log }));

  protected value(key: string): PlaygroundValue {
    return this.state()[key];
  }
  protected options(c: PlaygroundSpec['controls'][number]): readonly string[] {
    return c.kind === 'select' ? c.options : [];
  }
  protected bounds(c: PlaygroundSpec['controls'][number]): { min?: number; max?: number; step?: number } {
    return c.kind === 'number' ? { min: c.min, max: c.max, step: c.step } : {};
  }
  protected set(key: string, value: PlaygroundValue): void {
    this.state.update((s) => ({ ...s, [key]: value }));
  }
  protected setNumber(key: string, raw: string): void {
    const n = Number(raw);
    if (Number.isFinite(n)) this.set(key, n);
  }
  protected reset(): void {
    this.state.set({ ...this.spec().defaults });
    this.events.set([]);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { pg: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }
  protected share(): void {
    const pg = encodeState(this.spec(), this.state());
    void this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: { tab: 'playground', pg: pg === 'e30' ? null : pg },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      })
      .then(() => {
        void navigator.clipboard?.writeText(location.href).then(() => {
          this.copied.set(true);
          setTimeout(() => this.copied.set(false), 2000);
        });
      });
  }

  private readonly log = (name: string, payload: unknown): void => {
    const now = new Date();
    const at = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    let text: string;
    try {
      text = payload === undefined ? '' : JSON.stringify(payload, (_k, v) => (v instanceof Date ? v.toISOString() : v));
    } catch {
      text = String(payload);
    }
    if (text && text.length > 300) text = text.slice(0, 299) + '…';
    this.events.update((list) => [{ id: ++this.eventId, name, payload: text, at }, ...list].slice(0, 50));
  };
}
