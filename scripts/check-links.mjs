#!/usr/bin/env node
/**
 * Verifies every scheduled problem slug resolves on LeetCode.
 * Usage: npm run check:links
 *
 * LeetCode rate-limits aggressively, so requests are batched and throttled.
 * A 403/429 means "throttled", not "broken" — those are reported separately.
 */
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = await readFile(resolve(root, 'src/data/schedule.ts'), 'utf8')

const key = 'export const SCHEDULE: Day[] = '
const body = src.slice(src.indexOf(key) + key.length, src.lastIndexOf(';'))
const schedule = JSON.parse(body)

const slugs = [...new Set(schedule.flatMap((d) => d.problems.map((p) => p.slug)))]
console.log(`Checking ${slugs.length} unique slugs…\n`)

const bad = []
const throttled = []
const BATCH = 5
const DELAY = 1200

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

for (let i = 0; i < slugs.length; i += BATCH) {
  const batch = slugs.slice(i, i + BATCH)
  await Promise.all(
    batch.map(async (slug) => {
      const url = `https://leetcode.com/problems/${slug}/`
      try {
        const res = await fetch(url, { method: 'GET', redirect: 'follow' })
        if (res.status === 404) bad.push(slug)
        else if (res.status === 403 || res.status === 429) throttled.push(slug)
      } catch (e) {
        throttled.push(slug)
      }
    }),
  )
  process.stdout.write(`\r  ${Math.min(i + BATCH, slugs.length)}/${slugs.length}`)
  await sleep(DELAY)
}

console.log('\n')
if (bad.length) {
  console.log(`BROKEN (${bad.length}):`)
  bad.forEach((s) => console.log(`  https://leetcode.com/problems/${s}/`))
} else {
  console.log('No broken links found.')
}
if (throttled.length) {
  console.log(`\nInconclusive — rate limited (${throttled.length}). Re-run later to confirm.`)
}
process.exit(bad.length ? 1 : 0)
