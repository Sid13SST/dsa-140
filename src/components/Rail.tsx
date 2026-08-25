import { useMemo } from 'react'
import StudyTrack, { type KindMeta, type TrackDay } from './StudyTrack'
import { RAIL, RAIL_DOMAIN_META, type RailDay } from '../data/track200'
import { SD_TRACK } from '../data/systemDesign'
import { AIML_TRACK } from '../data/aiml'
import type { SdProgress } from '../lib/storage'

/**
 * Each domain gets its own badge colour so a glance down the list shows how the
 * subjects interleave. Rest days are deliberately drab — they should not look
 * like an achievement.
 */
const KIND_META: Record<string, KindMeta> = {
  backend: { label: 'backend', tone: 'text-brand-deep border-brand/40 bg-brand/10' },
  db: { label: 'database', tone: 'text-ac border-ac/40 bg-ac/10' },
  linux: { label: 'linux/net', tone: 'text-warn border-warn/40 bg-warn/10' },
  devops: { label: 'devops', tone: 'text-miss border-miss/40 bg-miss/10' },
  design: { label: 'design', tone: 'text-ink border-ink/30 bg-ink/[0.06]' },
  aiml: { label: 'ai/ml', tone: 'text-muted border-rule bg-ground' },
  rest: { label: 'rest', tone: 'text-muted border-dashed border-rule bg-transparent' },
}

/**
 * Curated design and AI/ML days carry only a day number — the resource itself
 * lives in the library track. Resolving here keeps one source of truth: editing
 * the library track updates the rail automatically.
 */
function resolve(d: RailDay): TrackDay {
  const base: TrackDay = {
    day: d.day,
    phase: RAIL_DOMAIN_META[d.domain].label,
    topic: d.topic,
    prompt: d.prompt,
    kind: d.domain,
    video: d.video,
    reading: d.reading,
    selfWork: d.selfWork,
  }
  if (!d.ref) return base
  const src = d.ref.track === 'sd' ? SD_TRACK[d.ref.day - 1] : AIML_TRACK[d.ref.day - 1]
  if (!src) return base
  return {
    ...base,
    prompt: src.prompt,
    video: src.video,
    reading: src.reading,
    selfWork: src.selfWork,
  }
}

export default function Rail({
  progress,
  onToggle,
}: {
  progress: SdProgress
  onToggle: (day: number) => void
}) {
  const track = useMemo(() => RAIL.map(resolve), [])
  const phases = useMemo(
    () => [...new Set(RAIL.map((d) => RAIL_DOMAIN_META[d.domain].label))],
    [],
  )

  return (
    <StudyTrack
      progress={progress}
      onToggle={onToggle}
      track={track}
      phases={phases}
      general={[]}
      kindMeta={KIND_META}
      eyebrow="the 200 · one thread beside dsa"
      blurb="One item a day, six subjects interleaved so no single one monopolises a month. Median day is 12 minutes; about one in five runs past 20 and is flagged long — use the filter and save those for a weekend. DSA stays the priority: this is the only other thing you owe, every twentieth day is deliberately empty, and nothing here is ever 'missed' because it is a queue, not a calendar."
    />
  )
}
