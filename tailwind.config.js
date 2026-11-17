/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary, #059669)',
          50: 'color-mix(in srgb, var(--color-primary, #059669) 8%, white)',
          100: 'color-mix(in srgb, var(--color-primary, #059669) 16%, white)',
          200: 'color-mix(in srgb, var(--color-primary, #059669) 30%, white)',
          500: 'var(--color-primary, #059669)',
          600: 'color-mix(in srgb, var(--color-primary, #059669) 88%, black)',
          700: 'color-mix(in srgb, var(--color-primary, #059669) 75%, black)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary, #0284c7)',
          50: 'color-mix(in srgb, var(--color-secondary, #0284c7) 8%, white)',
          100: 'color-mix(in srgb, var(--color-secondary, #0284c7) 16%, white)',
          600: 'color-mix(in srgb, var(--color-secondary, #0284c7) 88%, black)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
