/**
 * @hakistack/ng-daisyui-v4
 *
 * @deprecated This package is deprecated. Use `@hakistack/ng-daisyui` with
 * `provideHkTheme('daisyui-v4')` instead. All exports are re-exported from
 * `@hakistack/ng-daisyui` for backwards compatibility.
 *
 * Migration guide:
 * 1. Install `@hakistack/ng-daisyui`
 * 2. Replace imports: `@hakistack/ng-daisyui-v4` → `@hakistack/ng-daisyui`
 * 3. Add `provideHkTheme('daisyui-v4')` to your app config providers
 * 4. Import CSS: `@import "@hakistack/ng-daisyui/themes/daisyui-v4.css"`
 * 5. Import styles: `@import "@hakistack/ng-daisyui/styles.css"`
 */

// Re-export everything from the main library
export * from '@hakistack/ng-daisyui';
