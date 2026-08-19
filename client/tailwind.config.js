/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a8f8',
          500: '#0e8ce6',
          600: '#026fc5',
          700: '#03589f',
          800: '#074b83',
          900: '#0c3f6d',
          950: '#082847',
        },
        navy: {
          800: '#0f172a',
          900: '#0a0f1d',
          950: '#050811'
        },
        emerald: {
          500: '#10b981',
          600: '#059669',
          700: '#047857'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        'card': '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.35)',
        'glow-blue': '0 0 25px rgba(14, 140, 230, 0.35)'
      }
    },
  },
  plugins: [],
}
