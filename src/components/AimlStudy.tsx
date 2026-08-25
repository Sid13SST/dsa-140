import StudyTrack, { type KindMeta } from './StudyTrack'
import { AIML_GENERAL, AIML_PHASES, AIML_TRACK } from '../data/aiml'
import type { SdProgress } from '../lib/storage'

const KIND_META: Record<string, KindMeta> = {
  concept: { label: 'concept', tone: 'text-brand-deep border-brand/40 bg-brand/10' },
  applied: { label: 'applied', tone: 'text-warn border-warn/40 bg-warn/10' },
  review: { label: 'review', tone: 'text-ac border-ac/40 bg-ac/10' },
}

export default function AimlStudy({
  progress,
  onToggle,
}: {
  progress: SdProgress
  onToggle: (day: number) => void
}) {
  return (
    <StudyTrack
      progress={progress}
      onToggle={onToggle}
      track={AIML_TRACK}
      phases={AIML_PHASES}
      general={AIML_GENERAL}
      kindMeta={KIND_META}
      eyebrow="ai/ml engineering track"
      blurb="130 days at ~20 minutes, finishing the same week the DSA plan does. Infra-leaning on purpose: the target is serving, retrieval, evaluation and pipelines, not competition rank. Long sessions are flagged so you can save them for a weekend."
    />
  )
}
