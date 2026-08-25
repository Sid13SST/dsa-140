/**
 * Scrapes the AI/ML teaching playlists for real video ids, titles and runtimes.
 *
 * Same reason as scrape-sd-videos.cjs: an earlier hand-typed pass on the system
 * design track got 35 of 74 ids wrong. Ids are never typed by hand here either.
 *
 *   OUT=data/aiml-raw.json node scripts/scrape-aiml-videos.cjs
 */
const fs = require('fs')
const https = require('https')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

const get = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } }, (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => resolve(d))
      })
      .on('error', reject)
  })

// YouTube's current playlist UI puts title + duration in one accessibility
// label. The gap can be wide — a themedPalette blob sits between the two on
// some pages — so the window is deliberately generous.
const RE =
  /"contentId":"([\w-]{11})","contentType":"LOCKUP_CONTENT_TYPE_VIDEO"[\s\S]{0,4000}?"label":"((?:[^"\\]|\\.)*)"/g

function splitLabel(label) {
  // "... 4 minutes, 17 seconds" | "... 1 hour, 2 minutes" | "... 58 seconds"
  const m = label.match(
    /^(.*?)\s+((?:\d+\s+hours?,?\s*)?(?:\d+\s+minutes?,?\s*)?(?:\d+\s+seconds?)?)$/,
  )
  if (!m) return { title: label, seconds: null }
  const dur = m[2] || ''
  const h = /(\d+)\s+hour/.exec(dur)
  const mi = /(\d+)\s+minute/.exec(dur)
  const s = /(\d+)\s+second/.exec(dur)
  const seconds = (h ? +h[1] * 3600 : 0) + (mi ? +mi[1] * 60 : 0) + (s ? +s[1] : 0)
  return { title: m[1].trim(), seconds: seconds || null }
}

function parse(html) {
  const out = []
  const seen = new Set()
  let m
  RE.lastIndex = 0
  while ((m = RE.exec(html))) {
    const vid = m[1]
    if (seen.has(vid)) continue
    seen.add(vid)
    let label = m[2]
    try {
      label = JSON.parse(`"${label}"`)
    } catch (_) {}
    const { title, seconds } = splitLabel(label)
    out.push({ id: vid, title, seconds })
  }
  return out
}

const PLAYLISTS = {
  karpathyZ2H: 'PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ',
  b3NeuralNets: 'PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi',
  b3LinAlg: 'PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab',
  b3Calculus: 'PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr',
  sqMachineLearning: 'PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF',
  sqStatsFund: 'PLblh5JKOoLUK0FLuzwntyYI10UQFUhsY9',
  sqDeepLearning: 'PLblh5JKOoLUIxGDQs4LFFD--41Vzf-ME1',
  sqXGBoost: 'PLblh5JKOoLULU0irPgs1SnKO6wqVjKUsQ',
  sqRandomForest: 'PLblh5JKOoLUIE96dI3U7oxHaCAbZgfhHk',
  sqLogistic: 'PLblh5JKOoLUKxzEP5HA2d-Li7IJkHfXSe',
  sqGradientBoost: 'PLblh5JKOoLUJjeXUvUE0maghNuY2_5fY6',
}

/** Long-form deep dives used for the weekend lab track, not weeknights. */
const CHANNELS = { umarJamil: 'umarjamilai' }

;(async () => {
  const all = {}
  for (const [name, id] of Object.entries(PLAYLISTS)) {
    const v = parse(await get(`https://www.youtube.com/playlist?list=${id}`))
    all[name] = v
    console.log(`${name.padEnd(20)} ${String(v.length).padStart(4)} videos`)
  }
  for (const [name, handle] of Object.entries(CHANNELS)) {
    const v = parse(await get(`https://www.youtube.com/@${handle}/videos`))
    all[name] = v
    console.log(`${name.padEnd(20)} ${String(v.length).padStart(4)} videos`)
  }

  const empty = Object.entries(all).filter(([, v]) => v.length === 0)
  if (empty.length) {
    // YouTube's markup has changed under us once already; fail loudly rather
    // than quietly emitting a track with holes in it.
    console.error('EMPTY SOURCES (markup probably changed):', empty.map(([k]) => k).join(', '))
    process.exit(1)
  }

  fs.writeFileSync(process.env.OUT, JSON.stringify(all, null, 1))
  console.log('total:', Object.values(all).reduce((n, v) => n + v.length, 0))
})()
