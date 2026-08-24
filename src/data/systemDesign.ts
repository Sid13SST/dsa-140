/**
 * A 112-day system design track meant to run *alongside* DSA at ~20 minutes a
 * day. It is deliberately a queue, not a calendar: unlike the DSA plan there
 * are no dates and nothing is ever "missed", because this is the low-intensity
 * track and guilt is the fastest way to abandon it.
 *
 * Every URL was checked to resolve and every YouTube id resolved through the
 * oEmbed API so the listed `source` is the real uploader. Verify the same way
 * when adding entries:
 *   curl "https://www.youtube.com/oembed?url=<encoded-url>&format=json"
 */

export type SdKind = 'concept' | 'case' | 'review'

export interface SdResource {
  label: string
  url: string
  kind: 'video' | 'reading'
  source: string
}

export interface SdDay {
  day: number
  phase: string
  topic: string
  /** The single question you should be able to answer when the 20 minutes are up. */
  prompt: string
  minutes: number
  kind: SdKind
  /** Keys into RESOURCE_POOL. */
  refs: string[]
}

const yt = (id: string) => `https://www.youtube.com/playlist?list=${id}`

export const RESOURCE_POOL: Record<string, SdResource> = {
  primer: {
    label: 'The System Design Primer',
    url: 'https://github.com/donnemartin/system-design-primer',
    kind: 'reading',
    source: 'donnemartin',
  },
  gaurav: {
    label: 'System Design Playlist',
    url: yt('PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX'),
    kind: 'video',
    source: 'Gaurav Sen',
  },
  bbgFund: {
    label: 'System Design Fundamentals',
    url: yt('PLCRMIe5FDPsd0gVs500xeOewfySTsmEjf'),
    kind: 'video',
    source: 'ByteByteGo',
  },
  bbgInterview: {
    label: 'System Design Interview',
    url: yt('PLCRMIe5FDPseVvwzRiCQBmNOVUIZSSkP8'),
    kind: 'video',
    source: 'ByteByteGo',
  },
  bbgDb: {
    label: 'Database',
    url: yt('PLCRMIe5FDPsdnSszazqVIQFh99t1ExH19'),
    kind: 'video',
    source: 'ByteByteGo',
  },
  bbgAlgos: {
    label: 'Algorithms You Should Know For System Design',
    url: yt('PLCRMIe5FDPsdSsAdVfub8OCVeFi-5m06O'),
    kind: 'video',
    source: 'ByteByteGo',
  },
  bbgPayments: {
    label: 'Payment Systems',
    url: yt('PLCRMIe5FDPsfzc47gXWQT1Yl2r_Zwu46F'),
    kind: 'video',
    source: 'ByteByteGo',
  },
  bbgSecurity: {
    label: 'Security',
    url: yt('PLCRMIe5FDPseEIW687mH-LZ-DMNbzAQLF'),
    kind: 'video',
    source: 'ByteByteGo',
  },
  builders: {
    label: "Amazon Builders' Library — how AWS actually builds it",
    url: 'https://aws.amazon.com/builders-library/',
    kind: 'reading',
    source: 'AWS',
  },
  highscale: {
    label: 'High Scalability — real architecture write-ups',
    url: 'https://highscalability.com/',
    kind: 'reading',
    source: 'highscalability.com',
  },
  youngbloods: {
    label: 'Notes on Distributed Systems for Young Bloods',
    url: 'https://www.somethingsimilar.com/2013/01/14/notes-on-distributed-systems-for-young-bloods/',
    kind: 'reading',
    source: 'Jeff Hodges',
  },
  capMyth: {
    label: 'Please stop calling databases CP or AP',
    url: 'https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html',
    kind: 'reading',
    source: 'Martin Kleppmann',
  },
  raft: {
    label: 'Raft — consensus, visualised',
    url: 'https://raft.github.io/',
    kind: 'reading',
    source: 'raft.github.io',
  },
  jepsen: {
    label: 'Jepsen — consistency models map',
    url: 'https://jepsen.io/consistency',
    kind: 'reading',
    source: 'Jepsen',
  },
  mit: {
    label: 'MIT 6.824 Distributed Systems',
    url: yt('PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB'),
    kind: 'video',
    source: 'MIT 6.824',
  },
  bytebytego: {
    label: 'ByteByteGo — diagrams and newsletter',
    url: 'https://bytebytego.com/',
    kind: 'reading',
    source: 'ByteByteGo',
  },
}

