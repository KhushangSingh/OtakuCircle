/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Sets 'Outfit' as the default sans-serif font for the app
        sans: ['Outfit', 'sans-serif'], 
      },
    },
  },
  plugins: [],
}