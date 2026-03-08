// @hakistack/ng-daisyui - Tailwind CSS v3 Preset (DaisyUI v4)
//
// This preset auto-scans the library's compiled bundle for class names
// and registers the component plugin — no manual safelist needed.
//
// Usage in tailwind.config.js:
//   module.exports = {
//     presets: [require('@hakistack/ng-daisyui/themes/daisyui-v4-preset')],
//     content: ['./src/**/*.{html,ts}'],
//     plugins: [require('daisyui')],
//   }
//
// And in your CSS:
//   @import "@hakistack/ng-daisyui/themes/daisyui-v4";

const path = require('path');
const plugin = require('./daisyui-v4-plugin.cjs');

module.exports = {
  content: [
    // Scan the compiled FESM bundle — picks up every class used in component templates
    path.join(__dirname, '..', 'fesm2022', '*.mjs'),
  ],
  plugins: [plugin],
};
