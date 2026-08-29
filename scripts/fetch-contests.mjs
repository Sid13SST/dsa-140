#!/usr/bin/env node
/**
 * Writes public/contests.json — the fallback list, for hosts that cannot run a
 * serverless function (GitHub Pages). Runs in GitHub Actions every few hours.
 *
 * The live path is /api/contests, which fetches the same sources per request;
 * see api/_lib/contest-sources.mjs, which both share. A build served from a
 * branch this job has not committed to will have a stale file, and that is
 * exactly why the client prefers the API and treats this file as a backstop.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchAllContests } from '../api/_lib/contest-sources.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'public/contests.json')

const { contests, failed } = await fetchAllContests({ limit: 40 })

if (contests.length === 0) {
  console.error('All contest sources failed; leaving contests.json untouched.')
  process.exit(1)
}

if (failed.length) {
  // A warning, not a failure: publishing two platforms beats publishing none.
  console.log(`::warning::${failed.join(', ')} did not answer; publishing the rest.`)
}

await mkdir(dirname(OUT), { recursive: true })
await writeFile(
  OUT,
  JSON.stringify({ updatedAt: new Date().toISOString(), contests }, null, 2) + '\n',
)
console.log(`Wrote ${contests.length} upcoming contests.`)
