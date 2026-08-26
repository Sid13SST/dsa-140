import { useEffect, useRef, useState } from 'react'

/**
 * How long to wait for IntersectionObserver before giving up and showing
 * everything anyway.
 *
 * IO does not deliver callbacks to a hidden document, and there are other ways
 * for it to stay quiet — a background tab, an embedded frame that never
 * composites, a browser bug. Every one of those would otherwise leave the page
 * permanently blank, which is a far worse outcome than a missing fade.
 */
const REVEAL_FAILSAFE_MS = 2000

/** One source of truth for "should this move at all". */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

/**
 * Pointer parallax for a 3D element.
 *
 * Writes two CSS custom properties (-1..1) rather than setting `transform`
 * directly: the browser then resolves the transform in the compositor, and
 * React never re-renders on mouse move. Updates are throttled to one per frame
 * because pointermove fires far faster than the display refreshes.
 *
 * Pointer-based only — a touch device has no hover, so this stays inert there
 * rather than lurching when a finger lands.
 */
export function useTilt<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    let frame = 0
    let nx = 0
    let ny = 0

    const apply = () => {
      frame = 0
      el.style.setProperty('--mx', nx.toFixed(3))
      el.style.setProperty('--my', ny.toFixed(3))
    }

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      // Normalise to -1..1 around the element's centre.
      nx = ((e.clientX - r.left) / r.width) * 2 - 1
      ny = ((e.clientY - r.top) / r.height) * 2 - 1
      if (!frame) frame = requestAnimationFrame(apply)
    }

    const onLeave = () => {
      nx = 0
      ny = 0
      if (!frame) frame = requestAnimationFrame(apply)
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled])

  return ref
}

/**
 * Reveal on scroll — written so it CANNOT hide content permanently.
 *
 * The markup ships visible. JavaScript "arms" the effect by adding a class that
 * hides the elements, and only after it has confirmed it can observe them.
 * Three separate things then guarantee they come back:
 *
 *   1. the observer fires as each element scrolls in;
 *   2. a failsafe timer reveals everything if the observer has stayed silent,
 *      which is what happens in a document that never becomes visible;
 *   3. the effect's cleanup disarms, so a hot reload cannot strand the page.
 *
 * Hiding content by default and trusting an observer to bring it back is the
 * standard way these pages end up blank. This inverts that.
 */
export function useReveal(enabled: boolean) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))
    if (nodes.length === 0) return

    const revealAll = () => nodes.forEach((n) => n.setAttribute('data-inview', 'true'))

    // No animation wanted, or no observer available: leave everything visible.
    if (!enabled || typeof IntersectionObserver === 'undefined') {
      revealAll()
      return
    }

    // Arm only now — before this line the CSS has them fully visible.
    nodes.forEach((n) => n.classList.add('reveal-armed'))

    let settled = false
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          settled = true
          e.target.setAttribute('data-inview', 'true')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    )
    nodes.forEach((n) => io.observe(n))

    // If nothing has intersected by now, the observer is not going to deliver.
    const failsafe = window.setTimeout(() => {
      if (settled) return
      io.disconnect()
      revealAll()
    }, REVEAL_FAILSAFE_MS)

    return () => {
      window.clearTimeout(failsafe)
      io.disconnect()
      nodes.forEach((n) => n.classList.remove('reveal-armed'))
    }
  }, [enabled])
}

/**
 * Count a number up when it first scrolls into view.
 *
 * Starts at the real value rather than zero, so a stalled observer shows the
 * number instead of a permanent "0" — the same failure the reveal guards
 * against. It drops to zero only at the moment it is about to animate.
 *
 * Eased rather than linear, because a linear counter looks mechanical, and
 * driven by requestAnimationFrame rather than setInterval so it stays in step
 * with the display.
 */
export function useCountUp(target: number, enabled: boolean, ms = 1400) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [value, setValue] = useState(target)

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled || typeof IntersectionObserver === 'undefined') {
      setValue(target)
      return
    }

    let raf = 0
    let start = 0
    let began = false

    const run = () => {
      if (began) return
      began = true
      setValue(0)
      const tick = (t: number) => {
        if (!start) start = t
        const p = Math.min(1, (t - start) / ms)
        // easeOutCubic: quick off the mark, settles gently on the final number.
        setValue(Math.round(target * (1 - Math.pow(1 - p, 3))))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        io.disconnect()
        run()
      },
      { threshold: 0.4 },
    )
    io.observe(el)

    // Never leave a zero on screen because the observer stayed quiet.
    const failsafe = window.setTimeout(() => {
      if (!began) {
        io.disconnect()
        setValue(target)
      }
    }, REVEAL_FAILSAFE_MS)

    return () => {
      window.clearTimeout(failsafe)
      io.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [target, enabled, ms])

  return { ref, value }
}
