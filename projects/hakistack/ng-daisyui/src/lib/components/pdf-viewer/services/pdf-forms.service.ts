import { Injectable, effect, inject, signal } from '@angular/core';
import { cssFontFamily } from '../core/annotations/shapes';
import { acceptsKeystroke, calculate, commitValue, formatValue, validateRange } from '../core/forms/af';
import { displayText, innerBox, widgetFontSize } from '../core/forms/form-appearance';
import { FormField, FormModel, FormValue, FormWidget, emptyValue, sameValue } from '../core/forms/form-model';
import { readForm } from '../core/forms/form-reader';
import { PdfDoc } from '../core/pdf-writer/document';
import { PDF_PERMISSION } from '../core/pdf-writer/security';
import { PdfParser } from '../core/pdf-writer/parser';
import { PdfDict, PdfName, PdfString, PdfValue } from '../core/pdf-writer/objects';
import { PdfRasterHiddenService } from './pdf-raster-hidden.service';
import { PdfViewerStore } from './pdf-viewer.store';

/** Field kinds the overlay draws and edits (buttons and signatures stay in the raster). */
const FILLABLE = new Set(['text', 'checkbox', 'radio', 'combo', 'list']);

let nextInstance = 0;

/**
 * AcroForm filling. The form is read with hk-pdf-writer when a document
 * loads; values live here and are written into the file on save (`/V`,
 * `/AS`, regenerated appearances). The fillable widgets are left out of the
 * rasters and drawn as HTML controls instead (formatted when not focused,
 * filtered while typing, validated on commit, calculated fields kept up to
 * date). Values are also exposed through the component's `formValues`
 * binding: text and choice fields as strings (multi-select lists as arrays),
 * checkboxes as booleans, radio groups as the chosen option's export value.
 */
@Injectable()
export class PdfFormsService {
  private readonly store = inject(PdfViewerStore);
  private readonly hidden = inject(PdfRasterHiddenService);

  readonly model = signal<FormModel | null>(null);
  readonly values = signal<ReadonlyMap<string, FormValue>>(new Map());

  private baseline = new Map<string, FormValue>();
  private byName = new Map<string, FormField>();
  /** Live controls per field (pruned when their page re-renders). */
  private readonly controls = new Map<string, Set<{ el: HTMLElement; widget: FormWidget }>>();
  private loadSeq = 0;
  private readonly uid = `hk-pdf-form-${++nextInstance}`;
  /** Set while we push our own edit out through `formValues`, so the effect doesn't apply it back. */
  private emittedByUs = false;

  constructor() {
    // Consumer-set values (the formValues binding) flow into the form.
    effect(() => {
      const values = this.store.formValues();
      if (this.emittedByUs) {
        this.emittedByUs = false;
        return;
      }
      if (this.model()) this.applyPublic(values, false);
    });
  }

  // ── Loading ─────────────────────────────────────────────────────────────

  reset(): void {
    this.loadSeq++;
    this.model.set(null);
    this.values.set(new Map());
    this.baseline = new Map();
    this.byName = new Map();
    this.controls.clear();
    this.store.setDirty('forms', false);
  }

  /** Read the form of a parsed document, hide its fillable widgets in the rasters, apply the bound values. */
  async load(doc: PdfDoc | null): Promise<void> {
    this.reset();
    const seq = this.loadSeq;
    if (!doc) return;
    try {
      const { model } = await readForm(doc);
      if (seq !== this.loadSeq || !model.fields.length) return;
      // A document that permits neither filling nor annotating shows its fields read-only.
      const canFill = !doc.security || doc.security.allows(PDF_PERMISSION.fillForms) || doc.security.allows(PDF_PERMISSION.annotate);
      this.setModel(canFill ? model : { ...model, fields: model.fields.map((f) => ({ ...f, readOnly: true })) });
      this.applyPublic(this.store.formValues(), false);
    } catch {
      /* no usable form: widgets stay in the raster */
    }
  }

  private setModel(model: FormModel): void {
    this.model.set(model);
    this.byName = new Map(model.fields.map((f) => [f.name, f]));
    this.baseline = new Map(model.fields.map((f) => [f.name, f.value]));
    this.values.set(new Map(this.baseline));
    const entries: number[] = [];
    for (const f of model.fields) if (FILLABLE.has(f.kind)) for (const w of f.widgets) entries.push(w.page, w.index);
    void this.hidden.set('forms', entries);
  }

