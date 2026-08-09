/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Habilitar modo oscuro con clase
  theme: {
    extend: {
      fontFamily: {
        sans: ['Aptos', 'Segoe UI', 'sans-serif'],
        display: ['Bahnschrift Condensed', 'DIN Condensed', 'Aptos Narrow', 'sans-serif'],
        brand: ['Palatino Linotype', 'Book Antiqua', 'Georgia', 'serif'],
      },
      colors: {
        asanda: {
          ink: '#061a2e',
          navy: '#0a3154',
          blue: '#075f9d',
          cyan: '#14b8d4',
          foam: '#f4f9fb',
          line: '#c8dce7',
        },
        dark: {
          bg: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
        }
      }
    },
  },
  plugins: [],
}

