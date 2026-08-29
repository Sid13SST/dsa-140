/**
 * The three contest sources, in ONE place.
 *
 * Two things read this module:
 *   - api/contests.ts, the serverless route the browser calls, and
 *   - scripts/fetch-contests.mjs, the scheduled job that writes the static
 *     fallback file.
 *
 * They used to be separate copies of the same fetching code, which is how the
 * two drift apart. Plain .mjs rather than .ts because the script runs under
 * bare node with no build step; api/contests.ts imports it through the
 * hand-written .d.mts beside this file, so the route stays type-checked.
 *
 * Every fetch here happens SERVER-SIDE, and that is the point: of the three,
 * only Codeforces sends `Access-Control-Allow-Origin`. CodeChef and AtCoder
 * answer a browser request with no CORS header at all, so a page fetching them
 * directly gets nothing no matter how healthy the sources are.
 */

const UA = 'dsa-140-tracker'

export async function fetchCodeforces() {
  const res = await fetch('https://codeforces.com/api/contest.list?gym=false', {
    headers: { 'User-Agent': UA },
  })
  if (!res.ok) throw new Error(`Codeforces returned ${res.status}`)

  const json = await res.json()
  if (json.status !== 'OK' || !Array.isArray(json.result)) {
    throw new Error('Unexpected Codeforces response shape.')
  }

  return json.result
    .filter((c) => c.phase === 'BEFORE' && typeof c.startTimeSeconds === 'number')
    .map((c) => ({
      id: `cf-${c.id}`,
      name: c.name,
      platform: 'Codeforces',
      startsAt: c.startTimeSeconds * 1000,
      durationMin: Math.round((c.durationSeconds ?? 7200) / 60),
      url: `https://codeforces.com/contest/${c.id}`,
    }))
}

export async function fetchCodeChef() {
  const res = await fetch('https://www.codechef.com/api/list/contests/all', {
    headers: { 'User-Agent': UA },
  })
  if (!res.ok) throw new Error(`CodeChef returned ${res.status}`)

  const json = await res.json()
  if (!Array.isArray(json.future_contests)) {
    throw new Error('Unexpected CodeChef response shape.')
  }

  return json.future_contests.map((c) => ({
    id: `cc-${c.contest_code}`,
    name: c.contest_name,
    platform: 'CodeChef',
    startsAt: new Date(c.contest_start_date_iso).getTime(),
    durationMin: Math.round(Number(c.contest_duration ?? 180)),
    url: `https://www.codechef.com/${c.contest_code}`,
  }))
}

/**
 * AtCoder has no public contest API — kenkoooo's contests.json is historical
 * only (zero future entries when checked). So the upcoming table on
 * atcoder.jp is parsed directly, which is fine here because this only ever
 * runs server-side.
 */
export async function fetchAtCoder() {
  const res = await fetch('https://atcoder.jp/contests/?lang=en', {
    headers: {
      'User-Agent': `Mozilla/5.0 (compatible; ${UA})`,
      'Accept-Language': 'en',
    },
  })
  if (!res.ok) throw new Error(`AtCoder returned ${res.status}`)
  const html = await res.text()

  const start = html.indexOf('id="contest-table-upcoming"')
  if (start < 0) throw new Error('AtCoder upcoming table not found (page markup changed?)')
  // Stop at the next table so recent/active contests are never picked up.
  const rest = html.slice(start + 10)
  const next = rest.search(/id="contest-table-(recent|active|permanent)"/)
  const section = next > 0 ? rest.slice(0, next) : rest

  const row =
    /<time class='fixtime fixtime-full'>([^<]+)<\/time>[\s\S]*?<a href="\/contests\/([^"]+)">([\s\S]*?)<\/a>[\s\S]*?<td class="text-center">(\d{1,2}):(\d{2})<\/td>/g

  const clean = (s) =>
    s
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()

  const out = []
  let m
  while ((m = row.exec(section))) {
    const [, when, slug, title, hh, mm] = m
    // e.g. "2026-08-29 21:00:00+0900" — the offset makes this unambiguous.
    const startsAt = new Date(when.replace(' ', 'T')).getTime()
    if (!Number.isFinite(startsAt)) continue
    out.push({
      id: `ac-${slug}`,
      name: clean(title),
      platform: 'AtCoder',
      startsAt,
      durationMin: Number(hh) * 60 + Number(mm),
      url: `https://atcoder.jp/contests/${slug}`,
    })
  }
  if (out.length === 0) throw new Error('AtCoder page parsed but yielded no contests')
  return out
}

export const SOURCES = [
  ['Codeforces', fetchCodeforces],
  ['CodeChef', fetchCodeChef],
  ['AtCoder', fetchAtCoder],
]

/**
 * Fetch every source, keeping whatever succeeds.
 *
 * The sources are independent on purpose: one platform being down or changing
 * its markup must not blank the whole panel. `failed` carries the names that
 * did not answer so the caller can say so rather than silently showing less.
 */
export async function fetchAllContests({ limit = 40 } = {}) {
  const settled = await Promise.allSettled(SOURCES.map(([, fn]) => fn()))

  const contests = []
  const failed = []
  settled.forEach((r, i) => {
    const label = SOURCES[i][0]
    if (r.status === 'fulfilled') {
      console.log(`${label}: ${r.value.length} upcoming`)
      contests.push(...r.value)
    } else {
      failed.push(label)
      console.error(`${label} fetch failed: ${r.reason}`)
    }
  })

  // A finished contest is noise everywhere this is used, so drop it once here.
  const now = Date.now()
  const upcoming = contests
    .filter((c) => Number.isFinite(c.startsAt) && c.startsAt + c.durationMin * 60_000 > now)
    .sort((a, b) => a.startsAt - b.startsAt)
    .slice(0, limit)

  return { contests: upcoming, failed }
}
