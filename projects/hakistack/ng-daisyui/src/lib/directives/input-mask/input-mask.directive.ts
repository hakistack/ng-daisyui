import { Directive, ElementRef, inject, input, OnChanges, OnInit, output, PLATFORM_ID, SimpleChanges } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { MaskDefinition } from './input-mask.types';
import {
  applyCharAtPosition,
  buildDisplayValue,
  deleteCharAtPosition,
  deleteSelectionRange,
  extractRawValue,
  getFirstUnfilledPosition,
  getNextEditablePosition,
  handlePaste,
  isComplete,
  parseMask,
} from './input-mask.engine';

@Directive({
  selector: '[hkInputMask]',
  host: {
    '(keydown)': 'onKeydown($event)',
    '(input)': 'onInput($event)',
    '(paste)': 'onPaste($event)',
    '(focusin)': 'onFocus()',
    '(focusout)': 'onBlur()',
  },
})
export class InputMaskDirective implements OnInit, OnChanges {
  private readonly el = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  // ── Inputs ─────────────────────────────────────────────────────────────

  readonly hkInputMask = input.required<string>();
  readonly slotChar = input<string>('_');
  readonly autoClear = input<boolean>(true);
  readonly unmask = input<boolean>(false);

  // ── Outputs ────────────────────────────────────────────────────────────

  readonly maskValueChange = output<string>();
  readonly maskComplete = output<void>();

  // ── Internal State ─────────────────────────────────────────────────────

  private maskDef!: MaskDefinition;
  private rawChars: string[] = [];
  private inputEl!: HTMLInputElement;
  private suppressInput = false;
  private focused = false;

  // ── Lifecycle ──────────────────────────────────────────────────────────

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.inputEl = this.resolveInputElement();
    this.maskDef = parseMask(this.hkInputMask());

    // If the input already has a value (e.g., from formControl writeValue), parse it
    if (this.inputEl.value) {
      this.rawChars = extractRawValue(this.maskDef.slots, this.inputEl.value, this.slotChar());
      this.updateDisplay();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.inputEl) return;

