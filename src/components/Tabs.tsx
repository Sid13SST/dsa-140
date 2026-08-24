export interface TabDef<T extends string> {
  id: T
  label: string
}

interface Props<T extends string> {
  tabs: TabDef<T>[]
  active: T
  onChange: (id: T) => void
}

export default function Tabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label="Dashboard sections"
      // Scrolls rather than overflowing: five labels don't fit across a 375px
      // phone, and letting the bar widen would push the whole page sideways.
      className="card p-1 flex gap-1 sticky top-[68px] z-10 backdrop-blur bg-surface/90
        overflow-x-auto sm:overflow-x-visible"
    >
      {tabs.map((t) => {
        const isActive = t.id === active
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`shrink-0 sm:flex-1 sm:shrink px-3 py-1.5 rounded-lg text-sm font-semibold
              transition-all whitespace-nowrap
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
                isActive
                  ? 'bg-brand text-on-accent shadow-glow'
                  : 'text-muted hover:text-ink hover:bg-ground'
              }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
