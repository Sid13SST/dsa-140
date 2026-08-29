import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fetchAllContests } from './api/_lib/contest-sources.mjs'

/**
 * Serve /api/contests during `npm run dev`.
 *
 * Vite does not run the api/ functions, so without this the dev server 404s
 * that route and the dashboard falls back to whatever public/contests.json
 * happens to be committed on the current branch — which is how the contest
 * panel came to look broken locally while the scheduled job was healthy.
 * Same sources, same shape, so dev matches the deployed behaviour.
 */
function devContestsApi(): Plugin {
  return {
    name: 'dev-contests-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/contests', async (_req, res) => {
        try {
          const { contests, failed } = await fetchAllContests({ limit: 60 })
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = contests.length ? 200 : 502
          res.end(
            JSON.stringify(
              contests.length
                ? { updatedAt: new Date().toISOString(), source: 'live', failed, contests }
                : { error: 'No contest source answered.', failed },
            ),
          )
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devContestsApi()],
  /*
   * The app has real routes now, so './' no longer works — a relative base
   * breaks deep links like /plans. But GitHub Pages serves from a sub-path
   * (/dsa-140/) while Vercel serves from the root, and a hard-coded '/' gives
   * Pages a blank page 404ing on its own assets.
   *
   * So the base comes from the environment: the Pages workflow sets
   * VITE_BASE_PATH=/dsa-140/, and everything else defaults to the root.
   */
  base: process.env.VITE_BASE_PATH || '/',
})
