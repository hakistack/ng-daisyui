import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LucideTrash2, LucideX } from '@lucide/angular';
import { AfFormat } from '../core/forms/af';
import { DesignField } from '../core/forms/form-design';
import { ResolvedPdfViewerLabels } from '../pdf-viewer.labels';
import { PdfFormDesignerService } from '../services/pdf-form-designer.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';

type FormatKind = 'none' | 'number' | 'percent' | 'date' | 'zip' | 'phone' | 'ssn';

const FORMATS: readonly { value: FormatKind; label: keyof ResolvedPdfViewerLabels }[] = [
  { value: 'none', label: 'formatNone' },
  { value: 'number', label: 'formatNumber' },
  { value: 'percent', label: 'formatPercent' },
  { value: 'date', label: 'formatDate' },
  { value: 'zip', label: 'formatZip' },
  { value: 'phone', label: 'formatPhone' },
  { value: 'ssn', label: 'formatSsn' },
];

/** The selected field's properties in the form designer: general, text, format, options and appearance. */
@Component({
  selector: 'hk-pdf-form-field-panel',
  imports: [LucideX, LucideTrash2],
  templateUrl: './pdf-form-field-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfFormFieldPanelComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly designer = inject(PdfFormDesignerService);
  protected readonly formats = FORMATS;
  protected readonly nameError = signal<'empty' | 'taken' | null>(null);

  protected readonly field = this.designer.selectedField;
  protected readonly widget = computed(() => {
    const f = this.field();
    const s = this.designer.selection();
    return f && s ? (f.widgets[s.widget] ?? null) : null;
  });
  protected readonly formatKind = computed<FormatKind>(() => {
    const f = this.field()?.format;
    if (!f) return 'none';
    if (f.kind === 'special') return (['zip', 'zip', 'phone', 'ssn'] as const)[f.psf] ?? 'zip';
    return f.kind === 'number' || f.kind === 'percent' || f.kind === 'date' ? f.kind : 'none';
  });
  protected readonly optionsText = computed(() =>
    (this.field()?.options ?? []).map((o) => (o.value === o.label ? o.value : `${o.value}|${o.label}`)).join('\n'),
  );

  protected async rename(value: string): Promise<void> {
    const f = this.field();
    if (f) this.nameError.set(await this.designer.rename(f.name, value));
  }

  protected set(patch: Partial<DesignField>, mergeKey?: string): void {
    const f = this.field();
    if (f) void this.designer.updateField(f.name, patch, mergeKey);
  }

  protected setStyle(patch: Partial<DesignField['style']>, mergeKey?: string): void {
    const f = this.field();
    if (f)
      this.set(
        { style: { ...f.style, ...patch }, widgets: f.widgets.map((w) => ({ ...w, appearance: { ...w.appearance, ...patch } })) },
        mergeKey,
      );
  }

  protected setFormat(kind: FormatKind): void {
    const formats: Record<FormatKind, AfFormat | undefined> = {
      none: undefined,
      number: { kind: 'number', decimals: 2, sepStyle: 0, negStyle: 0, currency: '', prepend: true },
      percent: { kind: 'percent', decimals: 2, sepStyle: 0 },
      date: { kind: 'date', format: 'mm/dd/yyyy' },
      zip: { kind: 'special', psf: 0 },
      phone: { kind: 'special', psf: 2 },
      ssn: { kind: 'special', psf: 3 },
    };
    this.set({ format: formats[kind] });
  }

  protected setDateFormat(format: string): void {
    if (format.trim()) this.set({ format: { kind: 'date', format: format.trim() } });
  }

  protected setDecimals(value: string): void {
    const f = this.field()?.format;
    const decimals = Math.max(0, Math.min(10, Number(value) || 0));
    if (f?.kind === 'number' || f?.kind === 'percent') this.set({ format: { ...f, decimals } });
  }

  /** Options, one per line: `value|label` (or just the value). */
  protected setOptions(text: string): void {
    const options = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [value, label] = l.split('|');
        return { value: value.trim(), label: (label ?? value).trim() };
      });
    this.set({ options });
  }

  protected exportValueOf(state: string): string {
    const f = this.field();
    return (f && Object.hasOwn(f.exportValues, state) ? f.exportValues[state] : null) ?? state;
  }

  protected setExportValue(value: string): void {
    const f = this.field();
    const w = this.widget();
    if (f && w?.onState && value.trim()) this.set({ exportValues: { ...f.exportValues, [w.onState]: value.trim() } });
  }

  protected setWidgetColor(key: 'borderColor' | 'background', value: string | undefined): void {
    const f = this.field();
    const s = this.designer.selection();
    if (f && s) void this.designer.updateWidget(f.name, s.widget, { [key]: value }, key);
  }

  protected remove(): void {
    const f = this.field();
    const s = this.designer.selection();
    if (f && s) void this.designer.remove(f.name, s.widget);
  }

  protected num(ev: Event): number {
    return Number((ev.target as HTMLInputElement).value);
  }

  protected str(ev: Event): string {
    return (ev.target as HTMLInputElement).value;
  }

  protected checked(ev: Event): boolean {
    return (ev.target as HTMLInputElement).checked;
  }
}
