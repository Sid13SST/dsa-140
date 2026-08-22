import type { Day, DayState } from '../types'
import { emptyDay } from '../types'
import { problemHelp } from '../data/resources'

interface Props {
  day: Day
  state: DayState | undefined
  onChange: (next: DayState) => void
  onJump: (delta: number) => void
}

const LC = (slug: string) => `https://leetcode.com/problems/${slug}/`

const diffClass = (d: string) =>
  d === 'Easy' ? 'text-ac' : d === 'Medium' ? 'text-warn' : 'text-miss'

const kindLabel: Record<Day['kind'], string> = {
  study: 'New topic',
  review: 'Revision day',
  contest: 'Contest day',
  mixed: 'Final revision',
}

export default function DayPanel({ day, state, onChange, onJump }: Props) {
  const st = state ?? emptyDay()
  const core = day.problems.filter((p) => !p.revisit)
  const done = st.solved.length
  const target = core.length

  const patch = (p: Partial<DayState>) => onChange({ ...st, ...p })

  const toggleSolved = (slug: string) => {
    const has = st.solved.includes(slug)
    const solved = has ? st.solved.filter((s) => s !== slug) : [...st.solved, slug]
    // Completing every core problem marks the day done; unchecking backs that out.
    const allCore = core.every((p) => solved.includes(p.slug))
    const status =
      st.status === 'absent' ? 'absent' : allCore && core.length > 0 ? 'done' : st.status
    patch({ solved, status })
  }

  const absent = st.status === 'absent'

  return (
    <section className="card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="eyebrow">
            {day.phase} · {kindLabel[day.kind]}
            {day.isCheckpoint && (
              <span className="ml-2 text-warn font-bold">interview-ready checkpoint</span>
            )}
          </div>
          <h2 className="font-display text-lg font-bold mt-0.5">{day.topic}</h2>
          <div className="font-mono text-xs text-muted mt-0.5">
            Day {day.day} · {new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'long',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="btn" onClick={() => onJump(-1)} aria-label="Previous day">
            ←
          </button>
          <button className="btn" onClick={() => onJump(1)} aria-label="Next day">
            →
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 mt-4 pt-3 border-t border-rule">
        <label className="flex flex-col">
          <span className="eyebrow mb-1">hours studied</span>
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={st.hours}
            disabled={absent}
            onChange={(e) => patch({ hours: Number(e.target.value) })}
            className="field w-24 font-mono disabled:opacity-40"
          />
        </label>

        <div className="flex flex-col">
          <span className="eyebrow mb-1">day status</span>
          <div className="flex gap-1">
            <button
              className={`btn ${st.status === 'done' ? 'btn-ac' : ''}`}
              onClick={() => patch({ status: st.status === 'done' ? 'pending' : 'done' })}
            >
              Done
            </button>
            <button
              className={`btn ${absent ? 'btn-miss' : ''}`}
              onClick={() =>
                patch(
                  absent
                    ? { status: 'pending' }
                    : { status: 'absent', hours: 0, solved: [] },
                )
              }
            >
              Absent
            </button>
          </div>
        </div>

        {(day.lcWeekly || day.lcBiweekly || day.kind === 'contest') && (
          <label className="flex items-center gap-2 pb-1.5">
            <input
              type="checkbox"
              checked={st.contestDone}
              disabled={absent}
              onChange={(e) => patch({ contestDone: e.target.checked })}
              className="w-4 h-4 accent-[#0E7C66]"
            />
            <span className="text-sm">
              Gave the contest
              <a
                href="https://leetcode.com/contest/"
                target="_blank"
                rel="noreferrer"
                className="ml-1.5 font-mono text-xs underline text-muted hover:text-ink"
              >
                open ↗
              </a>
            </span>
          </label>
        )}

        <div className="ml-auto font-mono text-sm text-muted pb-1.5">
          {absent ? (
            <span className="text-miss">marked absent</span>
          ) : (
            <>
              <span className="text-ink font-bold">{done}</span>/{target} solved
            </>
          )}
        </div>
      </div>

      {absent && (
        <p className="mt-3 text-sm text-muted">
          This day is excused and won't count against your streak. Its problems roll into your
          backlog — pick them up on a lighter day.
        </p>
      )}

      {/* Problems */}
      <ul className={`mt-3 divide-y divide-rule ${absent ? 'opacity-40' : ''}`}>
        {day.problems.map((p) => {
          const checked = st.solved.includes(p.slug)
          const help = problemHelp(p.slug, p.title)
          return (
            <li key={p.slug} className="flex items-center gap-3 py-2 group">
              <input
                type="checkbox"
                checked={checked}
                disabled={absent}
                onChange={() => toggleSolved(p.slug)}
                className="w-4 h-4 shrink-0 accent-[#0E7C66]"
                aria-label={`Mark ${p.title} solved`}
              />
              <a
                href={LC(p.slug)}
                target="_blank"
                rel="noreferrer"
                className={`flex-1 text-sm hover:underline ${
                  checked ? 'line-through text-muted' : ''
                }`}
              >
                {p.title}
                {p.revisit && (
                  <span className="ml-2 eyebrow text-warn">re-solve</span>
                )}
              </a>
              <span className={`font-mono text-[11px] shrink-0 ${diffClass(p.difficulty)}`}>
                {p.difficulty}
              </span>
              {/* Stuck? These are always available, not just once the box is ticked. */}
              <a
                href={help.video}
                target="_blank"
                rel="noreferrer"
                title={`Search YouTube for a ${p.title} walkthrough`}
                className="font-mono text-[10px] text-muted hover:text-miss shrink-0
                  opacity-60 group-hover:opacity-100 transition-opacity"
              >
                ▶ video
              </a>
              <a
                href={help.editorial}
                target="_blank"
                rel="noreferrer"
                title={`Read community solutions for ${p.title}`}
                className="font-mono text-[10px] text-muted hover:text-brand shrink-0
                  opacity-60 group-hover:opacity-100 transition-opacity"
              >
                ¶ sol
              </a>
              <a
                href={LC(p.slug)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] text-muted hover:text-ink shrink-0"
                aria-label={`Open ${p.title} on LeetCode`}
              >
                ↗
              </a>
            </li>
          )
        })}
        {day.problems.length === 0 && (
          <li className="py-3 text-sm text-muted">
            No problems scheduled. Use today to clear backlog or rest.
          </li>
        )}
      </ul>

      <label className="block mt-3">
        <span className="eyebrow">what clicked / what didn't</span>
        <textarea
          value={st.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          rows={2}
          placeholder="The pattern that unlocked it, or the one you want to revisit."
          className="field w-full mt-1 resize-y"
        />
      </label>
    </section>
  )
}
