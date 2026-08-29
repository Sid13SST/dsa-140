import type { Contest } from '../types'

/**
 * Where the contest list comes from, in the order it is tried.
 *
 *   1. `/api/contests` — a serverless function that fetches all three sources
 *      per request. This is the only path that is always current, because it
 *      does not go through a git commit.
 *   2. `public/contests.json` — a snapshot a scheduled Action commits on the
 *      default branch. Correct on a deploy from that branch, and progressively
 *      wrong on any other, which is why it is now the fallback rather than the
 *      primary source.
 *   3. A direct browser fetch of Codeforces. Only Codeforces sends
 *      `Access-Control-Allow-Origin`; CodeChef and AtCoder do not, so this can
 *      never be more than a partial repair.
 *
 * LeetCode is in none of them — its GraphQL endpoint blocks browser requests
 * outright — so its rounds are derived from the fixed recurring schedule and
 * flagged with `computed: true` in the UI.
 */

const CF_API = 'https://codeforces.com/api/contest.list?gym=false'

/** Shape of both /api/contests and public/contests.json. */
interface ContestFeed {
  contests: Contest[]
  updatedAt: number | null
}

function parseFeed(json: unknown, label: string): ContestFeed {
  const body = json as { contests?: unknown; updatedAt?: unknown }
  if (!Array.isArray(body.contests)) throw new Error(`${label} is malformed`)
  const stamp = typeof body.updatedAt === 'string' ? Date.parse(body.updatedAt) : NaN
  return {
    contests: body.contests as Contest[],
    updatedAt: Number.isFinite(stamp) ? stamp : null,
  }
}

/**
 * The live server-side route.
 *
 * Absent on GitHub Pages, which serves static files only — a 404 there is
 * expected and simply means the static file is the answer.
 */
async function fromApi(): Promise<ContestFeed> {
  const res = await fetch(`${import.meta.env.BASE_URL}api/contests`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`/api/contests returned ${res.status}`)
  return parseFeed(await res.json(), '/api/contests')
}

/** The committed snapshot, refreshed on the default branch by a scheduled job. */
async function fromStaticFile(): Promise<ContestFeed> {
  const res = await fetch(`${import.meta.env.BASE_URL}contests.json`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`contests.json returned ${res.status}`)
  return parseFeed(await res.json(), 'contests.json')
}

/**
 * The one source a browser may call directly — Codeforces sends
 * `Access-Control-Allow-Origin: *`. There is deliberately no CodeChef or
 * AtCoder twin here: both answer a cross-origin request with no CORS header,
 * so a client-side version could only ever fail. They come from the server.
 */
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

/**
 * How old the FALLBACK file may get before the client stops trusting it alone.
 *
 * Only reached when /api/contests is unavailable. The scheduled job aims for
 * every few hours, but GitHub delays and sometimes drops cron runs under load —
 * so "the file loaded fine" is not the same as "the file is current".
 */
const STALE_AFTER_MS = 6 * 60 * 60 * 1000

/** Same contest from two sources: platform plus start minute is enough. */
const contestKey = (c: Contest) => `${c.platform}|${Math.round(c.startsAt / 60_000)}`

/** Merge live results into file results without duplicating a round. */
function mergeContests(base: Contest[], extra: Contest[]): Contest[] {
  const seen = new Set(base.map(contestKey))
  const out = [...base]
  for (const c of extra) {
    if (seen.has(contestKey(c))) continue
    seen.add(contestKey(c))
    out.push(c)
  }
  return out
}

export async function loadAllContests(limit = 14): Promise<{
  contests: Contest[]
  contestError: string | null
  /** When the list currently shown was assembled, if known. */
  updatedAt: number | null
}> {
  const lc = leetcodeUpcoming()
  let fetched: Contest[] = []
  let contestError: string | null = null
  let updatedAt: number | null = null

  /*
   * The live route first. It fetches all three sources per request, so when it
   * answers there is nothing to top up and nothing that can go stale — a build
   * from any branch gets the same current list.
   */
  let live = false
  try {
    const api = await fromApi()
    fetched = api.contests
    updatedAt = api.updatedAt
    live = true
  } catch {
    live = false
  }

  if (!live) {
    /*
     * No function on this host (GitHub Pages) or it could not reach the
     * sources. Fall back to the committed snapshot, and top up from the one
     * source a browser is allowed to call when that snapshot is missing or old.
     *
     * Being explicit about the limit: only Codeforces sends CORS headers, so
     * CodeChef and AtCoder cannot be repaired from here at all. That is the
     * whole reason /api/contests exists rather than more client-side retries.
     */
    let fileOk = false
    try {
      const file = await fromStaticFile()
      fetched = file.contests
      updatedAt = file.updatedAt
      fileOk = true
    } catch {
      fileOk = false
    }

    const age = updatedAt === null ? Infinity : Date.now() - updatedAt
    if (!fileOk || age > STALE_AFTER_MS) {
      const cf = await fetchCodeforces().catch(() => null)
      if (cf) fetched = mergeContests(fetched, cf)

      const missing = [
        !cf && 'Codeforces',
        // Neither can be fetched from a browser at all; they need the server.
        !fileOk && 'CodeChef',
        !fileOk && 'AtCoder',
      ].filter(Boolean) as string[]

      if (!fileOk) {
        contestError =
          `${missing.join(', ')} rounds aren't loading. This build has no /api/contests ` +
          'and the cached list is unavailable — check those sites directly for now.'
      } else if (missing.length) {
        contestError =
          `The cached list is over ${Math.round(STALE_AFTER_MS / 3_600_000)}h old and a live ` +
          `top-up for ${missing.join(', ')} also failed. Showing what was cached.`
      }
      // Otherwise the cached list was old and Codeforces topped it up live,
      // which is a repair, not something to warn about.
    }
  }

  // Drop anything already finished, then keep the near horizon. Callers
  // re-filter against a live clock too, since this list outlives the fetch.
  const now = Date.now()
  return {
    contests: [...lc, ...fetched]
      .filter((c) => c.startsAt + c.durationMin * 60_000 > now)
      .sort((a, b) => a.startsAt - b.startsAt)
      .slice(0, limit),
    contestError,
    updatedAt,
  }
}

/** True once a contest's end time has passed. */
export const hasFinished = (c: Contest, now: number) =>
  c.startsAt + c.durationMin * 60_000 <= now

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
