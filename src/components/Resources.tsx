import { useMemo, useState } from 'react'
import type { Day } from '../types'
import { GENERAL_RESOURCES, TOPIC_RESOURCES, resourcesForTopics } from '../data/resources'
import type { Resource, ResourceKind } from '../data/resources'

const KIND_META: Record<ResourceKind, { icon: string; label: string; tone: string }> = {
  video: { icon: '▶', label: 'Video', tone: 'bg-miss/10 text-miss border-miss/30' },
  reading: { icon: '¶', label: 'Read', tone: 'bg-brand/10 text-brand-deep border-brand/30' },
  practice: { icon: '◆', label: 'Practice', tone: 'bg-ac/10 text-ac border-ac/30' },
}

function ResourceRow({ r }: { r: Resource }) {
  const meta = KIND_META[r.kind]
  return (
    <li>
      <a
        href={r.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-ground transition-colors group"
      >
        <span
          className={`shrink-0 w-[52px] text-center font-mono text-[9px] uppercase tracking-wide
            border rounded px-1 py-0.5 ${meta.tone}`}
        >
          {meta.icon} {meta.label}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] leading-tight group-hover:text-brand-deep truncate">
            {r.label}
          </span>
          <span className="block font-mono text-[10px] text-muted">{r.source}</span>
        </span>
        <span className="shrink-0 font-mono text-[10px] text-muted group-hover:text-brand">↗</span>
      </a>
    </li>
  )
}

/** Compact, day-aware panel: what to watch/read for today's topic. */
export function DayResources({ day }: { day: Day }) {
  const resources = useMemo(() => {
    const topics = [day.topic, ...day.problems.map((p) => p.topic)]
    return resourcesForTopics(topics)
  }, [day])

  return (
    <div className="card p-3">
      <div className="flex items-baseline justify-between mb-1">
        <span className="eyebrow">learn this topic</span>
        <span className="font-mono text-[10px] text-muted truncate max-w-[50%]">{day.topic}</span>
      </div>
      <p className="text-[11px] text-muted mb-1.5">
        Watch the concept first, then solve. Links open in a new tab.
      </p>
      <ul className="divide-y divide-rule/60">
        {resources.map((r) => (
          <ResourceRow key={r.url} r={r} />
        ))}
        {resources.length === 0 && (
          <li className="py-2 text-sm text-muted">No topic material mapped for this day.</li>
        )}
      </ul>
    </div>
  )
}

/** The full library, grouped by topic, with a filter. */
export default function ResourceLibrary({ schedule }: { schedule: Day[] }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<ResourceKind | 'all'>('all')

  // Order topics the way the plan teaches them rather than alphabetically.
  const orderedTopics = useMemo(() => {
    const seen: string[] = []
    for (const d of schedule) {
      for (const t of [d.topic, ...d.problems.map((p) => p.topic)]) {
        if (TOPIC_RESOURCES[t] && !seen.includes(t)) seen.push(t)
      }
    }
    return seen
  }, [schedule])

  const q = query.trim().toLowerCase()

  const groups = orderedTopics
    .map((topic) => ({
      topic,
      items: (TOPIC_RESOURCES[topic] ?? []).filter(
        (r) =>
          (kind === 'all' || r.kind === kind) &&
          (q === '' ||
            r.label.toLowerCase().includes(q) ||
            r.source.toLowerCase().includes(q) ||
            topic.toLowerCase().includes(q)),
      ),
    }))
    .filter((g) => g.items.length > 0)

  const generalMatches = GENERAL_RESOURCES.filter(
    (r) =>
      (kind === 'all' || r.kind === kind) &&
      (q === '' || r.label.toLowerCase().includes(q) || r.source.toLowerCase().includes(q)),
  )

  return (
    <div className="space-y-4">
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, sources, material…"
            className="field flex-1 min-w-[180px]"
            aria-label="Search learning resources"
          />
          <div className="flex gap-1">
            {(['all', 'video', 'reading', 'practice'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`btn text-xs capitalize ${kind === k ? 'btn-primary' : ''}`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>

      {generalMatches.length > 0 && (
        <div className="card p-3">
          <span className="eyebrow">start here — works for every topic</span>
          <ul className="mt-1.5 divide-y divide-rule/60">
            {generalMatches.map((r) => (
              <ResourceRow key={r.url} r={r} />
            ))}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
        {groups.map((g) => (
          // min-w-0 so a long resource label truncates instead of widening the
          // grid track past the viewport.
          <div key={g.topic} className="card card-hover p-3 min-w-0">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-display font-bold text-sm">{g.topic}</span>
              <span className="font-mono text-[10px] text-muted">{g.items.length}</span>
            </div>
            <ul className="divide-y divide-rule/60">
              {g.items.map((r) => (
                <ResourceRow key={r.url} r={r} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {groups.length === 0 && generalMatches.length === 0 && (
        <div className="card p-6 text-center text-sm text-muted">
          Nothing matches “{query}”.
        </div>
      )}
    </div>
  )
}
