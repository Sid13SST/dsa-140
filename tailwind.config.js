/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Colors resolve through CSS custom properties (see index.css) so both
      // themes share one set of utility classes. The `<alpha-value>` form keeps
      // opacity modifiers like `bg-ac/45` working.
      colors: {
        ground: 'rgb(var(--ground) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        rule: 'rgb(var(--rule) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        ac: 'rgb(var(--ac) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        miss: 'rgb(var(--miss) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          soft: 'rgb(var(--brand-soft) / <alpha-value>)',
          deep: 'rgb(var(--brand-deep) / <alpha-value>)',
        },
        platform: {
          leetcode: 'rgb(var(--p-leetcode) / <alpha-value>)',
          codeforces: 'rgb(var(--p-codeforces) / <alpha-value>)',
          codechef: 'rgb(var(--p-codechef) / <alpha-value>)',
          atcoder: 'rgb(var(--p-atcoder) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / calc(var(--shadow-strength) * 0.3)), 0 8px 24px -12px rgb(0 0 0 / calc(var(--shadow-strength) * 0.9))',
        'card-hover':
          '0 1px 2px rgb(0 0 0 / calc(var(--shadow-strength) * 0.35)), 0 16px 32px -12px rgb(var(--glow) / 0.28)',
        glow: '0 8px 24px -8px rgb(var(--glow) / 0.45)',
      },
    },
  },
  plugins: [],
}