  // ── Values ──────────────────────────────────────────────────────────────

  field(name: string): FormField | undefined {
    return this.byName.get(name);
  }

  value(name: string): FormValue {
    const f = this.byName.get(name);
    return this.values().get(name) ?? (f ? emptyValue(f.kind) : '');
  }

  /**
   * Set field values (internal representation), recalculate dependent
   * fields, refresh their controls, update dirty state and, unless `silent`,
   * emit through `formValues`.
   */
  setValues(changes: ReadonlyMap<string, FormValue>, silent = false): void {
    const next = new Map(this.values());
    const touched = new Set<string>();
    for (const [name, v] of changes) {
      if (!this.byName.has(name) || sameValue(next.get(name) ?? '', v)) continue;
      next.set(name, v);
      touched.add(name);
    }
    if (!touched.size) return;
    for (const name of this.recalculate(next)) touched.add(name);
    this.values.set(next);
    this.store.setDirty(
      'forms',
      [...next].some(([n, v]) => !sameValue(v, this.baseline.get(n) ?? '')),
    );
    for (const name of touched) this.refreshControls(name);
    if (!silent) {
      const out: Record<string, unknown> = {};
      for (const name of touched) out[name] = this.publicValue(this.byName.get(name)!, next.get(name)!);
      this.emittedByUs = true;
      this.store.formValues.update((prev) => ({ ...prev, ...out }));
    }
  }

  /** Run every calculated field in order (`/CO` first); returns the names that changed. */
  private recalculate(values: Map<string, FormValue>): string[] {
    const model = this.model();
    if (!model) return [];
    const order = [...model.calculationOrder];
    for (const f of model.fields) if (f.calculate && !order.includes(f.name)) order.push(f.name);
    const changed: string[] = [];
    for (const name of order) {
      const f = this.byName.get(name);
      if (!f?.calculate) continue;
      const result = calculate(f.calculate, (n) => {
        const v = values.get(n);
        return typeof v === 'string' ? v : '';
      });
      if (!sameValue(values.get(name) ?? '', result)) {
        values.set(name, result);
        changed.push(name);
      }
    }
    return changed;
  }

  /** Reset every field to its default value (`resetForm`). */
  resetForm(): void {
    const model = this.model();
    if (model) this.setValues(new Map(model.fields.map((f) => [f.name, f.defaultValue])));
  }

  /** Values that differ from the file, for a save. */
  changedValues(): ReadonlyMap<string, FormValue> {
    const out = new Map<string, FormValue>();
    for (const [name, v] of this.values()) if (!sameValue(v, this.baseline.get(name) ?? '')) out.set(name, v);
    return out;
  }

  /** The value as `formValues` exposes it. */
  publicValue(field: FormField, value: FormValue): unknown {
    switch (field.kind) {
      case 'checkbox':
        return value !== 'Off';
      case 'radio':
        return value === 'Off' ? '' : (field.exportValues[value as string] ?? value);
      case 'list':
        return field.multiSelect ? [...(value as readonly string[])] : ((value as readonly string[])[0] ?? '');
      default:
        return value;
    }
  }

  /** A `formValues` value → the internal representation (null when it doesn't apply). */
  fromPublic(field: FormField, v: unknown): FormValue | null {
    switch (field.kind) {
      case 'checkbox': {
        const on = field.widgets[0]?.onState ?? 'Yes';
        const truthy =
          v === true || v === 1 || ['true', 'on', 'yes', '1'].includes(String(v).toLowerCase()) || v === field.exportValues[on];
        return truthy ? on : 'Off';
      }
      case 'radio': {
        if (v === '' || v === null || v === false) return 'Off';
        const s = String(v);
        const state = Object.keys(field.exportValues).find((k) => field.exportValues[k] === s || k === s);
        return state ?? null;
      }
      case 'list':
        return Array.isArray(v) ? v.map(String) : v == null || v === '' ? [] : [String(v)];
      case 'text':
      case 'combo':
        return v == null ? '' : String(v);
      default:
        return null;
    }
  }

  /** Apply consumer values (name → public value); unknown names are ignored. */
  applyPublic(values: Record<string, unknown>, emit: boolean): void {
    const changes = new Map<string, FormValue>();
    for (const [name, v] of Object.entries(values)) {
      const f = this.byName.get(name);
      const internal = f ? this.fromPublic(f, v) : null;
      if (f && internal !== null) changes.set(name, internal);
    }
    this.setValues(changes, !emit);
  }

