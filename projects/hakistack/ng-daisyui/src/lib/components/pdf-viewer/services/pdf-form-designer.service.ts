import { Injectable, computed, inject, signal } from '@angular/core';
import type { PdfRect } from '../core/annotations/annotation.types';
import { CommandStack, PdfCommandStackState } from '../core/command-stack';
import { AfFormat } from '../core/forms/af';
import {
  DesignField,
  DesignWidget,
  FormDesign,
  nameConflicts,
  newDesignField,
  newWidget,
  toDesign,
  uniqueFieldName,
} from '../core/forms/form-design';
import { FormFieldKind } from '../core/forms/form-model';
import { PdfFormsService } from './pdf-forms.service';
import { PdfViewerStore } from './pdf-viewer.store';

/** What the designer's tools create. */
export type FormDesignTool =
  | 'text'
  | 'multiline'
  | 'password'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'radio'
  | 'combo'
  | 'list'
  | 'signature'
  | 'initials';

const TOOL_KIND: Record<FormDesignTool, FormFieldKind> = {
  text: 'text',
  multiline: 'text',
  password: 'text',
  number: 'text',
  date: 'text',
  checkbox: 'checkbox',
  radio: 'radio',
  combo: 'combo',
  list: 'list',
  signature: 'signature',
  initials: 'signature',
};

const TOOL_BASE_NAME: Record<FormDesignTool, string> = {
  text: 'Text',
  multiline: 'Text',
  password: 'Password',
  number: 'Number',
  date: 'Date',
  checkbox: 'Check Box',
  radio: 'Group',
  combo: 'Dropdown',
  list: 'List Box',
  signature: 'Signature',
  initials: 'Initials',
};

/** A selected widget: its field and its position among the field's widgets. */
export interface DesignSelection {
  readonly field: string;
  readonly widget: number;
}

/**
 * The form designer ("Prepare form"): field and widget edits with undo,
 * the active creation tool and the selection. Leaving design mode hands the
 * designed fields to the forms service (they're fillable at once); a save
 * writes them into the file.
 */
@Injectable()
export class PdfFormDesignerService {
  private readonly store = inject(PdfViewerStore);
  private readonly forms = inject(PdfFormsService);

  readonly active = signal(false);
  readonly tool = signal<FormDesignTool | null>(null);
  readonly fields = signal<readonly DesignField[]>([]);
  readonly selection = signal<DesignSelection | null>(null);
  readonly history = signal<PdfCommandStackState>({ canUndo: false, canRedo: false, dirty: false, undoLabel: null, redoLabel: null });
  /** An in-progress drag (move, resize, draw) shown instead of the stored widget. */
  readonly preview = signal<{ field: string; widget: number; rect: PdfRect } | null>(null);

  readonly selectedField = computed(() => {
    const s = this.selection();
    return s ? (this.fields().find((f) => f.name === s.field) ?? null) : null;
  });

  /** Whether the document allows designing fields (no certification signature locks it). */
  readonly allowed = computed(() => this.forms.docMdp() === null && this.forms.editable());

  private deleted: string[] = [];
  /** The design as loaded, to tell whether anything changed. */
  private initial = '';
  private readonly stack = new CommandStack(200);

  constructor() {
    this.stack.subscribe((s) => this.history.set(s));
  }

  /** Fields with widgets on a 0-based page (with the drag preview applied). */
  widgetsOnPage(page: number): { field: DesignField; widget: DesignWidget; index: number }[] {
    const preview = this.preview();
    const out: { field: DesignField; widget: DesignWidget; index: number }[] = [];
    for (const field of this.fields()) {
      field.widgets.forEach((widget, index) => {
        if (widget.page !== page) return;
        const shown = preview && preview.field === field.name && preview.widget === index ? { ...widget, rect: preview.rect } : widget;
        out.push({ field, widget: shown, index });
      });
    }
    return out;
  }

  // ── Mode ────────────────────────────────────────────────────────────────

  /** Enter design mode with the form's current fields. */
  start(): void {
    if (!this.allowed()) return;
    const model = this.forms.model();
    if (!this.forms.designed()) {
      this.fields.set(toDesign(model?.fields ?? []));
      this.deleted = [];
      this.initial = JSON.stringify(this.fields());
      this.stack.clear();
    } else {
      this.fields.set(this.forms.designed()!.fields);
    }
    this.selection.set(null);
    this.active.set(true);
  }

  /** Leave design mode: the designed fields become the form (fillable at once). */
  finish(): void {
    this.active.set(false);
    this.tool.set(null);
    this.selection.set(null);
    this.preview.set(null);
    const changed = JSON.stringify(this.fields()) !== this.initial || this.deleted.length > 0;
    this.forms.applyDesign(changed ? { fields: this.fields(), deleted: [...this.deleted] } : null);
  }

  /** Forget the design (a new document is loading). */
  reset(): void {
    this.active.set(false);
    this.tool.set(null);
    this.fields.set([]);
    this.selection.set(null);
    this.preview.set(null);
    this.deleted = [];
    this.initial = '';
    this.stack.clear();
  }

  // ── Edits (undoable) ────────────────────────────────────────────────────

