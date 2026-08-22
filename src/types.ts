export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type DayKind = 'study' | 'review' | 'contest' | 'mixed'

export interface Problem {
  slug: string
  title: string
  difficulty: Difficulty
  topic: string
  /** True when this is a deliberate re-solve of a problem seen earlier. */
  revisit?: boolean
}

export interface Day {
  day: number
  date: string // YYYY-MM-DD
  phase: string
  topic: string
  kind: DayKind
  lcWeekly: boolean
  lcBiweekly: boolean
  isCheckpoint: boolean
  problems: Problem[]
}

export type DayStatus = 'pending' | 'done' | 'absent'

export interface DayState {
  status: DayStatus
  hours: number
  /** Slugs solved on this day. */
  solved: string[]
  notes: string
  contestDone: boolean
}

export type Progress = Record<string, DayState>

export const emptyDay = (): DayState => ({
  status: 'pending',
  hours: 0,
  solved: [],
  notes: '',
  contestDone: false,
})

export interface Contest {
  id: string
  name: string
  platform: 'LeetCode' | 'Codeforces' | 'CodeChef'
  startsAt: number // epoch ms
  durationMin: number
  url: string
  /** Computed from the standard recurring schedule rather than fetched live. */
  computed?: boolean
}
