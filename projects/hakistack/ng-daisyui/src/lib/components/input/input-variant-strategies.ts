import { CurrencyConfig, InputVariant, PercentageConfig, PhoneConfig } from './input.types';

export interface InputVariantStrategy {
  format(value: string | number | null, config?: unknown): string;
  parse(displayValue: string, config?: unknown): string | number | null;
  getInputType(state?: { passwordVisible?: boolean }): string;
  getInputMode(): string;
  shouldAllowKey?(event: KeyboardEvent, currentValue: string, config?: unknown): boolean;
}

const NAVIGATION_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

function isNavigationKey(event: KeyboardEvent): boolean {
  return NAVIGATION_KEYS.has(event.key) || event.ctrlKey || event.metaKey;
}

// ── Text Strategy ──────────────────────────────────────────────────────────

class TextStrategy implements InputVariantStrategy {
  format(value: string | number | null): string {
    return value == null ? '' : String(value);
  }

  parse(displayValue: string): string {
    return displayValue;
  }

  getInputType(): string {
    return 'text';
  }

  getInputMode(): string {
    return 'text';
  }
}

// ── Currency Strategy ──────────────────────────────────────────────────────

class CurrencyStrategy implements InputVariantStrategy {
  format(value: string | number | null, config?: CurrencyConfig): string {
    if (value == null || value === '') return '';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';

    const locale = config?.locale ?? 'en-US';
    const currency = config?.currency ?? 'USD';
    const decimalPlaces = config?.decimalPlaces ?? 2;
    const showSymbol = config?.showSymbol ?? true;

    if (showSymbol) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(num);
    }

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(num);
  }

  parse(displayValue: string, config?: CurrencyConfig): number | null {
    if (!displayValue) return null;
    const allowNegative = config?.allowNegative ?? false;
    const pattern = allowNegative ? /[^0-9.\-]/g : /[^0-9.]/g;
    const cleaned = displayValue.replace(pattern, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  getInputType(): string {
    return 'text';
  }

  getInputMode(): string {
    return 'decimal';
  }

  shouldAllowKey(event: KeyboardEvent, currentValue: string, config?: CurrencyConfig): boolean {
    if (isNavigationKey(event)) return true;

    const allowNegative = config?.allowNegative ?? false;

    if (event.key === '.') {
      return !currentValue.includes('.');
    }

    if (event.key === '-' && allowNegative) {
      return currentValue.length === 0 || (event.target as HTMLInputElement).selectionStart === 0;
    }

    return /^[0-9]$/.test(event.key);
  }
}

// ── Phone Strategy ─────────────────────────────────────────────────────────

const PHONE_FORMATS: Record<string, { mask: string; maxDigits: number }> = {
  US: { mask: '(###) ###-####', maxDigits: 10 },
  CA: { mask: '(###) ###-####', maxDigits: 10 },
};

class PhoneStrategy implements InputVariantStrategy {
  format(value: string | number | null, config?: PhoneConfig): string {
    if (value == null || value === '') return '';

    const digits = String(value).replace(/\D/g, '');
    if (!digits) return '';

    const country = config?.country ?? 'US';
    const formatConfig = PHONE_FORMATS[country];

    if (!formatConfig) return digits;

    const trimmed = digits.slice(0, formatConfig.maxDigits);
    let result = '';
    let digitIndex = 0;

    for (const char of formatConfig.mask) {
      if (digitIndex >= trimmed.length) break;
      if (char === '#') {
        result += trimmed[digitIndex++];
      } else {
        result += char;
      }
    }

    return result;
  }

  parse(displayValue: string): string {
    if (!displayValue) return '';
    return displayValue.replace(/\D/g, '');
  }

  getInputType(): string {
    return 'tel';
  }

  getInputMode(): string {
    return 'tel';
  }

  shouldAllowKey(event: KeyboardEvent, currentValue: string, config?: PhoneConfig): boolean {
    if (isNavigationKey(event)) return true;

    const country = (config as PhoneConfig | undefined)?.country ?? 'US';
    const formatConfig = PHONE_FORMATS[country];
    const maxDigits = formatConfig?.maxDigits ?? 15;
    const currentDigits = currentValue.replace(/\D/g, '');

    if (currentDigits.length >= maxDigits && /^[0-9]$/.test(event.key)) {
      return false;
    }

    return /^[0-9]$/.test(event.key);
  }
}

// ── Percentage Strategy ────────────────────────────────────────────────────

class PercentageStrategy implements InputVariantStrategy {
  format(value: string | number | null, config?: PercentageConfig): string {
    if (value == null || value === '') return '';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';

    const decimalPlaces = config?.decimalPlaces ?? 0;
    const showSymbol = config?.showSymbol ?? true;
    const formatted = num.toFixed(decimalPlaces);

    return showSymbol ? `${formatted}%` : formatted;
  }

  parse(displayValue: string, config?: PercentageConfig): number | null {
    if (!displayValue) return null;

    const cleaned = displayValue.replace(/[^0-9.\-]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;

    const min = config?.min ?? 0;
    const max = config?.max ?? 100;

    return Math.min(max, Math.max(min, num));
  }

  getInputType(): string {
    return 'text';
  }

  getInputMode(): string {
    return 'decimal';
  }

  shouldAllowKey(event: KeyboardEvent, currentValue: string): boolean {
    if (isNavigationKey(event)) return true;

    if (event.key === '.') {
      return !currentValue.includes('.');
    }

    return /^[0-9]$/.test(event.key);
  }
}

// ── Password Strategy ──────────────────────────────────────────────────────

class PasswordStrategy implements InputVariantStrategy {
  format(value: string | number | null): string {
    return value == null ? '' : String(value);
  }

  parse(displayValue: string): string {
    return displayValue;
  }

  getInputType(state?: { passwordVisible?: boolean }): string {
    return state?.passwordVisible ? 'text' : 'password';
  }

  getInputMode(): string {
    return 'text';
  }
}

// ── Strategy Map ───────────────────────────────────────────────────────────

export const VARIANT_STRATEGY_MAP: Record<InputVariant, InputVariantStrategy> = {
  text: new TextStrategy(),
  currency: new CurrencyStrategy(),
  phone: new PhoneStrategy(),
  percentage: new PercentageStrategy(),
  password: new PasswordStrategy(),
};
