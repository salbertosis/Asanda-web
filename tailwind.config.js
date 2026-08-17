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
          ink: '#123047',
          deep: '#087f84',
          navy: '#1646b8',
          blue: '#245fd1',
          cyan: '#0aafb5',
          aqua: '#18c7a1',
          lime: '#73c947',
          orange: '#c9582d',
          'orange-strong': '#bd4f27',
          mist: '#e1f4ee',
          'blue-soft': '#e8edff',
          'blue-pale': '#f3f6ff',
          'blue-line': '#bccaf0',
          surface: '#e8f5f1',
          foam: '#f4fbf8',
          line: '#cce5df',
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

