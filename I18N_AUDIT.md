# i18n Audit — How Each Component Takes Its Text

Where the built-in, user-visible English strings of `@hakistack/ng-daisyui` can be replaced, and whether a replacement follows a runtime language switch.

The library stays i18n-agnostic: it imports neither Transloco nor `@hakistack/i18n`. Apps connect any translation system (or none) through the surfaces below, and get runtime switching by handing the library **signals**.

User content (field labels, column headers, menu items, toast messages) is never translated by the library: the app passes it in, so the app translates it.

_Last reviewed: 2026-11-17._

## Status by component

| Component                  | Surface                                                                                                                | Follows a language switch?                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| DataGrid                   | `provideHkDataGridLabels(...)` + `[labels]` input                                                                      | Yes: signal/function source, or the input |
| PDF viewer / PDF workspace | `provideHkPdfLabels(...)`                                                                                              | Yes: signal/function source               |
| Document workspace         | `provideHkDocumentWorkspaceLabels(...)`                                                                                | Yes: signal/function source               |
| Notification host          | `provideHkNotificationLabels(...)`                                                                                     | Yes: signal/function source               |
| Command palette            | `provideHkCommandPaletteLabels(...)`                                                                                   | Yes: signal/function source               |
| Dynamic form               | `provideHkDynamicFormLabels(...)` (alias: `provideDynamicFormLabels`) + per-form `stepperConfig.*Text`                 | Yes: signal/function source               |
| Datepicker                 | `[labels]` input (`DatepickerLabels`); month/day names from `[locale]` via `Intl`                                      | Yes: input                                |
| Select                     | One input per string (`placeholder`, `searchPlaceholder`, `selectAllLabel`, `clearAllLabel`, `noOptionsFoundLabel`, …) | Yes: inputs                               |
| Stepper                    | `previousButtonText`, `nextButtonText`, `completeButtonText`, `optionalLabel` inputs                                   | Yes: inputs                               |
| Timepicker                 | `hourLabel`, `minuteLabel`, `secondLabel`, `nowLabel`, `clearLabel`, `closeLabel` inputs                               | Yes: inputs                               |
| Input                      | `showPasswordAriaLabel` / `hidePasswordAriaLabel` inputs                                                               | Yes: inputs                               |
| Tree                       | `labels` in the tree config (`TreeLabels`)                                                                             | Only if the app rebuilds the config       |
| Table (hk-table)           | `labels`, `filterLabels`, pagination / global-search / column-visibility `labels` in `createTable`                     | Only if the app rebuilds the config       |
| Toast                      | `provideToast({ labels })` (`ToastLabels`: online/offline messages, severity names)                                    | No: read once                             |
| Alert                      | `provideAlert({ labels })` or `provideAlert({ translate, langChange$ })`                                               | Yes, through `translate` + `langChange$`  |

Clean (no built-in text): TabGroup / TabPanel, OrganizationChart, VirtualScroller, DialogWrapper / DialogService, FormStateService, AccessibilityService, helpers.

## App-wide providers: three forms

Every `provide*Labels()` accepts `HkLabelsSource<T>` (`lib/utils/labels-source.ts`):

1. **A labels object.** Fixed text. The original form; unchanged.
2. **A `Signal<T>`.** Components read it in a `computed()`, so changing it re-renders them (OnPush included).
3. **A function `() => T | Signal<T>`.** Run once, in the environment injector's injection context and outside any reactive context, when the token is first injected. It may call `inject()`, `toSignal()` or `translateSignal()`. Return a `computed()` over translation signals to follow language switches.

```ts
// app.config.ts — works with Transloco or @hakistack/i18n (re-exports Transloco's translateSignal)
provideHkDataGridLabels(() => {
  const empty = translateSignal('grid.empty');
  const search = translateSignal('grid.search');
  return computed(() => ({ empty: empty(), searchPlaceholder: search() }));
}),
```

The function form runs once, not inside the `computed()`, because Transloco's `translateSignal` calls `toSignal()`, which throws inside a reactive context.

Components consume tokens with `injectLabels(TOKEN)`, which returns `Signal<T | null>` and also accepts a value registered directly with `{ provide: TOKEN, useValue }` in any of the three forms. The token types are now `InjectionToken<HkLabelsSource<T>>`. Code that injected a token itself and read it as a plain object must read it through `injectLabels()`. The library never did this outside its own components.

### Naming: `provideDynamicFormLabels` → `provideHkDynamicFormLabels`

The dynamic form was the only labels provider without the `Hk` prefix. `provideHkDynamicFormLabels` and `HK_DYNAMIC_FORM_LABELS` are now the documented names, matching the other five. `provideDynamicFormLabels` stays exported as a permanent alias (same token, same behavior). It is not deprecated, because renaming working code gains nothing. The `DYNAMIC_FORM_LABELS` constant (never part of the public API) is kept in the module as an alias of the same token.

## Remaining gaps

- **Form validation messages are English.** Built from the field label (“Email is required”), not part of `DynamicFormLabels`. Workaround: the form-level `validate` function of `createForm`.
- **Automatic placeholders.** Field builders without `placeholder` generate an English one (“Enter email”). Pass `placeholder`.
- **Toast labels are read once.** `provideToast({ labels })` takes a plain object; switching language needs a reload. Candidate for `HkLabelsSource`.
- **Tree / Table labels live in builder config.** They follow a switch only if the app recreates the config. Candidate: accept a `Signal` in `labels`.
- **Alert has its own bridge** (`translate` + `langChange$`) instead of `HkLabelsSource`. It works with any library; aligning it with the signal model is optional.
