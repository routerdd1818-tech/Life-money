/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: {
          light: '#F6F7F9',
          dark: '#0E1116',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#161B22',
        },
        elevated: {
          light: '#F0F2F6',
          dark: '#1F2631',
        },
        border: {
          light: '#EAEDF2',
          dark: '#262C36',
        },
        ink: {
          primary: '#191F28',
          secondary: '#4E5968',
          muted: '#8B95A1',
        },
        brand: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
        },
        twUp: '#F04452',
        twDown: '#059669',
      },
    },
  },
  plugins: [],
};
