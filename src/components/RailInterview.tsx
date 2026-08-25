import { useState } from 'react'
import AiInterview from './AiInterview'
import { SD_QUESTIONS } from '../data/sdPractice'
import { AIML_INTERVIEW } from '../data/aimlPractice'
import { AIML_DOMAIN, SYSTEM_DESIGN_DOMAIN } from '../lib/interviewPrompt'

/** One interviewer, two question banks and two personas. */
export default function RailInterview() {
  const [domain, setDomain] = useState<'design' | 'aiml'>('design')

  return (
    <div className="space-y-3">
      <div className="card p-2 flex flex-wrap gap-2">
        <button
          onClick={() => setDomain('design')}
          className={`btn text-xs ${domain === 'design' ? 'btn-primary' : ''}`}
        >
          System design {SD_QUESTIONS.length}
        </button>
        <button
          onClick={() => setDomain('aiml')}
          className={`btn text-xs ${domain === 'aiml' ? 'btn-primary' : ''}`}
        >
          AI/ML {AIML_INTERVIEW.length}
        </button>
      </div>

      {domain === 'design' ? (
        <AiInterview
          bank={SD_QUESTIONS}
          domain={SYSTEM_DESIGN_DOMAIN}
          eyebrow="system design interviewer"
        />
      ) : (
        <AiInterview bank={AIML_INTERVIEW} domain={AIML_DOMAIN} eyebrow="ai/ml interviewer" />
      )}
    </div>
  )
}
