import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

/** Width of a hidden side pane: just the strip that holds its reopen button. */
const HIDDEN_STRIP = 14;

let nextId = 0;

/** Text the layout shows or announces. */
export interface MesaLayoutLabels {
  readonly rail: string;
  readonly inspector: string;
  readonly showRail: string;
  readonly hideRail: string;
  readonly showInspector: string;
  readonly hideInspector: string;
  readonly skipToRail: string;
}

interface StoredLayout {
  railHidden?: boolean;
  inspectorHidden?: boolean;
}

/**
 * The Mesa work block (docs/design/mesa-style-guide.md): one rounded,
 * elevated surface with a rail · main column · inspector inside, meeting on
 * hairlines. Projects `[hkMesaRail]`, the main column (default slot) and
 * `[hkMesaInspector]`.
 *
 * - Side panes hide behind a round button on their divider (the pane stays
 *   as a thin, inert strip); the choice is remembered per browser under
 *   `storageKey`.
 * - Narrower than `foldInspectorBelow` (the component's own width, not the
 *   viewport's: it may live in a column), the inspector folds into a
 *   disclosure under the main column; narrower than `foldRailBelow`, the rail
 *   folds into one above it. Nothing is hidden, only reflowed.
 *
 * The DOM stays the same in every mode (only grid placement changes), so the
 * projected panes keep their state across breakpoints.
 */
