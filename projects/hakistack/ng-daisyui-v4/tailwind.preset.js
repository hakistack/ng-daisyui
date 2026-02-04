/**
 * @hakistack/ng-daisyui-v4 - Tailwind CSS v3 Preset
 *
 * This preset bundles the plugin and safelist together for easy integration.
 *
 * Usage in tailwind.config.js:
 *   const ngDaisyuiPreset = require('@hakistack/ng-daisyui-v4/tailwind.preset');
 *
 *   module.exports = {
 *     presets: [ngDaisyuiPreset],
 *     content: [...],
 *     plugins: [
 *       require('daisyui'),
 *     ],
 *   }
 *
 * Or use components individually:
 *   const plugin = require('@hakistack/ng-daisyui-v4/plugin');
 *   const { safelist } = require('@hakistack/ng-daisyui-v4/safelist');
 *
 *   module.exports = {
 *     safelist: safelist,
 *     plugins: [require('daisyui'), plugin],
 *   }
 */

const plugin = require('./plugin.cjs');
const { safelist } = require('./safelist.cjs');

module.exports = {
  safelist: safelist,
  plugins: [plugin],
};
