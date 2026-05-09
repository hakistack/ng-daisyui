/**
 * @hakistack/ng-daisyui — Tailwind CSS v3 Plugin (DaisyUI v4 compat)
 *
 * Intentionally minimal. Native daisyUI v4 is the visual baseline; this
 * plugin only contributes:
 *
 *   1. A real daisyUI v4 compatibility patch: text-color fix on disabled
 *      input/select/textarea so Material Angular and other consumer
 *      stacks render readable disabled values. (DaisyUI v4 sets these
 *      to `hsl(var(--bc) / 0.4)` which is too faint over Material's
 *      tinted backgrounds.)
 *
 *   2. Plugin-config plumbing for content scanning + safelist injection
 *      (see comment on the second argument of plugin() below). Required
 *      so the consumer's compiled CSS contains every utility class the
 *      lib's FESM references — Tailwind v3 has no first-class library
 *      content-injection API (https://v3.tailwindcss.com/docs/presets).
 *
 * Notably NOT here (removed in 0.1.91+ to match native daisyUI v4):
 *   - Custom toast positioning / animation classes
 *   - Custom dropdown animation chrome (backdrop-blur, scale transitions)
 *   - Custom stepper transitions
 *   - Custom keyframes
 *   - Reduced-motion overrides for the above
 *
 * Components inside the lib that referenced those classes have moved to
 * daisyUI's own equivalents (`.toast`, `.menu`, etc.) so removing the
 * plugin chrome doesn't leave them visually broken.
 *
 * Usage in tailwind.config.js (consumed via the v4 preset):
 *
 *   const ngDaisyuiPreset = require('@hakistack/ng-daisyui/themes/daisyui-v4-preset');
 *   module.exports = {
 *     presets: [ngDaisyuiPreset],
 *     content: ['./src/**\/*.{html,ts}'],
 *     plugins: [require('daisyui')],
 *   };
 */
const plugin = require('tailwindcss/plugin');
const path = require('path');

const FESM_GLOB = path.join(__dirname, '..', 'fesm2022', '*.mjs');

// Auto-generated list of every Tailwind-class-like token extracted from
// the FESM at build time (see scripts/extract-fesm-classes.mjs). Spread
// into the plugin's safelist so consumers' compiled CSS includes every
// utility the lib uses, regardless of how their `content` array is
// shaped. Tailwind silently drops entries that don't match a utility.
let generatedClasses = [];
try {
  generatedClasses = require('./fesm-classes.cjs');
} catch {
  // Pre-build state — empty fallback. The static safelist patterns
  // below still cover the most critical classes.
}

module.exports = plugin(
  function ({ addBase }) {
    // =====================================================
    // DISABLED INPUT TEXT COLOR FIX
    // Override DaisyUI defaults for better readability
    // Using addBase for element/attribute selectors
    // DaisyUI v4 uses hsl(var(--bc)) for base-content color
    // =====================================================
    addBase({
      '.input:disabled, .input[disabled]': {
        color: 'hsl(var(--bc) / 0.85) !important',
        '-webkit-text-fill-color': 'hsl(var(--bc) / 0.85) !important',
        opacity: '1 !important',
      },
      '.select:disabled, .select[disabled]': {
        color: 'hsl(var(--bc) / 0.85) !important',
        '-webkit-text-fill-color': 'hsl(var(--bc) / 0.85) !important',
        opacity: '1 !important',
      },
      '.textarea:disabled, .textarea[disabled]': {
        color: 'hsl(var(--bc) / 0.85) !important',
        '-webkit-text-fill-color': 'hsl(var(--bc) / 0.85) !important',
        opacity: '1 !important',
      },
    });
  },
  {
    // Plugin config — merged into the user's resolved Tailwind v3 config.
    //
    // Why both `content.files` AND `safelist`:
    //   - `content.files` should make Tailwind scan the FESM. Plugin-
    //     contributed content is merged in some Tailwind v3 minors but
    //     not others.
    //   - `safelist` is the bulletproof fallback — reliably merged in
    //     every minor version, so even if scanning fails the classes
    //     the lib uses still land in compiled CSS.
    content: { files: [FESM_GLOB] },
    safelist: [
      // Auto-generated from the FESM at lib build time (see
      // scripts/extract-fesm-classes.mjs) — covers every literal class
      // the lib actually uses. No regex backstops: every pattern we
      // tried generated Tailwind v3 "doesn't match any classes" warnings
      // because daisyUI's color tokens aren't registered as Tailwind
      // theme entries at safelist-validation time.
      ...generatedClasses,
      // Layout grids / col-spans built dynamically via string-concat
      // in component TS (e.g. dynamic-form's `colSpan` input). Pattern
      // form is fine here because grid-cols-N / col-span-N are stock
      // Tailwind theme entries, no daisyUI dependency.
      { pattern: /^grid-cols-(1|2|3|4|5|6|7|8|9|10|11|12)$/ },
      { pattern: /^col-span-(1|2|3|4|5|6|7|8|9|10|11|12)$/, variants: ['sm', 'md', 'lg', 'xl'] },
    ],
  },
);
