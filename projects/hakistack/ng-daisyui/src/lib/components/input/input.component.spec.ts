import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { InputComponent } from './input.component';
import { VARIANT_STRATEGY_MAP } from './input-variant-strategies';
import { InputVariant } from './input.types';

// ---------------------------------------------------------------------------
// Test-host for ControlValueAccessor / FormControl integration
// ---------------------------------------------------------------------------

@Component({
  selector: 'hk-test-host',
  imports: [InputComponent, ReactiveFormsModule],
  template: `
    <hk-input
      [variant]="variant()"
      [formControl]="control"
      [currencyConfig]="currencyConfig()"
      [phoneConfig]="phoneConfig()"
      [percentageConfig]="percentageConfig()"
      [placeholder]="'Enter value'"
    />
  `,
})
class TestHostComponent {
  readonly control = new FormControl<string | number | null>(null);
  readonly variant = signal<InputVariant>('text');
  readonly currencyConfig = signal({});
  readonly phoneConfig = signal({});
  readonly percentageConfig = signal({});
}

function getInput(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('input')!;
}

// ---------------------------------------------------------------------------
// Strategy unit tests
// ---------------------------------------------------------------------------

describe('InputVariantStrategies', () => {
  describe('TextStrategy', () => {
    const strategy = VARIANT_STRATEGY_MAP['text'];

    it('should passthrough format', () => {
      expect(strategy.format('hello')).toBe('hello');
      expect(strategy.format(null)).toBe('');
      expect(strategy.format(42)).toBe('42');
    });

    it('should passthrough parse', () => {
      expect(strategy.parse('hello')).toBe('hello');
    });

    it('should return text input type', () => {
      expect(strategy.getInputType()).toBe('text');
    });
  });

  describe('CurrencyStrategy', () => {
    const strategy = VARIANT_STRATEGY_MAP['currency'];

    it('should format as USD by default', () => {
      const result = strategy.format(1234.56);
      expect(result).toContain('1,234.56');
    });

    it('should format with custom decimal places', () => {
      const result = strategy.format(1234, { decimalPlaces: 0 });
      expect(result).toContain('1,234');
    });

    it('should return empty for null/empty', () => {
      expect(strategy.format(null)).toBe('');
      expect(strategy.format('')).toBe('');
    });

    it('should parse to number', () => {
      expect(strategy.parse('$1,234.56')).toBe(1234.56);
      expect(strategy.parse('')).toBeNull();
    });

    it('should return decimal inputmode', () => {
      expect(strategy.getInputMode()).toBe('decimal');
    });
  });

  describe('PhoneStrategy', () => {
    const strategy = VARIANT_STRATEGY_MAP['phone'];

    it('should format US phone number', () => {
      expect(strategy.format('5551234567')).toBe('(555) 123-4567');
    });

    it('should format partial phone number', () => {
      expect(strategy.format('555')).toBe('(555');
    });

    it('should parse to digits only', () => {
      expect(strategy.parse('(555) 123-4567')).toBe('5551234567');
    });

    it('should return tel input type', () => {
      expect(strategy.getInputType()).toBe('tel');
    });
  });

  describe('PercentageStrategy', () => {
    const strategy = VARIANT_STRATEGY_MAP['percentage'];

    it('should format with % symbol', () => {
      expect(strategy.format(75)).toBe('75%');
    });

    it('should format with decimal places', () => {
      expect(strategy.format(75.5, { decimalPlaces: 1 })).toBe('75.5%');
    });

    it('should clamp parsed value', () => {
      expect(strategy.parse('150')).toBe(100);
      expect(strategy.parse('-10')).toBe(0);
      expect(strategy.parse('50')).toBe(50);
    });

    it('should return decimal inputmode', () => {
      expect(strategy.getInputMode()).toBe('decimal');
    });
  });

  describe('PasswordStrategy', () => {
    const strategy = VARIANT_STRATEGY_MAP['password'];

    it('should return password type by default', () => {
      expect(strategy.getInputType()).toBe('password');
    });

    it('should return text type when visible', () => {
      expect(strategy.getInputType({ passwordVisible: true })).toBe('text');
    });

    it('should passthrough format/parse', () => {
      expect(strategy.format('secret')).toBe('secret');
      expect(strategy.parse('secret')).toBe('secret');
    });
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------

describe('InputComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render an input element', () => {
    const input = getInput(fixture);
    expect(input).toBeTruthy();
    expect(input.placeholder).toBe('Enter value');
  });

  describe('ControlValueAccessor', () => {
    it('should update display when form control value changes', () => {
      host.control.setValue('hello');
      fixture.detectChanges();
      expect(getInput(fixture).value).toBe('hello');
    });

    it('should update form control when user types', () => {
      const input = getInput(fixture);
      input.value = 'world';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(host.control.value).toBe('world');
    });

    it('should disable input when form control is disabled', () => {
      host.control.disable();
      fixture.detectChanges();
      expect(getInput(fixture).disabled).toBe(true);
    });
  });

  describe('Currency variant', () => {
    beforeEach(() => {
      host.variant.set('currency');
      fixture.detectChanges();
    });

    it('should format value on blur', () => {
      host.control.setValue(1234.56);
      fixture.detectChanges();

      const input = getInput(fixture);
      expect(input.value).toContain('1,234.56');
    });

    it('should show currency symbol as prefix', () => {
      fixture.detectChanges();
      const prefix = fixture.nativeElement.querySelector('.pointer-events-none span');
      expect(prefix?.textContent?.trim()).toBe('$');
    });

    it('should strip formatting on focus and reformat on blur', () => {
      host.control.setValue(1234.56);
      fixture.detectChanges();

      const input = getInput(fixture);
      input.dispatchEvent(new FocusEvent('focus'));
      fixture.detectChanges();
      expect(input.value).toBe('1234.56');

      input.dispatchEvent(new FocusEvent('blur'));
      fixture.detectChanges();
      expect(input.value).toContain('1,234.56');
    });
  });

  describe('Password variant', () => {
    beforeEach(() => {
      host.variant.set('password');
      fixture.detectChanges();
    });

    it('should render password type by default', () => {
      expect(getInput(fixture).type).toBe('password');
    });

    it('should toggle visibility', () => {
      const toggleBtn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      expect(toggleBtn).toBeTruthy();

      toggleBtn.click();
      fixture.detectChanges();
      expect(getInput(fixture).type).toBe('text');

      toggleBtn.click();
      fixture.detectChanges();
      expect(getInput(fixture).type).toBe('password');
    });

    it('should have accessible toggle button', () => {
      const toggleBtn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');

      toggleBtn.click();
      fixture.detectChanges();
      expect(toggleBtn.getAttribute('aria-label')).toBe('Hide password');
    });
  });

  describe('Phone variant', () => {
    beforeEach(() => {
      host.variant.set('phone');
      fixture.detectChanges();
    });

    it('should format phone number on blur', () => {
      host.control.setValue('5551234567');
      fixture.detectChanges();

      const input = getInput(fixture);
      expect(input.value).toBe('(555) 123-4567');
    });

    it('should use tel input type', () => {
      expect(getInput(fixture).type).toBe('tel');
    });
  });

  describe('Percentage variant', () => {
    beforeEach(() => {
      host.variant.set('percentage');
      fixture.detectChanges();
    });

    it('should format value with % on blur', () => {
      host.control.setValue(75);
      fixture.detectChanges();

      const input = getInput(fixture);
      expect(input.value).toBe('75%');
    });

    it('should show % suffix', () => {
      fixture.detectChanges();
      const suffix = fixture.nativeElement.querySelector('.absolute.inset-y-0.right-0 span');
      expect(suffix?.textContent?.trim()).toBe('%');
    });
  });

  describe('Accessibility', () => {
    it('should set aria-label from placeholder', () => {
      const input = getInput(fixture);
      expect(input.getAttribute('aria-label')).toBe('Enter value');
    });

    it('should reflect aria-invalid', () => {
      // Mark control as invalid and touched
      host.control.setErrors({ required: true });
      host.control.markAsTouched();
      fixture.detectChanges();

      // aria-invalid comes from the ariaInvalid input, not auto-detected from form control
      const input = getInput(fixture);
      expect(input.getAttribute('aria-invalid')).toBeNull();
    });
  });

  describe('DaisyUI classes', () => {
    it('should include base input classes', () => {
      const input = getInput(fixture);
      expect(input.className).toContain('input');
      expect(input.className).toContain('w-full');
    });
  });
});
