/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 1.5s linear infinite',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        base: ['15px', { lineHeight: '1.5' }],
      },
      colors: {
        primary: { 600: '#2563eb', 700: '#1d4ed8' },
        slate: { 850: '#172033' },
      },
    },
  },
  plugins: [],
};
