/**
 * Types for contest-sources.mjs.
 *
 * Hand-written so the implementation can stay plain .mjs — the scheduled job
 * runs it under bare node with no build step — while api/contests.ts still
 * type-checks against it under `npm run check:api`.
 */
export type Platform = 'Codeforces' | 'CodeChef' | 'AtCoder'

export interface SourceContest {
  id: string
  name: string
  platform: Platform
  /** Epoch ms. */
  startsAt: number
  durationMin: number
  url: string
}

export declare function fetchCodeforces(): Promise<SourceContest[]>
export declare function fetchCodeChef(): Promise<SourceContest[]>
export declare function fetchAtCoder(): Promise<SourceContest[]>

export declare const SOURCES: [Platform, () => Promise<SourceContest[]>][]

/** Fetches every source; `failed` names the ones that did not answer. */
export declare function fetchAllContests(opts?: {
  limit?: number
}): Promise<{ contests: SourceContest[]; failed: Platform[] }>
