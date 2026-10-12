import { Injectable, effect, inject } from '@angular/core';
import { BitmapCache } from '../core/bitmap-cache';
import { PdfFormField } from '../engine/pdf-engine.types';
import { PdfPageDataService } from './pdf-page-data.service';
import { PDF_BITMAP_CACHE, PdfViewerStore } from './pdf-viewer.store';

/**
 * AcroForm filling: the HTML controls laid over each widget, and the
 * two-way `formValues` binding with the engine.
 */
@Injectable()
export class PdfFormsService {
  private readonly store = inject(PdfViewerStore);
  private readonly pageData = inject(PdfPageDataService);
  private readonly bitmaps = inject<BitmapCache<ImageBitmap>>(PDF_BITMAP_CACHE);

  /**
   * Set while we push a user edit out through `formValues`, so the effect
   * watching `formValues` doesn't write that same value straight back.
   */
  private emittedByUs = false;

  constructor() {
    // Push consumer-set values into the engine. Runs once on mount with `{}`
    // (a no-op until a document is open).
    effect(() => {
      const values = this.store.formValues();
      if (this.emittedByUs) {
        this.emittedByUs = false;
        return;
      }
      void this.applyToEngine(values);
    });
  }

  /**
   * Write `values` into the open document's fields, matched by name across
   * pages. Unknown names and non-settable fields (buttons, signatures) are
   * skipped; a radio group's value selects the option with that export value.
   */
  async applyToEngine(values: Record<string, unknown>): Promise<void> {
    const session = this.store.session();
    if (!session || this.store.pages.length === 0) return;
    const pending = new Map(Object.entries(values).map(([name, val]) => [name, val == null ? '' : String(val)]));
    if (pending.size === 0) return;
    try {
      for (const page of this.store.pages) {
        if (pending.size === 0) break;
        const fields = await this.pageData.fields(page.pageNumber);
        let changed = false;
        for (const field of fields) {
          const value = pending.get(field.name);
          if (value === undefined) continue;
          if (field.type === 'radio') {
            if (field.exportValue !== value) continue; // another option of the group
            changed =
              (await session.engine.setFieldValue(session.doc, page.pageNumber - 1, field.annotIndex, field.name, 'true')) || changed;
          } else {
            changed =
              (await session.engine.setFieldValue(session.doc, page.pageNumber - 1, field.annotIndex, field.name, value)) || changed;
          }
          pending.delete(field.name);
        }
        if (changed) {
          this.store.markDocumentEdited();
          this.pageData.invalidateFields(page.pageNumber);
          this.bitmaps.invalidatePage(page.pageNumber);
        }
      }
    } catch (err) {
      this.store.reportOperationError({ code: 'render_failed', message: 'Failed to apply form values.', recoverable: true, cause: err });
    }
  }

  /**
   * The HTML control for one widget. Text, checkbox, radio, combo and list
   * write back to the engine on change and emit through `formValues`. Returns
   * `null` for widgets we don't render (push buttons, signatures).
   */
  buildWidget(field: PdfFormField, pageIdx: number): HTMLElement | null {
    // Bound to the document open now; a widget outliving a document swap must
    // never write into the next one.
    const session = this.store.session();
    if (!session) return null;
    const ariaLabel = field.alternateName || field.name || 'form field';
    // `value` is what `formValues` records; `engineValue` is what the widget is
    // set to. They differ for radios: the group records the chosen option's
    // export value, while the clicked widget is switched on.
    const sync = (value: string, engineValue = value) => {
      this.emittedByUs = true;
      this.store.formValues.update((prev) => ({ ...prev, [field.name]: value }));
      this.store.markDocumentEdited();
      void session.engine.setFieldValue(session.doc, pageIdx, field.annotIndex, field.name, engineValue).catch((err: unknown) => {
        this.store.reportOperationError({ code: 'render_failed', message: 'Failed to update form field.', recoverable: true, cause: err });
      });
      // The stored value and the baked raster appearance are now stale.
      this.pageData.invalidateFields(pageIdx + 1);
      this.bitmaps.invalidatePage(pageIdx + 1);
    };

    switch (field.type) {
      case 'text': {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'hk-pdf-form-widget';
        input.value = field.value;
        input.disabled = field.readOnly;
        input.setAttribute('aria-label', ariaLabel);
        // 'change' (on blur): one round-trip per edit, not per keystroke.
        input.addEventListener('change', () => sync(input.value));
        return input;
      }
      case 'checkbox': {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'hk-pdf-form-widget hk-pdf-form-check';
        input.checked = field.checked;
        input.disabled = field.readOnly;
        input.setAttribute('aria-label', ariaLabel);
        input.addEventListener('change', () => sync(input.checked ? 'true' : 'false'));
        return input;
      }
      case 'radio': {
        const input = document.createElement('input');
        input.type = 'radio';
        input.className = 'hk-pdf-form-widget hk-pdf-form-check';
        input.name = field.name;
        input.checked = field.checked;
        input.disabled = field.readOnly;
        input.setAttribute('aria-label', ariaLabel);
        input.addEventListener('change', () => sync(field.exportValue || 'true', 'true'));
        return input;
      }
      case 'combo':
      case 'list': {
        const select = document.createElement('select');
        select.className = 'hk-pdf-form-widget';
        select.disabled = field.readOnly;
        select.setAttribute('aria-label', ariaLabel);
        for (const opt of field.options) {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          if (opt === field.value) o.selected = true;
          select.appendChild(o);
        }
        select.addEventListener('change', () => sync(select.value));
        return select;
      }
      default:
        return null; // button / signature
    }
  }
}