  // ── Data import / export ────────────────────────────────────────────────

  /** The field values as JSON (`name → value`), XFDF or FDF. */
  exportData(format: 'json' | 'xfdf' | 'fdf'): string {
    const fields = (this.model()?.fields ?? []).filter((f) => FILLABLE.has(f.kind) && !f.noExport);
    if (format === 'json') {
      return JSON.stringify(Object.fromEntries(fields.map((f) => [f.name, this.publicValue(f, this.value(f.name))])), null, 2);
    }
    const tree = buildTree(fields.map((f) => [f, this.value(f.name)] as const));
    if (format === 'xfdf') {
      const xml = (nodes: Tree, indent: string): string =>
        [...nodes]
          .map(([part, node]) => {
            const values =
              node.value === undefined
                ? ''
                : (Array.isArray(node.value) ? node.value : [node.value]).map((v) => `<value>${escXml(v)}</value>`).join('');
            const kids = node.kids.size ? `\n${xml(node.kids, indent + '  ')}\n${indent}` : '';
            return `${indent}<field name="${escXml(part)}">${values}${kids}</field>`;
          })
          .join('\n');
      return `<?xml version="1.0" encoding="UTF-8"?>\n<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">\n  <fields>\n${xml(tree, '    ')}\n  </fields>\n</xfdf>\n`;
    }
    const fdf = (nodes: Tree): string =>
      [...nodes]
        .map(([part, node]) => {
          const parts = [`/T ${pdfString(part)}`];
          if (node.value !== undefined) parts.push(`/V ${this.fdfValue(node.field!, node.value)}`);
          if (node.kids.size) parts.push(`/Kids [${fdf(node.kids)}]`);
          return `<< ${parts.join(' ')} >>`;
        })
        .join(' ');
    return `%FDF-1.2\n1 0 obj\n<< /FDF << /Fields [${fdf(tree)}] >> >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`;
  }

  private fdfValue(field: FormField, value: FormValue): string {
    if (field.kind === 'checkbox' || field.kind === 'radio') return `/${value as string}`;
    if (Array.isArray(value)) return `[${value.map(pdfString).join(' ')}]`;
    return pdfString(value as string);
  }

  /** Import field values from JSON, XFDF or FDF (detected). Returns how many fields were set. */
  importData(text: string): number {
    const trimmed = text.trimStart();
    let values = new Map<string, FormValue | unknown>();
    let internal = false;
    if (trimmed.startsWith('%FDF')) {
      values = parseFdf(text);
      internal = true;
    } else if (trimmed.startsWith('<')) {
      values = parseXfdfFields(text);
      internal = true;
    } else {
      values = new Map(Object.entries(JSON.parse(text) as Record<string, unknown>));
    }
    const changes = new Map<string, FormValue>();
    for (const [name, v] of values) {
      const f = this.byName.get(name);
      if (!f || !FILLABLE.has(f.kind)) continue;
      const value = internal ? normalizeImported(f, v as FormValue) : this.fromPublic(f, v);
      if (value !== null) changes.set(name, value);
    }
    this.setValues(changes);
    return changes.size;
  }

  // ── Page structure ──────────────────────────────────────────────────────

  onPageRemoved(index: number): void {
    this.shiftPages((p) => (p === index ? null : p > index ? p - 1 : p));
  }

  onPageInserted(index: number): void {
    this.shiftPages((p) => (p >= index ? p + 1 : p));
  }

  private shiftPages(map: (page: number) => number | null): void {
    const model = this.model();
    if (!model) return;
    const fields = model.fields
      .map((f) => ({ ...f, widgets: f.widgets.flatMap((w) => (map(w.page) === null ? [] : [{ ...w, page: map(w.page)! }])) }))
      .filter((f) => f.widgets.length);
    const tabOrder: number[][] = [];
    model.tabOrder.forEach((order, page) => {
      const to = map(page);
      if (to !== null) tabOrder[to] = [...order];
    });
    const values = this.values();
    this.model.set({ ...model, fields, tabOrder: Array.from({ length: Math.max(tabOrder.length, 0) }, (_, i) => tabOrder[i] ?? []) });
    this.byName = new Map(fields.map((f) => [f.name, f]));
    this.values.set(new Map([...values].filter(([n]) => this.byName.has(n))));
    const entries: number[] = [];
    for (const f of fields) if (FILLABLE.has(f.kind)) for (const w of f.widgets) entries.push(w.page, w.index);
    void this.hidden.set('forms', entries);
  }