  /** Create a field with the active tool's kind at `rect` on `page`; a radio tool adds options to a selected group. */
  async create(tool: FormDesignTool, page: number, rect: PdfRect): Promise<void> {
    const sel = this.selectedField();
    if (tool === 'radio' && sel?.kind === 'radio') {
      const state = uniqueState(sel);
      await this.edit('Add option', (fields) =>
        fields.map((f) =>
          f.name === sel.name
            ? { ...f, exportValues: { ...f.exportValues, [state]: state }, widgets: [...f.widgets, newWidget('radio', page, rect, state)] }
            : f,
        ),
      );
      this.selection.set({ field: sel.name, widget: sel.widgets.length });
      return;
    }
    const taken = new Set(this.fields().map((f) => f.name));
    const name = uniqueFieldName(TOOL_BASE_NAME[tool], taken);
    let field = newDesignField(TOOL_KIND[tool], name, page, rect, toolFormat(tool));
    if (tool === 'multiline') field = { ...field, multiline: true };
    if (tool === 'password') field = { ...field, password: true };
    await this.edit(`Add ${TOOL_BASE_NAME[tool].toLowerCase()} field`, (fields) => [...fields, field]);
    this.selection.set({ field: name, widget: 0 });
  }

  /** Change a field's properties. */
  updateField(name: string, patch: Partial<DesignField>, mergeKey?: string): Promise<void> {
    return this.edit(
      'Edit field',
      (fields) => fields.map((f) => (f.name === name ? ({ ...f, ...patch } as DesignField) : f)),
      mergeKey ? `${name}:${mergeKey}` : undefined,
    );
  }

  /** Rename a field; returns an error key when the name is empty or taken. */
  async rename(name: string, next: string): Promise<'empty' | 'taken' | null> {
    const clean = next.trim();
    if (!clean) return 'empty';
    if (clean === name) return null;
    if (
      nameConflicts(
        clean,
        this.fields()
          .filter((f) => f.name !== name)
          .map((f) => f.name),
      )
    )
      return 'taken';
    await this.edit('Rename field', (fields) => fields.map((f) => (f.name === name ? { ...f, name: clean } : f)));
    this.selection.update((s) => (s?.field === name ? { ...s, field: clean } : s));
    return null;
  }

  /** Move or resize a widget. */
  setWidgetRect(name: string, index: number, rect: PdfRect, mergeKey?: string): Promise<void> {
    return this.edit(
      'Move field',
      (fields) => fields.map((f) => (f.name === name ? { ...f, widgets: f.widgets.map((w, i) => (i === index ? { ...w, rect } : w)) } : f)),
      mergeKey ? `${name}:${index}:${mergeKey}` : undefined,
    );
  }

  /** Change a widget's appearance (border, background). */
  updateWidget(name: string, index: number, patch: Partial<DesignWidget>, mergeKey?: string): Promise<void> {
    return this.edit(
      'Edit field',
      (fields) =>
        fields.map((f) => (f.name === name ? { ...f, widgets: f.widgets.map((w, i) => (i === index ? { ...w, ...patch } : w)) } : f)),
      mergeKey ? `${name}:${index}:${mergeKey}` : undefined,
    );
  }

  /** Delete a widget (the whole field when it's the last one). */
  async remove(name: string, index: number): Promise<void> {
    const field = this.fields().find((f) => f.name === name);
    if (!field) return;
    if (field.widgets.length <= 1) {
      await this.edit('Delete field', (fields) => fields.filter((f) => f.name !== name), undefined, field.origin);
    } else {
      await this.edit('Delete option', (fields) =>
        fields.map((f) => (f.name === name ? { ...f, widgets: f.widgets.filter((_, i) => i !== index) } : f)),
      );
    }
    this.selection.set(null);
  }

  undo(): Promise<boolean> {
    this.preview.set(null);
    return this.stack.undo();
  }

  redo(): Promise<boolean> {
    this.preview.set(null);
    return this.stack.redo();
  }

  private edit(
    label: string,
    change: (fields: readonly DesignField[]) => readonly DesignField[],
    mergeKey?: string,
    deletedOrigin?: string,
  ): Promise<void> {
    const before = this.fields();
    const after = change(before);
    const deletedBefore = [...this.deleted];
    const deletedAfter = deletedOrigin ? [...this.deleted, deletedOrigin] : deletedBefore;
    const command = {
      label,
      mergeKey,
      after,
      apply: () => {
        this.fields.set(after);
        this.deleted = deletedAfter;
      },
      revert: () => {
        this.fields.set(before);
        this.deleted = deletedBefore;
      },
      merge: (next: unknown) => {
        const n = next as { mergeKey?: string; after: readonly DesignField[] };
        if (!mergeKey || n.mergeKey !== mergeKey) return null;
        return { ...command, after: n.after, apply: () => this.fields.set(n.after) };
      },
    };
    return this.stack.execute(command);
  }
}

function toolFormat(tool: FormDesignTool): AfFormat | undefined {
  if (tool === 'number') return { kind: 'number', decimals: 2, sepStyle: 0, negStyle: 0, currency: '', prepend: true };
  if (tool === 'date') return { kind: 'date', format: 'mm/dd/yyyy' };
  return undefined;
}

/** The next unused radio on-state (`Choice1`, `Choice2`, …). */
function uniqueState(field: DesignField): string {
  const taken = new Set(field.widgets.map((w) => w.onState));
  for (let i = 1; ; i++) if (!taken.has(`Choice${i}`)) return `Choice${i}`;
}

export type { FormDesign };
