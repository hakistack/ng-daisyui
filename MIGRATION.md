# Dynamic Form API Migration Guide

## Overview

The `field.*()` builder API has been refactored for consistency, type safety, and developer experience. This is a **breaking change** — all existing `field.*()` calls need updating.

### Key Principles

- **Every field**: `field.*(key, label?, options?)`
- **Dropdown items**: renamed from `options` to `choices`
- **Validation**: flattened into the options bag (no more nested `validation: {}`)
- **Type-narrowed**: each field type only accepts relevant options

---

## 1. Consistent Signature

All field builders now use: `field.*(key, label?, options?)`

### `field.select()` / `field.multiSelect()` / `field.radio()`

Dropdown items moved from positional argument to `choices` in options.

```typescript
// BEFORE
field.select('country', ['USA', 'Canada', 'UK'], 'Country')
field.select('country', ['USA', 'Canada', 'UK'], 'Country', { required: true })

// AFTER
field.select('country', 'Country', { choices: ['USA', 'Canada', 'UK'] })
field.select('country', 'Country', { choices: ['USA', 'Canada', 'UK'], required: true })
```

```typescript
// BEFORE
field.multiSelect('langs', ['English', 'Spanish'], 'Languages')

// AFTER
field.multiSelect('langs', 'Languages', { choices: ['English', 'Spanish'] })
```

```typescript
// BEFORE
field.radio('gender', ['Male', 'Female', 'Other'], 'Gender')

// AFTER
field.radio('gender', 'Gender', { choices: ['Male', 'Female', 'Other'] })
```

Object-style choices work the same way:

```typescript
// BEFORE
field.select('role', [{ value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }], 'Role')

// AFTER
field.select('role', 'Role', {
  choices: [{ value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }],
})
```

### `field.range()`

`min` and `max` moved from positional arguments to options.

```typescript
// BEFORE
field.range('score', 1, 10, 'Score')
field.range('score', 1, 10, 'Score', { defaultValue: 5 })

// AFTER
field.range('score', 'Score', { min: 1, max: 10 })
field.range('score', 'Score', { min: 1, max: 10, defaultValue: 5 })
```

> `min` defaults to `0`, `max` defaults to `100` if not provided.

### `field.hidden()`

Value moved to `defaultValue` in options. No label parameter.

```typescript
// BEFORE
field.hidden('userId', '123')
field.hidden('token', 'abc', { cssClass: 'x' })

// AFTER
field.hidden('userId', { defaultValue: '123' })
field.hidden('token', { defaultValue: 'abc' })
```

### Unchanged signatures

These already used `(key, label?, options?)` and remain the same:

- `field.text()`
- `field.email()`
- `field.password()`
- `field.textarea()`
- `field.number()`
- `field.checkbox()`
- `field.toggle()`
- `field.date()`
- `field.file()`

---

## 2. Flattened Validation

Validation properties are now top-level in the options bag. No more nested `validation: {}`.

### Before

```typescript
field.text('name', 'Name', {
  required: true,
  validation: { minLength: 3, maxLength: 50 },
})

field.number('age', 'Age', {
  validation: { min: 18, max: 120 },
})

field.text('code', 'Code', {
  validation: { pattern: '^[A-Z]{3}$' },
})

field.text('word', 'Word', {
  validation: { custom: [myValidator] },
})
```

### After

```typescript
field.text('name', 'Name', {
  required: true,
  minLength: 3,
  maxLength: 50,
})

field.number('age', 'Age', {
  min: 18,
  max: 120,
})

field.text('code', 'Code', {
  pattern: '^[A-Z]{3}$',
})

field.text('word', 'Word', {
  customValidators: [myValidator],
})
```

### Validation helpers

Validation helpers now return flat objects. Use spread (`...`) instead of nesting.

```typescript
// BEFORE
field.password('pw', 'Password', { validation: validation.password(8) })
field.number('age', 'Age', { validation: validation.number(18, 120) })

// AFTER
field.password('pw', 'Password', { ...validation.password(8) })
field.number('age', 'Age', { ...validation.number(18, 120) })
```

The helpers still exist and return the same semantic values:

| Helper | Returns |
|--------|---------|
| `validation.required(min?, max?)` | `{ required: true, minLength?, maxLength? }` |
| `validation.email(required?)` | `{ required, email: true }` |
| `validation.password(minLen?, strong?)` | `{ required: true, minLength, pattern? }` |
| `validation.number(min?, max?, required?)` | `{ required, min, max }` |
| `validation.custom(...validators)` | `{ customValidators: [...] }` |

---

## 3. `options` Renamed to `choices`

The word "options" was overloaded — it meant both "dropdown choices" and "field configuration". Now:

- **`choices`** = dropdown items (select, multiSelect, radio)
- **options bag** = field configuration (3rd argument)

