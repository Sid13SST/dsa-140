/**
 * Generates src/data/sdPracticeBank.ts — 50 self-graded practice questions.
 *
 * These are deliberately DISJOINT from the 24 in sdPractice.ts, which the AI
 * interviewer uses. Practising the same questions you get interviewed on turns
 * the interview into a memory test, so the two banks never overlap — this
 * script asserts that and exits non-zero if an id collides.
 *
 * No video ids here: unlike the study track these questions don't need a
 * watch-this reference, and hand-picking one per question is exactly how the
 * earlier 35-wrong-ids problem happened. Where a written walkthrough genuinely
 * exists, a deep-linked primer anchor is attached instead.
 *
 *   OUT_TS=src/data/sdPracticeBank.ts node scripts/gen-practice-bank.cjs
 */
const fs = require('fs')

// [id, title, tier, scope, clarify[3], rubric[5], primerAnchor?]
const Q = [
  /* ------------------------------- warm-up ------------------------------- */

  ['session-store', 'Session store', 'warmup',
    'Keep users logged in across a stateless server fleet.',
    ['Session lifetime?', 'Revocation needed immediately?', 'How many concurrent sessions?'],
    ['Why server-side sessions force a shared store once you scale out',
     'Sticky sessions named as the tempting wrong answer, and why',
     'TTL and sliding expiry',
     'Immediate revocation is why a pure JWT struggles here',
     'What happens to logged-in users when the store restarts'],
    null],

  ['url-preview', 'Link preview service', 'warmup',
    'Given a URL, return title, description and thumbnail.',
    ['How fresh must previews be?', 'Who can trigger a fetch?', 'Timeout budget?'],
    ['Cache by URL with a TTL — the same link is requested constantly',
     'Fetch timeout so a slow site cannot block your request',
     'SSRF: refusing internal addresses and redirects into private ranges',
     'Thumbnail resized and re-hosted rather than hot-linked',
     'Failure returns a degraded preview rather than an error'],
    null],

  ['otp-delivery', 'OTP delivery', 'warmup',
    'Send a one-time code by SMS or email and verify it.',
    ['Code lifetime?', 'Resend policy?', 'Which channels?'],
    ['Codes stored hashed with an expiry, never in plaintext',
     'Attempt limiting so a 6-digit code cannot be brute-forced',
     'Resend throttling per user and per number',
     'Provider failure fallback, and why delivery is at-most-once in practice',
     'Verification is idempotent and single-use'],
    null],

  ['feature-flags', 'Feature flag service', 'warmup',
    'Toggle features per user without a deploy.',
    ['Evaluation client-side or server-side?', 'How fast must a flip propagate?', 'Percentage rollouts?'],
    ['Flags pushed/polled to clients rather than a lookup per request',
     'Deterministic bucketing so a user does not flip between requests',
     'Stale-flag behaviour when the service is unreachable — fail to a known default',
     'Kill-switch path that is faster than the normal propagation',
     'Audit of who changed what'],
    null],

  ['short-poll-vs-push', 'Polling vs push', 'warmup',
    'Deliver updates to a web client. Choose the mechanism and defend it.',
    ['Update frequency?', 'How many concurrent clients?', 'Is ordering required?'],
    ['Short poll vs long poll vs SSE vs WebSocket, with the cost of each',
     'Connection count as the real constraint at scale',
     'Reconnect and missed-message recovery',
     'Fallback path when WebSockets are blocked',
     'Why the answer changes at 1k vs 1M clients'],
    null],

  ['thumbnail-pipeline', 'Image processing pipeline', 'warmup',
    'Accept an upload and produce several derived sizes.',
    ['Sync or async derivatives?', 'Which formats?', 'Retention of originals?'],
    ['Upload direct to object storage, work queued afterwards',
     'Derivatives generated asynchronously, with a placeholder until ready',
     'Idempotent workers so a retry does not duplicate output',
     'Content-addressed naming to dedupe identical uploads',
     'Poison-message handling for files that always fail'],
    null],

  ['audit-log', 'Audit log', 'warmup',
    'Record who did what, tamper-evident, queryable.',
    ['Retention period?', 'Who can read it?', 'Is tamper-evidence a requirement?'],
    ['Append-only storage — no update or delete path exists',
     'Writes must not block the user action; async with durability guarantees',
     'Hash chaining or signing if tamper-evidence is required',
     'Query patterns drive the index (by actor, by object, by time)',
     'Retention and lawful deletion, which conflicts with append-only'],
    null],

  ['config-service', 'Configuration service', 'warmup',
    'Distribute config to hundreds of services without redeploying them.',
    ['Push or pull?', 'How fast must a change land?', 'Rollback needed?'],
    ['Clients cache locally and keep running if the service dies',
     'Versioned config with rollback, not last-write-wins',
     'Staged rollout so a bad value cannot take down everything at once',
     'Watch/long-poll rather than tight polling from every instance',
     'Validation before publish, because config is code'],
    null],


  /* --------------------------------- core -------------------------------- */
  ['stories', 'Ephemeral stories', 'core',
    'Posts that disappear after 24 hours, with seen-state per viewer.',
    ['How many followers per poster?', 'Is seen-state per device?', 'Media sizes?'],
    ['TTL as a first-class design element, not a cleanup cron afterthought',
     'Seen-state is the write-heavy part, not the media',
     'Fanout choice for the story tray, and the celebrity case',
     'Media on a CDN with expiring URLs',
     'What actually deletes the data, and when'],
    null],

  ['collab-doc', 'Collaborative document editing', 'core',
    'Multiple people editing one document live.',
    ['How many concurrent editors?', 'Offline editing?', 'Full history required?'],
    ['Concurrent edits need OT or CRDTs — last-write-wins loses characters',
     'The server is the ordering authority, or the CRDT removes the need',
     'Presence and cursors are a separate, cheaper channel',
     'Snapshot plus oplog so a document does not replay from zero',
     'Offline reconciliation on reconnect'],
    null],



  ['inventory-cart', 'Cart and inventory', 'core',
    'A shopping cart that does not oversell stock.',
    ['Reserve at add-to-cart or at checkout?', 'Overselling ever acceptable?', 'Cart lifetime?'],
    ['Where the reservation happens, and the cost of reserving too early',
     'Atomic decrement with a conditional update, stated precisely',
     'Cart abandonment releasing stock via TTL',
     'Idempotent checkout so a double-click buys once',
     'Read-your-writes for the buyer after adding to cart'],
    null],


  ['recommendation-feed', 'Recommendation feed', 'core',
    'Rank content per user from a large candidate pool.',
    ['Latency budget?', 'How many candidates?', 'Cold-start users?'],
    ['Two-stage: cheap candidate generation, expensive ranking on a shortlist',
     'Features precomputed offline; request time is lookup plus scoring',
     'Cold start needs a non-personalised path',
     'Diversity/dedup so the feed is not ten of the same thing',
     'Feedback loop and how stale a model may be'],
    null],

  ['fraud-detection', 'Fraud detection', 'core',
    'Score transactions in-line and block the bad ones.',
    ['Latency budget per transaction?', 'False-positive tolerance?', 'Batch or streaming?'],
    ['Synchronous scoring within the payment latency budget',
     'Feature store shared between training and serving, to avoid skew',
     'Rules engine alongside the model for immediate blocks',
     'Fail-open vs fail-closed decided explicitly — it is a business call',
     'Asynchronous review queue for borderline cases'],
    null],

  ['webhooks', 'Webhook delivery', 'core',
    'Call customer endpoints when events happen, reliably.',
    ['Delivery guarantee?', 'How long to retry?', 'Ordering per customer?'],
    ['At-least-once with retries, so consumers must be idempotent',
     'Per-endpoint isolation so one slow customer cannot block others',
     'Exponential backoff and eventual disabling of dead endpoints',
     'Signing so the receiver can verify authenticity',
     'Replay tooling, because customers will ask for it'],
    null],



  ['order-matching', 'Order matching engine', 'core',
    'Match buy and sell orders with strict fairness.',
    ['Throughput target?', 'Fairness rule — price-time priority?', 'Recovery on crash?'],
    ['A single-threaded matching core is a feature: determinism beats parallelism',
     'The order book structure and why it is in memory',
     'Sequenced input log so state can be rebuilt exactly',
     'Price-time priority stated precisely',
     'Failover without losing or reordering a single order'],
    null],

  ['rtb', 'Real-time bidding', 'core',
    'Return a bid in under 100ms, millions of times per second.',
    ['Hard latency budget?', 'Budget pacing?', 'How many bidders?'],
    ['Latency budget decomposed across hops — there is no room for a slow DB',
     'Timeout-and-drop rather than late responses',
     'Budget pacing with approximate counters, accepting slight overspend',
     'Precomputed targeting rather than per-request joins',
     'Why eventual consistency is acceptable for spend but not for billing'],
    null],



  ['eta-service', 'ETA and routing', 'core',
    'Estimate arrival time over a road network under live traffic.',
    ['Accuracy target?', 'How fresh is traffic data?', 'Precompute or on-demand?'],
    ['Graph partitioning and precomputed contractions — Dijkstra per request will not do',
     'Traffic as edge weights updated on a schedule',
     'Caching common origin-destination pairs',
     'Degrade to historical averages when live data is missing',
     'Accuracy vs compute cost stated as a trade-off'],
    null],

  ['live-scores', 'Live score fanout', 'core',
    'Push score updates to millions of viewers within a second.',
    ['Acceptable delay?', 'Peak concurrent viewers?', 'Per-match subscriptions?'],
    ['Fanout tree / pub-sub rather than per-client polling',
     'Connection layer scaled separately from the ingest layer',
     'Idempotent updates so a reconnecting client converges',
     'Last-known-state on connect, then deltas',
     'Backpressure when a client cannot keep up'],
    null],

  ['video-call', 'Video conferencing', 'core',
    'Multi-party live video with acceptable quality.',
    ['How many participants?', 'Recording required?', 'Mobile networks?'],
    ['Mesh vs SFU vs MCU, and why SFU wins past three people',
     'Media does not flow through your API servers',
     'Signalling separated from media transport',
     'Adaptive bitrate and packet loss handling',
     'TURN relay for clients behind restrictive NAT'],
    null],

  ['game-state', 'Multiplayer game state', 'core',
    'Keep a shared world consistent across players in real time.',
    ['Tick rate?', 'Authoritative server?', 'Player count per session?'],
    ['Server-authoritative state, because clients lie',
     'Client-side prediction and reconciliation',
     'Interest management — a player only receives nearby state',
     'UDP-style lossy updates with periodic full snapshots',
     'Cheating as a design constraint, not an afterthought'],
    null],

  ['matchmaking', 'Matchmaking', 'core',
    'Group players into fair matches quickly.',
    ['Target queue time?', 'Skill metric available?', 'Party support?'],
    ['Skill buckets widening over time — fairness vs wait time',
     'Regional pools to bound latency',
     'Parties as an indivisible unit that complicates balancing',
     'Backfill for players who drop mid-match',
     'Why a strict fairness rule can starve the queue'],
    null],

  ['moderation', 'Content moderation pipeline', 'core',
    'Screen uploads before or after they go live.',
    ['Pre or post publish?', 'Human review capacity?', 'Appeal process?'],
    ['Automated first pass, human queue for the uncertain band',
     'Pre-publish blocks throughput; post-publish accepts exposure — pick and justify',
     'Priority queue so severe categories jump ahead',
     'Reviewer throughput as the real capacity constraint',
     'Audit trail and appeals as part of the design'],
    null],

  ['object-storage', 'Object storage', 'core',
    'Design S3: durable blobs behind a simple API.',
    ['Durability target?', 'Object size range?', 'Consistency on overwrite?'],
    ['Erasure coding vs replication, and the cost difference',
     'Metadata service separate from data placement',
     'Durability arithmetic — how eleven nines is actually reached',
     'Multipart upload for large objects',
     'Background scrubbing to detect silent corruption'],
    null],

  ['message-broker', 'Message broker', 'core',
    'Design Kafka: an ordered, replayable log.',
    ['Retention?', 'Ordering scope?', 'Consumer group semantics?'],
    ['Partition as the unit of ordering and parallelism',
     'Append-only segments and why sequential IO is the point',
     'Consumer offsets stored by the broker, not the consumer',
     'Replication with an in-sync replica set',
     'Rebalancing when a consumer joins or dies'],
    null],

  ['workflow-engine', 'Workflow orchestration', 'core',
    'Run DAGs of tasks with retries and dependencies.',
    ['Max DAG size?', 'Task duration range?', 'Backfill required?'],
    ['Scheduler separate from workers, communicating through a queue',
     'Task state machine persisted so a scheduler restart is survivable',
     'Dependency resolution and detecting cycles',
     'Retries with backoff, and tasks that must never auto-retry',
     'Backfill without stampeding downstream systems'],
    null],

  ['clickstream', 'Clickstream collection', 'core',
    'Collect billions of front-end events per day.',
    ['Sampling acceptable?', 'Loss tolerance?', 'Real-time or batch consumers?'],
    ['Collector is dumb and fast; enrichment happens downstream',
     'Client-side batching and retry on flaky networks',
     'Schema evolution so old clients keep working',
     'Sampling as an explicit decision with its statistical cost',
     'Partitioning for both real-time and batch consumers'],
    null],

  ['cdc-pipeline', 'Change data capture', 'core',
    'Stream database changes to other systems.',
    ['Which downstreams?', 'Acceptable lag?', 'Schema changes?'],
    ['Reading the write-ahead log rather than polling',
     'Ordering guarantees per key, and what breaks across keys',
     'Initial snapshot plus stream, and the handover between them',
     'Schema change propagation without breaking consumers',
     'Backpressure when a consumer falls behind the log retention'],
    null],

  ['data-warehouse-ingest', 'Warehouse ingestion', 'core',
    'Land operational data into an analytics store reliably.',
    ['Batch cadence?', 'Late-arriving data?', 'PII handling?'],
    ['Idempotent loads keyed so a rerun does not double-count',
     'Late data and how the partition is corrected',
     'Schema-on-read vs schema-on-write trade-off',
     'PII masking or exclusion at ingest, not in the query layer',
     'Backfill strategy that does not block the daily load'],
    null],


  ['tracing', 'Distributed tracing', 'core',
    'Follow one request across dozens of services.',
    ['Sampling rate?', 'Retention?', 'Cross-language propagation?'],
    ['Trace and span ids propagated through every hop, including queues',
     'Head vs tail sampling, and why tail catches the interesting traces',
     'Storage cost driving the sampling decision',
     'Clock skew across hosts making spans look impossible',
     'Correlating traces with logs and metrics'],
    null],

  ['log-aggregation', 'Log aggregation', 'core',
    'Collect, index and search logs from a large fleet.',
    ['Volume per day?', 'Retention?', 'Who queries, and how often?'],
    ['Agent on each host with local buffering for network blips',
     'Index only what is searched; archive the rest cheaply',
     'Hot/warm/cold tiers driven by query patterns',
     'Backpressure so logging cannot take down the app',
     'Cardinality and index size as the cost driver'],
    null],

  ['alerting', 'Alerting and paging', 'core',
    'Evaluate rules and wake the right human.',
    ['Evaluation frequency?', 'Escalation policy?', 'Dedup requirements?'],
    ['Rule evaluation separate from notification delivery',
     'Deduplication and grouping so one outage is not fifty pages',
     'Escalation and acknowledgement state machine',
     'The alerting system must not depend on what it monitors',
     'Flapping suppression'],
    null],

  ['sso-provider', 'SSO / OAuth provider', 'core',
    'Let users log in once and access many applications.',
    ['Which flows?', 'Token lifetime?', 'Session revocation?'],
    ['Authorization code with PKCE, and why implicit is dead',
     'Short access tokens plus refresh, and where refresh tokens live',
     'Revocation is the hard part with stateless tokens',
     'Redirect URI validation as an exact match',
     'Multi-tenant isolation of clients and keys'],
    null],

  ['secrets-manager', 'Secrets manager', 'core',
    'Distribute credentials to services without leaking them.',
    ['Rotation frequency?', 'Who audits access?', 'Break-glass path?'],
    ['Encryption at rest with a separate key hierarchy',
     'Short-lived dynamic credentials over long-lived static ones',
     'Rotation without downtime — two valid secrets during handover',
     'Every read audited, because that is the point',
     'What happens when the secrets service is down'],
    null],

  ['gdpr-deletion', 'Right-to-erasure across services', 'core',
    'Delete one user everywhere, provably, including backups.',
    ['Deadline?', 'Which systems hold PII?', 'Backups in scope?'],
    ['A registry of which systems hold what, or deletion is guesswork',
     'Orchestrated deletion with per-system acknowledgement',
     'Backups and immutable logs as the genuinely hard case — crypto-shredding',
     'Tombstones so a replica does not resurrect the record',
     'Proof of completion for the audit'],
    null],

  ['multi-tenant', 'Multi-tenant isolation', 'core',
    'One system, many customers, no leakage.',
    ['Shared or isolated storage?', 'Noisy-neighbour tolerance?', 'Per-tenant compliance?'],
    ['Row-level vs schema vs database isolation, with the cost of each',
     'Tenant id enforced at a layer the application cannot bypass',
     'Noisy neighbours and per-tenant quotas',
     'Per-tenant encryption keys when compliance demands it',
     'Migrating one large tenant off the shared pool'],
    null],

  ['zero-downtime-migration', 'Zero-downtime schema migration', 'core',
    'Change a hot table with no maintenance window.',
    ['Table size?', 'Acceptable write pause?', 'Rollback plan?'],
    ['Expand-migrate-contract in explicit phases',
     'Dual writes and the backfill that catches up old rows',
     'Every phase independently rollback-safe',
     'Reads switched only after the backfill is verified',
     'Why a single ALTER on a large hot table is the wrong answer'],
    null],

  ['backup-restore', 'Backup and point-in-time restore', 'core',
    'Recover the database to any second in the last week.',
    ['RPO and RTO?', 'Data size?', 'Restore tested how often?'],
    ['Full snapshots plus a continuous log to replay',
     'RPO and RTO stated as numbers and traced back to the design',
     'Restore time as the metric that matters, not backup time',
     'Backups tested by restoring, or they do not exist',
     'Isolation so a compromised system cannot delete its backups'],
    null],

  ['api-gateway', 'Public API gateway', 'core',
    'Front many internal services for external developers.',
    ['Per-key quotas?', 'Versioning policy?', 'Auth model?'],
    ['Authn, quotas and routing at the edge, not in every service',
     'Per-key and per-tenant rate limits with shared counters',
     'Versioning strategy and deprecation path',
     'Request/response transformation kept thin to avoid a distributed monolith',
     'Gateway failure modes — it is now a single point of failure'],
    null],

  ['idempotency-layer', 'Idempotency for a public API', 'core',
    'Make every mutating endpoint safe to retry.',
    ['Key supplied by client or server?', 'Retention of keys?', 'Concurrent duplicates?'],
    ['Client-supplied key stored with the response, replayed on repeat',
     'Concurrent duplicate handled with a lock or unique constraint, not a read-then-write',
     'Key retention window and what happens after it',
     'Distinguishing a retry from a genuinely new identical request',
     'Failure mid-request: what is recorded and when'],
    null],

  /* --------------------------------- hard -------------------------------- */
  ['dns-service', 'DNS service', 'hard',
    'Answer name lookups globally with very high availability.',
    ['Authoritative or resolver?', 'Propagation expectations?', 'DDoS posture?'],
    ['Anycast so the nearest site answers',
     'TTL as the propagation control, and why low TTLs cost you',
     'Caching hierarchy end to end',
     'Availability target so high that it constrains every choice',
     'Amplification attacks as a first-class concern'],
    null],

  ['cdn-design', 'Design a CDN', 'hard',
    'Serve static content from close to every user.',
    ['Push or pull origin?', 'Invalidation latency?', 'Cache hit target?'],
    ['Edge hierarchy with mid-tier shielding the origin',
     'Cache key design, including which headers vary',
     'Invalidation vs versioned URLs, and why versioning usually wins',
     'Origin protection during a cache-miss storm',
     'Hit ratio as the metric that decides the economics'],
    null],

  ['distributed-fs', 'Distributed file system', 'hard',
    'A POSIX-ish filesystem across many machines.',
    ['File size distribution?', 'Consistency guarantees?', 'Small-file heavy?'],
    ['Metadata server as the bottleneck, and how to shard it',
     'Chunked storage with replication and placement rules',
     'Consistency model actually offered, stated honestly',
     'Small files being the pathological case',
     'Recovery and rebalancing after a node loss'],
    null],

  ['consensus-store', 'Strongly consistent metadata store', 'hard',
    'A small store other systems trust absolutely (etcd-like).',
    ['Cluster size?', 'Read latency tolerance?', 'Watch support?'],
    ['Raft/Paxos for the replicated log, and why quorum size matters',
     'Leader leases for fast reads, and the risk of a stale leader',
     'Linearizable reads costing a round trip unless leased',
     'Watches implemented on the log, not by polling',
     'Why you keep this store small on purpose'],
    null],

  ['exactly-once-pipeline', 'Exactly-once processing', 'hard',
    'Process each event once, end to end, and prove it.',
    ['Which sinks?', 'Duplicate tolerance?', 'Ordering requirement?'],
    ['Exactly-once delivery is impossible; exactly-once *effect* is achievable',
     'Idempotent writes keyed by event id',
     'Transactional outbox or two-phase commit at the sink, with the cost',
     'Checkpointing and replay semantics after a crash',
     'Where duplicates can still leak in, named honestly'],
    null],

  ['saga', 'Distributed transaction without 2PC', 'hard',
    'A booking spans flight, hotel and payment services.',
    ['Compensation possible for each step?', 'Acceptable inconsistency window?', 'Ordering?'],
    ['Saga with explicit compensating actions per step',
     'Orchestration vs choreography, and which you can debug',
     'Semantic rollback is not a database rollback — money may already have moved',
     'Idempotency of both the action and the compensation',
     'Observability: knowing which sagas are stuck'],
    null],

  ['cache-coherence', 'Cross-service cache invalidation', 'hard',
    'Five services cache the same entity. Keep them coherent.',
    ['Staleness tolerance?', 'Who owns the entity?', 'Read volume?'],
    ['A single owner publishing change events, not peers invalidating each other',
     'Versioned entities so a stale write cannot overwrite a fresh one',
     'TTL as the safety net when an invalidation is missed',
     'The race between a read populating the cache and a concurrent invalidation',
     'Why "just invalidate on write" is insufficient'],
    null],

  ['hot-key', 'Hot key and hot partition', 'hard',
    'One key receives a thousand times the traffic of any other.',
    ['Read-hot or write-hot?', 'Is the key predictable?', 'Staleness tolerance?'],
    ['Read-hot solved by replication and local caching',
     'Write-hot solved by sharding the key itself and aggregating',
     'Detection: you must find the hot key before you can fix it',
     'Why consistent hashing alone does not help here',
     'Request coalescing for identical concurrent reads'],
    null],

  ['global-counter', 'Globally accurate counter', 'hard',
    'Count something enormous, accurately, and read it fast.',
    ['Exact or approximate?', 'Read frequency?', 'Multi-region?'],
    ['Sharded counters summed on read, avoiding a single hot row',
     'Approximate structures where exactness is not required',
     'Read-time aggregation vs materialised totals',
     'Multi-region convergence and why exactness gets expensive',
     'Reconciliation to catch drift'],
    null],

  ['leader-failover', 'Leader failover without split brain', 'hard',
    'The primary dies. Promote a replica safely.',
    ['Acceptable data loss?', 'Automatic or manual?', 'Client behaviour during failover?'],
    ['Fencing tokens so the old leader cannot keep writing',
     'Quorum-based election rather than a single health checker',
     'Replication lag determining actual data loss on promotion',
     'Client reconnect and retry behaviour during the window',
     'Why automatic failover sometimes causes more outages than it prevents'],
    null],

  ['storage-migration', 'Migrating a live datastore', 'hard',
    'Move a hot dataset to a different database with no downtime.',
    ['Data size?', 'Acceptable inconsistency?', 'Rollback window?'],
    ['Dual writes with a backfill, then read migration, then cutover',
     'Verification by shadow reads comparing both stores',
     'Rollback plan that stays valid at every phase',
     'Handling writes that fail on one side only',
     'How you know when it is genuinely safe to switch'],
    null],
]

