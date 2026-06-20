const path = require('path');

/**
 * This app consumes @hakistack/ng-daisyui exactly like an EXTERNAL v4 consumer:
 * it does NOT scan the library's source/FESM and uses no ng-daisyui preset.
 * The library's own classes come from the precompiled
 * `@hakistack/ng-daisyui/styles-v4.css` (imported in src/styles.css). Here we
 * only scan THIS app's code (the demo shell + the shared demo pages).
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: [
    path.join(__dirname, 'src/**/*.{html,ts}'),
    // Shared demo pages (this app's own code)
    path.join(__dirname, '../../projects/shared-demos/**/*.{html,ts}'),
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