@Component({
  selector: 'hk-mesa-layout',
  imports: [NgTemplateOutlet, LucideChevronLeft, LucideChevronRight],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block min-h-0' },
  template: `
    @if (rail()) {
      <a
        [href]="'#' + uid + '-rail'"
        class="bg-neutral text-neutral-content rounded-field sr-only z-50 px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
        (click)="focusRail($event)"
        >{{ labels().skipToRail }}</a
      >
    }
    <div class="bg-base-100 border-base-300 rounded-box relative flex h-full min-h-0 flex-col overflow-hidden border shadow-sm">
      <div
        class="relative grid min-h-0 flex-1"
        [class.overflow-y-auto]="mode() === 'compact'"
        [style.grid-template-columns]="columns()"
        [style.grid-template-rows]="rows()"
      >
        @if (rail()) {
          <section
            [id]="uid + '-rail'"
            tabindex="-1"
            class="border-base-300 flex min-h-0 min-w-0 flex-col overflow-hidden outline-none"
            [class.border-r]="mode() !== 'compact'"
            [class.border-b]="mode() === 'compact'"
            [class.bg-base-200]="railHidden() && mode() !== 'compact'"
            [class.*:invisible]="railHidden() && mode() !== 'compact'"
            [attr.inert]="railHidden() && mode() !== 'compact' ? '' : null"
            [attr.aria-label]="labels().rail"
            style="grid-column: 1"
            [style.grid-row]="mode() === 'narrow' ? '1 / span 2' : '1'"
          >
            @if (mode() === 'compact') {
              <ng-container [ngTemplateOutlet]="disclosure" [ngTemplateOutletContext]="{ pane: 'rail' }" />
            }
            <div
              [id]="uid + '-rail-body'"
              class="flex min-h-0 flex-1 flex-col"
              [class.h-80]="mode() === 'compact'"
              [hidden]="mode() === 'compact' && !railOpen()"
            >
              <ng-content select="[hkMesaRail]" />
            </div>
          </section>
        }

        <div
          class="flex min-h-0 min-w-0 flex-col"
          [class.min-h-[36rem]]="mode() === 'compact'"
          [style.grid-column]="mode() === 'compact' || !rail() ? '1' : '2'"
          [style.grid-row]="mode() === 'compact' && rail() ? '2' : '1'"
        >
          <ng-content />
        </div>

        @if (inspector()) {
          <aside
            [id]="uid + '-inspector'"
            class="border-base-300 flex min-h-0 min-w-0 flex-col overflow-hidden"
            [class.border-l]="mode() === 'wide'"
            [class.border-t]="mode() !== 'wide'"
            [class.bg-base-200]="inspectorHidden() && mode() === 'wide'"
            [class.*:invisible]="inspectorHidden() && mode() === 'wide'"
            [attr.inert]="inspectorHidden() && mode() === 'wide' ? '' : null"
            [attr.aria-label]="labels().inspector"
            [style.grid-column]="inspectorColumn()"
            [style.grid-row]="inspectorRow()"
          >
            @if (mode() !== 'wide') {
              <ng-container [ngTemplateOutlet]="disclosure" [ngTemplateOutletContext]="{ pane: 'inspector' }" />
            }
            <div
              [id]="uid + '-inspector-body'"
              class="min-h-0 flex-1 overflow-y-auto"
              [class.max-h-96]="mode() !== 'wide'"
              [hidden]="mode() !== 'wide' && !inspectorOpen()"
            >
              <ng-content select="[hkMesaInspector]" />
            </div>
          </aside>
        }

        @if (rail() && mode() !== 'compact') {
          <button
            type="button"
            class="btn btn-circle btn-xs absolute top-1/2 z-[3] -translate-y-1/2 shadow-sm"
            [style.left.px]="railWidthNow() - 12"
            [attr.aria-label]="railHidden() ? labels().showRail : labels().hideRail"
            [title]="railHidden() ? labels().showRail : labels().hideRail"
            [attr.aria-expanded]="!railHidden()"
            [attr.aria-controls]="uid + '-rail'"
            (click)="toggleRail()"
          >
            @if (railHidden()) {
              <svg lucideChevronRight [size]="14" aria-hidden="true"></svg>
            } @else {
              <svg lucideChevronLeft [size]="14" aria-hidden="true"></svg>
            }
          </button>
        }
        @if (inspector() && mode() === 'wide') {
          <button
            type="button"
            class="btn btn-circle btn-xs absolute top-1/2 z-[3] -translate-y-1/2 shadow-sm"
            [style.right.px]="inspectorWidthNow() - 12"
            [attr.aria-label]="inspectorHidden() ? labels().showInspector : labels().hideInspector"
            [title]="inspectorHidden() ? labels().showInspector : labels().hideInspector"
            [attr.aria-expanded]="!inspectorHidden()"
            [attr.aria-controls]="uid + '-inspector'"
            (click)="toggleInspector()"
          >
            @if (inspectorHidden()) {
              <svg lucideChevronLeft [size]="14" aria-hidden="true"></svg>
            } @else {
              <svg lucideChevronRight [size]="14" aria-hidden="true"></svg>
            }
          </button>
        }
      </div>
    </div>

    <!-- A folded pane's header: the disclosure that shows or hides its body. -->
    <ng-template #disclosure let-pane="pane">
      <button
        type="button"
        class="border-base-300 hover:bg-base-200 flex w-full shrink-0 items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold"
        [class.border-b]="pane === 'rail' ? railOpen() : inspectorOpen()"
        [attr.aria-expanded]="pane === 'rail' ? railOpen() : inspectorOpen()"
        [attr.aria-controls]="uid + '-' + pane + '-body'"
        (click)="pane === 'rail' ? railOpen.set(!railOpen()) : inspectorOpen.set(!inspectorOpen())"
      >
        <svg
          lucideChevronRight
          [size]="14"
          class="transition-transform motion-reduce:transition-none"
          [class.rotate-90]="pane === 'rail' ? railOpen() : inspectorOpen()"
          aria-hidden="true"
        ></svg>
        {{ pane === 'rail' ? labels().rail : labels().inspector }}
      </button>
    </ng-template>
  `,
})
export class MesaLayoutComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly uid = `hk-mesa-${++nextId}`;

  readonly labels = input.required<MesaLayoutLabels>();
  /** Whether there is a rail (left pane). */
  readonly rail = input(true);
  /** Whether there is an inspector (right pane). */
  readonly inspector = input(true);
  readonly railWidth = input(288);
  readonly inspectorWidth = input(384);
  /** Below this component width the inspector folds under the main column. */
  readonly foldInspectorBelow = input(1100);
  /** Below this component width the rail folds above the main column too. */
  readonly foldRailBelow = input(720);
  /** `localStorage` key for the hidden panes; `null` doesn't remember them. */
  readonly storageKey = input<string | null>('hk-mesa-layout');

  /** The component's width (measured; wide until measured, e.g. on the server). */
  private readonly width = signal(Number.POSITIVE_INFINITY);

  readonly mode = computed<'wide' | 'narrow' | 'compact'>(() => {
    const w = this.width();
    if (w < this.foldRailBelow()) return 'compact';
    return w < this.foldInspectorBelow() ? 'narrow' : 'wide';
  });

  /** Hidden by the divider button (wide and narrow modes). */
  readonly railHidden = signal(false);
  readonly inspectorHidden = signal(false);
  /** Expanded disclosure (folded modes). */
  readonly railOpen = signal(false);
  readonly inspectorOpen = signal(false);

  /** Whether the rail's content is on screen. */
  readonly railVisible = computed(() => this.rail() && (this.mode() === 'compact' ? this.railOpen() : !this.railHidden()));
  /** Whether the inspector's content is on screen. */
  readonly inspectorVisible = computed(() => this.inspector() && (this.mode() === 'wide' ? !this.inspectorHidden() : this.inspectorOpen()));

  protected readonly railWidthNow = computed(() => (this.railHidden() ? HIDDEN_STRIP : this.railWidth()));
  protected readonly inspectorWidthNow = computed(() => (this.inspectorHidden() ? HIDDEN_STRIP : this.inspectorWidth()));

  protected readonly columns = computed(() => {
    const mode = this.mode();
    const rail = this.rail() && mode !== 'compact' ? `${this.railWidthNow()}px ` : '';
    const inspector = this.inspector() && mode === 'wide' ? ` ${this.inspectorWidthNow()}px` : '';
    return `${rail}minmax(0,1fr)${inspector}`;
  });

  protected readonly rows = computed(() => {
    const mode = this.mode();
    if (mode === 'wide') return 'minmax(0,1fr)';
    if (mode === 'narrow') return this.inspector() ? 'minmax(0,1fr) auto' : 'minmax(0,1fr)';
    return [this.rail() ? 'auto' : '', 'minmax(0,1fr)', this.inspector() ? 'auto' : ''].filter(Boolean).join(' ');
  });

  protected readonly inspectorColumn = computed(() => {
    const mode = this.mode();
    if (mode === 'wide') return this.rail() ? '3' : '2';
    return mode === 'narrow' && this.rail() ? '2' : '1';
  });

  protected readonly inspectorRow = computed(() => {
    const mode = this.mode();
    if (mode === 'wide') return '1';
    if (mode === 'narrow') return '2';
    return this.rail() ? '3' : '2';
  });

  constructor() {
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    if (browser && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(([entry]) => this.width.set(entry.contentRect.width));
      ro.observe(this.host);
      inject(DestroyRef).onDestroy(() => ro.disconnect());
    }

    // Restore the hidden panes for this key, then remember changes.
    let restoredFor: string | null | undefined;
    effect(() => {
      const key = this.storageKey();
      const railHidden = this.railHidden();
      const inspectorHidden = this.inspectorHidden();
      untracked(() => {
        if (restoredFor !== key) {
          restoredFor = key;
          const stored = browser && key ? readStored(key) : {};
          this.railHidden.set(stored.railHidden === true);
          this.inspectorHidden.set(stored.inspectorHidden === true);
          return;
        }
        if (browser && key) writeStored(key, { railHidden, inspectorHidden });
      });
    });
  }

  toggleRail(): void {
    if (this.mode() === 'compact') this.railOpen.update((open) => !open);
    else this.railHidden.update((hidden) => !hidden);
  }

  toggleInspector(): void {
    if (this.mode() === 'wide') this.inspectorHidden.update((hidden) => !hidden);
    else this.inspectorOpen.update((open) => !open);
  }

  /** Bring the rail into view (unhide or expand it). */
  showRail(): void {
    this.railHidden.set(false);
    this.railOpen.set(true);
  }

  /** Bring the inspector into view (unhide or expand it). */
  showInspector(): void {
    this.inspectorHidden.set(false);
    this.inspectorOpen.set(true);
  }

  /** Skip link: move focus into the rail (and show it). */
  protected focusRail(event: Event): void {
    event.preventDefault();
    this.showRail();
    queueMicrotask(() => this.host.querySelector<HTMLElement>(`#${this.uid}-rail`)?.focus());
  }
}

function readStored(key: string): StoredLayout {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return {};
    const { railHidden, inspectorHidden } = parsed as Record<string, unknown>;
    return { railHidden: railHidden === true, inspectorHidden: inspectorHidden === true };
  } catch {
    return {};
  }
}

function writeStored(key: string, layout: StoredLayout): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(layout));
  } catch {
    /* storage unavailable (private mode, quota): the layout just isn't remembered */
  }
}
