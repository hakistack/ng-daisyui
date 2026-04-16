import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AbstractControl, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import Quill, { type QuillOptions } from 'quill';

import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import type {
  EditorOutputFormat,
  EditorToolbarConfig,
  EditorToolbarGroup,
  EditorToolbarItem,
  EditorTextChangeEvent,
  EditorSelectionChangeEvent,
  EditorModules,
} from './editor.types';
import { TOOLBAR_PRESETS } from './editor.types';

@Component({
  selector: 'hk-editor',
  imports: [LucideIconComponent],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditorComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => EditorComponent),
      multi: true,
    },
  ],
})
export class EditorComponent implements Validator, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // ── Inputs ──────────────────────────────────────────────────────────────────

  readonly id = input<string>('');
  readonly placeholder = input<string>('Write something...');
  readonly disabled = input<boolean>(false);
  readonly readonly = input<boolean>(false);
  readonly outputFormat = input<EditorOutputFormat>('html');
  readonly toolbar = input<EditorToolbarConfig>('basic');
  readonly formats = input<string[] | null>(null);
  readonly modules = input<EditorModules | null>(null);
  readonly minLength = input<number | null>(null);
  readonly maxLength = input<number | null>(null);
  readonly editorHeight = input<string>('200px');

  // ── Outputs ─────────────────────────────────────────────────────────────────

  readonly textChange = output<EditorTextChangeEvent>();
  readonly selectionChange = output<EditorSelectionChangeEvent>();
  readonly editorFocus = output<void>();
  readonly editorBlur = output<void>();
  readonly editorReady = output<void>();

  // ── Internal state ──────────────────────────────────────────────────────────

  private quillInstance: Quill | null = null;
  readonly isLoading = signal(true);
  readonly isFocused = signal(false);
  readonly characterCount = signal(0);

  private pendingValue: string | null = null;
  private _onChange: (value: string | unknown | null) => void = () => {};
  private _onTouched: () => void = () => {};

  private readonly editorContainer = viewChild<ElementRef<HTMLDivElement>>('editorContainer');
  private readonly toolbarContainer = viewChild<ElementRef<HTMLDivElement>>('toolbarContainer');

  /** Resolved toolbar groups for the template. */
  readonly resolvedToolbar = computed<EditorToolbarGroup[]>(() => {
    const toolbar = this.toolbar();
    if (typeof toolbar === 'string') {
      return TOOLBAR_PRESETS[toolbar] ?? TOOLBAR_PRESETS['basic'];
    }
    return toolbar;
  });

  constructor() {
    if (this.isBrowser) {
      afterNextRender(() => {
        this.isLoading.set(false);
        requestAnimationFrame(() => this.initQuill());
      });
    }

    effect(() => {
      const disabled = this.disabled();
      const readonly = this.readonly();
      if (this.quillInstance) {
        this.quillInstance.enable(!disabled && !readonly);
      }
    });
  }

  // ── Template helpers ────────────────────────────────────────────────────────

  isStringItem(item: EditorToolbarItem): item is string {
    return typeof item === 'string';
  }

  getItemKey(item: EditorToolbarItem): string {
    if (typeof item === 'string') return item;
    return Object.keys(item)[0] ?? '';
  }

  getItemValue(item: EditorToolbarItem): unknown {
    if (typeof item === 'string') return item;
    return Object.values(item)[0];
  }

  // ── Quill initialization ────────────────────────────────────────────────────

  private initQuill(): void {
    const container = this.editorContainer()?.nativeElement;
    const toolbarEl = this.toolbarContainer()?.nativeElement;
    if (!container) return;

    const userModules = this.modules();

    const quillModules: Record<string, unknown> = {
      toolbar: toolbarEl ?? false,
      ...userModules,
    };

    const quillFormats = this.formats();

    // Quill accepts `false` for theme to disable theming, but its types only allow `string`
    const options: QuillOptions = {
      theme: false as unknown as string,
      modules: quillModules,
      placeholder: this.placeholder(),
      readOnly: this.disabled() || this.readonly(),
      formats: quillFormats,
    };

    this.quillInstance = new Quill(container, options);

    // Apply pending value from writeValue called before init
    if (this.pendingValue !== null) {
      this.quillInstance.clipboard.dangerouslyPasteHTML(this.pendingValue);
      this.pendingValue = null;
    }

    // Event: text-change
    this.quillInstance.on('text-change', (delta, _oldDelta, source) => {
      const html = this.getEditorHtml();
      const text = this.quillInstance!.getText();
      this.characterCount.set(text.trim().length);

      if (source === 'user') {
        const value = this.outputFormat() === 'delta' ? this.quillInstance!.getContents() : html;
        this._onChange(value);
      }

      this.textChange.emit({
        htmlValue: html,
        textValue: text,
        delta,
        source,
      });
    });

    // Event: selection-change
    this.quillInstance.on('selection-change', (range, oldRange, source) => {
      if (range) {
        this.isFocused.set(true);
        this.editorFocus.emit();
      } else {
        this.isFocused.set(false);
        this._onTouched();
        this.editorBlur.emit();
      }

      this.selectionChange.emit({ range, oldRange, source });
    });

    // Set initial character count
    this.characterCount.set(this.quillInstance.getText().trim().length);

    this.editorReady.emit();
  }

  private getEditorHtml(): string {
    const html = this.quillInstance?.root?.innerHTML ?? '';
    return html === '<p><br></p>' ? '' : html;
  }

  // ── ControlValueAccessor ────────────────────────────────────────────────────

  writeValue(value: string | unknown | null): void {
    if (!this.quillInstance) {
      this.pendingValue = typeof value === 'string' ? value : null;
      return;
    }

    if (value === null || value === undefined || value === '') {
      this.quillInstance.setText('');
      return;
    }

    if (typeof value === 'string') {
      this.quillInstance.clipboard.dangerouslyPasteHTML(value);
    } else if (typeof value === 'object' && value !== null && 'ops' in value) {
      this.quillInstance.setContents(value as Parameters<Quill['setContents']>[0]);
    }
  }

  registerOnChange(fn: (value: string | unknown | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.quillInstance) {
      this.quillInstance.enable(!isDisabled);
    }
  }

  // ── Validator ───────────────────────────────────────────────────────────────

  validate(_control: AbstractControl): ValidationErrors | null {
    if (!this.quillInstance) return null;

    const textLength = this.quillInstance.getText().trim().length;
    const min = this.minLength();
    const max = this.maxLength();

    if (min !== null && textLength > 0 && textLength < min) {
      return { minlength: { requiredLength: min, actualLength: textLength } };
    }

    if (max !== null && textLength > max) {
      return { maxlength: { requiredLength: max, actualLength: textLength } };
    }

    return null;
  }

  registerOnValidatorChange(_fn: () => void): void {}

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.quillInstance = null;
  }
}
