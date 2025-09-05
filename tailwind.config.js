/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'brand-pink': '#d85f9c',
        'brand-yellow': '#e2d151',
        'brand-blue': '#a1cfd2',
      }
    },
  },
  plugins: [],
}
