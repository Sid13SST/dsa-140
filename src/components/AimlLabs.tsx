import { AIML_LABS, AIML_PLATFORMS, AIML_TRACK } from '../data/aiml'
import type { LabProgress, SdProgress } from '../lib/storage'

interface Props {
  labs: LabProgress
  onToggle: (id: string) => void
  /** Study progress, so a lab can say whether you have covered its material yet. */
  study: SdProgress
}

/**
 * The hands-on half. These are deliberately NOT part of the daily 20 minutes —
 * reading about serving does not teach you serving, but neither does pretending
 * a four-hour build fits a weeknight beside DSA.
 */
export default function AimlLabs({ labs, onToggle, study }: Props) {
  const done = AIML_LABS.filter((l) => labs[l.id]).length
  const studied = AIML_TRACK.filter((d) => study[d.day]).length

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="eyebrow">labs · weekend work</span>
          <span className="font-mono text-[10px] text-muted">
            {done}/{AIML_LABS.length} done
          </span>
        </div>
        <p className="text-[11px] text-muted mt-1.5">
          You cannot learn ML infrastructure by reading, and you cannot build a serving stack in
          twenty minutes. These are the hands-on ladder: one per weekend when DSA allows, or save
          the lot for January when the DSA plan ends. Each one names what has to be true for it to
          count — a lab with no measurement is a tutorial.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-3 items-start">
        {AIML_LABS.map((l) => {
          const ready = studied >= l.after
          return (
            <div key={l.id} className="card card-hover p-3 min-w-0">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={!!labs[l.id]}
                  onChange={() => onToggle(l.id)}
                  className="w-4 h-4 mt-0.5 shrink-0 accent-ac"
                  aria-label={`Mark lab ${l.title} complete`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className={`font-display font-bold text-sm ${
                        labs[l.id] ? 'line-through text-muted' : ''
                      }`}
                    >
                      {l.title}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wide px-1 py-0.5
                      rounded border text-warn border-warn/40 bg-warn/10">
                      ~{l.hours}h
                    </span>
                    {!ready && (
                      <span
                        className="font-mono text-[10px] text-muted"
                        title={`This builds on material around day ${l.after} of the study track`}
                      >
                        after day {l.after}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-muted mt-1 leading-snug">{l.goal}</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {l.done.map((d) => (
                      <li key={d} className="text-[11px] flex gap-1.5">
                        <span className="text-muted shrink-0 font-mono">✓</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card p-3">
        <span className="eyebrow">platforms — and how much each actually matters</span>
        <p className="text-[11px] text-muted mt-1 mb-2">
          Ranked for AI/ML <em>engineering</em> roles. Kaggle is here, but placed honestly: it
          trains modelling, which is one phase of this track rather than the target.
        </p>
        <ul className="divide-y divide-rule/60">
          {AIML_PLATFORMS.map((p) => (
            <li key={p.url} className="py-2">
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-medium hover:text-brand-deep underline decoration-rule"
              >
                {p.name} ↗
              </a>
              <p className="text-[11px] text-muted mt-0.5">{p.what}</p>
              <p className="text-[11px] mt-0.5">{p.worth}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
