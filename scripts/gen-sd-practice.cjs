/**
 * Generates src/data/sdPractice.ts — the system design question bank.
 *
 * Same rule as the study track: reference video ids are NEVER typed by hand.
 * They are resolved by title fragment against the scraped playlist data, and
 * this script exits non-zero if a fragment matches nothing.
 *
 *   VIDEOS=/tmp/videos.json OUT_TS=src/data/sdPractice.ts node scripts/gen-sd-practice.cjs
 */
const fs = require('fs')

const scraped = JSON.parse(fs.readFileSync(process.env.VIDEOS, 'utf8'))
const CHANNEL = {
  bbgFundamentals: 'ByteByteGo',
  bbgInterview: 'ByteByteGo',
  bbgDatabase: 'ByteByteGo',
  bbgAlgorithms: 'ByteByteGo',
  bbgSecurity: 'ByteByteGo',
  bbgPayments: 'ByteByteGo',
  gauravSystemDesign: 'Gaurav Sen',
}
const pool = []
for (const [list, vids] of Object.entries(scraped)) {
  for (const v of vids) pool.push({ ...v, channel: CHANNEL[list] })
}
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const missing = []
function find(fragment) {
  if (!fragment) return null
  const f = norm(fragment)
  const hits = pool.filter((v) => norm(v.title).includes(f))
  if (!hits.length) {
    missing.push(fragment)
    return null
  }
  hits.sort((a, b) => (a.seconds || 1e9) - (b.seconds || 1e9))
  return hits[0]
}

/**
 * Every answer is graded on the same seven axes — that is the framework itself.
 * Listing them per question would be noise, so they live once, here.
 */
const UNIVERSAL = [
  'Scoped it: named the functional requirements you are building, and what you are explicitly not',
  'Stated non-functionals with numbers: scale, read/write ratio, latency target, availability',
  'Did back-of-envelope: QPS, storage/year, bandwidth — and used them later',
  'Sketched the API before the boxes',
  'Chose a data model and justified the store against the access pattern',
  'Drew a high-level design that a reader could follow end to end',
  'Named bottlenecks and what you would fix first at 10x',
]

