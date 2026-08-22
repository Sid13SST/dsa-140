#!/usr/bin/env node
/**
 * Fetches upcoming Codeforces rounds and writes public/contests.json.
 * Runs in GitHub Actions (server-side), so CORS doesn't apply.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'public/contests.json')

const res = await fetch('https://codeforces.com/api/contest.list?gym=false', {
  headers: { 'User-Agent': 'dsa-140-tracker' },
})
if (!res.ok) {
  console.error(`Codeforces returned ${res.status}`)
  process.exit(1)
}

const json = await res.json()
if (json.status !== 'OK' || !Array.isArray(json.result)) {
  console.error('Unexpected Codeforces response shape.')
  process.exit(1)
}

const contests = json.result
  .filter((c) => c.phase === 'BEFORE' && typeof c.startTimeSeconds === 'number')
  .map((c) => ({
    id: `cf-${c.id}`,
    name: c.name,
    platform: 'Codeforces',
    startsAt: c.startTimeSeconds * 1000,
    durationMin: Math.round((c.durationSeconds ?? 7200) / 60),
    url: `https://codeforces.com/contest/${c.id}`,
  }))
  .sort((a, b) => a.startsAt - b.startsAt)
  .slice(0, 20)

await mkdir(dirname(OUT), { recursive: true })
await writeFile(
  OUT,
  JSON.stringify({ updatedAt: new Date().toISOString(), contests }, null, 2) + '\n',
)
console.log(`Wrote ${contests.length} upcoming Codeforces contests.`)
