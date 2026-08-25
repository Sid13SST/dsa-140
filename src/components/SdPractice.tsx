import PracticeBank from './PracticeBank'
import { allRubric } from '../data/sdPractice'
// Practice uses its own 50-question bank; the AI interviewer keeps sdPractice's
// 24. Sharing them would make the interview a memory test.
import { SD_PRACTICE_BANK } from '../data/sdPracticeBank'
import type { SdAttempt, SdQuizProgress } from '../lib/storage'

export default function SdPractice({
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
      bank={SD_PRACTICE_BANK}
      rubricFor={allRubric}
      eyebrow="design practice"
      blurb="There is no judge for system design, so each question carries a rubric — seven framework points plus five specific to that system. Design first, reveal the rubric after, and grade yourself honestly. The gap is the study list."
    />
  )
}
