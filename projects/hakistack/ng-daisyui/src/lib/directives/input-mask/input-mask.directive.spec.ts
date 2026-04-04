import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { InputMaskDirective } from './input-mask.directive';
import {
  applyCharAtPosition,
  buildDisplayValue,
  deleteCharAtPosition,
  extractRawValue,
  handlePaste,
  isComplete,
  parseMask,
} from './input-mask.engine';

// ---------------------------------------------------------------------------
// Engine Unit Tests
// ---------------------------------------------------------------------------

describe('InputMask Engine', () => {
  describe('parseMask', () => {
    it('should parse a phone mask', () => {
      const def = parseMask('(999) 999-9999');
      expect(def.slots.length).toBe(14);
      expect(def.firstEditableIndex).toBe(1); // first '9' is at index 1
      expect(def.slots[0].editable).toBe(false);
      expect(def.slots[0].literal).toBe('(');
      expect(def.slots[1].editable).toBe(true);
      expect(def.slots[1].maskChar).toBe('9');
    });

    it('should parse optional section', () => {
      const def = parseMask('999-9999?-99');
      expect(def.optionalStartIndex).toBeLessThan(def.slots.length);
      const optionalSlots = def.slots.filter((s) => s.optional);
      expect(optionalSlots.length).toBeGreaterThan(0);
    });

    it('should parse alpha and alphanumeric chars', () => {
      const def = parseMask('a*-999');
      expect(def.slots[0].maskChar).toBe('a');
      expect(def.slots[1].maskChar).toBe('*');
      expect(def.slots[2].editable).toBe(false);
      expect(def.slots[3].maskChar).toBe('9');
    });
  });

  describe('buildDisplayValue', () => {
    it('should build empty mask with slot chars', () => {
      const def = parseMask('99/99');
      const display = buildDisplayValue(def.slots, [], '_');
      expect(display).toBe('__/__');
    });

    it('should build partially filled mask', () => {
      const def = parseMask('99/99');
      const display = buildDisplayValue(def.slots, ['1', '2'], '_');
      expect(display).toBe('12/__');
    });

    it('should build fully filled mask', () => {
      const def = parseMask('99/99');
      const display = buildDisplayValue(def.slots, ['1', '2', '3', '4'], '_');
      expect(display).toBe('12/34');
    });
  });

  describe('extractRawValue', () => {
    it('should extract digits from formatted phone', () => {
      const def = parseMask('(999) 999-9999');
      const raw = extractRawValue(def.slots, '(555) 123-4567', '_');
      expect(raw).toEqual(['5', '5', '5', '1', '2', '3', '4', '5', '6', '7']);
    });

    it('should skip slot chars', () => {
      const def = parseMask('99/99');
      const raw = extractRawValue(def.slots, '12/__', '_');
      expect(raw).toEqual(['1', '2']);
    });
  });

  describe('applyCharAtPosition', () => {
    it('should insert valid digit', () => {
      const def = parseMask('(999) 999-9999');
      const result = applyCharAtPosition(def.slots, [], '5', 1);
      expect(result).not.toBeNull();
      expect(result!.newRawChars[0]).toBe('5');
    });

    it('should reject invalid char', () => {
      const def = parseMask('999');
      const result = applyCharAtPosition(def.slots, [], 'a', 0);
      expect(result).toBeNull();
    });

    it('should skip literal positions', () => {
      const def = parseMask('(999)');
      // Position 0 is '(' literal, should jump to first editable at index 1
      const result = applyCharAtPosition(def.slots, [], '5', 0);
      expect(result).not.toBeNull();
      expect(result!.newRawChars[0]).toBe('5');
    });

    it('should accept alpha for "a" mask char', () => {
      const def = parseMask('aaa');
      const result = applyCharAtPosition(def.slots, [], 'x', 0);
      expect(result).not.toBeNull();
      expect(result!.newRawChars[0]).toBe('x');
    });

    it('should reject digit for "a" mask char', () => {
      const def = parseMask('aaa');
      const result = applyCharAtPosition(def.slots, [], '5', 0);
      expect(result).toBeNull();
    });
  });

  describe('deleteCharAtPosition', () => {
    it('should delete backward', () => {
      const def = parseMask('999');
      const result = deleteCharAtPosition(def.slots, ['1', '2', '3'], 2, 'backward');
      expect(result.newRawChars).toEqual(['1', '3']);
    });

    it('should delete forward', () => {
      const def = parseMask('999');
      const result = deleteCharAtPosition(def.slots, ['1', '2', '3'], 1, 'forward');
      expect(result.newRawChars).toEqual(['1', '3']);
    });
  });

  describe('handlePaste', () => {
    it('should paste valid characters', () => {
      const def = parseMask('99/99');
      const result = handlePaste(def.slots, [], '1234', 0);
      expect(result.newRawChars).toEqual(['1', '2', '3', '4']);
    });

    it('should skip invalid characters in paste', () => {
      const def = parseMask('999');
      const result = handlePaste(def.slots, [], '1a2b3', 0);
      expect(result.newRawChars).toEqual(['1', '2', '3']);
    });
  });

  describe('isComplete', () => {
    it('should return true when all required slots filled', () => {
      const def = parseMask('99/99');
      expect(isComplete(def.slots, ['1', '2', '3', '4'])).toBe(true);
    });

    it('should return false when incomplete', () => {
      const def = parseMask('99/99');
      expect(isComplete(def.slots, ['1', '2'])).toBe(false);
    });

    it('should allow optional section to be empty', () => {
      const def = parseMask('99?/99');
      expect(isComplete(def.slots, ['1', '2'])).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Test Hosts
// ---------------------------------------------------------------------------

@Component({
  selector: 'hk-test-host',
  imports: [InputMaskDirective],
  template: `<input [hkInputMask]="mask()" [slotChar]="slot()" />`,
})
class BasicTestHostComponent {
  readonly mask = signal('(999) 999-9999');
  readonly slot = signal('_');
}

@Component({
  selector: 'hk-form-host',
  imports: [InputMaskDirective, ReactiveFormsModule],
  template: `<input [hkInputMask]="'99/99/9999'" [formControl]="control" [unmask]="true" />`,
})
class FormTestHostComponent {
  readonly control = new FormControl('');
}

// ---------------------------------------------------------------------------
// Directive Integration Tests
// ---------------------------------------------------------------------------

describe('InputMaskDirective', () => {
  describe('Basic', () => {
    let fixture: ComponentFixture<BasicTestHostComponent>;
    let input: HTMLInputElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
      input = fixture.nativeElement.querySelector('input');
    });

    it('should create', () => {
      expect(input).toBeTruthy();
    });

    it('should show mask on focus', () => {
      input.dispatchEvent(new FocusEvent('focusin'));
      fixture.detectChanges();
      expect(input.value).toBe('(___) ___-____');
    });

    it('should apply typed digit into mask via directive method', () => {
      const directive = fixture.debugElement.children[0].injector.get(InputMaskDirective);

      // Trigger focus to show mask
      directive.onFocus();
      fixture.detectChanges();

      // Set cursor position before typing
      input.setSelectionRange(1, 1); // After '(' literal

      const event = new KeyboardEvent('keydown', { key: '5', bubbles: true, cancelable: true });
      directive.onKeydown(event);
      fixture.detectChanges();

      expect(input.value).toContain('5');
    });

    it('should reject non-digit for numeric mask', () => {
      const directive = fixture.debugElement.children[0].injector.get(InputMaskDirective);

      directive.onFocus();
      fixture.detectChanges();

      input.setSelectionRange(1, 1);
      const initialValue = input.value;

      const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
      directive.onKeydown(event);
      fixture.detectChanges();

      expect(input.value).toBe(initialValue);
    });

    it('should clear on blur when autoClear and incomplete', () => {
      input.dispatchEvent(new FocusEvent('focusin'));
      fixture.detectChanges();

      input.dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true }));
      fixture.detectChanges();

      input.dispatchEvent(new FocusEvent('focusout'));
      fixture.detectChanges();

      expect(input.value).toBe('');
    });
  });

  describe('With FormControl', () => {
    let fixture: ComponentFixture<FormTestHostComponent>;
    let input: HTMLInputElement;
    let host: FormTestHostComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [FormTestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(FormTestHostComponent);
      host = fixture.componentInstance;
      fixture.detectChanges();
      input = fixture.nativeElement.querySelector('input');
    });

    it('should create with form control', () => {
      expect(input).toBeTruthy();
    });
  });
});
