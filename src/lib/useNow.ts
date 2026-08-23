import { useEffect, useState } from 'react'

/**
 * A clock the UI can depend on, so a tab left open keeps telling the truth.
 *
 * Without this everything derived from "now" is frozen at mount: the day
 * number, streak, consistency and on-pace all keep using yesterday's date
 * after midnight, and contests that have finished stay on the list.
 *
 * Browsers throttle timers hard in background tabs (often to once a minute or
 * less, and not at all when the machine sleeps), so this resyncs on focus and
 * visibility rather than trusting the interval alone.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const sync = () => setNow(Date.now())
    const id = setInterval(sync, intervalMs)
    const onWake = () => {
      if (!document.hidden) sync()
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [intervalMs])

  return now
}
