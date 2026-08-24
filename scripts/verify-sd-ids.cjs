/** Re-verifies the generated file: every id must exist in the scrape, and a
 *  random sample is checked live against oEmbed to catch a stale scrape. */
const fs = require('fs')
const https = require('https')

const src = fs.readFileSync(process.env.SD_FILE, 'utf8')
const scraped = JSON.parse(fs.readFileSync(process.env.VIDEOS, 'utf8'))
const known = new Map()
for (const list of Object.values(scraped)) for (const v of list) known.set(v.id, v)

const RE = /\{ id: '([\w-]{11})', title: '((?:[^'\\]|\\.)*)', seconds: (\d+), channel: '([^']+)' \}/g
const used = []
let m
while ((m = RE.exec(src))) used.push({ id: m[1], title: m[2].replace(/\\'/g, "'"), seconds: +m[3] })

const oembed = (id) =>
  new Promise((resolve) => {
    https
      .get(
        `https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${id}&format=json`,
        (res) => {
          let d = ''
          res.on('data', (c) => (d += c))
          res.on('end', () => {
            if (res.statusCode !== 200) return resolve(null)
            try { resolve(JSON.parse(d)) } catch (_) { resolve(null) }
          })
        },
      )
      .on('error', () => resolve(null))
  })

;(async () => {
  console.log('video entries in file:', used.length)

  const notKnown = used.filter((u) => !known.get(u.id))
  console.log('ids absent from scrape (must be 0):', notKnown.length)
  notKnown.forEach((u) => console.log('   ', u.id, u.title))

  const wrongTitle = used.filter((u) => {
    const k = known.get(u.id)
    return k && k.title !== u.title
  })
  console.log('title mismatches vs scrape (must be 0):', wrongTitle.length)

  const wrongDur = used.filter((u) => {
    const k = known.get(u.id)
    return k && k.seconds !== u.seconds
  })
  console.log('duration mismatches (must be 0):', wrongDur.length)

  // Live-check a sample, spread across the file.
  const step = Math.max(1, Math.floor(used.length / 12))
  const sample = used.filter((_, i) => i % step === 0).slice(0, 12)
  console.log(`\nlive oEmbed sample (${sample.length}):`)
  let live = 0
  for (const s of sample) {
    const r = await oembed(s.id)
    if (!r) { console.log('   DEAD', s.id, s.title); continue }
    const ok = r.title.trim() === s.title.trim()
    if (ok) live++
    console.log(`   ${ok ? 'ok  ' : 'DIFF'} ${s.id}  ${r.title.slice(0, 62)}${ok ? '' : `   (file says: ${s.title.slice(0, 40)})`}`)
  }
  console.log(`\nlive sample passing: ${live}/${sample.length}`)

  const dupes = used.map((u) => u.id).filter((id, i, a) => a.indexOf(id) !== i)
  console.log('duplicate ids:', [...new Set(dupes)].length ? [...new Set(dupes)] : 'none')
})()
