/**
 * @hakistack/ng-daisyui-v4 - Tailwind CSS v3 Plugin (CommonJS)
 *
 * Compatible with: Tailwind CSS v3 + DaisyUI v4
 *
 * Usage in tailwind.config.js:
 *   module.exports = {
 *     plugins: [
 *       require('daisyui'),
 *       require('@hakistack/ng-daisyui-v4/plugin'),
 *     ],
 *   }
 */
const plugin = require('tailwindcss/plugin');
const path = require('path');

// Absolute path to the lib's compiled FESM bundle. Plugin-contributed
// `content.files` is merged into the resolved Tailwind v3 config in
// some minor versions but not all — kept here as belt-and-suspenders.
const FESM_GLOB = path.join(__dirname, '..', 'fesm2022', '*.mjs');

// Auto-generated list of every Tailwind-class-like token extracted from
// the FESM at build time (see scripts/extract-fesm-classes.mjs). This
// is the canonical lib-side workaround for the documented Tailwind v3
// behavior where a consumer's top-level `content: [array]` REPLACES
// the preset's content — there is no other way for the lib to ensure
// its classes reach compiled CSS without consumer config changes.
//
// Tailwind v3 silently drops safelist entries that don't match any
// utility, so over-matching is harmless; the safelist itself is
// config-time only and doesn't add to compiled CSS bytes for
// non-matching entries.
let generatedClasses = [];
try {
  generatedClasses = require('./fesm-classes.cjs');
} catch {
  // First-run before build script has executed, or running from a
  // checkout that hasn't built yet. Fall back to empty — the curated
  // safelist below still covers the most critical classes.
}

