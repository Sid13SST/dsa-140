import StudyTrack, { type KindMeta } from './StudyTrack'
import { SD_GENERAL, SD_PHASES, SD_TRACK } from '../data/systemDesign'
import type { SdProgress } from '../lib/storage'

const KIND_META: Record<string, KindMeta> = {
  concept: { label: 'concept', tone: 'text-brand-deep border-brand/40 bg-brand/10' },
  case: { label: 'case study', tone: 'text-warn border-warn/40 bg-warn/10' },
  review: { label: 'review', tone: 'text-ac border-ac/40 bg-ac/10' },
}

export default function SystemDesign({
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
      track={SD_TRACK}
      phases={SD_PHASES}
      general={SD_GENERAL}
      kindMeta={KIND_META}
      eyebrow="system design track"
      blurb="DSA stays the priority. Each day links one specific video — with its real runtime — or one deep-linked article section, so a session fits the time you actually have."
    />
  )
}
