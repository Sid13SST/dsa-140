import { useState } from 'react'
import SystemDesign from './SystemDesign'
import AimlStudy from './AimlStudy'
import AimlLabs from './AimlLabs'
import ResourceLibrary from './Resources'
import { SD_TOTAL_DAYS } from '../data/systemDesign'
import { AIML_TOTAL_DAYS } from '../data/aiml'
import { SCHEDULE } from '../data/schedule'
import type { LabProgress, SdProgress } from '../lib/storage'

type Shelf = 'design' | 'aiml' | 'labs' | 'dsa'

interface Props {
  sdProgress: SdProgress
  onToggleSd: (day: number) => void
  aimlProgress: SdProgress
  onToggleAiml: (day: number) => void
  labs: LabProgress
  onToggleLab: (id: string, index: number) => void
}

/**
 * Everything that is NOT a daily obligation.
 *
 * The 200-day rail cherry-picks 35 of the 122 design days and 25 of the 130
 * AI/ML days. The rest are not deleted — they live here, browsable, with their
 * own tick boxes. Going deeper is a choice you make on a good week, not a
 * second streak you can fall behind on.
 */
export default function Library({
  sdProgress,
  onToggleSd,
  aimlProgress,
  onToggleAiml,
  labs,
  onToggleLab,
}: Props) {
  const [shelf, setShelf] = useState<Shelf>('design')

  const shelves: { id: Shelf; label: string; hint: string }[] = [
    { id: 'design', label: 'System design', hint: `${SD_TOTAL_DAYS} days` },
    { id: 'aiml', label: 'AI/ML engineering', hint: `${AIML_TOTAL_DAYS} days` },
    { id: 'labs', label: 'Labs', hint: 'weekend builds' },
    { id: 'dsa', label: 'DSA material', hint: 'by topic' },
  ]

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <span className="eyebrow">library · browse, do not obey</span>
        <p className="text-[11px] text-muted mt-1.5">
          The full tracks, kept whole. The 200-day rail takes the essential {35} design days and{' '}
          {25} AI/ML days; everything else lives here. Nothing on this page is on a schedule and
          nothing here can make you behind — open it on a good week, ignore it on a bad one.
        </p>
        <div className="flex flex-wrap gap-2 mt-2.5">
          {shelves.map((s) => (
            <button
              key={s.id}
              onClick={() => setShelf(s.id)}
              className={`btn text-xs ${shelf === s.id ? 'btn-primary' : ''}`}
            >
              {s.label}{' '}
              <span className={`font-mono text-[9px] ${shelf === s.id ? 'opacity-75' : 'text-muted'}`}>
                {s.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      {shelf === 'design' && <SystemDesign progress={sdProgress} onToggle={onToggleSd} />}
      {shelf === 'aiml' && <AimlStudy progress={aimlProgress} onToggle={onToggleAiml} />}
      {shelf === 'labs' && (
        <AimlLabs labs={labs} onToggle={onToggleLab} study={aimlProgress} />
      )}
      {shelf === 'dsa' && <ResourceLibrary schedule={SCHEDULE} />}
    </div>
  )
}