    if (changes['hkInputMask']) {
      this.maskDef = parseMask(this.hkInputMask());
      this.rawChars = extractRawValue(this.maskDef.slots, this.inputEl.value, this.slotChar());
      this.updateDisplay();
    }
  }

  // ── Event Handlers ─────────────────────────────────────────────────────

  onKeydown(event: KeyboardEvent): void {
    if (!this.maskDef) return;

    // Allow modifier combos (Ctrl+C, Ctrl+V handled by paste, Ctrl+A, etc.)
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    // Allow navigation keys
    if (isNavigationKey(event.key)) return;

    const selStart = this.inputEl.selectionStart ?? 0;
    const selEnd = this.inputEl.selectionEnd ?? 0;

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (selStart !== selEnd) {
        const result = deleteSelectionRange(this.maskDef.slots, this.rawChars, selStart, selEnd);
        this.rawChars = result.newRawChars;
        this.updateDisplay(result.newCursorPos);
      } else {
        const result = deleteCharAtPosition(this.maskDef.slots, this.rawChars, selStart, 'backward');
        this.rawChars = result.newRawChars;
        this.updateDisplay(result.newCursorPos);
      }
      this.emitValue();
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      if (selStart !== selEnd) {
        const result = deleteSelectionRange(this.maskDef.slots, this.rawChars, selStart, selEnd);
        this.rawChars = result.newRawChars;
        this.updateDisplay(result.newCursorPos);
      } else {
        const result = deleteCharAtPosition(this.maskDef.slots, this.rawChars, selStart, 'forward');
        this.rawChars = result.newRawChars;
        this.updateDisplay(result.newCursorPos);
      }
      this.emitValue();
      return;
    }

    // Printable character (single char)
    if (event.key.length === 1) {
      event.preventDefault();

      // If there's a selection, delete it first
      if (selStart !== selEnd) {
        const delResult = deleteSelectionRange(this.maskDef.slots, this.rawChars, selStart, selEnd);
        this.rawChars = delResult.newRawChars;
      }

      const cursorPos = selStart;
      const result = applyCharAtPosition(this.maskDef.slots, this.rawChars, event.key, cursorPos);

      if (result) {
        this.rawChars = result.newRawChars;
        this.updateDisplay(result.newCursorPos);
        this.emitValue();

        if (isComplete(this.maskDef.slots, this.rawChars)) {
          this.maskComplete.emit();
        }
      }
    }
  }

  onInput(_event: Event): void {
    if (this.suppressInput) {
      this.suppressInput = false;
      return;
    }

    // Fallback for mobile/IME: reconcile input value with mask
    if (!this.maskDef) return;

    const currentValue = this.inputEl.value;
    // Extract any valid characters from whatever the browser put in
    const validChars: string[] = [];
    for (const c of currentValue) {
      if (c !== this.slotChar()) {
        // Try to find a matching slot for this character
        for (const slot of this.maskDef.slots) {
          if (slot.editable && slot.maskChar) {
            const test = slot.maskChar === '9' ? /^[0-9]$/ : slot.maskChar === 'a' ? /^[a-zA-Z]$/ : /^[a-zA-Z0-9]$/;
            if (test.test(c) && !validChars.includes(c + ':' + slot.index)) {
              validChars.push(c);
              break;
            }
          }
        }
      }
    }

    // Rebuild rawChars from extracted characters
    this.rawChars = extractRawValue(this.maskDef.slots, currentValue, this.slotChar());
    this.updateDisplay();
    this.emitValue();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    if (!this.maskDef) return;

    const pastedText = event.clipboardData?.getData('text') ?? '';
    if (!pastedText) return;

    const selStart = this.inputEl.selectionStart ?? 0;
    const selEnd = this.inputEl.selectionEnd ?? 0;

    // Delete selection first
    if (selStart !== selEnd) {
      const delResult = deleteSelectionRange(this.maskDef.slots, this.rawChars, selStart, selEnd);
      this.rawChars = delResult.newRawChars;
    }

    const result = handlePaste(this.maskDef.slots, this.rawChars, pastedText, selStart);
    this.rawChars = result.newRawChars;
    this.updateDisplay(result.newCursorPos);
    this.emitValue();

    if (isComplete(this.maskDef.slots, this.rawChars)) {
      this.maskComplete.emit();
    }
  }

  onFocus(): void {
    this.focused = true;
    if (!this.maskDef) return;

    if (this.rawChars.length === 0 || this.rawChars.every((c) => !c)) {
      // Show mask with slotChars
      this.updateDisplay(this.maskDef.firstEditableIndex);
    } else {
      // Place cursor at first unfilled position
      const pos = getFirstUnfilledPosition(this.maskDef.slots, this.rawChars);
      this.updateDisplay(pos);
    }
  }

  onBlur(): void {
    this.focused = false;
    if (!this.maskDef) return;

    const hasContent = this.rawChars.some((c) => !!c);

    if (!hasContent) {
      // Clear display when unfocused and empty
      this.setInputValue('');
      this.emitValue();
      return;
    }

    if (this.autoClear() && !isComplete(this.maskDef.slots, this.rawChars)) {
      this.rawChars = [];
      this.setInputValue('');
      this.emitValue();
      return;
    }

    this.emitValue();
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  private resolveInputElement(): HTMLInputElement {
    const native = this.el.nativeElement;
    if (native instanceof HTMLInputElement) return native;
    const inner = native.querySelector('input');
    if (inner) return inner;
    throw new Error('hkInputMask: No <input> element found. Apply this directive to an <input> or a component containing one.');
  }

  private updateDisplay(cursorPos?: number): void {
    const display = buildDisplayValue(this.maskDef.slots, this.rawChars, this.slotChar());
    this.setInputValue(display);

    if (cursorPos !== undefined) {
      requestAnimationFrame(() => {
        this.inputEl.setSelectionRange(cursorPos, cursorPos);
      });
    }
  }

  private setInputValue(value: string): void {
    this.suppressInput = true;
    this.inputEl.value = value;
    this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private emitValue(): void {
    const hasContent = this.rawChars.some((c) => !!c);
    if (!hasContent && !this.focused) {
      this.maskValueChange.emit('');
      return;
    }

    if (this.unmask()) {
      this.maskValueChange.emit(this.rawChars.filter((c) => !!c).join(''));
    } else {
      this.maskValueChange.emit(this.inputEl.value);
    }
  }
}

// ── Utilities ────────────────────────────────────────────────────────────

const NAVIGATION_KEYS = new Set(['Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter']);

function isNavigationKey(key: string): boolean {
  return NAVIGATION_KEYS.has(key);
}
