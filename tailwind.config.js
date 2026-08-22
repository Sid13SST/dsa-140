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
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
