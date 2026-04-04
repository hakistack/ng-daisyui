import { ChangeDetectionStrategy, Component, computed, ElementRef, forwardRef, input, output, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { VARIANT_STRATEGY_MAP } from './input-variant-strategies';
import { CurrencyConfig, InputColor, InputSize, InputVariant, PasswordConfig, PercentageConfig, PhoneConfig } from './input.types';

@Component({
  selector: 'hk-input',
  imports: [LucideIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  host: {
    class: 'block w-full',
  },
  template: `
    <div class="relative w-full">
      @if (hasPrefix()) {
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
          @if (effectivePrefixIcon(); as icon) {
            <hk-lucide-icon [name]="icon" [size]="16" class="text-base-content/50" />
          }
          @if (effectivePrefixText(); as text) {
            <span class="text-base-content/50 text-sm">{{ text }}</span>
          }
        </div>
      }

      <input
        #inputEl
        [type]="inputType()"
        [attr.inputmode]="inputMode()"
        [class]="inputClasses()"
        [placeholder]="placeholder()"
        [disabled]="isDisabled()"
        [readOnly]="readonly()"
        [value]="displayValue()"
        [attr.maxlength]="maxlength()"
        [attr.minlength]="minlength()"
        [attr.autocomplete]="autocomplete()"
        [attr.name]="name()"
        [attr.aria-label]="ariaLabel() || placeholder() || null"
        [attr.aria-describedby]="ariaDescribedBy() || null"
        [attr.aria-invalid]="ariaInvalid() || null"
        (input)="onInput($event)"
        (focus)="onFocus($event)"
        (blur)="onBlur($event)"
        (keydown)="onKeydown($event)"
      />

      @if (hasSuffix()) {
        <div class="absolute inset-y-0 right-0 flex items-center pr-2 z-10">
          @if (variant() === 'password' && (passwordConfig().showToggle ?? true)) {
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-circle"
              [attr.aria-label]="passwordVisible() ? 'Hide password' : 'Show password'"
              (click)="togglePasswordVisibility()"
            >
              <hk-lucide-icon [name]="passwordVisible() ? 'EyeOff' : 'Eye'" [size]="16" />
            </button>
          }
          @if (effectiveSuffixIcon(); as icon) {
            <hk-lucide-icon [name]="icon" [size]="16" class="text-base-content/50" />
          }
          @if (effectiveSuffixText(); as text) {
            <span class="text-base-content/50 text-sm">{{ text }}</span>
          }
        </div>
      }
    </div>
  `,
})
export class InputComponent implements ControlValueAccessor {
  private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  // ── Signal Inputs ──────────────────────────────────────────────────────

  readonly variant = input<InputVariant>('text');
  readonly size = input<InputSize>('md');
  readonly color = input<InputColor | null>(null);
  readonly placeholder = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly readonly = input<boolean>(false);

  readonly prefixText = input<string>('');
  readonly suffixText = input<string>('');
  readonly prefixIcon = input<string>('');
  readonly suffixIcon = input<string>('');

  readonly currencyConfig = input<CurrencyConfig>({});
  readonly phoneConfig = input<PhoneConfig>({});
  readonly percentageConfig = input<PercentageConfig>({});
  readonly passwordConfig = input<PasswordConfig>({});

  readonly maxlength = input<number | null>(null);
  readonly minlength = input<number | null>(null);
  readonly autocomplete = input<string>('');
  readonly name = input<string>('');
  readonly ariaLabel = input<string>('');
  readonly ariaDescribedBy = input<string>('');
  readonly ariaInvalid = input<boolean>(false);

  // ── Outputs ────────────────────────────────────────────────────────────

  readonly valueChange = output<string | number | null>();

  // ── Internal State ─────────────────────────────────────────────────────

  readonly displayValue = signal<string>('');
  readonly isFocused = signal<boolean>(false);
  readonly passwordVisible = signal<boolean>(false);

  private modelValue: string | number | null = null;
  private _onChange = (_value: string | number | null): void => {};
  private _onTouched = (): void => {};
  private readonly _disabled = signal(false);

  // ── Computed ───────────────────────────────────────────────────────────

  readonly strategy = computed(() => VARIANT_STRATEGY_MAP[this.variant()]);

  readonly inputType = computed(() => this.strategy().getInputType({ passwordVisible: this.passwordVisible() }));

  readonly inputMode = computed(() => this.strategy().getInputMode());

  readonly isDisabled = computed(() => this.disabled() || this._disabled());

  readonly hasPrefix = computed(() => !!this.effectivePrefixIcon() || !!this.effectivePrefixText());

  readonly hasSuffix = computed(
    () =>
      !!this.effectiveSuffixIcon() ||
      !!this.effectiveSuffixText() ||
      (this.variant() === 'password' && (this.passwordConfig()?.showToggle ?? true)),
  );

  readonly effectivePrefixIcon = computed(() => this.prefixIcon() || null);

  readonly effectivePrefixText = computed(() => {
    if (this.prefixText()) return this.prefixText();
    if (this.variant() === 'currency') {
      const config = this.currencyConfig();
      if (config?.showSymbol ?? true) {
        return getCurrencySymbol(config?.locale ?? 'en-US', config?.currency ?? 'USD');
      }
    }
    return null;
  });

  readonly effectiveSuffixIcon = computed(() => this.suffixIcon() || null);

  readonly effectiveSuffixText = computed(() => {
    if (this.suffixText()) return this.suffixText();
    if (this.variant() === 'percentage' && (this.percentageConfig()?.showSymbol ?? true)) {
      return '%';
    }
    return null;
  });

  readonly inputClasses = computed(() => {
    const classes = ['input', 'w-full'];
    const s = this.size();
    if (s !== 'md') classes.push(`input-${s}`);
    const c = this.color();
    if (c) classes.push(`input-${c}`);
    if (this.hasPrefix()) classes.push('pl-10');
    if (this.hasSuffix()) classes.push('pr-10');
    return classes.join(' ');
  });

  // ── ControlValueAccessor ──────────────────────────────────────────────

  writeValue(value: string | number | null): void {
    this.modelValue = value;
    const strategy = this.strategy();
    const config = this.getActiveConfig();
    this.displayValue.set(strategy.format(value, config));
  }

  registerOnChange(fn: (value: string | number | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }

  // ── Event Handlers ────────────────────────────────────────────────────

  onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const strategy = this.strategy();
    const config = this.getActiveConfig();
    const parsed = strategy.parse(raw, config);

    this.modelValue = parsed;
    this.displayValue.set(raw);
    this._onChange(parsed);
    this.valueChange.emit(parsed);
  }

  onFocus(event: FocusEvent): void {
    this.isFocused.set(true);

    // Strip formatting on focus for numeric variants
    const v = this.variant();
    if (v === 'currency' || v === 'percentage') {
      const raw = this.modelValue;
      if (raw != null && raw !== '') {
        this.displayValue.set(String(raw));
        // Move cursor to end after value update
        requestAnimationFrame(() => {
          const el = event.target as HTMLInputElement;
          el.setSelectionRange(el.value.length, el.value.length);
        });
      }
    }
  }

  onBlur(_event: FocusEvent): void {
    this.isFocused.set(false);
    this._onTouched();

    // Apply formatting on blur
    const strategy = this.strategy();
    const config = this.getActiveConfig();
    this.displayValue.set(strategy.format(this.modelValue, config));
  }

  onKeydown(event: KeyboardEvent): void {
    const strategy = this.strategy();
    if (strategy.shouldAllowKey) {
      const config = this.getActiveConfig();
      if (!strategy.shouldAllowKey(event, this.displayValue(), config)) {
        event.preventDefault();
      }
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
    this.inputEl()?.nativeElement.focus();
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private getActiveConfig(): unknown {
    switch (this.variant()) {
      case 'currency':
        return this.currencyConfig();
      case 'phone':
        return this.phoneConfig();
      case 'percentage':
        return this.percentageConfig();
      case 'password':
        return this.passwordConfig();
      default:
        return undefined;
    }
  }
}

function getCurrencySymbol(locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? '$';
}
