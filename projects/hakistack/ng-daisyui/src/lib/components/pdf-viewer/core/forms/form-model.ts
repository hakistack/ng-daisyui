import type { PdfRect } from '../annotations/annotation.types';
import type { StandardFont } from '../pdf-writer/standard-fonts';
import type { AfCalculate, AfFormat, AfRange } from './af';

/** What kind of control a field is. */
export type FormFieldKind = 'text' | 'checkbox' | 'radio' | 'combo' | 'list' | 'button' | 'signature';

/**
 * A field's value. Text and combo: the text. List: the selected export
 * values. Checkbox and radio: the "on" state name of the selected widget, or
 * `'Off'`.
 */
export type FormValue = string | readonly string[];

/** One widget (the clickable box) of a field, in displayed-page points. */
export interface FormWidget {
  /** 0-based page. */
  readonly page: number;
  /** Index in the page's `/Annots` (also PDFium's annotation index). */
  readonly index: number;
  readonly rect: PdfRect;
  /** Checkbox / radio: the appearance state that means "on" (`/AP /N` key other than `Off`). */
  readonly onState?: string;
  /** Border and background colours (`/MK /BC`, `/BG`), `#rrggbb`. */
  readonly borderColor?: string;
  readonly background?: string;
  readonly borderWidth: number;
  /** Checkbox caption character (`/MK /CA`, a ZapfDingbats code: `4` check, `8` cross, `l` dot, …). */
  readonly caption?: string;
  /** The widget's own `/DA` / `/Q`, when it overrides the field's. */
  readonly appearance: FormTextStyle;
  /** Widget rotation (`/MK /R`). */
  readonly rotation: number;
}

/** Text style from a `/DA` string and `/Q`. `fontSize` 0 means auto-size. */
export interface FormTextStyle {
  readonly font: StandardFont;
  readonly fontSize: number;
  readonly color: string;
  readonly align: 'left' | 'center' | 'right';
}

export interface FormField {
  /** Fully qualified name (`parent.child`). */
  readonly name: string;
  readonly kind: FormFieldKind;
  /** `/TU`: the accessible label. */
  readonly tooltip?: string;
  readonly readOnly: boolean;
  readonly required: boolean;
  readonly noExport: boolean;
  // Text
  readonly multiline: boolean;
  readonly password: boolean;
  readonly comb: boolean;
  readonly doNotScroll: boolean;
  readonly maxLength?: number;
  // Choice
  readonly multiSelect: boolean;
  /** Combo boxes that accept typed values. */
  readonly editable: boolean;
  /** `[export value, display text]` pairs. */
  readonly options: readonly { readonly value: string; readonly label: string }[];
  // Buttons
  /** Radios: clicking the selected option doesn't turn it off. */
  readonly noToggleToOff: boolean;
  /** Radios whose options share on-states turn on together. */
  readonly radiosInUnison: boolean;
  /** Checkbox / radio export values by on-state (`/Opt` maps widget order to export values). */
  readonly exportValues: Readonly<Record<string, string>>;

  readonly value: FormValue;
  readonly defaultValue: FormValue;
  readonly widgets: readonly FormWidget[];
  readonly style: FormTextStyle;
  readonly format?: AfFormat;
  readonly validate?: AfRange;
  readonly calculate?: AfCalculate;
}

/** A document's form: fields, the calculation order and each page's tab order. */
export interface FormModel {
  readonly fields: readonly FormField[];
  /** Field names in `/CO` order (calculated fields not listed there run after, in field order). */
  readonly calculationOrder: readonly string[];
  /** `/NeedAppearances` was set: viewers regenerate appearances. */
  readonly needAppearances: boolean;
  /** Per page (0-based): the widgets' `/Annots` indices in tab order (`/Tabs` R, C or document order). */
  readonly tabOrder: readonly (readonly number[])[];
}

/** The empty value for a field kind. */
export function emptyValue(kind: FormFieldKind): FormValue {
  return kind === 'checkbox' || kind === 'radio' ? 'Off' : kind === 'list' ? [] : '';
}

export function sameValue(a: FormValue, b: FormValue): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
