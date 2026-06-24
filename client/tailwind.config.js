/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // NHS Blue scale — dominant brand colour per NHS Identity Guidelines.
        // 500 = NHS Blue (#005EB8), 800 = NHS Dark Blue (#003087).
        brand: {
          50:  '#e8f1fa',
          100: '#c8def3',
          200: '#98c0e8',
          300: '#6ba3dd',
          400: '#4188d2',
          500: '#005EB8',
          600: '#00509e',
          700: '#003f7e',
          800: '#003087',
          900: '#001e5e',
        },
        // NHS Bright Blue / Light Blue — supporting, moderate use.
        brightBlue: { 500: '#0072CE', 300: '#41B6E6', 100: '#aedcf2' },
        aquaBlue: { 500: '#00A9CE' },

        // NHS Green scale — moderate accent, reinforces the reuse / sustainability angle.
        // 500 = NHS Green (#009639), 700 = NHS Dark Green (#006747).
        accent: {
          50:  '#e6f4ec',
          100: '#c2e4cf',
          200: '#9bd3b1',
          300: '#6fc18f',
          400: '#33ad6a',
          500: '#009639',
          600: '#007e2f',
          700: '#006747',
          800: '#00532e',
          900: '#003c20',
        },
        // NHS Highlight colours — very minimal use (errors, warnings, special states).
        nhs: {
          warmYellow: '#FFB81C',
          orange: '#ED8B00',
          red: '#DA291C',
          darkRed: '#8A1538',
          pink: '#AE2573',
          purple: '#330072',
          lightGreen: '#78BE20',
          aquaGreen: '#00A499',
        },

        // Neutrals — NHS Black, Dark Grey, Mid Grey, Pale Grey with interpolated steps.
        ink: {
          50:  '#F8FAFB',
          100: '#E8EDEE', // NHS Pale Grey
          200: '#D0D7DA',
          300: '#A8B3B8',
          400: '#768692', // NHS Mid Grey
          500: '#5A6973',
          700: '#425563', // NHS Dark Grey
          800: '#2D3A44',
          900: '#231F20', // NHS Black
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(35,31,32,0.04), 0 1px 1px rgba(35,31,32,0.03)',
        cardHover: '0 8px 24px -8px rgba(0,94,184,0.18), 0 2px 4px rgba(35,31,32,0.05)',
      },
      backgroundImage: {
        // NHS Blue dominant gradient for primary surfaces.
        'brand-gradient': 'linear-gradient(135deg, #005EB8 0%, #003087 100%)',
        // Accent gradient (NHS Green) reserved for sustainability/reuse motifs.
        'accent-gradient': 'linear-gradient(135deg, #009639 0%, #006747 100%)',
      },
    },
  },
  plugins: [],
};
