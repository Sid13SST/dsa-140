import { fetchAllContests } from './_lib/contest-sources.mjs'

/**
 * GET /api/contests — the upcoming rounds, fetched live, server-side.
 *
 * This exists because the previous design had one delivery path and it kept
 * going stale:
 *
 *   1. A scheduled Action rewrites public/contests.json on the DEFAULT branch.
 *   2. Anything built from any other branch therefore ships whatever snapshot
 *      was committed when that branch was cut, and gets older every day.
 *   3. The browser cannot repair that itself: of the three sources only
 *      Codeforces sends CORS headers, so a client-side top-up can never
 *      recover CodeChef or AtCoder.
 *
 * So the panel showed a days-old list and blamed the refresh job, while the
 * job was running perfectly on main. Fetching here removes the git commit from
 * the data path entirely: every deploy and every branch gets the same live
 * answer. public/contests.json stays as the fallback for hosts that cannot run
 * a function (GitHub Pages), which is why the scheduled job is still wanted.
 *
 * No auth: this is public data from public endpoints, and requiring a session
 * would only mean the panel breaks whenever Clerk is switched off.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Use GET' })
    return
  }

  try {
    const { contests, failed } = await fetchAllContests({ limit: 60 })

    if (contests.length === 0) {
      // Every source failed. Say so with a 502 rather than publishing an empty
      // list that a cache would then hold on to — the client falls back to the
      // committed file, which is old but real.
      res.status(502).json({ error: 'No contest source answered.', failed })
      return
    }

    /*
     * Cached at the edge, not in the browser: s-maxage lets one upstream fetch
     * serve everyone for 15 minutes, and stale-while-revalidate means a slow or
     * failing source shows the last good list instead of an error while the
     * refresh happens behind it. These sources move on the order of days, so
     * this costs nothing in freshness.
     */
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400')
    res.status(200).json({
      updatedAt: new Date().toISOString(),
      source: 'live',
      failed,
      contests,
    })
  } catch (e) {
    console.error(e)
    res.status(502).json({ error: 'Could not reach the contest sources.' })
  }
}
