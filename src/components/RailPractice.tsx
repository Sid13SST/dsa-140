import { useState } from 'react'
import PracticeBank from './PracticeBank'
import { allRubric } from '../data/sdPractice'
import { SD_PRACTICE_BANK } from '../data/sdPracticeBank'
import { aimlRubric } from '../data/aimlPractice'
import { AIML_PRACTICE_BANK } from '../data/aimlPracticeBank'
import type { SdAttempt, SdQuizProgress } from '../lib/storage'

const FAMILY_META: Record<string, string> = {
  concept: 'Explain',
  debug: 'Debug',
  design: 'ML system design',
  applied: 'Cost & capacity',
}

interface Props {
  sdQuiz: SdQuizProgress
  onSdChange: (id: string, next: SdAttempt) => void
  aimlQuiz: SdQuizProgress
  onAimlChange: (id: string, next: SdAttempt) => void
}

/**
 * One practice tab, two banks. They keep separate rubrics because the
 * frameworks genuinely differ — system design grades sharding and estimation,
 * AI/ML grades labels, metrics and feedback loops.
 */
export default function RailPractice({ sdQuiz, onSdChange, aimlQuiz, onAimlChange }: Props) {
  const [bank, setBank] = useState<'design' | 'aiml'>('design')

  return (
    <div className="space-y-3">
      <div className="card p-2 flex flex-wrap gap-2">
        <button
          onClick={() => setBank('design')}
          className={`btn text-xs ${bank === 'design' ? 'btn-primary' : ''}`}
        >
          System design {SD_PRACTICE_BANK.length}
        </button>
        <button
          onClick={() => setBank('aiml')}
          className={`btn text-xs ${bank === 'aiml' ? 'btn-primary' : ''}`}
        >
          AI/ML {AIML_PRACTICE_BANK.length}
        </button>
      </div>

      {bank === 'design' ? (
        <PracticeBank
          progress={sdQuiz}
          onChange={onSdChange}
          bank={SD_PRACTICE_BANK}
          rubricFor={allRubric}
          eyebrow="design practice"
          blurb="There is no judge for system design, so each question carries a rubric — seven framework points plus five specific to that system. Design first, reveal the rubric after, and grade yourself honestly. The gap is the study list."
        />
      ) : (
        <PracticeBank
          progress={aimlQuiz}
          onChange={onAimlChange}
          bank={AIML_PRACTICE_BANK}
          rubricFor={aimlRubric}
          eyebrow="ai/ml practice"
          blurb="Nothing grades an ML design for you, so each question ships a rubric — seven framework points about data, labels and feedback loops, plus the specifics. Attempt it first, reveal the rubric after, grade honestly."
          familyMeta={FAMILY_META}
        />
      )}
    </div>
  )
}
