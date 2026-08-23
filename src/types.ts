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

export type Platform = 'LeetCode' | 'Codeforces' | 'CodeChef' | 'AtCoder'

/**
 * Per-platform identity. `short` is the secondary encoding that makes the
 * markers readable without relying on colour alone — the four hues sit in the
 * 6-8 CVD band, which is only acceptable with a label alongside.
 */
export const PLATFORMS: Record<
  Platform,
  { short: string; dot: string; text: string; border: string; listUrl: string }
> = {
  LeetCode: {
    short: 'LC',
    dot: 'bg-platform-leetcode',
    text: 'text-platform-leetcode',
    border: 'border-platform-leetcode',
    listUrl: 'https://leetcode.com/contest/',
  },
  Codeforces: {
    short: 'CF',
    dot: 'bg-platform-codeforces',
    text: 'text-platform-codeforces',
    border: 'border-platform-codeforces',
    listUrl: 'https://codeforces.com/contests',
  },
  CodeChef: {
    short: 'CC',
    dot: 'bg-platform-codechef',
    text: 'text-platform-codechef',
    border: 'border-platform-codechef',
    listUrl: 'https://www.codechef.com/contests',
  },
  AtCoder: {
    short: 'AC',
    dot: 'bg-platform-atcoder',
    text: 'text-platform-atcoder',
    border: 'border-platform-atcoder',
    listUrl: 'https://atcoder.jp/contests/',
  },
}

export interface Contest {
  id: string
  name: string
  platform: Platform
  startsAt: number // epoch ms
  durationMin: number
  url: string
  /** Computed from the standard recurring schedule rather than fetched live. */
  computed?: boolean
}
