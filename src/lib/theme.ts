import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

const KEY = 'dsa140:theme'

/** Dark is the product default; a stored choice always wins over it. */
export function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(KEY)
    return raw === 'light' || raw === 'dark' ? raw : 'dark'
  } catch {
    return 'dark'
  }
}

/**
 * Swap the theme with transitions suppressed for one frame.
 *
 * Chromium latches the computed value of a transitioned property when the
 * custom property it derives from changes: `.btn` (transition: all) and `body`
 * would keep their old theme's colors indefinitely, leaving dark buttons on a
 * light page. Disabling transitions across the swap avoids that entirely, and
 * an instant theme switch reads better than a half-second colour smear anyway.
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.add('theme-swapping')
  root.setAttribute('data-theme', theme)
  // Force a reflow so the suppressed styles are committed before we re-enable.
  void root.offsetHeight
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove('theme-swapping'))
  })
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // Storage can be blocked; the theme still applies for this session.
    }
  }, [theme])

  return {
    theme,
    setTheme,
    toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  }
}