// [id, title, tier, scope, clarify[], rubric[], videoFragment|null, primerAnchor|null, primerLabel|null]
const Q = [
  [
    'url-shortener', 'URL shortener', 'warmup',
    'Take a long URL, return a short one, redirect on lookup.',
    ['Custom aliases allowed?', 'Link expiry?', 'Analytics on clicks?', 'Read:write ratio — assume heavily read'],
    [
      'Key generation without cross-server coordination (counter+base62, or hash+collision check)',
      'Explained why a random hash needs a collision check and a counter does not',
      'Redirect is 301 vs 302 — and why 302 keeps analytics working',
      'Read path served from cache; database is the fallback not the front door',
      'Storage estimate justifies the key length you chose',
    ],
    null, 'design-pastebincom-or-bitly', 'Design Pastebin / Bit.ly — full walkthrough',
  ],
  [
    'rate-limiter', 'Rate limiter', 'warmup',
    'Reject requests above a per-user quota, across a fleet of servers.',
    ['Per user, per IP, or per API key?', 'Hard reject or queue?', 'Limit shared across regions?'],
    [
      'Picked an algorithm and named its failure mode (token vs leaky bucket vs sliding window)',
      'Fixed-window burst problem at the boundary, and how sliding window fixes it',
      'Where counters live so many gateway nodes agree — and the race on read-modify-write',
      'What happens when the counter store is down: fail open or fail closed, and why',
      'Returns 429 with Retry-After rather than dropping silently',
    ],
    null, null, null,
  ],
  [
    'key-value-store', 'Distributed key-value store', 'warmup',
    'A store that survives nodes coming and going.',
    ['Consistency guarantee required?', 'Durability on write?', 'Expected value size?'],
    [
      'Consistent hashing for placement, and why it limits reshuffling',
      'Replication factor N, with quorum R + W > N reasoned about explicitly',
      'How the ring detects failure and what happens to writes during it',
      'Repair after a node returns (read repair / anti-entropy / hinted handoff)',
      'Named the consistency model you are actually offering',
    ],
    'How Key value Stores Work', 'design-a-key-value-store-for-a-search-engine', 'Design a key-value store',
  ],
  [
    'unique-id', 'Unique ID generator', 'warmup',
    'Generate 64-bit ids, sortable by time, across many machines.',
    ['Must ids be strictly monotonic or roughly time-ordered?', 'How many machines?', 'Is leaking volume acceptable?'],
    [
      'Snowflake layout: timestamp + machine id + sequence, with bit budget justified',
      'Why a database auto-increment does not survive sharding',
      'Clock skew and what happens when time moves backwards',
      'How machine ids are assigned without a human doing it',
      'Trade-off named: UUIDv4 is easy but destroys index locality',
    ],
    null, null, null,
  ],
  [
    'news-feed', 'News feed', 'core',
    'Build the home timeline for a social product.',
    ['Follow graph size — any celebrities?', 'Chronological or ranked?', 'How stale may the feed be?'],
    [
      'Fanout on write vs on read, with the read/write ratio driving the choice',
      'The celebrity problem, and the hybrid that fixes it',
      'Feed cache per user, and what is stored — ids or hydrated posts',
      'Pagination that survives new posts arriving (cursor, not offset)',
      'What is precomputed vs computed at request time',
    ],
    'Designing INSTAGRAM', 'design-the-twitter-timeline-and-search-or-facebook-feed-and-search', 'Design the Twitter timeline',
  ],
  [
    'chat', 'Chat / messaging', 'core',
    'One-to-one and group messaging with delivery state.',
    ['Group size limit?', 'Message history retention?', 'Read receipts and presence needed?'],
    [
      'Persistent connections (WebSocket) and how a server finds the recipient',
      'Per-conversation ordering — sequence numbers, not wall-clock timestamps',
      'Offline delivery: the inbox/queue that holds messages until pickup',
      'Presence is expensive: how you avoid a fanout storm on every connect',
      'Storage model chosen for "recent messages, one conversation" reads',
    ],
    'Design A Chat System', null, null,
  ],
  [
    'web-crawler', 'Web crawler', 'core',
    'Crawl a large slice of the web, repeatedly.',
    ['How many pages, in what window?', 'Respect robots.txt?', 'Recrawl policy?'],
    [
      'URL frontier with politeness — per-domain rate limiting, not global',
      'Deduplication of URLs and of content (checksums, not just URLs)',
      'Trap avoidance: infinite calendars, session ids, redirect loops',
      'Distributed workers pulling from the frontier without duplicating work',
      'Freshness: how a page gets scheduled for recrawl',
    ],
    'Design a Web Crawler', 'design-a-web-crawler', 'Design a web crawler',
  ],
  [
    'typeahead', 'Typeahead / autocomplete', 'core',
    'Suggest completions as the user types.',
    ['Top-k per prefix?', 'Personalised?', 'How fresh must suggestions be?'],
    [
      'Trie with top-k precomputed at each node, not computed per keystroke',
      'Why you debounce on the client before the request ever leaves',
      'Where the trie lives and how it is sharded by prefix',
      'Rebuild pipeline is offline and batched — suggestions are allowed to be stale',
      'Latency budget stated: this is a sub-100ms feature or it is useless',
    ],
    null, null, null,
  ],
  [
    'notification', 'Notification system', 'core',
    'Fan a single event out to push, email and SMS.',
    ['Which channels?', 'Delivery guarantee?', 'User preferences and quiet hours?'],
    [
      'Queue between the trigger and the senders, so a slow provider cannot block',
      'Per-channel workers with independent retry and rate limits',
      'Idempotency so a retry does not notify twice',
      'Preference and opt-out checked at send time, not at enqueue time',
      'Dead-letter handling for permanently failing sends',
    ],
    null, null, null,
  ],
  [
    'youtube', 'Video platform', 'core',
    'Upload, process and stream video at scale.',
    ['Max upload size?', 'Which resolutions?', 'Live or on-demand?'],
    [
      'Upload goes to blob storage directly, not through the app server',
      'Transcoding as a queue of jobs, fanned out per resolution',
      'Why the pipeline is a DAG and how a failed step is retried',
      'CDN for delivery, with adaptive bitrate explained',
      'Metadata store separate from blob store, with the access pattern named',
    ],
    'Design YouTube', null, null,
  ],
  [
    'drive', 'Cloud drive / file sync', 'core',
    'Sync files across a user\'s devices.',
    ['Max file size?', 'Sharing between users?', 'Offline edits allowed?'],
    [
      'Chunking, so a one-byte change does not re-upload a gigabyte',
      'Content-addressed chunks and deduplication',
      'Sync protocol: how a client learns what changed since it last looked',
      'Conflict resolution when two devices edit offline — and who wins',
      'Metadata service separate from chunk storage',
    ],
    null, null, null,
  ],
  [
    'ride-matching', 'Ride matching', 'core',
    'Match riders to nearby drivers in real time.',
    ['Match radius?', 'How often do drivers report location?', 'Surge pricing in scope?'],
    [
      'Geospatial index — geohash/quadtree/S2 — and why a lat-long B-tree fails',
      'Write volume of location pings, and why they go somewhere cheap',
      'Matching as a short-lived lock so two riders cannot take one driver',
      'State machine for a trip, and where it is persisted',
      'Hot cells: a stadium at closing time, and what you do about it',
    ],
    'Design A Location Based Service', null, null,
  ],
  [
    'ticket-booking', 'Ticket booking', 'core',
    'Sell reserved seats under heavy contention.',
    ['Seat selection or general admission?', 'Hold duration?', 'Overselling ever acceptable?'],
    [
      'The double-booking problem stated precisely as a race',
      'Reservation with a TTL hold, then confirm — not a single write',
      'Transaction or conditional update at the row level, with isolation named',
      'Queueing/waiting room for a popular on-sale, so the DB is not the queue',
      'What happens when payment fails after the hold',
    ],
    null, null, null,
  ],
  [
    'payments', 'Payment system', 'core',
    'Charge a customer and keep books that balance.',
    ['Which payment methods?', 'Refunds and chargebacks?', 'Multi-currency?'],
    [
      'Double-entry ledger, append-only — no UPDATE on a balance',
      'Idempotency key on every charge so retries cannot double-charge',
      'Reconciliation against the provider, and what a mismatch triggers',
      'The dual-write problem between your DB and the provider, and the outbox fix',
      'Money is integer minor units, never a float',
    ],
    'How Does Apple/Google Pay Work', 'design-mintcom', 'Design Mint.com',
  ],
  [
    'search', 'Search engine', 'core',
    'Full-text search over a large corpus.',
    ['Corpus size and update rate?', 'Ranking signals available?', 'Typo tolerance?'],
    [
      'Inverted index: term to posting list, and why that beats scanning',
      'Index build is an offline pipeline, separate from serving',
      'Sharding the index by document, and scatter-gather at query time',
      'Ranking as a second pass over a candidate set, not over everything',
      'Freshness tier for very recent documents',
    ],
    'How Search Really Works', null, null,
  ],
  [
    'metrics', 'Metrics and monitoring', 'core',
    'Ingest, store and query time-series at scale.',
    ['Retention period?', 'Query patterns — dashboards or alerts?', 'Cardinality expectations?'],
    [
      'Write path optimised for append; why a general-purpose OLTP store is wrong',
      'Rollups/downsampling so a year of per-second data is affordable',
      'Cardinality explosion from labels, and how you bound it',
      'Push vs pull collection, with the trade-off named',
      'Alert evaluation path kept separate from dashboard queries',
    ],
    null, null, null,
  ],
  [
    'distributed-cache', 'Distributed cache', 'hard',
    'A cache tier shared by many application servers.',
    ['Eviction policy?', 'Consistency with the source of truth?', 'Cache size vs working set?'],
    [
      'Placement via consistent hashing, and what a node loss costs',
      'Invalidation strategy, and why it is the hard half',
      'Stampede protection: locking, or probabilistic early expiry',
      'Hot key problem and replication of just that key',
      'What the application does on a cache-tier outage',
    ],
    null, null, null,
  ],
  [
    'job-scheduler', 'Distributed job scheduler', 'hard',
    'Run scheduled and one-off jobs across a worker fleet.',
    ['At-least-once or at-most-once?', 'Max job duration?', 'Priorities or fairness?'],
    [
      'Leasing so two workers cannot run one job, with lease renewal',
      'What happens when a worker dies mid-job — and why at-least-once is the honest promise',
      'Idempotency requirement pushed onto the job itself',
      'Backoff and dead-lettering for repeatedly failing jobs',
      'Fairness so one tenant cannot starve the queue',
    ],
    null, null, null,
  ],
  [
    'ad-click', 'Ad click aggregation', 'hard',
    'Count clicks at very high volume, with reporting.',
    ['Exact or approximate counts?', 'Reporting latency tolerance?', 'Fraud filtering in scope?'],
    [
      'Stream ingestion with a log, not synchronous DB writes',
      'Windowed aggregation, and late-arriving events',
      'Exactly-once is a lie — how you dedupe with event ids instead',
      'Pre-aggregated rollups for the query path',
      'Approximation (HyperLogLog) where exactness is not required, stated as a choice',
    ],
    null, null, null,
  ],
  [
    'leaderboard', 'Leaderboard', 'hard',
    'Global and friend rankings that update constantly.',
    ['How many players?', 'Real-time or periodic?', 'Need "my rank" for everyone?'],
    [
      'Sorted set for top-N, and why a SQL ORDER BY does not scale here',
      '"My rank" for a mid-table player is the expensive query — how you avoid it',
      'Bucketing/approximate rank as an accepted trade-off',
      'Write amplification when every score updates the structure',
      'Sharding by game/region and merging',
    ],
    'Top 5 Redis Use Cases', null, null,
  ],
  [
    'multi-region', 'Multi-region active-active', 'hard',
    'Serve and accept writes from more than one region.',
    ['Which data must be globally consistent?', 'RPO/RTO targets?', 'Regulatory data residency?'],
    [
      'What you give up: named the CAP trade-off for each data class',
      'Conflict resolution for concurrent writes (LWW, CRDT, or partition by region)',
      'Replication lag made visible to the user, or hidden — and how',
      'Failover: how traffic moves, and what is lost',
      'Why some data (payments, inventory) should stay single-writer',
    ],
    null, null, null,
  ],
  [
    'consistency-tradeoff', 'Pick the consistency model', 'hard',
    'Given three features, choose a consistency model for each and defend it.',
    ['What does the user actually observe?', 'What is the cost of being wrong?', 'Can staleness be hidden?'],
    [
      'Bank balance: strong, and why eventual is unacceptable here',
      'Social feed: eventual, and why the user cannot tell',
      'Read-your-own-writes for the poster, and how you achieve it cheaply',
      'Named the mechanism, not just the label (quorum, sticky routing, session token)',
      'Said what latency each choice costs',
    ],
    'Data Consistency and Tradeoffs', 'consistency-patterns', 'Consistency patterns',
  ],
  [
    'scale-to-millions', 'Scale a monolith to millions', 'hard',
    'A single server app is buckling. Walk the whole evolution.',
    ['Current bottleneck — CPU, DB, or bandwidth?', 'Budget?', 'Acceptable downtime for migration?'],
    [
      'Ordered the moves by cost/benefit rather than jumping to microservices',
      'Vertical first, then stateless app tier behind a load balancer',
      'Read replicas before sharding, and why sharding is the last resort',
      'Cache and CDN placed where the measurement said, not by reflex',
      'Named what you would measure to know the next bottleneck',
    ],
    null, 'design-a-system-that-scales-to-millions-of-users-on-aws', 'Scaling to millions of users',
  ],
  [
    'social-graph', 'Social graph', 'hard',
    'Store and query a follow/friend graph.',
    ['Directed or mutual?', 'Max degree?', 'Which queries dominate?'],
    [
      'Adjacency storage chosen against the dominant query, both directions',
      'Why a naive JOIN across a sharded graph is the wrong plan',
      'Denormalising follower lists, and the write cost that buys',
      'Two-hop queries (friends of friends) and why you bound them',
      'Handling the very-high-degree node',
    ],
    null, 'design-the-data-structures-for-a-social-network', 'Data structures for a social network',
  ],
]

