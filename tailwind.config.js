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
        obsidian: {
          950: 'rgb(var(--color-obsidian-950-rgb) / <alpha-value>)',
          900: 'rgb(var(--color-obsidian-900-rgb) / <alpha-value>)',
          850: 'rgb(var(--color-obsidian-850-rgb) / <alpha-value>)',
          800: 'rgb(var(--color-obsidian-800-rgb) / <alpha-value>)',
          border: 'rgb(var(--color-obsidian-border-rgb) / <alpha-value>)',
          subtle: 'rgb(var(--color-obsidian-subtle-rgb) / <alpha-value>)',
          text: 'rgb(var(--color-obsidian-text-rgb) / <alpha-value>)',
          muted: 'rgb(var(--color-obsidian-muted-rgb) / <alpha-value>)',
          box: 'rgb(var(--color-obsidian-box-rgb) / <alpha-value>)',
        },
        scrim: 'var(--color-scrim)',
        brand: {
          orange: '#ff9900',
          vivid: '#f97316',
          hover: '#ffaa22',
          subtle: 'rgba(255, 153, 0, 0.12)',
          glow: 'rgba(249, 115, 22, 0.25)',
        },
        aws: {
          dark: '#09090b',
          card: '#121215',
          border: '#27272a',
          orange: '#ff9900',
          squid: '#18181b',
          accent: '#f97316',
          success: '#10b981',
          danger: '#ef4444',
          warning: '#f59e0b',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
