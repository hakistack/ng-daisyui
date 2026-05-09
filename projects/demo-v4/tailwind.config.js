const path = require('path');
const ngDaisyuiPreset = require('../hakistack/ng-daisyui/themes/daisyui-v4-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [ngDaisyuiPreset],
  content: [
    path.join(__dirname, 'src/**/*.{html,ts}'),
    // Shared demo components
    path.join(__dirname, '../../projects/shared-demos/**/*.{html,ts}'),
    // Dev: scan library source directly (in prod, the preset scans the FESM bundle)
    path.join(__dirname, '../../projects/hakistack/ng-daisyui/src/**/*.{html,ts}'),
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      "light",
      "dark",
      "cupcake",
      "emerald",
      "corporate",
      "retro",
      "cyberpunk",
      "valentine",
      "garden",
      "forest",
      "lofi",
      "pastel",
      "fantasy",
      "wireframe",
      "black",
      "luxury",
      "dracula",
      "cmyk",
      "autumn",
      "business",
      "acid",
      "lemonade",
      "night",
      "coffee",
      "winter",
      "dim",
      "nord",
      "sunset",
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    logs: false
  }
};
