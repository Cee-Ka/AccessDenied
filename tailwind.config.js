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
          950: 'var(--color-obsidian-950)',
          900: 'var(--color-obsidian-900)',
          850: 'var(--color-obsidian-850)',
          800: 'var(--color-obsidian-800)',
          border: 'var(--color-obsidian-border)',
          subtle: 'var(--color-obsidian-subtle)',
          text: 'var(--color-obsidian-text)',
          muted: 'var(--color-obsidian-muted)',
          box: 'var(--color-obsidian-box)',
        },
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
