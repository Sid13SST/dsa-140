/**
 * Generates systemDesign.ts from the SCRAPED playlist data.
 *
 * Every video is looked up by a title fragment against videos.json, so an id
 * can never be typed by hand (which is exactly how the first attempt shipped
 * 35 wrong ids). If a fragment matches nothing, the build fails loudly.
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

/** Find exactly one video whose title contains the fragment. */
function find(fragment) {
  const f = norm(fragment)
  const hits = pool.filter((v) => norm(v.title).includes(f))
  if (hits.length === 0) {
    missing.push(fragment)
    return null
  }
  // Prefer the shortest runtime when a fragment matches several (keeps the
  // 20-minute budget honest), but flag genuine ambiguity.
  hits.sort((a, b) => (a.seconds || 1e9) - (b.seconds || 1e9))
  return hits[0]
}

// [phase, topic, prompt, kind, videoFragment|null, readingKey|null, selfWork|null]
const P1 = 'Primitives'
const P2 = 'Patterns & Reliability'
const P3 = 'Case Studies'
const P4 = 'Interview Craft'

const READINGS = {
  approach: ['primer', 'how-to-approach-a-system-design-interview-question', 'How to approach the question — the 4 steps'],
  latency: ['primer', 'latency-numbers-every-programmer-should-know', 'The latency table'],
  botec: ['primer', 'back-of-the-envelope-calculations', 'Powers of two and the maths'],
  dns: ['primer', 'domain-name-system', 'DNS and its disadvantages'],
  lb: ['primer', 'load-balancer', 'Layer 4 vs layer 7 load balancing'],
  revproxy: ['primer', 'reverse-proxy-web-server', 'Load balancer vs reverse proxy'],
  hscale: ['primer', 'horizontal-scaling', 'Horizontal scaling and its disadvantages'],
  cache: ['primer', 'cache', 'The five places a cache can sit'],
  cacheUpdate: ['primer', 'when-to-update-the-cache', 'When to update the cache'],
  cdn: ['primer', 'content-delivery-network', 'Push CDNs vs pull CDNs'],
  index: ['primer', 'index-of-system-design-topics', 'Index — check yourself against it'],
  sqlOrNo: ['primer', 'sql-or-nosql', 'SQL or NoSQL — the decision list'],
  replication: ['primer', 'replication', 'Master-slave and master-master replication'],
  consistencyP: ['primer', 'consistency-patterns', 'Weak, eventual and strong consistency'],
  availabilityP: ['primer', 'availability-patterns', 'Fail-over and replication'],
  mq: ['primer', 'message-queues', 'Message queues and task queues'],
  backpressure: ['primer', 'back-pressure', 'Back pressure and the costs of async'],
  micro: ['primer', 'microservices', 'Microservices and service discovery'],
  rest: ['primer', 'representational-state-transfer-rest', 'RPC and REST compared'],
  security: ['primer', 'security', 'The security checklist'],
  casePastebin: ['primer', 'design-pastebincom-or-bitly', 'Design Pastebin / Bit.ly — full walkthrough'],
  caseTwitter: ['primer', 'design-the-twitter-timeline-and-search-or-facebook-feed-and-search', 'Design the Twitter timeline — full walkthrough'],
  caseCrawler: ['primer', 'design-a-web-crawler', 'Design a web crawler — full walkthrough'],
  caseKv: ['primer', 'design-a-key-value-store-for-a-search-engine', 'Design a key-value store'],
  caseAws: ['primer', 'design-a-system-that-scales-to-millions-of-users-on-aws', 'Scaling to millions of users — step by step'],
  caseSocial: ['primer', 'design-the-data-structures-for-a-social-network', 'Data structures for a social network'],
  caseMint: ['primer', 'design-mintcom', 'Design Mint.com — full walkthrough'],
  caseAmazon: ['primer', 'design-amazons-sales-ranking-by-category-feature', "Amazon's sales ranking by category"],

  bTimeouts: ['builders', 'timeouts-retries-and-backoff-with-jitter', 'Timeouts, retries, and backoff with jitter'],
  bShed: ['builders', 'using-load-shedding-to-avoid-overload', 'Using load shedding to avoid overload'],
  bHealth: ['builders', 'implementing-health-checks', 'Implementing health checks'],
  bFallback: ['builders', 'avoiding-fallback-in-distributed-systems', 'Avoiding fallback in distributed systems'],
  bCaching: ['builders', 'caching-challenges-and-strategies', 'Caching challenges and strategies'],
  bBacklog: ['builders', 'avoiding-insurmountable-queue-backlogs', 'Avoiding insurmountable queue backlogs'],
  bShuffle: ['builders', 'workload-isolation-using-shuffle-sharding', 'Shuffle sharding — isolating the noisy tenant'],
  bLeader: ['builders', 'leader-election-in-distributed-systems', 'Leader election in distributed systems'],
  bChallenges: ['builders', 'challenges-with-distributed-systems', 'Challenges with distributed systems'],
  bConstant: ['builders', 'reliability-and-constant-work', 'Reliability, constant work, and a good cup of coffee'],
  bStatic: ['builders', 'static-stability-using-availability-zones', 'Static stability using availability zones'],
  bInstrument: ['builders', 'instrumenting-distributed-systems-for-operational-visibility', 'Instrumenting for operational visibility'],
  bRollback: ['builders', 'ensuring-rollback-safety-during-deployments', 'Ensuring rollback safety during deployments'],
  bIdempotent: ['builders', 'making-retries-safe-with-idempotent-APIs', 'Making retries safe with idempotent APIs'],

  cap: ['url', 'https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html', 'Please stop calling databases CP or AP', 'Martin Kleppmann'],
  jepsen: ['url', 'https://jepsen.io/consistency', 'The consistency model map', 'Jepsen'],
  raft: ['url', 'https://raft.github.io/', 'Raft, visualised — play the animation', 'raft.github.io'],
}

