import type { Contest } from '../types'

/**
 * Codeforces and CodeChef both publish JSON contest lists but neither sends
 * CORS headers, so they're fetched server-side (see fetch-contests.mjs) into
 * `public/contests.json`. LeetCode's GraphQL endpoint blocks browser requests
 * entirely, so its contests are derived from the fixed recurring schedule
 * instead and flagged with `computed: true` in the UI.
 */

const CF_API = 'https://codeforces.com/api/contest.list?gym=false'

/**
 * Codeforces does not send CORS headers, so a browser fetch to their API fails.
 * A scheduled GitHub Action refreshes `public/contests.json` server-side every
 * few hours; we read that first and only try the live API as a fallback (which
 * works in environments where CORS isn't enforced, e.g. a proxied deployment).
 */
async function fromStaticFile(): Promise<Contest[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}contests.json`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`contests.json returned ${res.status}`)
  const json = await res.json()
  if (!Array.isArray(json.contests)) throw new Error('contests.json is malformed')
  return json.contests as Contest[]
}

export async function fetchCodeforces(): Promise<Contest[]> {
  const res = await fetch(CF_API)
  if (!res.ok) throw new Error(`Codeforces returned ${res.status}`)
  const json = await res.json()
  if (json.status !== 'OK' || !Array.isArray(json.result)) {
    throw new Error('Codeforces returned an unexpected response.')
  }
  return json.result
    .filter((c: any) => c.phase === 'BEFORE' && typeof c.startTimeSeconds === 'number')
    .map(
      (c: any): Contest => ({
        id: `cf-${c.id}`,
        name: c.name,
        platform: 'Codeforces',
        startsAt: c.startTimeSeconds * 1000,
        durationMin: Math.round((c.durationSeconds ?? 7200) / 60),
        url: `https://codeforces.com/contest/${c.id}`,
      }),
    )
    .sort((a: Contest, b: Contest) => a.startsAt - b.startsAt)
}

const CODECHEF_API = 'https://www.codechef.com/api/list/contests/all'

export async function fetchCodeChef(): Promise<Contest[]> {
  const res = await fetch(CODECHEF_API)
  if (!res.ok) throw new Error(`CodeChef returned ${res.status}`)
  const json = await res.json()
  if (!Array.isArray(json.future_contests)) {
    throw new Error('CodeChef returned an unexpected response.')
  }
  return json.future_contests
    .map(
      (c: any): Contest => ({
        id: `cc-${c.contest_code}`,
        name: c.contest_name,
        platform: 'CodeChef',
        startsAt: new Date(c.contest_start_date_iso).getTime(),
        durationMin: Math.round(Number(c.contest_duration ?? 180)),
        url: `https://www.codechef.com/${c.contest_code}`,
      }),
    )
    .sort((a: Contest, b: Contest) => a.startsAt - b.startsAt)
}

/**
 * LeetCode Weekly runs every Sunday 08:00 IST (02:30 UTC).
 * LeetCode Biweekly runs on alternate Saturdays 20:00 IST (14:30 UTC).
 * BIWEEKLY_ANCHOR must be a Saturday on which a Biweekly actually ran — change
 * it once against leetcode.com/contest and the alternating series stays correct.
 */
const BIWEEKLY_ANCHOR = Date.UTC(2026, 7, 22, 14, 30, 0) // 2026-08-22, a Saturday
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function nextWeekly(from: number, count: number): Contest[] {
  const out: Contest[] = []
  const d = new Date(from)
  // Walk forward to the next Sunday 02:30 UTC.
  const cur = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 2, 30, 0)
  let t = cur
  while (t < from || new Date(t).getUTCDay() !== 0) t += 24 * 60 * 60 * 1000
  for (let i = 0; i < count; i++) {
    out.push({
      id: `lc-weekly-${t}`,
      name: 'LeetCode Weekly Contest',
      platform: 'LeetCode',
      startsAt: t,
      durationMin: 90,
      url: 'https://leetcode.com/contest/',
      computed: true,
    })
    t += WEEK_MS
  }
  return out
}

function nextBiweekly(from: number, count: number): Contest[] {
  const out: Contest[] = []
  let t = BIWEEKLY_ANCHOR
  const twoWeeks = 2 * WEEK_MS
  if (t < from) {
    const steps = Math.ceil((from - t) / twoWeeks)
    t += steps * twoWeeks
  }
  for (let i = 0; i < count; i++) {
    out.push({
      id: `lc-biweekly-${t}`,
      name: 'LeetCode Biweekly Contest',
      platform: 'LeetCode',
      startsAt: t,
      durationMin: 90,
      url: 'https://leetcode.com/contest/',
      computed: true,
    })
    t += twoWeeks
  }
  return out
}

export function leetcodeUpcoming(from = Date.now(), count = 4): Contest[] {
  return [...nextWeekly(from, count), ...nextBiweekly(from, count)].sort(
    (a, b) => a.startsAt - b.startsAt,
  )
}

export async function loadAllContests(): Promise<{
  contests: Contest[]
  contestError: string | null
}> {
  const lc = leetcodeUpcoming()
  let fetched: Contest[] = []
  let contestError: string | null = null

  try {
    fetched = await fromStaticFile()
  } catch {
    // The static file (refreshed server-side every 6h) is unavailable — fall
    // back to live browser fetches, which only work where CORS isn't enforced.
    const [cf, cc] = await Promise.allSettled([fetchCodeforces(), fetchCodeChef()])
    if (cf.status === 'fulfilled') fetched.push(...cf.value)
    if (cc.status === 'fulfilled') fetched.push(...cc.value)
    if (cf.status === 'rejected' && cc.status === 'rejected') {
      contestError =
        "Codeforces and CodeChef rounds aren't loading. The scheduled job refreshes them every 6 hours — " +
        'until then, check codeforces.com/contests and codechef.com/contests directly.'
    } else if (cf.status === 'rejected') {
      contestError =
        "Codeforces rounds aren't loading right now. The scheduled job refreshes them every 6 hours — " +
        'until then, check codeforces.com/contests directly.'
    } else if (cc.status === 'rejected') {
      contestError =
        "CodeChef rounds aren't loading right now. The scheduled job refreshes them every 6 hours — " +
        'until then, check codechef.com/contests directly.'
    }
  }

  // Drop anything already finished, then keep the near horizon.
  const now = Date.now()
  return {
    contests: [...lc, ...fetched]
      .filter((c) => c.startsAt + c.durationMin * 60_000 > now)
      .sort((a, b) => a.startsAt - b.startsAt)
      .slice(0, 14),
    contestError,
  }
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'live now'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