  // ── Overlay controls ────────────────────────────────────────────────────

  /** The fillable widgets of a page (1-based), in tab order. */
  widgetsForPage(pageNumber: number): { field: FormField; widget: FormWidget }[] {
    const model = this.model();
    if (!model) return [];
    const page = pageNumber - 1;
    const out: { field: FormField; widget: FormWidget }[] = [];
    for (const field of model.fields) {
      if (!FILLABLE.has(field.kind)) continue;
      for (const widget of field.widgets) if (widget.page === page) out.push({ field, widget });
    }
    const order = model.tabOrder[page] ?? [];
    const rank = (i: number) => {
      const r = order.indexOf(i);
      return r < 0 ? Number.MAX_SAFE_INTEGER : r;
    };
    return out.sort((a, b) => rank(a.widget.index) - rank(b.widget.index));
  }

  /**
   * The HTML control for a widget at `scale` CSS px per point, styled from
   * the field's appearance (font, size, colour, alignment, border,
   * background). Text fields show the formatted value until focused.
   */
  buildControl(field: FormField, widget: FormWidget, scale: number): HTMLElement | null {
    const label = field.tooltip || field.name;
    let el: HTMLElement;
    switch (field.kind) {
      case 'text':
        el = this.textControl(field, widget, scale);
        break;
      case 'checkbox':
      case 'radio': {
        const input = document.createElement('input');
        input.type = field.kind;
        input.className = `hk-pdf-form-widget hk-pdf-form-check${field.kind === 'radio' || widget.caption === 'l' ? ' hk-pdf-form-radio' : ''}${widget.caption === '8' || widget.caption === 'u' ? ' hk-pdf-form-cross' : ''}`;
        if (field.kind === 'radio') input.name = `${this.uid}:${field.name}`;
        input.checked = this.value(field.name) === widget.onState;
        input.addEventListener('change', () => {
          if (field.kind === 'radio') this.setValues(new Map([[field.name, widget.onState!]]));
          else this.setValues(new Map([[field.name, input.checked ? widget.onState! : 'Off']]));
        });
        el = input;
        break;
      }
      case 'combo':
        el = field.editable ? this.editableCombo(field, widget, scale) : this.select(field, false);
        break;
      case 'list':
        el = this.select(field, field.multiSelect);
        break;
      default:
        return null;
    }
    el.setAttribute('aria-label', label);
    if (field.tooltip) el.title = field.tooltip;
    if (field.required) {
      el.setAttribute('aria-required', 'true');
      (el as HTMLInputElement).required = true;
    }
    if (field.readOnly) {
      el.setAttribute('aria-readonly', 'true');
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.readOnly = true;
      else (el as HTMLSelectElement).disabled = true;
      if (el instanceof HTMLInputElement && (field.kind === 'checkbox' || field.kind === 'radio')) el.disabled = true;
    }
    const s = el.style;
    const style = widget.appearance;
    s.color = style.color;
    s.fontFamily = cssFontFamily(style.font);
    if (style.font === 'Helvetica-Bold') s.fontWeight = '700';
    if (widget.background) s.backgroundColor = widget.background;
    if (widget.borderColor && widget.borderWidth > 0) s.border = `${Math.max(1, widget.borderWidth * scale)}px solid ${widget.borderColor}`;
    el.dataset['field'] = field.name;
    this.register(field.name, el, widget);
    return el;
  }

