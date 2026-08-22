/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#EEF1F6',
        surface: '#FFFFFF',
        ink: '#12263F',
        muted: '#5B6B7F',
        rule: '#D3DAE4',
        ac: '#0E7C66',
        warn: '#C77D22',
        miss: '#A33B4A',
        brand: {
          DEFAULT: '#4F46E5',
          soft: '#EEF0FF',
          deep: '#3730A3',
        },
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,38,63,0.04), 0 8px 24px -12px rgba(18,38,63,0.12)',
        'card-hover': '0 1px 2px rgba(18,38,63,0.05), 0 16px 32px -12px rgba(79,70,229,0.18)',
        glow: '0 8px 24px -8px rgba(79,70,229,0.45)',
      },
    },
  },
  plugins: [],
}
