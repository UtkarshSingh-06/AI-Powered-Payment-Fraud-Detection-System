/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0a0f0a',
        'dark-surface': '#0d1a0d',
        'dark-card': '#0f1f0f',
        'dark-green': '#0d4d26',
        'dark-green-light': '#15803d',
        'dark-green-dark': '#052e16',
        'accent-green': '#22c55e',
        'accent-green-light': '#4ade80',
        'accent-green-dark': '#16a34a',
        'pure-white': '#ffffff',
        'pure-black': '#000000',
        'gray-light': '#f5f5f5',
        'gray-dark': '#1a1a1a',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
