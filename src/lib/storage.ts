import type { Progress } from '../types'

const KEY = 'dsa140:progress:v1'

export function loadLocal(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Progress) : {}
  } catch {
    return {}
  }
}

export function saveLocal(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // Storage can be full or blocked; progress stays in memory for this session.
  }
}

export function exportJSON(p: Progress): string {
  return JSON.stringify(p, null, 2)
}

export function importJSON(text: string): Progress {
  const parsed = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('That file is not a progress export.')
  }
  return parsed as Progress
}

/* ------------------------- system design track ------------------------- */

const SD_KEY = 'dsa140:systemdesign:v1'

/** Day number → done. Kept separate from DSA so neither track can corrupt the other. */
export type SdProgress = Record<number, boolean>

export function loadSd(): SdProgress {
  try {
    const raw = localStorage.getItem(SD_KEY)
    return raw ? (JSON.parse(raw) as SdProgress) : {}
  } catch {
    return {}
  }
}

export function saveSd(p: SdProgress) {
  try {
    localStorage.setItem(SD_KEY, JSON.stringify(p))
  } catch {
    // Same as above — non-fatal.
  }
}

/* ----------------------- system design practice ------------------------ */

const SDQ_KEY = 'dsa140:sdpractice:v1'

export interface SdAttempt {
  /** Rubric points ticked, by index into allRubric(question). */
  hit: number[]
  attempts: number
  lastAt: string | null
  notes: string
}

export type SdQuizProgress = Record<string, SdAttempt>

export function loadSdQuiz(): SdQuizProgress {
  try {
    const raw = localStorage.getItem(SDQ_KEY)
    return raw ? (JSON.parse(raw) as SdQuizProgress) : {}
  } catch {
    return {}
  }
}

export function saveSdQuiz(p: SdQuizProgress) {
  try {
    localStorage.setItem(SDQ_KEY, JSON.stringify(p))
  } catch {
    // Non-fatal, same as the other tracks.
  }
}

export const emptyAttempt = (): SdAttempt => ({ hit: [], attempts: 0, lastAt: null, notes: '' })

/* ------------------------------ ai/ml track ------------------------------ */

const AIML_KEY = 'dsa140:aiml:v1'
const AIMLQ_KEY = 'dsa140:aimlpractice:v1'
const AIMLLAB_KEY = 'dsa140:aimllabs:v1'

/** Day number → done. Isolated from DSA and system design for the same reason. */
export function loadAiml(): SdProgress {
  try {
    const raw = localStorage.getItem(AIML_KEY)
    return raw ? (JSON.parse(raw) as SdProgress) : {}
  } catch {
    return {}
  }
}

export function saveAiml(p: SdProgress) {
  try {
    localStorage.setItem(AIML_KEY, JSON.stringify(p))
  } catch {
    // Non-fatal, same as the other tracks.
  }
}

export function loadAimlQuiz(): SdQuizProgress {
  try {
    const raw = localStorage.getItem(AIMLQ_KEY)
    return raw ? (JSON.parse(raw) as SdQuizProgress) : {}
  } catch {
    return {}
  }
}

export function saveAimlQuiz(p: SdQuizProgress) {
  try {
    localStorage.setItem(AIMLQ_KEY, JSON.stringify(p))
  } catch {
    // Non-fatal.
  }
}

/** Lab id → done. Labs are weekend-sized, so they are tracked apart from days. */
export type LabProgress = Record<string, boolean>

export function loadAimlLabs(): LabProgress {
  try {
    const raw = localStorage.getItem(AIMLLAB_KEY)
    return raw ? (JSON.parse(raw) as LabProgress) : {}
  } catch {
    return {}
  }
}

export function saveAimlLabs(p: LabProgress) {
  try {
    localStorage.setItem(AIMLLAB_KEY, JSON.stringify(p))
  } catch {
    // Non-fatal.
  }
}