module.exports = plugin(function ({ addBase, addComponents }) {
  // =====================================================
  // BASE STYLES & CSS VARIABLES
  // =====================================================
  addBase({
    ':root': {
      '--hk-transition-duration': '150ms',
      '--hk-transition-timing': 'cubic-bezier(0.4, 0, 0.2, 1)',
      '--dropdown-max-height': '25rem',
      '--dropdown-border-radius': '0.5rem',
      '--dropdown-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      '--dropdown-backdrop-blur': 'blur(8px)',
    },
  });

  // =====================================================
  // TOAST COMPONENT
  // =====================================================
  addComponents({
    '.toast-container': {
      position: 'fixed',
      display: 'flex',
      pointerEvents: 'none',
      zIndex: '9999',
      gap: '0.5rem',
    },
    '.toast-container.toast-top': {
      top: '1rem',
      flexDirection: 'column',
    },
    '.toast-container.toast-bottom': {
      bottom: '1rem',
      flexDirection: 'column-reverse',
    },
    '.toast-container.toast-start': {
      left: '1rem',
    },
    '.toast-container.toast-end': {
      right: '1rem',
    },
    '.toast-container.toast-center': {
      left: '50%',
      transform: 'translateX(-50%)',
    },
    '.toast-item': {
      pointerEvents: 'auto',
      minWidth: '320px',
      maxWidth: '420px',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 200ms ease-out',
    },
    '.toast-item.cursor-pointer': {
      cursor: 'pointer',
      transition: 'transform 150ms ease-out',
    },
    '.toast-item.cursor-pointer:hover': {
      transform: 'scale(1.02)',
    },
    '.toast-content': {
      flex: '1 1 0%',
      minWidth: '0',
    },
    '.toast-content .toast-summary': {
      fontWeight: '500',
    },
    '.toast-content .toast-detail': {
      fontSize: '0.875rem',
      opacity: '0.8',
      marginTop: '0.125rem',
      display: '-webkit-box',
      WebkitLineClamp: '2',
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    },
    '.toast-actions': {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '0.5rem',
    },
    '.toast-icon': {
      flexShrink: '0',
    },
    '.toast-dismiss': {
      flexShrink: '0',
    },
    '.toast-enter-bottom': {
      animation: 'hk-slide-in-bottom 300ms ease-out forwards',
    },
    '.toast-leave-bottom': {
      animation: 'hk-slide-out-bottom 300ms ease-in forwards',
    },
    '.toast-enter-top': {
      animation: 'hk-slide-in-top 300ms ease-out forwards',
    },
    '.toast-leave-top': {
      animation: 'hk-slide-out-top 300ms ease-in forwards',
    },
    '.toast-progress': {
      position: 'absolute',
      bottom: '0',
      left: '0',
      height: '3px',
      background: 'currentColor',
      opacity: '0.3',
      pointerEvents: 'none',
      borderRadius: '0 0 0 var(--rounded-box, 1rem)',
      transition: 'width linear',
      transitionDuration: 'var(--progress-duration, 5000ms)',
    },
    '.toast-progress.paused': {
      transitionDuration: '0ms',
      opacity: '0.5',
    },
    '.toast-item:hover .toast-progress': {
      opacity: '0.5',
    },
    '.dropdown-container': {
      borderRadius: 'var(--dropdown-border-radius)',
      boxShadow: 'var(--dropdown-shadow)',
      backdropFilter: 'var(--dropdown-backdrop-blur)',
      transformOrigin: 'top center',
      willChange: 'opacity, transform, max-height',
      contain: 'layout style paint',
      opacity: '0',
      transform: 'scaleY(0.95)',
      maxHeight: '0',
      pointerEvents: 'none',
      overflow: 'hidden',
      transition: 'opacity var(--hk-transition-duration) var(--hk-transition-timing), transform var(--hk-transition-duration) var(--hk-transition-timing), max-height var(--hk-transition-duration) var(--hk-transition-timing)',
      zIndex: '1000',
      isolation: 'isolate',
    },
    '.dropdown-container.dropdown-open': {
      opacity: '1',
      transform: 'scaleY(1)',
      maxHeight: 'var(--dropdown-max-height)',
      pointerEvents: 'auto',
    },
    '.dropdown-container.dropdown-closed': {
      opacity: '0',
      transform: 'scaleY(0.95)',
      maxHeight: '0',
      pointerEvents: 'none',
    },
    '.dropdown-container:focus-within': {
      outline: '2px solid hsl(var(--p))',
      outlineOffset: '2px',
    },
    '.step-content-wrapper': {
      animation: 'hk-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    '.step-content-wrapper.animate-forward': {
      animation: 'hk-slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    '.step-content-wrapper.animate-backward': {
      animation: 'hk-slide-in-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
  });

  // Keyframe animations
  addBase({
    '@keyframes hk-slide-in-bottom': {
      from: { transform: 'translateY(100%)', opacity: '0' },
      to: { transform: 'translateY(0)', opacity: '1' },
    },
    '@keyframes hk-slide-out-bottom': {
      from: { transform: 'translateY(0)', opacity: '1' },
      to: { transform: 'translateY(100%)', opacity: '0' },
    },
    '@keyframes hk-slide-in-top': {
      from: { transform: 'translateY(-100%)', opacity: '0' },
      to: { transform: 'translateY(0)', opacity: '1' },
    },
    '@keyframes hk-slide-out-top': {
      from: { transform: 'translateY(0)', opacity: '1' },
      to: { transform: 'translateY(-100%)', opacity: '0' },
    },
    '@keyframes hk-fade-in': {
      from: { opacity: '0' },
      to: { opacity: '1' },
    },
    '@keyframes hk-slide-in-right': {
      from: { opacity: '0', transform: 'translateX(30px)' },
      to: { opacity: '1', transform: 'translateX(0)' },
    },
    '@keyframes hk-slide-in-left': {
      from: { opacity: '0', transform: 'translateX(-30px)' },
      to: { opacity: '1', transform: 'translateX(0)' },
    },
    '@keyframes hk-fade-in-up': {
      from: { opacity: '0', transform: 'translateY(10px)' },
      to: { opacity: '1', transform: 'translateY(0)' },
    },
  });

  // Reduced motion support
  addBase({
    '@media (prefers-reduced-motion: reduce)': {
      '.toast-item, .toast-item.cursor-pointer, .dropdown-container, .step-content-wrapper': {
        transition: 'none !important',
        animation: 'none !important',
      },
      '.toast-progress': {
        transition: 'none',
        width: '100% !important',
        opacity: '0.2',
      },
      '.toast-enter-bottom, .toast-enter-top, .toast-leave-bottom, .toast-leave-top': {
        animation: 'none',
      },
    },
  });

  // =====================================================
  // DISABLED INPUT TEXT COLOR FIX
  // Override DaisyUI defaults for better readability
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
}, {
  // Plugin config merged into the user's resolved Tailwind config.
  //
  // Why both `content.files` AND `safelist`:
  //   - `content` should make Tailwind scan the FESM. But Tailwind v3
  //     has a merge quirk where a consumer's top-level `content: [array]`
  //     can override the preset's content path entirely. Plugin-contributed
  //     content is sometimes (but not always) merged depending on the
  //     consumer's Tailwind v3 minor version.
  //   - `safelist` is the bulletproof fallback. Plugin safelists ARE
  //     reliably merged into the resolved config in every Tailwind v3
  //     version. So even if scanning fails entirely, the classes the
  //     library DEFINITELY uses (datepicker grid, dynamic-form spans,
  //     editor surface tokens) still make it into the output.
  content: { files: [FESM_GLOB] },
  safelist: [
    // Auto-generated: every Tailwind-class-like token in the FESM.
    // Re-extracted on every `npm run build` so it stays in sync with
    // the lib's actual class usage.
    ...generatedClasses,
    // Static curated patterns kept as a backstop for shapes the
    // extractor's heuristics might miss (e.g. theme-bridged classes
    // built dynamically via string concatenation in component TS).
    { pattern: /^grid-cols-(1|2|3|4|5|6|7|8|9|10|11|12)$/ },
    { pattern: /^col-span-(1|2|3|4|5|6|7|8|9|10|11|12)$/ },
    { pattern: /^(sm|md|lg|xl):col-span-(1|2|3|4|5|6|7|8|9|10|11|12)$/ },
    { pattern: /^(bg|border)-base-(100|200|300)$/ },
    { pattern: /^bg-base-(200|300)\/(30|50|60|70|80)$/ },
    { pattern: /^(bg|border|text)-base-content\/(5|10|15|20|25|30|40|45|50|60|70|80|85)$/ },
    { pattern: /^(bg|text|border)-primary\/(5|10|15|20|30)$/ },
    'focus-within:border-primary',
    'focus-within:ring-2',
    'focus-within:ring-primary/20',
  ],
});
