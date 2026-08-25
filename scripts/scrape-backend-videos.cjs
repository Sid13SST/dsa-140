/**
 * Scrapes the backend / OS / networking playlists for real video ids, titles
 * and runtimes.
 *
 *   OUT=data/backend-raw.json node scripts/scrape-backend-videos.cjs
 *
 * Same rule as the other two scrapers: ids are never typed by hand. An earlier
 * hand-typed pass on the system design track got 35 of 74 wrong.
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

const RE =
  /"contentId":"([\w-]{11})","contentType":"LOCKUP_CONTENT_TYPE_VIDEO"[\s\S]{0,4000}?"label":"((?:[^"\\]|\\.)*)"/g

function splitLabel(label) {
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
    if (seen.has(m[1])) continue
    seen.add(m[1])
    let label = m[2]
    try {
      label = JSON.parse(`"${label}"`)
    } catch (_) {}
    const { title, seconds } = splitLabel(label)
    out.push({ id: m[1], title, seconds })
  }
  return out
}

/** Hussein Nasser (@hnasr) — the closest thing to a backend-engineering curriculum on YouTube. */
const PLAYLISTS = {
  hnBackendBeginner: 'PLQnljOFTspQUNnO4p00ua_C5mKTfldiYT',
  hnBackendIntermediate: 'PLQnljOFTspQWGuRmwojJ6LiV0ejm6eOcs',
  hnBackendAdvanced: 'PLQnljOFTspQUybacGRk1b_p13dgI-SmcZ',
  hnOsFundamentals: 'PLQnljOFTspQU2bFV-N5Ix-Qg9A3WAik7N',
  hnDistributed: 'PLQnljOFTspQUVDsQcPnmdbtLUhqODSV1F',
  hnLoadBalancing: 'PLQnljOFTspQWdgYcGXCTkjda8vd2jWJYt',
  hnQueues: 'PLQnljOFTspQVcumYRWE2w9kVxxIXy_AMo',
  hnWebSockets: 'PLQnljOFTspQUGjfGdg8UvL3D_K9ACL6Qh',
  hnHttp2: 'PLQnljOFTspQWbBegaU790WhH7gNKcMAl-',
  hnHttp3: 'PLQnljOFTspQVAtL9nmMTLFaXmKJIP7_38',
  hnTls: 'PLQnljOFTspQXFUUIEnnmsQatlXz5duXRb',
  hnHighAvailability: 'PLQnljOFTspQVPOt2GrGpq2_NRZjcdxzfu',
  hnNginx: 'PLQnljOFTspQX8hkaqYiei8O2mqRIfxBm-',
  // ByteByteGo's database set — reused from the system design track's sources.
  bbgDatabase: 'PLCRMIe5FDPsdnSszazqVIQFh99t1ExH19',
  bbgSecurity: 'PLCRMIe5FDPseEIW687mH-LZ-DMNbzAQLF',
  bbgFundamentals: 'PLCRMIe5FDPsd0gVs500xeOewfySTsmEjf',
}

;(async () => {
  const all = {}
  for (const [name, id] of Object.entries(PLAYLISTS)) {
    const v = parse(await get(`https://www.youtube.com/playlist?list=${id}`))
    all[name] = v
    console.log(`${name.padEnd(24)} ${String(v.length).padStart(4)} videos`)
  }

  const empty = Object.entries(all).filter(([, v]) => v.length === 0)
  if (empty.length) {
    console.error('EMPTY SOURCES (markup probably changed):', empty.map(([k]) => k).join(', '))
    process.exit(1)
  }

  fs.writeFileSync(process.env.OUT, JSON.stringify(all, null, 1))
  console.log('total:', Object.values(all).reduce((n, v) => n + v.length, 0))
})()
