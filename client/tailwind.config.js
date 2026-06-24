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
        brand: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        ink: {
          900: '#0b1417',
          800: '#162026',
          700: '#1f2c34',
          500: '#4b5b66',
          400: '#6b7a85',
          300: '#9aa6ae',
          200: '#cdd5db',
          100: '#e8ecef',
          50:  '#f5f7f8',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.03)',
        cardHover: '0 8px 24px -8px rgba(5,150,105,0.15), 0 2px 4px rgba(15,23,42,0.05)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
        'hero-grid':
          'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.06) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};