const ids = Q.map((q) => q[0])
const dupes = ids.filter((x, i) => ids.indexOf(x) !== i)
if (dupes.length) {
  console.error('Duplicate ids within the practice bank:', dupes)
  process.exit(1)
}

// The interview bank must stay disjoint — practising the exam is not practice.
const interviewSrc = fs.readFileSync('src/data/sdPractice.ts', 'utf8')
const interviewIds = [...interviewSrc.matchAll(/^\s{4}id: '([^']+)'/gm)].map((m) => m[1])
const overlap = ids.filter((i) => interviewIds.includes(i))
if (overlap.length) {
  console.error('These ids collide with the AI-interview bank:', overlap)
  process.exit(1)
}

const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
const arr = (a) => '[\n' + a.map((x) => `      ${q(x)},`).join('\n') + '\n    ]'

const body = Q.map(([id, title, tier, scope, clarify, rubric, anchor]) => {
  const parts = [
    `    id: ${q(id)},`,
    `    title: ${q(title)},`,
    `    tier: ${q(tier)},`,
    `    scope: ${q(scope)},`,
    `    clarify: ${arr(clarify)},`,
    `    rubric: ${arr(rubric)},`,
  ]
  if (anchor) {
    parts.push(
      `    reading: primer(${q(anchor)}, ${q('Written walkthrough in the System Design Primer')}),`,
    )
  }
  return '  {\n' + parts.join('\n') + '\n  },'
}).join('\n')

