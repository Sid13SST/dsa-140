export type Section = 'home' | 'dsa' | 'design' | 'aiml'

interface Props {
  active: Section
  onChange: (s: Section) => void
  /** Small trailing hint per section, e.g. "day 3" or "12%". */
  hints?: Partial<Record<Section, string>>
}

const ITEMS: { id: Section; label: string; icon: string; blurb: string }[] = [
  { id: 'home', label: 'Overview', icon: '◈', blurb: 'All three tracks at a glance' },
  { id: 'dsa', label: 'DSA', icon: '⌘', blurb: '140-day problem plan' },
  { id: 'design', label: 'System Design', icon: '⬢', blurb: 'Study, practice, interview' },
  { id: 'aiml', label: 'AI / ML', icon: '◉', blurb: 'Engineering track, labs, interview' },
]

/**
 * Rail on desktop, horizontal strip on mobile. The three tracks are genuinely
 * separate practices with separate cadences, so they get separate sections
 * rather than competing for one row of tabs.
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
