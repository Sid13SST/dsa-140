import { useEffect, useState } from 'react'
import type { Theme } from '../lib/theme'

interface Props {
  dayNumber: number | null
  totalDays: number
  theme: Theme
  onToggleTheme: () => void
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const isDark = theme === 'dark'
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="relative w-14 h-7 rounded-full border border-rule bg-ground shrink-0
        transition-colors hover:border-brand/50 focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-brand/50"
    >
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full grid place-items-center
          text-[11px] bg-surface border border-rule shadow-card
          transition-transform duration-200 ${isDark ? 'translate-x-0' : 'translate-x-7'}`}
      >
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  )
}

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const time = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const date = now.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="text-right">
      <div className="font-mono text-2xl sm:text-3xl font-bold tabular-nums leading-none">
        {time}
      </div>
      <div className="eyebrow mt-1">{date}</div>
    </div>
  )
}

export default function Header({ dayNumber, totalDays, theme, onToggleTheme }: Props) {
  const pct = dayNumber === null ? 0 : Math.round((dayNumber / totalDays) * 100)

  return (
    <header className="border-b border-rule bg-surface/70 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-deep shadow-glow flex items-center justify-center shrink-0">
            <span className="font-display font-bold text-on-accent text-sm">140</span>
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight leading-none heading-gradient">
              DSA 140
            </h1>
            <div className="eyebrow mt-1">
              {dayNumber === null ? (
                <>schedule starts 22 Aug 2026</>
              ) : (
                <>
                  day <span className="text-ink font-bold">{dayNumber}</span> of {totalDays}
                  <span className="text-brand font-bold ml-1">· {pct}%</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <Clock />
        </div>
      </div>
    </header>
  )
}
