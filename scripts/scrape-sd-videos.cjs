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

// YouTube's current playlist UI puts title + duration in one accessibility label.
const RE =
  /"contentId":"([\w-]{11})","contentType":"LOCKUP_CONTENT_TYPE_VIDEO"[\s\S]{0,500}?"label":"((?:[^"\\]|\\.)*)"/g

function splitLabel(label) {
  // "... 4 minutes, 17 seconds"  |  "... 1 hour, 2 minutes"  |  "... 58 seconds"
  const m = label.match(
    /^(.*?)\s+((?:\d+\s+hours?,?\s*)?(?:\d+\s+minutes?,?\s*)?(?:\d+\s+seconds?)?)$/,
  )
  if (!m) return { title: label, seconds: null }
  const dur = m[2] || ''
  const h = /(\d+)\s+hour/.exec(dur)
  const mi = /(\d+)\s+minute/.exec(dur)
  const s = /(\d+)\s+second/.exec(dur)
  const seconds =
    (h ? +h[1] * 3600 : 0) + (mi ? +mi[1] * 60 : 0) + (s ? +s[1] : 0)
  return { title: m[1].trim(), seconds: seconds || null }
}

async function scrape(id) {
  const html = await get(`https://www.youtube.com/playlist?list=${id}`)
  const out = []
  const seen = new Set()
  let m
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

;(async () => {
  const lists = {
    bbgFundamentals: 'PLCRMIe5FDPsd0gVs500xeOewfySTsmEjf',
    bbgInterview: 'PLCRMIe5FDPseVvwzRiCQBmNOVUIZSSkP8',
    bbgDatabase: 'PLCRMIe5FDPsdnSszazqVIQFh99t1ExH19',
    bbgAlgorithms: 'PLCRMIe5FDPsdSsAdVfub8OCVeFi-5m06O',
    bbgSecurity: 'PLCRMIe5FDPseEIW687mH-LZ-DMNbzAQLF',
    bbgPayments: 'PLCRMIe5FDPsfzc47gXWQT1Yl2r_Zwu46F',
    gauravSystemDesign: 'PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX',
  }
  const all = {}
  for (const [name, id] of Object.entries(lists)) {
    try {
      const v = await scrape(id)
      all[name] = v
      console.log(`${name.padEnd(20)} ${String(v.length).padStart(3)} videos`)
    } catch (e) {
      console.log(`${name.padEnd(20)} FAILED ${e.message}`)
      all[name] = []
    }
  }
  fs.writeFileSync(process.env.OUT, JSON.stringify(all, null, 1))
  console.log('total:', Object.values(all).reduce((n, v) => n + v.length, 0))
})()
