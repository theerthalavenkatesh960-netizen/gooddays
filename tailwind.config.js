/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        background: '#0A0A0F',
        surface: '#13131A',
        'surface-elevated': '#1C1C26',
        accent: {
          DEFAULT: '#6C63FF',
          warm: '#FF6B6B',
          green: '#4ECDC4',
          gold: '#FFD93D',
        },
        primary: '#F0F0F5',
        secondary: '#8888A0',
        muted: '#55556A',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      maxWidth: {
        mobile: '390px',
      },
    },
  },
  plugins: [],
};
