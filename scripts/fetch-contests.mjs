#!/usr/bin/env node
/**
 * Fetches upcoming Codeforces, CodeChef and AtCoder contests and writes
 * public/contests.json. Runs in GitHub Actions (server-side), so CORS doesn't
 * apply — which is what makes the AtCoder page scrape viable.
 *
 * Sources are independent: if one fails the others still publish, and the file
 * is only left untouched when all of them fail.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'public/contests.json')

async function fetchCodeforces() {
  const res = await fetch('https://codeforces.com/api/contest.list?gym=false', {
    headers: { 'User-Agent': 'dsa-140-tracker' },
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

async function fetchCodeChef() {
  const res = await fetch('https://www.codechef.com/api/list/contests/all', {
    headers: { 'User-Agent': 'dsa-140-tracker' },
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
 * atcoder.jp is parsed directly, which is fine here because this runs
 * server-side in Actions where CORS doesn't apply.
 */
async function fetchAtCoder() {
  const res = await fetch('https://atcoder.jp/contests/?lang=en', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; dsa-140-tracker)',
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

const sources = [
  ['Codeforces', fetchCodeforces],
  ['CodeChef', fetchCodeChef],
  ['AtCoder', fetchAtCoder],
]

const results = await Promise.allSettled(sources.map(([, fn]) => fn()))

let contests = []
results.forEach((r, i) => {
  const label = sources[i][0]
  if (r.status === 'fulfilled') {
    console.log(`${label}: ${r.value.length} upcoming`)
    contests.push(...r.value)
  } else {
    console.error(`${label} fetch failed: ${r.reason}`)
  }
})

if (contests.length === 0) {
  console.error("All contest sources failed; leaving contests.json untouched.")
  process.exit(1)
}

contests = contests.sort((a, b) => a.startsAt - b.startsAt).slice(0, 40)

await mkdir(dirname(OUT), { recursive: true })
await writeFile(
  OUT,
  JSON.stringify({ updatedAt: new Date().toISOString(), contests }, null, 2) + '\n',
)
console.log(`Wrote ${contests.length} upcoming contests.`)
