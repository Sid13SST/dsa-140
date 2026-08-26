export type Section = 'home' | 'dsa' | 'rail' | 'fde' | 'library'

interface Props {
  active: Section
  onChange: (s: Section) => void
  /** Small trailing hint per section, e.g. "day 3" or "12%". */
  hints?: Partial<Record<Section, string>>
}

const ITEMS: { id: Section; label: string; icon: string; blurb: string; hot?: boolean }[] = [
  { id: 'home', label: 'Overview', icon: '◈', blurb: 'Both tracks at a glance' },
  { id: 'dsa', label: 'DSA', icon: '⌘', blurb: '140-day problem plan' },
  { id: 'rail', label: 'The 200', icon: '⬢', blurb: 'One 20-min thread beside DSA' },
  {
    id: 'fde',
    label: 'FDE',
    icon: '◆',
    blurb: 'Customer-embedded engineering',
    hot: true,
  },
  { id: 'library', label: 'Library', icon: '◉', blurb: 'Full tracks, labs, resources' },
]

/**
 * Rail on desktop, horizontal strip on mobile.
 *
 * Two obligations, not three: DSA and one 20-minute thread. System design and
 * AI/ML used to be separate sections, which meant three streaks and three ways
 * to feel behind. They are now interleaved into The 200, with their full
 * versions parked in the Library where nothing is on a schedule.
 */
export default function Sidebar({ active, onChange, hints }: Props) {
  return (
    <nav
      aria-label="Sections"
      className="lg:w-56 lg:shrink-0 lg:sticky lg:top-[68px] lg:self-start"
    >
      <div className="card p-1 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
        {ITEMS.map((it) => {
          const on = it.id === active
          return (
            <button
              key={it.id}
              aria-current={on ? 'page' : undefined}
              onClick={() => onChange(it.id)}
              className={`shrink-0 lg:shrink text-left px-3 py-2 rounded-lg transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50
                ${on ? 'bg-brand text-on-accent shadow-glow' : 'text-muted hover:text-ink hover:bg-ground'}`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="font-mono text-xs opacity-80">
                  {it.icon}
                </span>
                <span className="text-sm font-semibold whitespace-nowrap">{it.label}</span>
                {it.hot && (
                  /* The role is genuinely in demand right now, so it is worth
                     flagging — but as a small mark, not a shouting badge. */
                  <span
                    title="In high demand across AI labs and enterprise right now"
                    className={`font-mono text-[8px] uppercase tracking-wider px-1 py-px rounded
                      border ${
                        on
                          ? 'border-current/40 opacity-80'
                          : 'text-miss border-miss/40 bg-miss/10'
                      }`}
                  >
                    hot
                  </span>
                )}
                {hints?.[it.id] && (
                  <span
                    className={`ml-auto font-mono text-[10px] ${on ? 'opacity-80' : 'text-muted'}`}
                  >
                    {hints[it.id]}
                  </span>
                )}
              </span>
              <span
                className={`hidden lg:block text-[10px] mt-0.5 ${on ? 'opacity-75' : 'text-muted'}`}
              >
                {it.blurb}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