/** Shown once at the top of the track rather than repeated on every day. */
export const SD_GENERAL: string[] = ['primer', 'bytebytego', 'highscale', 'builders']

type Seed = [topic: string, prompt: string, kind: SdKind, refs: string[]]

const PHASE_1 = 'Primitives'
const PHASE_2 = 'Patterns & Reliability'
const PHASE_3 = 'Case Studies'
const PHASE_4 = 'Interview Craft'

const p1: Seed[] = [
  ['What these interviews actually test', 'What is the interviewer grading — the answer, or how you narrow an open problem?', 'concept', ['bbgInterview', 'primer']],
  ['Latency numbers worth memorising', 'Memory vs SSD vs disk vs cross-continent round trip — which order of magnitude each?', 'concept', ['primer']],
  ['Back-of-envelope estimation', 'For 10M daily users, how do you get to QPS and storage per year?', 'concept', ['primer', 'gaurav']],
  ['How a request actually travels', 'Name every hop from typing a URL to bytes rendering.', 'concept', ['primer']],
  ['Load balancing: L4 vs L7', 'What can an L7 balancer do that an L4 one cannot?', 'concept', ['bbgFund', 'primer']],
  ['Reverse proxies and API gateways', 'What belongs in a gateway and what does not?', 'concept', ['bbgFund']],
  ['Horizontal vs vertical scaling', 'When is scaling up genuinely the right call?', 'concept', ['primer']],
  ['Statelessness', 'Why does one piece of server-side state ruin horizontal scaling?', 'concept', ['primer']],
  ['Where to put a cache', 'Client, CDN, gateway, app, database — what does each buy you?', 'concept', ['bbgFund', 'primer']],
  ['Cache strategies', 'Cache-aside vs write-through vs write-back — failure behaviour of each?', 'concept', ['bbgFund']],
  ['Eviction and TTLs', 'What is a thundering herd and how do you stop one?', 'concept', ['bbgAlgos']],
  ['CDNs', 'What should never be served from a CDN?', 'concept', ['bbgFund']],
  ['Review: the request path', 'Sketch client → CDN → LB → app → cache → DB from memory.', 'review', ['primer']],
  ['SQL vs NoSQL', 'Name a workload where the wrong choice hurts, and say why.', 'concept', ['bbgDb']],
  ['Indexes', 'Why does an index speed reads and slow writes?', 'concept', ['bbgDb']],
  ['Transactions and ACID', 'What does each letter actually guarantee?', 'concept', ['bbgDb']],
  ['Isolation levels', 'Dirty read, non-repeatable read, phantom — which level stops which?', 'concept', ['bbgDb']],
  ['Replication', 'Leader-follower: what happens the moment the leader dies?', 'concept', ['bbgDb', 'gaurav']],
  ['Replication lag', 'How do you give a user read-your-own-writes despite lag?', 'concept', ['bbgDb']],
  ['Sharding strategies', 'Range vs hash vs directory — the failure mode of each?', 'concept', ['gaurav', 'primer']],
  ['Consistent hashing', 'Why does adding one node not reshuffle everything?', 'concept', ['bbgAlgos', 'gaurav']],
  ['Hot partitions', 'One celebrity user melts a shard — what do you do?', 'concept', ['gaurav']],
  ['CAP, honestly', 'Why is "CP or AP" a bad way to describe a real database?', 'concept', ['capMyth']],
  ['Consistency models', 'Strong vs eventual vs causal — give a product example of each.', 'concept', ['jepsen']],
  ['Quorums', 'Why does R + W > N give you overlap, and what does it cost?', 'concept', ['jepsen']],
  ['Consensus and Raft', 'What problem does consensus solve that replication alone does not?', 'concept', ['raft', 'mit']],
  ['Message queues', 'What does making a call async actually buy you?', 'concept', ['bbgFund', 'gaurav']],
  ['Log vs broker', 'Kafka vs RabbitMQ — when does the difference matter?', 'concept', ['bbgFund']],
]