```typescript
// BEFORE — "options" means two different things
field.select('role',
  ['Admin', 'User'],       // select options (dropdown choices)
  'Role',
  { required: true }       // field options (configuration)
)

// AFTER — clear distinction
field.select('role', 'Role', {
  choices: ['Admin', 'User'],  // dropdown choices
  required: true,              // field configuration
})
```

### `optionsFrom` (dependent fields)

No more dummy empty array. Just pass `optionsFrom` directly.

```typescript
// BEFORE — forced empty [] placeholder
field.select('state', [], 'State', {
  optionsFrom: {
    field: 'country',
    loadFn: (country) => api.getStates(country),
  },
})

// AFTER — clean
field.select('state', 'State', {
  optionsFrom: {
    field: 'country',
    loadFn: (country) => api.getStates(country),
  },
})
```

---

## 4. New Field Builders

Five new field types that previously had no shortcut:

```typescript
field.tel('phone', 'Phone Number', { pattern: '^\\d{10}$' })

field.url('website', 'Website', { placeholder: 'https://...' })

field.color('accent', 'Accent Color')

field.time('meeting', 'Meeting Time')

field.datetime('start', 'Start Date/Time')
```

---

## 5. Type-Narrowed Options

Each field builder now accepts only relevant options. TypeScript will flag invalid combinations.

| Field Type | Options Interface | Extra Properties |
|------------|------------------|-----------------|
| `text`, `email`, `password`, `tel`, `url` | `TextFieldOptions` etc. | `minLength`, `maxLength`, `pattern` |
| `textarea` | `TextareaFieldOptions` | `rows`, `cols`, `minLength`, `maxLength` |
| `number` | `NumberFieldOptions` | `min`, `max`, `step` |
| `range` | `RangeFieldOptions` | `min`, `max`, `step` |
| `select` | `SelectFieldOptions` | `choices`, `optionsFrom`, `enableSearch` |
| `multiSelect` | `MultiSelectFieldOptions` | `choices`, `optionsFrom`, `enableSearch` |
| `radio` | `RadioFieldOptions` | `choices`, `optionsFrom`, `orientation` |
| `checkbox`, `toggle` | `CheckboxFieldOptions` etc. | _(base only)_ |
| `date` | `DateFieldOptions` | `isRange` |
| `time`, `datetime`, `color` | `TimeFieldOptions` etc. | _(base only)_ |
| `file` | `FileFieldOptions` | `accept`, `multiple` |
| `hidden` | `HiddenFieldOptions` | `defaultValue` only |

All types extend `BaseFieldOptions` which provides: `placeholder`, `defaultValue`, `helpText`, `colSpan`, `width`, `cssClass`, `containerClass`, `hidden`, `disabled`, `required`, `prefix`, `suffix`, `focusOnLoad`, `showWhen`, `hideWhen`, `requiredWhen`, `disabledWhen`, `customValidators`.

---

## 6. Internal `FormFieldConfig` Changes

If you construct `FormFieldConfig` objects directly (bypassing builders), these properties changed:

| Before | After |
|--------|-------|
| `validation: { required: true }` | `required: true` |
| `validation: { minLength: 3 }` | `minLength: 3` |
| `validation: { maxLength: 50 }` | `maxLength: 50` |
| `validation: { min: 0 }` | `min: 0` |
| `validation: { max: 100 }` | `max: 100` |
| `validation: { email: true }` | `email: true` |
| `validation: { pattern: /.../ }` | `pattern: /.../` |
| `validation: { custom: [...] }` | `customValidators: [...]` |
| `options: [...]` | `choices: [...]` |
| `isSelectSearchable: true` | `enableSearch: true` |

The `FieldValidation` interface has been removed.

---

## Quick Find & Replace Guide

For most codebases, these mechanical replacements cover 90% of the migration:

1. `field.select('key', [choices], 'Label'` → `field.select('key', 'Label', { choices: [choices]`
2. `field.multiSelect('key', [choices], 'Label'` → `field.multiSelect('key', 'Label', { choices: [choices]`
3. `field.radio('key', [choices], 'Label'` → `field.radio('key', 'Label', { choices: [choices]`
4. `field.range('key', MIN, MAX, 'Label'` → `field.range('key', 'Label', { min: MIN, max: MAX`
5. `field.hidden('key', VALUE)` → `field.hidden('key', { defaultValue: VALUE })`
6. `validation: validation.password(` → `...validation.password(`
7. `validation: validation.number(` → `...validation.number(`
8. `validation: { minLength:` → `minLength:`
9. `validation: { maxLength:` → `maxLength:`
10. `validation: { min:` → `min:`
11. `validation: { max:` → `max:`
12. `validation: { pattern:` → `pattern:`
13. `validation: { custom:` → `customValidators:`
