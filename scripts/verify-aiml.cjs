/**
 * Verifies everything src/data/aiml.ts points at is real.
 *
 *   node scripts/verify-aiml.cjs
 *
 * Videos go through YouTube's oEmbed endpoint, which fails for dead or private
 * ids and returns the real uploader — so a live id that belongs to the wrong
 * channel is caught too. Article URLs are checked for a 200.
 *
 * This exists because a hand-typed pass on the system design track had 35 of 74
 * ids wrong, several of which were live videos by unrelated channels.
 */
const fs = require('fs')
const https = require('https')

const src = fs.readFileSync('src/data/aiml.ts', 'utf8')

const videos = [...src.matchAll(/video: \{ id: "([\w-]{11})", title: "((?:[^"\\]|\\.)*)", seconds: (\d+), channel: "([^"]+)" \}/g)].map(
  (m) => ({ id: m[1], title: JSON.parse(`"${m[2]}"`), seconds: +m[3], channel: m[4] }),
)
// Both quote styles: the generated track days emit double quotes via
// JSON.stringify, the hand-written lab/platform blocks use single.
const readings = [
  ...[...src.matchAll(/url: "(https:\/\/[^"]+)"/g)].map((m) => m[1]),
  ...[...src.matchAll(/url: '(https:\/\/[^']+)'/g)].map((m) => m[1]),
]

const head = (url) =>
  new Promise((resolve) => {
    const req = https.request(
      url,
      { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' } },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume()
          const next = new URL(res.headers.location, url).toString()
          return resolve(head(next))
        }
        res.resume()
        resolve(res.statusCode)
      },
    )
    req.on('error', () => resolve(0))
    req.setTimeout(30000, () => {
      req.destroy()
      resolve(0)
    })
    req.end()
  })

const oembed = (id) =>
  new Promise((resolve) => {
    const url = `https://www.youtube.com/oembed?url=https%3A//www.youtube.com/watch%3Fv%3D${id}&format=json`
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode !== 200) {
          res.resume()
          return resolve(null)
        }
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(d))
          } catch (_) {
            resolve(null)
          }
        })
      })
      .on('error', () => resolve(null))
  })

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

;(async () => {
  const bad = []

  console.log(`checking ${videos.length} videos...`)
  for (const v of videos) {
    const meta = await oembed(v.id)
    if (!meta) {
      bad.push(`DEAD  ${v.id}  ${v.title}`)
      continue
    }
    if (norm(meta.title) !== norm(v.title)) {
      bad.push(`TITLE ${v.id}  expected "${v.title}"  got "${meta.title}"`)
    }
    // The uploader is the real check: a wrong id is usually a *live* video.
    if (!norm(meta.author_name).includes(norm(v.channel).split(' ')[0])) {
      bad.push(`CHAN  ${v.id}  expected ${v.channel}  got ${meta.author_name}`)
    }
  }

  const urls = [...new Set(readings)]
  console.log(`checking ${urls.length} urls...`)
  for (const u of urls) {
    const code = await head(u)
    if (code !== 200) bad.push(`URL   ${code}  ${u}`)
  }

  if (bad.length) {
    console.error('\nFAILED:')
    for (const b of bad) console.error('  ' + b)
    process.exit(1)
  }
  console.log(`\nok — ${videos.length} videos, ${urls.length} urls all resolve`)
})()
