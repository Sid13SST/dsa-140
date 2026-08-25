import { AIML_LABS, AIML_PLATFORMS, AIML_TRACK } from '../data/aiml'
import type { AimlLab, AimlLabResource, LabResourceKind } from '../data/aiml'
import { labDone, type LabProgress, type SdProgress } from '../lib/storage'

interface Props {
  labs: LabProgress
  onToggle: (id: string, index: number) => void
  /** Study progress, so a lab can say whether you have covered its material yet. */
  study: SdProgress
}

const KIND_META: Record<LabResourceKind, { icon: string; label: string; tone: string }> = {
  dataset: { icon: '⛁', label: 'data', tone: 'text-ac border-ac/40 bg-ac/10' },
  notebook: { icon: '⌨', label: 'run', tone: 'text-warn border-warn/40 bg-warn/10' },
  tool: { icon: '⚙', label: 'tool', tone: 'text-brand-deep border-brand/40 bg-brand/10' },
  guide: { icon: '¶', label: 'read', tone: 'text-muted border-rule bg-ground' },
}

function ResourceLink({ r, primary }: { r: AimlLabResource; primary?: boolean }) {
  const meta = KIND_META[r.kind]
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noreferrer"
      title={`${r.label} — ${r.source}`}
      className={`flex items-center gap-1.5 px-1.5 py-1 rounded-lg border text-[11px] min-w-0
        transition-colors hover:border-brand/50 hover:bg-ground
        ${primary ? 'border-brand/40 bg-brand/5' : 'border-rule'}`}
    >
      <span
        className={`font-mono text-[9px] uppercase px-1 py-0.5 rounded border shrink-0 ${meta.tone}`}
      >
        {meta.icon} {meta.label}
      </span>
      <span className="truncate">{r.label}</span>
      <span className="font-mono text-[9px] text-muted shrink-0 ml-auto">↗</span>
    </a>
  )
}

function LabCard({
  l,
  hit,
  onToggle,
  ready,
}: {
  l: AimlLab
  hit: number[]
  onToggle: (index: number) => void
  ready: boolean
}) {
  const complete = labDone(hit, l.done.length)
  const pct = Math.round((hit.length / l.done.length) * 100)

  return (
    <div className="card card-hover p-3 min-w-0">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={`font-display font-bold text-sm ${complete ? 'line-through text-muted' : ''}`}
        >
          {l.title}
        </span>
        <span
          className="font-mono text-[9px] uppercase tracking-wide px-1 py-0.5 rounded border
            text-warn border-warn/40 bg-warn/10"
        >
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
        <span
          className={`font-mono text-[10px] ml-auto shrink-0 font-bold ${
            complete ? 'text-ac' : hit.length ? 'text-warn' : 'text-muted'
          }`}
        >
          {hit.length}/{l.done.length}
        </span>
      </div>

      <div className="h-1 bg-ground rounded-full mt-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${complete ? 'bg-ac' : 'bg-brand'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-[12px] text-muted mt-2 leading-snug">{l.goal}</p>

      {/* The point of the section: somewhere to actually go. */}
      <div className="mt-2">
        <span className="eyebrow">start here</span>
        <div className="grid sm:grid-cols-2 gap-1 mt-1">
          {l.resources.map((r, i) => (
            <ResourceLink key={r.url} r={r} primary={i === 0} />
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5 min-w-0">
        <span className="font-mono text-[9px] text-muted uppercase shrink-0">first</span>
        <code
          className="font-mono text-[11px] bg-ground rounded px-1.5 py-0.5 min-w-0 truncate"
          title={l.firstStep}
        >
          {l.firstStep}
        </code>
      </div>

      <div className="mt-2 pt-2 border-t border-rule">
        <span className="eyebrow">done when</span>
        <ul className="mt-1 space-y-0.5">
          {l.done.map((d, i) => (
            <li key={d}>
              <label className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={hit.includes(i)}
                  onChange={() => onToggle(i)}
                  className="w-3.5 h-3.5 mt-0.5 shrink-0 accent-ac"
                />
                <span
                  className={`text-[11px] leading-snug ${hit.includes(i) ? 'text-muted line-through' : ''}`}
                >
                  {d}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * The hands-on half. These are deliberately NOT part of the daily 20 minutes —
 * reading about serving does not teach you serving, but neither does pretending
 * a four-hour build fits a weeknight beside DSA.
 *
 * Each card links out to where the work actually happens, because a lab that is
 * only a description of a lab is indistinguishable from a practice question.
 */
export default function AimlLabs({ labs, onToggle, study }: Props) {
  const done = AIML_LABS.filter((l) => labDone(labs[l.id], l.done.length)).length
  const criteria = AIML_LABS.reduce((n, l) => n + l.done.length, 0)
  const ticked = AIML_LABS.reduce((n, l) => n + (labs[l.id]?.length ?? 0), 0)
  const studied = AIML_TRACK.filter((d) => study[d.day]).length

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="eyebrow">labs · weekend work</span>
          <span className="font-mono text-[10px] text-muted">
            {done}/{AIML_LABS.length} built · {ticked}/{criteria} checks
          </span>
        </div>
        <p className="text-[11px] text-muted mt-1.5">
          You cannot learn ML infrastructure by reading, and you cannot build a serving stack in
          twenty minutes. These are the hands-on ladder: one per weekend when DSA allows, or save
          the lot for January when the DSA plan ends. Every card links straight to the dataset,
          library or notebook the work happens in, and names the first thing to run — so there is
          no blank page to stare at.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-3 items-start">
        {AIML_LABS.map((l) => (
          <LabCard
            key={l.id}
            l={l}
            hit={labs[l.id] ?? []}
            onToggle={(i) => onToggle(l.id, i)}
            ready={studied >= l.after}
          />
        ))}
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