const rows = Q.map(([id, title, tier, scope, clarify, rubric, frag, anchor, anchorLabel]) => ({
  id,
  title,
  tier,
  scope,
  clarify,
  rubric,
  video: find(frag),
  anchor: anchor ? { anchor, label: anchorLabel } : null,
}))

if (missing.length) {
  console.error('NO MATCH for fragments:', missing)
  process.exit(1)
}

const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
const arr = (a) => '[\n' + a.map((x) => `      ${q(x)},`).join('\n') + '\n    ]'

const body = rows
  .map((r) => {
    const parts = [
      `    id: ${q(r.id)},`,
      `    title: ${q(r.title)},`,
      `    tier: ${q(r.tier)},`,
      `    scope: ${q(r.scope)},`,
      `    clarify: ${arr(r.clarify)},`,
      `    rubric: ${arr(r.rubric)},`,
    ]
    if (r.video) {
      parts.push(
        `    video: { id: ${q(r.video.id)}, title: ${q(r.video.title)}, seconds: ${r.video.seconds}, channel: ${q(r.video.channel)} },`,
      )
    }
    if (r.anchor) parts.push(`    reading: primer(${q(r.anchor.anchor)}, ${q(r.anchor.label)}),`)
    return '  {\n' + parts.join('\n') + '\n  },'
  })
  .join('\n')

