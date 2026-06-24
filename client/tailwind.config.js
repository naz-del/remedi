/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff8f4',
          100: '#d6ece1',
          500: '#1f8a5c',
          600: '#176f49',
          700: '#0f5436',
        },
      },
    },
  },
  plugins: [],
};