const p2: Seed[] = [
  ['Delivery semantics', 'Why is exactly-once mostly a lie, and what do you build instead?', 'concept', ['youngbloods']],
  ['Idempotency keys', 'A payment request retries. How do you not charge twice?', 'concept', ['bbgPayments']],
  ['The dual-write problem', 'Why can you not just write to the DB and the queue?', 'concept', ['builders']],
  ['Outbox pattern', 'How does an outbox make the dual write safe?', 'concept', ['builders']],
  ['Change data capture', 'What does CDC give you that polling does not?', 'concept', ['bbgFund']],
  ['Backpressure', 'A consumer falls behind. What are your options, in order?', 'concept', ['builders']],
  ['Rate limiting algorithms', 'Token bucket vs leaky bucket vs sliding window — pick one and defend it.', 'concept', ['bbgAlgos']],
  ['Retries, jitter, and storms', 'Why do naive retries make an outage worse?', 'concept', ['builders']],
  ['Timeouts and deadlines', 'Why must a deadline propagate across service hops?', 'concept', ['builders']],
  ['Circuit breakers', 'What state machine does a breaker implement?', 'concept', ['builders']],
  ['Graceful degradation', 'Name three things you would shed first under load.', 'concept', ['builders']],
  ['Review: reliability toolkit', 'From memory, list the defences against a slow dependency.', 'review', ['builders']],
  ['Monolith vs microservices', 'What does splitting cost you, honestly?', 'concept', ['gaurav']],
  ['Service discovery', 'How does service A find a healthy instance of B?', 'concept', ['bbgFund']],
  ['REST vs gRPC vs GraphQL', 'Pick one per scenario and justify it in one line each.', 'concept', ['bbgFund']],
  ['API design details', 'Why is offset pagination a trap at scale?', 'concept', ['bbgFund']],
  ['Authn vs authz', 'Sessions vs JWT — what does JWT make hard?', 'concept', ['bbgSecurity']],
  ['Secrets and key management', 'Where do secrets live, and how do they rotate?', 'concept', ['bbgSecurity']],
  ['TLS, briefly', 'What does the handshake establish, and why does it cost a round trip?', 'concept', ['bbgSecurity']],
  ['Observability', 'Logs vs metrics vs traces — which answers "why is this request slow"?', 'concept', ['builders']],
  ['SLIs, SLOs, error budgets', 'How does an error budget change a release decision?', 'concept', ['builders']],
  ['Deploys: blue-green and canary', 'How do you roll back a bad schema change?', 'concept', ['builders']],
  ['Feature flags', 'How do flags decouple deploy from release?', 'concept', ['builders']],
  ['Review: the service checklist', 'What would you demand before putting a service in production?', 'review', ['builders']],
  ['Object and blob storage', 'Why not store images in your database?', 'concept', ['primer']],
  ['Inverted indexes', 'How does a search index turn text into fast lookups?', 'concept', ['bbgAlgos']],
  ['Search at a high level', 'Where does search sit relative to your primary store?', 'concept', ['bbgFund']],
  ['Time-series and analytics stores', 'Why is OLAP shaped differently from OLTP?', 'concept', ['bbgDb']],
]