const out = `/**
 * System design practice questions.
 *
 * Unlike DSA there is no judge: nothing can tell you whether your answer was
 * good. So every question ships a RUBRIC — the specific points a strong answer
 * covers — and you grade yourself against it after the attempt, not before.
 * That is the whole mechanism; without it "practise system design" is just
 * staring at a whiteboard.
 *
 * GENERATED by scripts/gen-sd-practice.cjs. Reference video ids are resolved
 * by title fragment against scraped playlist data and never typed by hand.
 */
import type { SdVideo, SdReading } from './systemDesign'

export type QTier = 'warmup' | 'core' | 'hard'

export interface SdQuestion {
  id: string
  title: string
  tier: QTier
  /** One line of framing, so you know what you are being asked. */
  scope: string
  /** Questions to ask before designing anything. */
  clarify: string[]
  /** Question-specific points a strong answer hits. Grade yourself on these. */
  rubric: string[]
  video?: SdVideo
  reading?: SdReading
}

const PRIMER = 'https://github.com/donnemartin/system-design-primer'
const primer = (anchor: string, label: string): SdReading => ({
  label,
  url: \`\${PRIMER}#\${anchor}\`,
  source: 'System Design Primer',
})

/**
 * Graded on every question — this is the framework itself, so repeating it per
 * question would just be noise.
 */
export const UNIVERSAL_RUBRIC: string[] = [
${UNIVERSAL.map((u) => `  ${q(u)},`).join('\n')}
]

export const SD_QUESTIONS: SdQuestion[] = [
${body}
]

export const TIERS: QTier[] = ['warmup', 'core', 'hard']

/** Rubric points for a question: the shared framework plus its specifics. */
export function allRubric(question: SdQuestion): { text: string; universal: boolean }[] {
  return [
    ...UNIVERSAL_RUBRIC.map((text) => ({ text, universal: true })),
    ...question.rubric.map((text) => ({ text, universal: false })),
  ]
}
`

fs.writeFileSync(process.env.OUT_TS, out)
console.log(
  `questions: ${rows.length} | with video: ${rows.filter((r) => r.video).length} | with primer: ${rows.filter((r) => r.anchor).length}`,
)
console.log(`rubric points per question: ${UNIVERSAL.length} universal + ${rows[0].rubric.length} specific`)
