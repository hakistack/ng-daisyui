import { InjectionToken } from '@angular/core';

/**
 * Class names of the chrome pieces both PDF hosts share (annotation and form
 * design bars, find bar, properties panels). `hk-pdf-viewer` keeps its classic
 * look; `hk-pdf-workspace` provides the Mesa set (docs/design/mesa-style-guide.md):
 * related buttons in joins, `btn-sm`, pressed = `btn-primary`, docked panels.
 */
export class PdfChrome {
  constructor(readonly mesa: boolean) {}

  /** A secondary bar under the toolbar (annotation tools, form design). */
  get bar(): string {
    return this.mesa
      ? 'flex flex-wrap items-center gap-2 px-3.5 py-2 border-b border-base-300 bg-base-100 text-sm'
      : 'flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-base-300 bg-base-100 text-sm';
  }

  /** The find bar. */
  get findBar(): string {
    return this.mesa
      ? 'flex flex-wrap items-center gap-2 px-3.5 py-2 border-b border-base-300 bg-base-100 text-sm'
      : 'flex items-center gap-1.5 px-3 py-2 border-b border-base-300 bg-base-200/40 text-sm';
  }

  /** Related buttons in a bar. */
  get group(): string {
    return this.mesa ? 'join' : 'flex items-center gap-0.5';
  }

  /** Rule between groups (Mesa groups are joins, so none). */
  get divider(): string {
    return this.mesa ? 'hidden' : 'w-px h-5 bg-base-300 mx-1 shrink-0';
  }

  /** An icon-only button in a bar; `pressed` for a toggle that is on. */
  button(pressed = false): string {
    if (this.mesa) return pressed ? 'btn btn-sm btn-square btn-primary' : 'btn btn-sm btn-square';
    return pressed ? 'btn btn-ghost btn-xs btn-square btn-active' : 'btn btn-ghost btn-xs btn-square';
  }

  /** An icon-only button inside a {@link group}. */
  groupButton(pressed = false): string {
    return this.mesa ? `${this.button(pressed)} join-item` : this.button(pressed);
  }

  /** The bar's main action (Finish design). */
  get primaryButton(): string {
    return this.mesa ? 'btn btn-primary btn-sm' : 'btn btn-primary btn-xs';
  }

  /** A small icon button in a panel header. */
  get panelButton(): string {
    return this.mesa ? 'btn btn-xs btn-square' : 'btn btn-ghost btn-xs btn-square';
  }

  /** A page in the page stack; Mesa rings the current one in `neutral`. */
  page(current: boolean): string {
    if (!this.mesa) return 'hk-pdf-page bg-base-100 shadow-md';
    return current ? 'hk-pdf-page bg-white shadow-sm ring-2 ring-neutral' : 'hk-pdf-page bg-white shadow-sm ring-1 ring-base-content/45';
  }

  /** A properties panel: floating over the pages, or a section of the workspace inspector. `width` is the floating width. */
  panel(width: 'w-64' | 'w-72'): string {
    return this.mesa
      ? 'block border-b border-base-300 text-sm'
      : `absolute right-3 top-3 z-30 ${width} max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-box border border-base-300 bg-base-100 shadow-lg text-sm`;
  }

  /** A properties panel's header row. */
  get panelHeader(): string {
    return this.mesa ? 'flex items-center gap-1 px-4 pt-3.5 pb-1' : 'flex items-center gap-1 border-b border-base-300 px-3 py-2';
  }

  /** A properties panel's title. */
  get panelTitle(): string {
    return this.mesa ? 'grow truncate text-sm font-semibold' : 'grow truncate font-medium';
  }

  /** A properties panel's body. */
  get panelBody(): string {
    return this.mesa ? 'flex flex-col gap-3 px-4 pt-2 pb-4' : 'flex flex-col gap-3 px-3 py-3';
  }
}

export const CLASSIC_PDF_CHROME = new PdfChrome(false);
export const MESA_PDF_CHROME = new PdfChrome(true);

/** The chrome classes in use; `hk-pdf-workspace` provides {@link MESA_PDF_CHROME}. */
export const PDF_CHROME = new InjectionToken<PdfChrome>('PDF_CHROME', { providedIn: 'root', factory: () => CLASSIC_PDF_CHROME });
