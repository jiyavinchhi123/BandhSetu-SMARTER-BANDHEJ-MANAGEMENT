/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#A20D38',
          dark: '#880D32',
          light: '#C3224E',
          blush: '#FCEDEC',
          border: '#F0E1E1',
          50: '#FCEDEC',
          100: '#FAD8D8',
          200: '#F5B3B7',
          300: '#EE808A',
          400: '#DE475B',
          500: '#A20D38',
          600: '#880D32',
          700: '#6D0A27',
          800: '#54081E',
          900: '#3D0515',
        },
        ivory: {
          DEFAULT: '#FFF9F6',
          surface: '#FFF9F6',
          card: '#FFFFFF',
          border: '#F0E1E1',
          50: '#FFFDFB',
          100: '#FFF9F6',
          200: '#FAF0E9',
          300: '#F3E4DC',
        },
        charcoal: {
          DEFAULT: '#30232A',
          primary: '#30232A',
          secondary: '#786773',
          muted: '#9E8D99',
        },
        brand: {
          50: '#FCEDEC',
          100: '#FAD8D8',
          200: '#F5B3B7',
          300: '#EE808A',
          400: '#DE475B',
          500: '#A20D38', // Primary Maroon
          600: '#880D32', // Deep Maroon
          700: '#6D0A27',
          800: '#54081E',
          900: '#3D0515',
        },
        saffron: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        craft: {
          dark: '#30232A',
          surface: '#FFF9F6',
          card: '#FFFFFF',
          border: '#F0E1E1',
          muted: '#786773',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

