/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        'brand-pink': '#d85f9c',
        'brand-yellow': '#e2d151',
        'brand-blue': '#a1cfd2',
        
        // Pink shades (from darkest to lightest)
        'pink': {
          900: '#a8477a',
          800: '#c4538b',
          700: '#d85f9c',
          600: '#e075ad',
          500: '#e88bbe',
          400: '#f0a1cf',
          300: '#f8b7e0',
          200: '#ffcdf1',
          100: '#ffe3ff',
          50: '#fff9ff'
        },
        
        // Yellow shades (from darkest to lightest)
        'yellow': {
          900: '#b59a41',
          800: '#d1b649',
          700: '#e2d151',
          600: '#e8d96a',
          500: '#ede183',
          400: '#f3e99c',
          300: '#f9f1b5',
          200: '#fff9ce',
          100: '#fffde7',
          50: '#fffff9'
        },
        
        // Blue shades (from darkest to lightest)
        'blue': {
          900: '#81a5a8',
          800: '#91babe',
          700: '#a1cfd2',
          600: '#b1d7da',
          500: '#c1dfe2',
          400: '#d1e7ea',
          300: '#e1eff2',
          200: '#f1f7fa',
          100: '#f9fbfc',
          50: '#fdfeffe'
        }
      }
    },
  },
  plugins: [],
};