  private textControl(field: FormField, widget: FormWidget, scale: number): HTMLElement {
    const labels = this.store.labels();
    const el: HTMLInputElement | HTMLTextAreaElement = field.multiline
      ? document.createElement('textarea')
      : document.createElement('input');
    if (el instanceof HTMLInputElement) el.type = field.password ? 'password' : 'text';
    el.className = 'hk-pdf-form-widget';
    if (field.maxLength) el.maxLength = field.maxLength;
    const raw = () => (this.value(field.name) as string) ?? '';
    const size = widgetFontSize(field, widget, raw()) * scale;
    const s = el.style;
    s.fontSize = `${size}px`;
    s.textAlign = widget.appearance.align;
    const inner = innerBox(widget);
    s.padding = `0 ${(inner.x - widget.rect.x) * scale}px`;
    if (field.comb && field.maxLength) {
      // Monospaced glyphs spaced to the comb's cells.
      const cell = (inner.w / field.maxLength) * scale;
      const glyph = size * 0.6;
      s.fontFamily = cssFontFamily('Courier');
      s.letterSpacing = `${cell - glyph}px`;
      s.paddingLeft = `${(inner.x - widget.rect.x) * scale + (cell - glyph) / 2}px`;
      s.textAlign = 'left';
    }
    const show = (focused: boolean) => {
      const v = raw();
      el.value = focused || field.password ? v : displayText({ ...field, password: false }, v);
      const red = !focused && formatValue(field.format, v).red;
      el.style.color = red ? '#dc2626' : widget.appearance.color;
    };
    show(false);
    let accepted = el.value;
    el.addEventListener('focus', () => {
      show(true);
      accepted = el.value;
    });
    el.addEventListener('input', () => {
      if (acceptsKeystroke(field.format, el.value)) accepted = el.value;
      else el.value = accepted; // the keystroke action rejects it
      el.setCustomValidity('');
    });
    el.addEventListener('change', () => {
      const committed = commitValue(field.format, el.value);
      if (committed === null) {
        this.invalid(el, labels.formInvalidFormat);
        return;
      }
      if (!validateRange(field.validate, committed)) {
        const { min, max } = field.validate ?? {};
        this.invalid(el, labels.formOutOfRange.replace('{min}', String(min ?? '−∞')).replace('{max}', String(max ?? '∞')));
        return;
      }
      el.setCustomValidity('');
      el.removeAttribute('aria-invalid');
      this.setValues(new Map([[field.name, committed]]));
    });
    el.addEventListener('blur', () => {
      if (el.getAttribute('aria-invalid') !== 'true') show(false);
    });
    return el;
  }

  private invalid(el: HTMLInputElement | HTMLTextAreaElement, message: string): void {
    el.setAttribute('aria-invalid', 'true');
    el.setCustomValidity(message);
    el.reportValidity?.();
  }

  private select(field: FormField, multiple: boolean): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'hk-pdf-form-widget';
    if (field.kind === 'list') {
      select.multiple = multiple;
      select.size = Math.max(2, Math.min(field.options.length, 8));
    }
    const current = this.value(field.name);
    const selected = new Set(Array.isArray(current) ? current : [current]);
    if (field.kind === 'combo' && !field.options.some((o) => selected.has(o.value))) {
      const blank = document.createElement('option');
      blank.value = '';
      blank.textContent = '';
      select.appendChild(blank);
    }
    for (const o of field.options) {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      opt.selected = selected.has(o.value);
      select.appendChild(opt);
    }
    select.addEventListener('change', () => {
      const chosen = Array.from(select.selectedOptions, (o) => o.value);
      this.setValues(new Map([[field.name, field.kind === 'list' ? chosen : (chosen[0] ?? '')]]));
    });
    return select;
  }

  /** An editable combo box: a text input with the options as suggestions. */
  private editableCombo(field: FormField, widget: FormWidget, scale: number): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'hk-pdf-form-combo';
    const input = this.textControl({ ...field, kind: 'text', multiline: false }, widget, scale) as HTMLInputElement;
    const list = document.createElement('datalist');
    list.id = `${this.uid}-${field.name.replace(/\W/g, '_')}-${widget.index}`;
    for (const o of field.options) {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.label = o.label;
      list.appendChild(opt);
    }
    input.setAttribute('list', list.id);
    wrap.append(input, list);
    return wrap;
  }

  private register(name: string, el: HTMLElement, widget: FormWidget): void {
    let set = this.controls.get(name);
    if (!set) this.controls.set(name, (set = new Set()));
    set.add({ el, widget });
  }

  /** Update a field's live controls (another widget of it, or a calculation, changed the value). */
  private refreshControls(name: string): void {
    const set = this.controls.get(name);
    const field = this.byName.get(name);
    if (!set || !field) return;
    const value = this.value(name);
    for (const entry of [...set]) {
      const { el, widget } = entry;
      if (!el.isConnected) {
        set.delete(entry);
        continue;
      }
      if (el === document.activeElement) continue;
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) el.checked = value === widget.onState;
      else if (el instanceof HTMLSelectElement) {
        const selected = new Set(Array.isArray(value) ? value : [value]);
        for (const o of Array.from(el.options)) o.selected = selected.has(o.value);
      } else {
        const input = el instanceof HTMLDivElement ? el.querySelector('input') : (el as HTMLInputElement);
        if (input) input.value = field.password ? (value as string) : displayText({ ...field, password: false }, value);
      }
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

interface TreeNode {
  value?: FormValue;
  field?: FormField;
  kids: Tree;
}
type Tree = Map<string, TreeNode>;

/** Fully qualified names → a tree of name parts (XFDF and FDF nest fields). */
function buildTree(entries: readonly (readonly [FormField, FormValue])[]): Tree {
  const root: Tree = new Map();
  for (const [field, value] of entries) {
    let level = root;
    const parts = field.name.split('.');
    parts.forEach((part, i) => {
      let node = level.get(part);
      if (!node) level.set(part, (node = { kids: new Map() }));
      if (i === parts.length - 1) {
        node.value = value;
        node.field = field;
      }
      level = node.kids;
    });
  }
  return root;
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pdfString(s: string): string {
  const str = PdfString.text(s);
  let out = '(';
  for (const b of str.bytes) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) out += '\\' + String.fromCharCode(b);
    else if (b < 0x20 || b > 0x7e) out += '\\' + b.toString(8).padStart(3, '0');
    else out += String.fromCharCode(b);
  }
  return out + ')';
}

