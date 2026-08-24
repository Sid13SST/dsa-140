const fs = require('fs')
const { rows, READINGS } = JSON.parse(fs.readFileSync(process.env.IN_JSON, 'utf8'))

const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"

function readingExpr(key) {
  const r = READINGS[key]
  if (!r) throw new Error('unknown reading key ' + key)
  const [type] = r
  if (type === 'primer') return `primer(${q(r[1])}, ${q(r[2])})`
  if (type === 'builders') return `builders(${q(r[1])}, ${q(r[2])})`
  return `{ label: ${q(r[2])}, url: ${q(r[1])}, source: ${q(r[3])} }`
}

const body = rows
  .map((r) => {
    const parts = [
      `    phase: ${q(r.phase)},`,
      `    topic: ${q(r.topic)},`,
      `    prompt: ${q(r.prompt)},`,
      `    kind: ${q(r.kind)},`,
    ]
    if (r.vid) {
      parts.push(
        `    video: { id: ${q(r.vid.id)}, title: ${q(r.vid.title)}, seconds: ${r.vid.seconds}, channel: ${q(r.vid.channel)} },`,
      )
    }
    if (r.readingKey) parts.push(`    reading: ${readingExpr(r.readingKey)},`)
    if (r.selfWork) parts.push(`    selfWork: ${q(r.selfWork)},`)
    return '  {\n' + parts.join('\n') + '\n  },'
  })
  .join('\n')

const header = `/**
 * A system design track meant to run *alongside* DSA at roughly 20 minutes a
 * day. It is deliberately a queue, not a calendar: unlike the DSA plan there
 * are no dates and nothing is ever "missed", because this is the low-intensity
 * track and guilt is the fastest way to abandon it.
 *
 * EVERY DAY POINTS AT ONE SPECIFIC THING. Linking a 100-video playlist or a
 * 110KB README defeats the 20-minute premise, so each day names a single video
 * (with its real runtime, so the budget is honest) and/or one deep-linked
 * article section.
 *
 * GENERATED, NOT HAND-WRITTEN. Video ids, titles and durations were scraped
 * from the playlist pages and matched by title fragment; an earlier hand-typed
 * pass had 35 of 74 ids wrong, pointing at unrelated videos or nothing at all.
 * If you add days, add them to the generator and re-run it rather than typing
 * an id here. Article URLs were each checked for a 200 and every primer anchor
 * matched against the live README headings.
 */

export type SdKind = 'concept' | 'case' | 'review'

export interface SdVideo {
  /** A single YouTube video id — never a playlist. */
  id: string
  title: string
  /** Real runtime, so a day can advertise what it will actually cost. */
  seconds: number
  channel: string
}

export interface SdReading {
  label: string
  url: string
  source: string
}

export interface SdDay {
  day: number
  phase: string
  topic: string
  /** The single question you should be able to answer when the time is up. */
  prompt: string
  kind: SdKind
  video?: SdVideo
  reading?: SdReading
  /** Set when the day is self-testing with nothing new to watch. */
  selfWork?: string
}

const PRIMER = 'https://github.com/donnemartin/system-design-primer'
const primer = (anchor: string, label: string): SdReading => ({
  label,
  url: \`\${PRIMER}#\${anchor}\`,
  source: 'System Design Primer',
})
const builders = (slug: string, label: string): SdReading => ({
  label,
  url: \`https://aws.amazon.com/builders-library/\${slug}/\`,
  source: "AWS Builders' Library",
})

const ROWS: Omit<SdDay, 'day'>[] = [
${body}
]

export const SD_TRACK: SdDay[] = ROWS.map((r, i) => ({ ...r, day: i + 1 }))
export const SD_TOTAL_DAYS = SD_TRACK.length
export const SD_PHASES = ['Primitives', 'Patterns & Reliability', 'Case Studies', 'Interview Craft']

/** Anything past this is worth saving for a weekend rather than a weeknight. */
export const LONG_SESSION_SECONDS = 20 * 60

/** Shown once at the top of the track rather than repeated on every day. */
export const SD_GENERAL: SdReading[] = [
  primer('index-of-system-design-topics', 'System Design Primer — the index'),
  { label: "AWS Builders' Library", url: 'https://aws.amazon.com/builders-library/', source: 'AWS' },
  { label: 'High Scalability — real architectures', url: 'https://highscalability.com/', source: 'highscalability.com' },
]

export const videoUrl = (id: string) => \`https://www.youtube.com/watch?v=\${id}\`

export function runtimeLabel(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return \`\${m}:\${String(s).padStart(2, '0')}\`
}
`

fs.writeFileSync(process.env.OUT_TS, header)
console.log('written', process.env.OUT_TS, header.length, 'bytes')