/** Case studies run over two days: design the shape, then go deep on one part. */
const cases: [string, string, string][] = [
  ['URL shortener', 'Key generation, collisions, and the read/write ratio.', 'How do you generate short keys without coordination?'],
  ['Rate limiter', 'Where it lives and how it shares state.', 'How do many gateway nodes agree on one counter?'],
  ['Pastebin / file storage', 'Blob storage plus metadata.', 'How do you handle very large uploads?'],
  ['Web crawler', 'Frontier, politeness, dedup.', 'How do you avoid crawling the same page forever?'],
  ['Notification system', 'Fanout across email, push, SMS.', 'How do you make delivery idempotent per channel?'],
  ['News feed', 'Fanout on write vs on read.', 'What breaks when a celebrity posts?'],
  ['Chat / messaging', 'Connections, presence, ordering.', 'How do you guarantee per-conversation ordering?'],
  ['Typeahead / autocomplete', 'Tries, ranking, and caching.', 'How fresh can suggestions be, realistically?'],
  ['Search engine', 'Indexing pipeline and query path.', 'How do you rank without scanning everything?'],
  ['Video streaming', 'Upload, transcode, deliver.', 'Why is transcoding a queue problem?'],
  ['Cloud drive', 'Sync, chunking, conflicts.', 'Two devices edit offline — who wins?'],
  ['Ride matching', 'Geospatial indexing and matching.', 'How do you query "drivers near me" fast?'],
  ['Ticket booking', 'Inventory under contention.', 'How do you stop double-booking the last seat?'],
  ['Payment system', 'Ledgers, idempotency, reconciliation.', 'Why is a ledger append-only?'],
  ['Ad click aggregation', 'High-volume counting.', 'Exact vs approximate — what do you give up?'],
  ['Metrics and monitoring', 'Ingest, rollup, query.', 'How do you store a year of per-second data?'],
  ['Distributed job scheduler', 'Fairness, retries, exactly-once-ish.', 'How do you stop two workers running one job?'],
  ['Key-value store', 'Partitioning, replication, repair.', 'How does the store heal after a node returns?'],
  ['Distributed cache', 'Placement, invalidation, stampedes.', 'How do you invalidate across a cluster?'],
  ['Leaderboard', 'Ranked reads at scale.', 'How do you serve top-N and "my rank" cheaply?'],
]

const p4: Seed[] = [
  ['The 45-minute framework', 'Requirements → estimate → API → data → high level → deep dive → bottlenecks. Can you recite it?', 'concept', ['bbgInterview']],
  ['Functional vs non-functional', 'Which non-functional requirement changes your design most?', 'concept', ['bbgInterview']],
  ['Clarifying questions', 'What five questions do you always ask before drawing anything?', 'concept', ['bbgInterview']],
  ['Drawing legibly under pressure', 'Can you draw your standard boxes in under two minutes?', 'concept', ['bbgInterview']],
  ['Trade-off vocabulary', 'Say "it depends" without saying it — name the axis instead.', 'concept', ['youngbloods']],
  ['Mock: pick a read-heavy system', 'Time yourself 45 minutes, no notes.', 'review', ['bbgInterview']],
  ['Mock: pick a write-heavy system', 'Time yourself 45 minutes, no notes.', 'review', ['bbgInterview']],
  ['Mock: pick a real-time system', 'Time yourself 45 minutes, no notes.', 'review', ['bbgInterview']],
  ['Mock: pick a storage system', 'Time yourself 45 minutes, no notes.', 'review', ['bbgInterview']],
  ['Common failure modes', 'Which of these do you personally do — jumping to a solution, or over-engineering?', 'review', ['bbgInterview']],
  ['Final sweep: primitives', 'Rebuild the primitives list from memory.', 'review', ['primer']],
  ['Final sweep: cases', 'Which case study still feels shaky? Redo it.', 'review', ['bbgInterview']],
]

function build(): SdDay[] {
  const out: SdDay[] = []
  let n = 1
  const push = (phase: string, s: Seed, minutes = 20) =>
    out.push({ day: n++, phase, topic: s[0], prompt: s[1], kind: s[2], refs: s[3], minutes })

  p1.forEach((s) => push(PHASE_1, s))
  p2.forEach((s) => push(PHASE_2, s))
  for (const [name, shape, deep] of cases) {
    push(PHASE_3, [`${name} — shape it`, shape, 'case', ['bbgInterview', 'gaurav']], 20)
    push(PHASE_3, [`${name} — deep dive`, deep, 'case', ['bbgInterview', 'highscale']], 20)
  }
  p4.forEach((s) => push(PHASE_4, s, 45))
  return out
}

export const SD_TRACK: SdDay[] = build()
export const SD_TOTAL_DAYS = SD_TRACK.length
export const SD_PHASES = [PHASE_1, PHASE_2, PHASE_3, PHASE_4]