const out = `/**
 * The self-graded practice bank — ${Q.length} questions.
 *
 * Deliberately DISJOINT from the AI interviewer's bank in sdPractice.ts.
 * Practising the same questions you are interviewed on turns the interview into
 * a memory test, so the generator asserts there is no id overlap and fails the
 * build if one appears.
 *
 * Unlike the study track these carry no video references: a rubric is the
 * reference here, and hand-picking a video per question is exactly how an
 * earlier pass shipped 35 wrong ids.
 *
 * GENERATED by scripts/gen-practice-bank.cjs — edit that, not this.
 */
import type { SdQuestion } from './sdPractice'
import type { SdReading } from './systemDesign'

const PRIMER = 'https://github.com/donnemartin/system-design-primer'
const primer = (anchor: string, label: string): SdReading => ({
  label,
  url: \`\${PRIMER}#\${anchor}\`,
  source: 'System Design Primer',
})

export const SD_PRACTICE_BANK: SdQuestion[] = [
${body}
]
`

fs.writeFileSync(process.env.OUT_TS, out)
const byTier = ids.reduce((acc, _, i) => {
  acc[Q[i][2]] = (acc[Q[i][2]] || 0) + 1
  return acc
}, {})
console.log(`questions: ${Q.length}`, JSON.stringify(byTier))
console.log(`overlap with interview bank: ${overlap.length} (must be 0)`)
console.log(`rubric points each: 7 universal + ${Q[0][5].length} specific`)
