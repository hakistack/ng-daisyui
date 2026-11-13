# Form-control components & input directives

All of `hk-input`, `hk-select`, `hk-datepicker`, `hk-timepicker` implement `ControlValueAccessor` — use `[formControl]`, `formControlName`, or `[(ngModel)]`.

> Project memory: if `hk-select` "won't open", the app likely wrapped it in a `<label>` (label forwards click → toggles open+closed). The library arrow works in v4/v5 — check app markup first.

## `hk-input` (InputComponent)

Inputs: `variant` (`'text'|'currency'|'phone'|'percentage'|'password'`, def `text`), `size` (`xs|sm|md|lg|xl`), `color` (`neutral|primary|secondary|accent|info|success|warning|error|null`), `placeholder`, `disabled`, `readonly`, `prefixIcon`/`suffixIcon` (Lucide name), `prefixText`/`suffixText`, `maxlength`, `minlength`, `autocomplete`, `name`, `ariaLabel`, `ariaDescribedBy`, `ariaInvalid`. Config objects: `currencyConfig` (`{ locale, currency, decimalPlaces, showSymbol, allowNegative }`), `phoneConfig` (`{ country, format: 'national'|'international' }`), `percentageConfig` (`{ decimalPlaces, min, max, showSymbol }`), `passwordConfig` (`{ showToggle }`).
Output: `(valueChange)` → `string | number | null`.

```html
<hk-input placeholder="Search…" prefixIcon="search" />
<hk-input variant="currency" [formControl]="amount" [currencyConfig]="{ locale: 'en-US', currency: 'USD', decimalPlaces: 2 }" />
<hk-input variant="phone" [formControl]="phone" />          <!-- raw "5551234567", display formatted on blur -->
<hk-input variant="password" [formControl]="pw" />          <!-- show/hide toggle -->
<hk-input variant="percentage" [percentageConfig]="{ min: 0, max: 100 }" [formControl]="pct" />
```

## `hk-select` (SelectComponent)

Inputs: `options: SelectOption[]` (`{ value, label, group?, disabled? }`), `multiple`, `enableSearch`, `searchPlaceholder`, `placeholder`, `size`, `color`, `allowClear` (def true), `virtualScroll`, `disabled`, `maxSelectedItems`, `showSelectAll` (def true), `chipDisplay` (def true), `maxChipsVisible` (def 3), plus label overrides (`selectAllLabel`, `clearAllLabel`, `selectedSuffix`, `noOptionsFoundLabel`, …).
Outputs: `(selectionChange)` → `SelectOption | SelectOption[] | null`, `(searchChange)` → string, `(dropdownToggle)` → boolean.
Methods: `toggleDropdown`, `selectOption`, `selectAll`, `deselectAll`, `clearSelection`, `isSelected`.

```html
<hk-select [options]="countries" [enableSearch]="true" [allowClear]="true" placeholder="Country"
           [formControl]="country" />
<hk-select [options]="fruits" [multiple]="true" [showSelectAll]="true" [maxChipsVisible]="2" [formControl]="picks" />
<hk-select [options]="thousandItems" [virtualScroll]="true" [enableSearch]="true" />
```
Grouped: give each option a `group` string. Searchable select is fuzzy (Fuse-backed for large lists).

## `hk-datepicker` (DatepickerComponent — CVA + Validator)

Value: `Date | null` (single), `{ start: Date; end: Date } | null` (range), `Date` with time when `showTime`.
Inputs: `range`, `showTime`, `use24Hour`, `minuteStep`, `placeholder`, `disabled`, `locale` (def `en-US`), `labels`, `minDate`, `maxDate`, `disabledDates: Date[]`, `disabledDaysOfWeek: number[]` (0=Sun…6=Sat), `showWeekNumbers`, `firstDayOfWeek`, `closeOnSelect` (def true), `showClearButton` (def true), `showTodayButton`, `dropdownPosition` (`bottom-left|bottom-right|top-left|top-right`), `minWidth` (def `20rem`), `required`, `customDateFormatter`, `customRangeFormatter`.
Outputs: `(selectionChange)` → `DatepickerEvent`, `(dateSelected)`, `(rangeSelected)`, `(pickerOpened)`, `(pickerClosed)`, `(viewChanged)`.
Methods: `togglePicker`, `openPicker`, `closePicker`, `selectDate`, `selectToday`, `clearSelection`, `setView('days'|'months'|'years')`.

```html
<hk-datepicker [formControl]="date" placeholder="Pick a date" [showTodayButton]="true" />
<hk-datepicker [formControl]="range" [range]="true" placeholder="Date range" />
<hk-datepicker [formControl]="dt" [showTime]="true" [use24Hour]="false" [minuteStep]="15" />
<hk-datepicker [formControl]="d" [minDate]="min" [maxDate]="max" [disabledDaysOfWeek]="[0,6]" />
```

## `hk-timepicker` (TimepickerComponent — CVA + Validator)

Value: string `"HH:MM"` or `"HH:MM:SS"` (always 24-hour internally).
Inputs: `placeholder`, `use24Hour` (def true), `showSeconds`, `minuteStep`, `secondStep`, `closeOnSelect`, `showClearButton`, `showNowButton`, `dropdownPosition`, `minWidth` (def `16rem`), `required`, `minTime`/`maxTime` (`"HH:MM"`), `clockFace` (analog UI), `disabled`.
Outputs: `(timeChange)` → `TimepickerEvent`, `(pickerOpened)`, `(pickerClosed)`.
Methods: `togglePicker`, `openPicker`, `closePicker`, `selectNow`, `clearSelection`, `setView('hours'|'minutes'|'seconds')`, `selectHour/Minute/Second`, `togglePeriod`.

```html
<hk-timepicker [formControl]="time" />                       <!-- "14:30" -->
<hk-timepicker [formControl]="time" [use24Hour]="false" />
<hk-timepicker [formControl]="time" [showSeconds]="true" [minuteStep]="5" />
<hk-timepicker [formControl]="time" [clockFace]="true" />
<hk-timepicker [formControl]="time" minTime="09:00" maxTime="17:00" />
```

## `[hkInputMask]` directive (works on plain `<input>`)

Mask chars: `9`=digit, `a`=letter, `*`=alphanumeric; anything else is literal; `?` marks the rest optional.
Inputs: `hkInputMask` (pattern, required), `slotChar` (def `_`), `autoClear` (def true), `unmask` (def false → emit raw chars only).
Outputs: `(maskValueChange)` → string, `(maskComplete)`.

```html
<input class="input input-bordered" hkInputMask="(999) 999-9999" (maskValueChange)="phone.set($event)" />
<input class="input input-bordered" hkInputMask="9999 9999 9999 9999" [unmask]="true"
       (maskComplete)="submit()" (maskValueChange)="card.set($event)" />
<input class="input input-bordered" hkInputMask="99/99/9999" placeholder="MM/DD/YYYY" />
```

## `[appAutoFocus]` directive

Focuses the host element after view init (via `queueMicrotask`).
```html
<input appAutoFocus placeholder="Auto-focused" />
```
