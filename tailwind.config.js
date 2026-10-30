/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neo: {
          'bg': 'rgb(var(--neo-bg-rgb) / <alpha-value>)',
          'surface': 'rgb(var(--neo-surface-rgb) / <alpha-value>)',
          'raised': 'rgb(var(--neo-raised-rgb) / <alpha-value>)',
          'ink': 'rgb(var(--neo-ink-rgb) / <alpha-value>)',
          'muted': 'rgb(var(--neo-muted-rgb) / <alpha-value>)',
          'shadow': 'rgb(var(--neo-shadow-rgb) / <alpha-value>)',
          'on-accent': 'rgb(var(--neo-on-accent-rgb) / <alpha-value>)',
          'grid': 'rgb(var(--neo-grid-rgb) / <alpha-value>)',
          'orange': 'rgb(var(--neo-orange-rgb) / <alpha-value>)',
          'yellow': 'rgb(var(--neo-yellow-rgb) / <alpha-value>)',
          'lilac': 'rgb(var(--neo-lilac-rgb) / <alpha-value>)',
          'sky': 'rgb(var(--neo-sky-rgb) / <alpha-value>)',
          'lime': 'rgb(var(--neo-lime-rgb) / <alpha-value>)',
          'coral': 'rgb(var(--neo-coral-rgb) / <alpha-value>)',
        },
        scrim: 'var(--color-scrim)',
      },
      fontFamily: {
        display: ['Archivo', '"Arial Black"', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // Neobrutalism: hard offset shadows, no blur
      boxShadow: {
        'neo-sm': '2px 2px 0 0 var(--neo-shadow)',
        neo: '4px 4px 0 0 var(--neo-shadow)',
        'neo-lg': '6px 6px 0 0 var(--neo-shadow)',
        'neo-press': '1px 1px 0 0 var(--neo-shadow)',
      },
      borderWidth: {
        3: '3px',
      },
      borderRadius: {
        neo: '6px',
      }
    },
  },
  plugins: [],
}