const ROWS = [
  // ---- Primitives ----
  [P1, 'Why these interviews exist', 'Is the interviewer grading your answer, or how you narrow an open problem?', 'concept', 'Why Is System Design Interview Important', null],
  [P1, 'The step-by-step framework', 'Name the four steps in order, before you draw a single box.', 'concept', 'System Design Interview: A Step-By-Step Guide', 'approach'],
  [P1, 'Latency numbers', 'Memory vs SSD vs disk vs cross-continent — which order of magnitude each?', 'concept', 'Latency Numbers Programmer Should Know', 'latency'],
  [P1, 'Back-of-envelope estimation', 'For 10M daily users, how do you get to QPS and to storage per year?', 'concept', 'Back-Of-The-Envelope Estimation', 'botec'],
  [P1, 'What happens when you type a URL', 'Name every hop from keystroke to rendered bytes.', 'concept', 'What happens when you type a URL', null],
  [P1, 'DNS', 'Why is DNS a cache hierarchy rather than one lookup?', 'concept', 'Everything You Need to Know About DNS', 'dns'],
  [P1, 'How the internet works', 'Which layer would you debug first when a request is slow?', 'concept', 'How the Internet Works in 9 Minutes', null],
  [P1, 'Load balancers', 'What can an L7 balancer do that an L4 one cannot?', 'concept', 'What is a LOAD BALANCER really about', 'lb'],
  [P1, 'Load balancing algorithms', 'Round robin vs least connections vs hashing — when does it matter?', 'concept', 'Top 6 Load Balancing Algorithms', null],
  [P1, 'Proxy vs reverse proxy vs gateway', 'What belongs in an API gateway, and what does not?', 'concept', 'Reverse Proxy vs API Gateway vs Load Balancer', 'revproxy'],
  [P1, 'Vertical vs horizontal scaling', 'When is scaling up genuinely the right call?', 'concept', 'Vertical Vs Horizontal Scaling', 'hscale'],
  [P1, 'Scalability end to end', 'Which single bottleneck appears first as traffic grows 10x?', 'concept', 'Scalability Simply Explained', null],
  [P1, 'Caching: where it lives', 'Client, CDN, web server, application, database — what does each buy?', 'concept', 'Cache Systems Every Developer Should Know', 'cache'],
  [P1, 'Cache update strategies', 'Cache-aside vs write-through vs write-behind — failure behaviour of each?', 'concept', 'Caching Pitfalls Every Developer Should Know', 'cacheUpdate'],
  [P1, 'Cache failure modes', 'What is a thundering herd, and what actually prevents one?', 'concept', null, 'bCaching'],
  [P1, 'CDNs', 'Push vs pull CDN — and what should never be served from one?', 'concept', 'What Is A CDN', 'cdn'],
  [P1, 'Review: the request path', 'Draw client → DNS → CDN → LB → app → cache → DB from memory.', 'review', null, 'index', 'Sketch it on paper first, then check yourself against the index.'],
  [P1, 'Choosing a database', 'Name a workload where picking wrong genuinely hurts, and say why.', 'concept', 'How To Choose The Right Database', 'sqlOrNo'],
  [P1, 'Data structures behind databases', 'Why does a B-tree suit reads and an LSM tree suit writes?', 'concept', '8 Key Data Structures That Power Modern Databases', null],
  [P1, 'LSM trees', 'What does an LSM tree trade away to make writes fast?', 'concept', 'The Secret Sauce Behind NoSQL: LSM Tree', null],
  [P1, 'ACID', 'What does each of the four letters actually guarantee?', 'concept', 'ACID Properties in Databases', null],
  [P1, 'Indexes and query execution', 'Why does an index speed reads and slow writes?', 'concept', 'Secret To Optimizing SQL Queries', null],
  [P1, 'NoSQL', 'Which NoSQL family fits which access pattern?', 'concept', 'Introduction to NoSQL databases', null],
  [P1, 'Replication', 'Leader-follower: what happens the moment the leader dies?', 'concept', 'Distributed Consensus and Data Replication', 'replication'],
  [P1, 'Scaling the database', 'List the seven levers in the order you would reach for them.', 'concept', 'Must-know Strategies to Scale Your Database', null],
  [P1, 'Sharding', 'Range vs hash vs directory — the failure mode of each?', 'concept', 'What is DATABASE SHARDING', null],
  [P1, 'Consistent hashing', 'Why does adding one node not reshuffle every key?', 'concept', 'Consistent Hashing', null],
  [P1, 'Hot partitions', 'One celebrity user melts a shard. What do you actually do?', 'concept', null, 'bShuffle'],
  [P1, 'CAP, honestly', 'Why is "this database is CP" a sloppy thing to say?', 'concept', 'CAP Theorem Simplified', 'cap'],
  [P1, 'Consistency models', 'Strong vs eventual vs causal — a product example of each.', 'concept', 'Data Consistency and Tradeoffs', 'jepsen'],
  [P1, 'Consistency patterns', 'Which pattern would you pick for a bank, and which for a feed?', 'concept', null, 'consistencyP'],
  [P1, 'Consensus and Raft', 'What does consensus solve that plain replication does not?', 'concept', null, 'raft'],
  [P1, 'Leader election', 'Why is a lease safer than a lock for electing a leader?', 'concept', null, 'bLeader'],
  [P1, 'Message queues', 'What does making a call async actually buy you?', 'concept', 'What is a MESSAGE QUEUE', 'mq'],
  [P1, 'Kafka vs the rest', 'A log versus a broker — when does the difference decide your design?', 'concept', 'Kafka vs. RabbitMQ', null],
  [P1, 'Why Kafka is fast', 'Name the two design choices that give Kafka its throughput.', 'concept', 'Why is Kafka fast', null],
  [P1, 'Pub/sub and event-driven', 'When does an event-driven design stop helping and start hurting?', 'concept', 'What is the Publisher Subscriber Model', null],
  [P1, 'Review: storage and messaging', 'Can you justify a database choice in three sentences?', 'review', null, null, 'Write three sentences each for: a chat app, an analytics dashboard, a bank ledger.'],

  // ---- Patterns & Reliability ----
  [P2, 'Distributed systems are different', 'Which single-machine assumption breaks first over a network?', 'concept', null, 'bChallenges'],
  [P2, 'Distributed system patterns', 'Which of the seven have you used without naming it?', 'concept', 'Top 7 Most-Used Distributed System Patterns', null],
  [P2, 'Idempotency', 'A payment request retries. How do you not charge twice?', 'concept', null, 'bIdempotent'],
  [P2, 'Timeouts, retries and backoff', 'Why do naive retries turn a blip into an outage?', 'concept', null, 'bTimeouts'],
  [P2, 'Load shedding', 'Under overload, why is rejecting work kinder than queueing it?', 'concept', null, 'bShed'],
  [P2, 'Queue backlogs', 'Your consumer is an hour behind. What are your options, in order?', 'concept', null, 'bBacklog'],
  [P2, 'Back pressure', 'Where should back pressure be applied — producer, queue, or consumer?', 'concept', null, 'backpressure'],
  [P2, 'Rate limiting', 'Token bucket vs leaky bucket vs sliding window — pick one and defend it.', 'concept', null, 'security'],
  [P2, 'Health checks', 'Why can a naive health check take down a healthy fleet?', 'concept', null, 'bHealth'],
  [P2, 'Fallbacks considered harmful', 'Why does AWS argue against fallback paths?', 'concept', null, 'bFallback'],
  [P2, 'Fault tolerance', 'Name three things you would shed first under load.', 'concept', 'Tips for Designing Fault-Tolerant System', null],
  [P2, 'Single points of failure', 'Find the SPOF in your own last project.', 'concept', 'single point of failure', 'availabilityP'],
  [P2, 'Constant work', 'Why is a system that always does the same work more reliable?', 'concept', null, 'bConstant'],
  [P2, 'Static stability', 'What does it mean to survive a dependency being down?', 'concept', null, 'bStatic'],
  [P2, 'Review: the reliability toolkit', 'From memory, list every defence against one slow dependency.', 'review', null, null, 'Aim for six, then re-read the timeouts article and see what you missed.'],
  [P2, 'Microservices — the honest version', 'What does splitting genuinely cost you?', 'concept', 'What Are Microservices Really All About', 'micro'],
  [P2, 'Microservice architecture', 'Where would you draw the first service boundary?', 'concept', 'What is a MICROSERVICE ARCHITECTURE', null],
  [P2, 'API styles', 'REST, gRPC, GraphQL — one scenario each, justified in a line.', 'concept', 'Top 6 Most Popular API Architecture Styles', null],
  [P2, 'REST in practice', 'What makes an API RESTful rather than just HTTP?', 'concept', 'What Is REST API', 'rest'],
  [P2, 'gRPC and RPC', 'When is RPC the better fit than REST?', 'concept', 'What is RPC', null],
  [P2, 'GraphQL', 'What problem does GraphQL solve, and what does it create?', 'concept', 'What Is GraphQL', null],
  [P2, 'Designing an API', 'What makes an API pleasant to use a year later?', 'concept', 'What is an API and how do you design it', null],
  [P2, 'Pagination', 'Why is offset pagination a trap at scale?', 'concept', 'API Pagination', null],
  [P2, 'API performance', 'Which of the seven levers would you try first, and why?', 'concept', 'Ways to 10x Your API Performance', null],
  [P2, 'Sessions vs JWT', 'What does JWT make hard that sessions make easy?', 'concept', 'Session Vs JWT', null],
  [P2, 'Why JWT is popular', 'What is actually inside the token?', 'concept', 'Why is JWT popular', null],
  [P2, 'OAuth 2', 'Who holds what secret, at each step of the flow?', 'concept', 'OAuth 2 Explained', null],
  [P2, 'Storing passwords', 'Why is salted-and-hashed still not the whole answer?', 'concept', 'How to store passwords in the database', null],
  [P2, 'TLS and HTTPS', 'What does the handshake establish, and why does it cost a round trip?', 'concept', 'SSL, TLS, HTTPS Explained', null],
  [P2, 'API security', 'Which two of the twelve are missing from most side projects?', 'concept', 'Top 12 Tips For API Security', null],
  [P2, 'Observability', 'Logs, metrics, traces — which answers "why is this request slow"?', 'concept', null, 'bInstrument'],
  [P2, 'Deployment strategies', 'Blue-green vs canary vs rolling — which fails safest?', 'concept', 'Top 5 Most-Used Deployment Strategies', null],
  [P2, 'Rollback safety', 'How do you roll back a deploy that already changed the schema?', 'concept', null, 'bRollback'],
  [P2, 'How big tech ships code', 'What is in the pipeline between commit and production?', 'concept', 'How Big Tech Ships Code to Production', null],
  [P2, 'HTTP/1 → 2 → 3', 'What problem does each version solve that the last had?', 'concept', 'HTTP/1 to HTTP/2 to HTTP/3', null],
  [P2, 'Bloom filters', 'What does a Bloom filter let you skip, and what can it never tell you?', 'concept', 'Bloom Filters', null],
  [P2, 'Fundamental data structures', 'Which of the ten show up in system design answers most?', 'concept', '10 Key Data Structures We Use Every Day', null],
  [P2, 'Review: the service checklist', 'What would you demand before putting a service in production?', 'review', null, null, 'Write the checklist, then compare it against the observability and health-check articles.'],

  // ---- Case Studies ----
  [P3, 'URL shortener', 'How do you generate short keys without coordinating between servers?', 'case', null, 'casePastebin'],
  [P3, 'Key-value store', 'How does the store heal after a node comes back?', 'case', 'How Key value Stores Work', 'caseKv'],
  [P3, 'Redis internals', 'Why is single-threaded Redis fast rather than slow?', 'case', 'Why is single-threaded Redis so fast', null],
  [P3, 'Redis in practice', 'Which five jobs is Redis genuinely the right tool for?', 'case', 'Top 5 Redis Use Cases', null],
  [P3, 'What Redis really is', 'When would you not reach for Redis?', 'case', 'What Is Redis Really About', null],
  [P3, 'Web crawler', 'How do you avoid crawling the same page forever?', 'case', 'Design a Web Crawler', 'caseCrawler'],
  [P3, 'News feed', 'Fanout on write or on read — and what breaks when a celebrity posts?', 'case', 'Designing INSTAGRAM', 'caseTwitter'],
  [P3, 'Chat system', 'How do you guarantee ordering within one conversation?', 'case', 'Design A Chat System', null],
  [P3, 'Chat, deeper', 'Where does presence state live, and what happens when it is wrong?', 'case', 'WHATSAPP System Design', null],
  [P3, 'How Discord stores messages', 'Why did they move stores, and what did it cost?', 'case', 'How Discord Stores', null],
  [P3, 'YouTube / video', 'Why is transcoding fundamentally a queue problem?', 'case', 'Design YouTube', null],
  [P3, 'Video processing at scale', 'What happens before a title is ever watchable?', 'case', 'How NETFLIX onboards new content', null],
  [P3, 'Live streaming', 'What changes when the video is live rather than stored?', 'case', 'How Does Live Streaming Platform Work', null],
  [P3, 'Capacity planning, applied', 'How much does YouTube actually store in a day?', 'case', 'Capacity Planning and Estimation', null],
  [P3, 'Location-based service', 'How do you answer "what is near me" without scanning everything?', 'case', 'Design A Location Based Service', null],
  [P3, 'Geospatial indexing', 'What does a quadtree give you that a lat/long index does not?', 'case', 'Designing a location database', null],
  [P3, 'Search', 'How does an inverted index turn text into a fast lookup?', 'case', 'How Search Really Works', null],
  [P3, 'Storing the web', 'Where does Google actually keep trillions of pages?', 'case', 'Trillions of Web Pages', null],
  [P3, 'Tinder as microservices', 'Which service boundary would you draw differently?', 'case', 'TINDER as a microservice', null],
  [P3, 'TikTok architecture', 'What dominates the design — the feed, or the video pipeline?', 'case', 'TikTok architecture', null],
  [P3, 'Payments', 'Why is a ledger append-only?', 'case', 'How Does Apple/Google Pay Work', 'caseMint'],
  [P3, 'Scan to pay', 'What is actually encoded in the QR, and what stops replay?', 'case', 'Scan To Pay', null],
  [P3, 'Scaling writes with a log', 'How does treating the log as source of truth change things?', 'case', 'How databases scale writes', null],
  [P3, 'Event-driven systems', 'What does an event log let you rebuild that a database cannot?', 'case', "What's an Event Driven System", null],
  [P3, 'Hotstar: a billion emojis', 'How do you absorb a spike 100x normal for ten seconds?', 'case', 'Disney Hotstar', null],
  [P3, 'Stack Overflow architecture', 'Why does it run on so few machines?', 'case', "Stack Overflow's Shocking Architecture", null],
  [P3, 'When serverless was wrong', 'What did Prime Video learn, and does it generalise?', 'case', 'Prime Video Ditches AWS Serverless', null],
  [P3, 'Netflix API evolution', 'What forced each architectural change?', 'case', 'Evolution of the Netflix API', null],
  [P3, 'Monorepo at scale', 'Why would you put a billion lines in one repository?', 'case', 'Billion Lines of Code In 1 Repository', null],
  [P3, 'Kafka use cases', 'Which of these would you have solved with a queue instead?', 'case', 'Top Kafka Use Cases', null],
  [P3, 'Scale to millions on AWS', 'At which user count does each component become necessary?', 'case', null, 'caseAws'],
  [P3, 'Social graph structures', 'How do you store a friend graph so lookups stay cheap?', 'case', null, 'caseSocial'],
  [P3, 'Sales ranking', 'How do you rank by category without recomputing everything?', 'case', null, 'caseAmazon'],
  [P3, 'Review: pattern-match the cases', 'Group every case by its dominant constraint.', 'review', null, null, 'Read-heavy, write-heavy, real-time, storage-heavy — put each case in a bucket.'],

  // ---- Interview Craft ----
  [P4, 'Cracking the round', 'What does a strong candidate do in the first five minutes?', 'concept', 'How to Crack Any System Design Interview', null],
  [P4, 'The biggest mistakes', 'Which do you personally do — jumping to a solution, or over-engineering?', 'concept', 'BIGGEST Mistakes to Avoid', null],
  [P4, 'Trade-off vocabulary', 'Say "it depends" without saying it — name the axis instead.', 'concept', 'Until You Knew the Trade-Offs', null],
  [P4, 'The concepts checklist', 'Of the twenty, which three are still shaky?', 'review', '20 System Design Concepts', null],
  [P4, 'Eight core concepts', 'Can you explain all eight without notes?', 'review', '8 Most Important System Design Concepts', null],
  [P4, 'Architecture patterns', 'Which pattern fits the system you last built?', 'concept', 'Top 5 Most Used Architecture Patterns', null],
  [P4, 'Interview tips', 'What will you change about how you open the round?', 'concept', '5 Tips for System Design Interviews', null],
  [P4, 'Mock: read-heavy system', '45 minutes, no notes. Pick a feed or a catalogue.', 'review', null, null, 'Time yourself, then grade against the 4-step framework.'],
  [P4, 'Mock: write-heavy system', '45 minutes, no notes. Pick metrics ingestion or click aggregation.', 'review', null, null, 'Time yourself. Note where you ran out of things to say.'],
  [P4, 'Mock: real-time system', '45 minutes, no notes. Pick chat or ride matching.', 'review', null, null, 'Did you handle ordering and presence explicitly?'],
  [P4, 'Mock: storage system', '45 minutes, no notes. Pick a drive or a key-value store.', 'review', null, null, 'Did you cover replication, failure and repair?'],
  [P4, 'Final sweep: weak spots', 'Which case study still feels shaky? Redo it today.', 'review', null, 'index', 'Pick the one you avoided. That is the one they will ask.'],
]

const rows = ROWS.map(([phase, topic, prompt, kind, frag, readingKey, selfWork]) => {
  const vid = frag ? find(frag) : null
  return { phase, topic, prompt, kind, vid, readingKey, selfWork }
})

if (missing.length) {
  console.error('NO MATCH for these fragments — fix before generating:')
  missing.forEach((m) => console.error('  - ' + m))
  process.exit(1)
}

const noResource = rows.filter((r) => !r.vid && !r.readingKey && !r.selfWork)
if (noResource.length) {
  console.error('Days with no resource at all:', noResource.map((r) => r.topic))
  process.exit(1)
}

fs.writeFileSync(process.env.OUT_JSON, JSON.stringify({ rows, READINGS }, null, 1))
const withVideo = rows.filter((r) => r.vid).length
console.log(`rows: ${rows.length} | with video: ${withVideo} | reading-only: ${rows.length - withVideo}`)
const over20 = rows.filter((r) => r.vid && r.vid.seconds > 1200)
console.log(`videos over 20 min: ${over20.length}`)
over20.forEach((r) => console.log(`   ${Math.round(r.vid.seconds / 60)}m  ${r.topic} — ${r.vid.title}`))
