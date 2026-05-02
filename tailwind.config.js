/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        serif: ["'Instrument Serif'", "serif"],
      },
    },
  },
  plugins: [],
};
