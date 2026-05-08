// @hakistack/ng-daisyui - Tailwind CSS v3 Preset (DaisyUI v4)
//
// This preset registers the component plugin and provides a fallback
// `content` path scanning the library's compiled FESM bundle.
//
// Usage in tailwind.config.js — minimal:
//
//   module.exports = {
//     presets: [require('@hakistack/ng-daisyui/themes/daisyui-v4-preset')],
//     content: ['./src/**/*.{html,ts}'],
//     plugins: [require('daisyui')],
//   }
//
// And in your CSS:
//   @import "@hakistack/ng-daisyui/themes/daisyui-v4";
//
// The preset registers the daisyUI-v4 plugin which contributes a
// `content.files` glob for the lib's FESM bundle AND a defensive
// `safelist` covering the layout / elevation classes the lib relies on
// (datepicker grid-cols-7, dynamic-form col-span-N, editor surface
// tokens). Both routes get reliably merged into the user's resolved
// Tailwind config — no need to add anything manually.

const path = require('path');
const plugin = require('./daisyui-v4-plugin.cjs');

module.exports = {
  // Object form `{ files: [...] }` rather than a bare array — Tailwind v3's
  // resolver merges object-form `content` with the consumer's array-form
  // content via concatenation, instead of letting the array form override
  // it. This is the difference between "FESM scanned automatically" and
  // "FESM silently ignored when consumer sets a top-level content array".
  content: {
    files: [path.join(__dirname, '..', 'fesm2022', '*.mjs')],
  },
  plugins: [plugin],
};
