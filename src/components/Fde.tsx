import { useMemo } from 'react'
import StudyTrack, { type KindMeta, type TrackDay } from './StudyTrack'
import { FDE_GENERAL, FDE_MIX, FDE_PHASES, FDE_TRACK } from '../data/fde'
import type { SdProgress } from '../lib/storage'

/**
 * Each phase gets its own badge, because this track is a narrative rather than
 * a rotation — the badge tells you which chapter you are in, not which of six
 * independent subjects came up today.
 */
const PHASE_META: Record<string, KindMeta> = {
  'The role': { label: 'the role', tone: 'text-brand-deep border-brand/40 bg-brand/10' },
  'Discovery & communication': { label: 'comms', tone: 'text-ac border-ac/40 bg-ac/10' },
  'Integration engineering': { label: 'integration', tone: 'text-warn border-warn/40 bg-warn/10' },
  'Data plumbing': { label: 'data', tone: 'text-miss border-miss/40 bg-miss/10' },
  'Shipping into customer environments': {
    label: 'shipping',
    tone: 'text-ink border-ink/30 bg-ink/[0.06]',
  },
  'AI delivery': { label: 'ai delivery', tone: 'text-brand border-brand/30 bg-brand/[0.07]' },
  'Security & compliance': { label: 'security', tone: 'text-muted border-rule bg-ground' },
  Consolidate: { label: 'consolidate', tone: 'text-muted border-dashed border-rule bg-transparent' },
}

export default function Fde({
  progress,
  onToggle,
}: {
  progress: SdProgress
  onToggle: (day: number) => void
}) {
  // FdeDay carries no `kind` of its own — the phase IS the kind here.
  const track = useMemo<TrackDay[]>(
    () => FDE_TRACK.map((d) => ({ ...d, kind: d.phase })),
    [],
  )

  return (
    <StudyTrack
      progress={progress}
      onToggle={onToggle}
      track={track}
      phases={FDE_PHASES}
      general={FDE_GENERAL}
      kindMeta={PHASE_META}
      eyebrow="forward deployed engineer · 135 days"
      blurb={
        `An FDE is embedded with a customer: they run discovery, write production code against ` +
        `that customer's data, own the rollout, and are still the one paged when it breaks six ` +
        `months later. So this track is ${FDE_MIX.reading} readings and ${FDE_MIX.selfWork} written ` +
        `exercises against only ${FDE_MIX.video} videos — the job is judgment and communication at ` +
        `least as much as code. It runs in order, as a narrative, and shares nothing with The 200.`
      }
    />
  )
}
