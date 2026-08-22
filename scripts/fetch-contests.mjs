#!/usr/bin/env node
/**
 * Fetches upcoming Codeforces + CodeChef contests and writes public/contests.json.
 * Runs in GitHub Actions (server-side), so CORS doesn't apply.
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

const results = await Promise.allSettled([fetchCodeforces(), fetchCodeChef()])

let contests = []
for (const [i, r] of results.entries()) {
  const label = i === 0 ? 'Codeforces' : 'CodeChef'
  if (r.status === 'fulfilled') {
    contests.push(...r.value)
  } else {
    console.error(`${label} fetch failed: ${r.reason}`)
  }
}

if (contests.length === 0) {
  console.error('Both contest sources failed; leaving contests.json untouched.')
  process.exit(1)
}

contests = contests.sort((a, b) => a.startsAt - b.startsAt).slice(0, 30)

await mkdir(dirname(OUT), { recursive: true })
await writeFile(
  OUT,
  JSON.stringify({ updatedAt: new Date().toISOString(), contests }, null, 2) + '\n',
)
console.log(`Wrote ${contests.length} upcoming contests.`)
