/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Sets 'DM Sans' as the default sans-serif font for the app
        sans: ['"DM Sans"', 'sans-serif'], 
      },
    },
  },
  plugins: [],
}
