/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        harbor: { DEFAULT: '#0E3B43', 700: '#144B55', 500: '#1B6573', 300: '#7FB3BC' },
        mist: '#EEF2F3',
        ink: '#14232B',
        line: '#D3DCDF',
        signal: '#F2B134',
        danger: '#B3261E',
      },
      fontFamily: { sans: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
