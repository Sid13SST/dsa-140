import PracticeBank from './PracticeBank'
import { aimlRubric } from '../data/aimlPractice'
// Same rule as system design: the 50 you practise are disjoint from the 24 the
// interviewer asks, and the generator fails the build if that stops being true.
import { AIML_PRACTICE_BANK } from '../data/aimlPracticeBank'
import type { SdAttempt, SdQuizProgress } from '../lib/storage'

/** The four families are genuinely different exercises, so they get a filter. */
const FAMILY_META: Record<string, string> = {
  concept: 'Explain',
  debug: 'Debug',
  design: 'ML system design',
  applied: 'Cost & capacity',
}

export default function AimlPractice({
  progress,
  onChange,
}: {
  progress: SdQuizProgress
  onChange: (id: string, next: SdAttempt) => void
}) {
  return (
    <PracticeBank
      progress={progress}
      onChange={onChange}
      bank={AIML_PRACTICE_BANK}
      rubricFor={aimlRubric}
      eyebrow="ai/ml practice"
      blurb="Nothing grades an ML design for you, so each question ships a rubric — seven framework points about data, labels and feedback loops, plus the specifics. Attempt it first, reveal the rubric after, grade honestly."
      familyMeta={FAMILY_META}
    />
  )
}
