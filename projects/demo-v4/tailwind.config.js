/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "../../projects/hakistack/ng-daisyui-v4/src/**/*.{html,ts}"
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
      {
        sirat: {
               primary: '#8E487A',
               secondary: '#8E487A',
               accent: '#F0BE71',
               neutral: '#181B20',
               'base-100': '#EAE7EE',
               info: '#F0BE71',
               success: '#778E6E',
               warning: '#F0BE71',
               error: '#CB6B5D',
            }
      },
      {
        hacienda: {
          // Base colors - warm earthy tones
          'base-100': '#f7f5f2',
          'base-200': '#f0ebe3',
          'base-300': '#e3dcd0',
          'base-content': '#5a5347',

          // Primary - muted slate blue
          'primary': '#4a6a8a',
          'primary-content': '#f8fafb',

          // Secondary - darker slate blue
          'secondary': '#3d5a75',
          'secondary-content': '#f8fafb',

          // Accent - warm amber/orange
          'accent': '#d4944a',
          'accent-content': '#3d2e1f',

          // Neutral - warm gray
          'neutral': '#6b6560',
          'neutral-content': '#e8e6e3',

          // Status colors
          'info': '#7eb8e8',
          'info-content': '#1e4a6d',
          'success': '#9ed4a8',
          'success-content': '#1e4a28',
          'warning': '#d4944a',
          'warning-content': '#3d2e1f',
          'error': '#e87c6a',
          'error-content': '#6d2a1e',

          // Border radius (v4 CSS variables)
          '--rounded-box': '1rem',
          '--rounded-btn': '0.5rem',
          '--rounded-badge': '0.5rem',

          // Border width
          '--border-btn': '2px',
        }
      }
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    logs: false
  }
};