/** Field values from an FDF file (`/Fields` with `/T` parts, `/Kids`, `/V`). */
function parseFdf(text: string): Map<string, FormValue> {
  const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0) & 0xff);
  const at = text.indexOf('<<');
  const out = new Map<string, FormValue>();
  if (at < 0) return out;
  const root = new PdfParser(bytes, at).parseValue();
  const fdf = root instanceof PdfDict ? root.get('FDF') : null;
  const fields = fdf instanceof PdfDict ? fdf.get('Fields') : null;
  const walk = (list: PdfValue | undefined, prefix: string) => {
    if (!Array.isArray(list)) return;
    for (const f of list) {
      if (!(f instanceof PdfDict)) continue;
      const t = f.get('T');
      const name = t instanceof PdfString ? (prefix ? `${prefix}.${t.text()}` : t.text()) : prefix;
      const v = f.get('V');
      if (v instanceof PdfString) out.set(name, v.text());
      else if (v instanceof PdfName) out.set(name, v.value);
      else if (Array.isArray(v))
        out.set(
          name,
          v.filter((x): x is PdfString => x instanceof PdfString).map((x) => x.text()),
        );
      walk(f.get('Kids'), name);
    }
  };
  walk(fields ?? undefined, '');
  return out;
}

/** Field values from an XFDF `<fields>` tree. */
function parseXfdfFields(xml: string): Map<string, FormValue> {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('invalid XFDF');
  const out = new Map<string, FormValue>();
  const walk = (el: Element, prefix: string) => {
    for (const child of Array.from(el.children)) {
      if (child.localName !== 'field') continue;
      const part = child.getAttribute('name') ?? '';
      const name = prefix ? `${prefix}.${part}` : part;
      const values = Array.from(child.children)
        .filter((c) => c.localName === 'value')
        .map((c) => c.textContent ?? '');
      if (values.length) out.set(name, values.length === 1 ? values[0] : values);
      walk(child, name);
    }
  };
  const fields = Array.from(doc.getElementsByTagNameNS('*', 'fields'))[0];
  if (fields) walk(fields, '');
  return out;
}

/** An imported XFDF/FDF value in the field's internal form (buttons use their state names there). */
function normalizeImported(field: FormField, v: FormValue): FormValue | null {
  if (field.kind === 'checkbox' || field.kind === 'radio') {
    const s = Array.isArray(v) ? v[0] : (v as string);
    if (!s || s === 'Off') return 'Off';
    return s in field.exportValues ? s : (Object.keys(field.exportValues).find((k) => field.exportValues[k] === s) ?? null);
  }
  if (field.kind === 'list') return Array.isArray(v) ? v : v ? [v as string] : [];
  return Array.isArray(v) ? v.join(', ') : (v as string);
}
