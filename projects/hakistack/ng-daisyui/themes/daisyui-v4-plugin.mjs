/**
 * @hakistack/ng-daisyui-v4 - Tailwind CSS v3 Plugin
 *
 * This plugin provides:
 * - Custom CSS variables for transitions
 * - Animation keyframes for toast, stepper, dropdown components
 * - Component-specific styles that require CSS animations
 * - Reduced motion support
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
import plugin from 'tailwindcss/plugin';

export default plugin(function ({ addBase, addComponents }) {
  // =====================================================
  // BASE STYLES & CSS VARIABLES
  // =====================================================
  addBase({
    ':root': {
      '--hk-transition-duration': '150ms',
      '--hk-transition-timing': 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  });

  // =====================================================
  // TOAST COMPONENT
  // =====================================================
  addComponents({
    // Container positioning
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

    // Toast item
    '.toast-item': {
      pointerEvents: 'auto',
      minWidth: '320px',
      maxWidth: '420px',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
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

    // Toast content
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

    // Toast animations
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

    // Toast progress bar
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
  });

  // =====================================================
  // DROPDOWN/SELECT COMPONENT
  // =====================================================
  addComponents({
    // Dropdown container animation
    '.dropdown-container': {
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
      backdropFilter: 'blur(8px)',
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
      maxHeight: '25rem',
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
  });

  // =====================================================
  // STEPPER COMPONENT
  // =====================================================
  addComponents({
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

  // =====================================================
  // KEYFRAME ANIMATIONS
  // =====================================================
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
  });

  // =====================================================
  // REDUCED MOTION SUPPORT
  // =====================================================
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
});
