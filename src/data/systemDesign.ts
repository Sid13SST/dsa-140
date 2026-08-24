/**
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
  url: `${PRIMER}#${anchor}`,
  source: 'System Design Primer',
})
const builders = (slug: string, label: string): SdReading => ({
  label,
  url: `https://aws.amazon.com/builders-library/${slug}/`,
  source: "AWS Builders' Library",
})

const ROWS: Omit<SdDay, 'day'>[] = [
  {
    phase: 'Primitives',
    topic: 'Why these interviews exist',
    prompt: 'Is the interviewer grading your answer, or how you narrow an open problem?',
    kind: 'concept',
    video: { id: 'EyMRZpgJUuc', title: 'Why Is System Design Interview Important?', seconds: 174, channel: 'ByteByteGo' },
  },
  {
    phase: 'Primitives',
    topic: 'The step-by-step framework',
    prompt: 'Name the four steps in order, before you draw a single box.',
    kind: 'concept',
    video: { id: 'i7twT3x5yv8', title: 'System Design Interview: A Step-By-Step Guide', seconds: 594, channel: 'ByteByteGo' },
    reading: primer('how-to-approach-a-system-design-interview-question', 'How to approach the question — the 4 steps'),
  },
  {
    phase: 'Primitives',
    topic: 'Latency numbers',
    prompt: 'Memory vs SSD vs disk vs cross-continent — which order of magnitude each?',
    kind: 'concept',
    video: { id: 'FqR5vESuKe0', title: 'Latency Numbers Programmer Should Know: Crash Course System Design #1', seconds: 382, channel: 'ByteByteGo' },
    reading: primer('latency-numbers-every-programmer-should-know', 'The latency table'),
  },
  {
    phase: 'Primitives',
    topic: 'Back-of-envelope estimation',
    prompt: 'For 10M daily users, how do you get to QPS and to storage per year?',
    kind: 'concept',
    video: { id: 'UC5xf8FbdJc', title: 'Back-Of-The-Envelope Estimation / Capacity Planning', seconds: 512, channel: 'ByteByteGo' },
    reading: primer('back-of-the-envelope-calculations', 'Powers of two and the maths'),
  },
  {
    phase: 'Primitives',
    topic: 'What happens when you type a URL',
    prompt: 'Name every hop from keystroke to rendered bytes.',
    kind: 'concept',
    video: { id: 'AlkDbnbv7dk', title: 'What happens when you type a URL into your browser?', seconds: 320, channel: 'ByteByteGo' },
  },
  {
    phase: 'Primitives',
    topic: 'DNS',
    prompt: 'Why is DNS a cache hierarchy rather than one lookup?',
    kind: 'concept',
    video: { id: '27r4Bzuj5NQ', title: 'Everything You Need to Know About DNS: Crash Course System Design #4', seconds: 345, channel: 'ByteByteGo' },
    reading: primer('domain-name-system', 'DNS and its disadvantages'),
  },
  {
    phase: 'Primitives',
    topic: 'How the internet works',
    prompt: 'Which layer would you debug first when a request is slow?',
    kind: 'concept',
    video: { id: 'sMHzfigUxz4', title: 'How the Internet Works in 9 Minutes', seconds: 555, channel: 'ByteByteGo' },
  },
  {
    phase: 'Primitives',
    topic: 'Load balancers',
    prompt: 'What can an L7 balancer do that an L4 one cannot?',
    kind: 'concept',
    video: { id: 'LQuuoHTyYz8', title: 'What is a LOAD BALANCER really about?', seconds: 405, channel: 'ByteByteGo' },
    reading: primer('load-balancer', 'Layer 4 vs layer 7 load balancing'),
  },
  {
    phase: 'Primitives',
    topic: 'Load balancing algorithms',
    prompt: 'Round robin vs least connections vs hashing — when does it matter?',
    kind: 'concept',
    video: { id: 'dBmxNsS3BGE', title: 'Top 6 Load Balancing Algorithms Every Developer Should Know', seconds: 318, channel: 'ByteByteGo' },
  },
  {
    phase: 'Primitives',
    topic: 'Proxy vs reverse proxy vs gateway',
    prompt: 'What belongs in an API gateway, and what does not?',
    kind: 'concept',
    video: { id: 'RqfaTIWc3LQ', title: 'Reverse Proxy vs API Gateway vs Load Balancer', seconds: 186, channel: 'ByteByteGo' },
    reading: primer('reverse-proxy-web-server', 'Load balancer vs reverse proxy'),
  },
  {
    phase: 'Primitives',
    topic: 'Vertical vs horizontal scaling',
    prompt: 'When is scaling up genuinely the right call?',
    kind: 'concept',
    video: { id: 'dvRFHG2-uYs', title: 'Vertical Vs Horizontal Scaling: Key Differences You Should Know', seconds: 274, channel: 'ByteByteGo' },
    reading: primer('horizontal-scaling', 'Horizontal scaling and its disadvantages'),
  },
  {
    phase: 'Primitives',
    topic: 'Scalability end to end',
    prompt: 'Which single bottleneck appears first as traffic grows 10x?',
    kind: 'concept',
    video: { id: 'EWS_CIxttVw', title: 'Scalability Simply Explained in 10 Minutes', seconds: 560, channel: 'ByteByteGo' },
  },
  {
    phase: 'Primitives',
    topic: 'Caching: where it lives',
    prompt: 'Client, CDN, web server, application, database — what does each buy?',
    kind: 'concept',
    video: { id: 'dGAgxozNWFE', title: 'Cache Systems Every Developer Should Know', seconds: 348, channel: 'ByteByteGo' },
    reading: primer('cache', 'The five places a cache can sit'),
  },
  {
    phase: 'Primitives',
    topic: 'Cache update strategies',
    prompt: 'Cache-aside vs write-through vs write-behind — failure behaviour of each?',
    kind: 'concept',
    video: { id: 'wh98s0XhMmQ', title: 'Caching Pitfalls Every Developer Should Know', seconds: 401, channel: 'ByteByteGo' },
    reading: primer('when-to-update-the-cache', 'When to update the cache'),
  },
  {
    phase: 'Primitives',
    topic: 'Cache failure modes',
    prompt: 'What is a thundering herd, and what actually prevents one?',
    kind: 'concept',
    reading: builders('caching-challenges-and-strategies', 'Caching challenges and strategies'),
  },
  {
    phase: 'Primitives',
    topic: 'CDNs',
    prompt: 'Push vs pull CDN — and what should never be served from one?',
    kind: 'concept',
    video: { id: 'RI9np1LWzqw', title: 'What Is A CDN? How Does It Work?', seconds: 264, channel: 'ByteByteGo' },
    reading: primer('content-delivery-network', 'Push CDNs vs pull CDNs'),
  },
  {
    phase: 'Primitives',
    topic: 'Review: the request path',
    prompt: 'Draw client → DNS → CDN → LB → app → cache → DB from memory.',
    kind: 'review',
    reading: primer('index-of-system-design-topics', 'Index — check yourself against it'),
    selfWork: 'Sketch it on paper first, then check yourself against the index.',
  },
  {
    phase: 'Primitives',
    topic: 'Choosing a database',
    prompt: 'Name a workload where picking wrong genuinely hurts, and say why.',
    kind: 'concept',
    video: { id: 'kkeFE6iRfMM', title: 'How To Choose The Right Database?', seconds: 418, channel: 'ByteByteGo' },
    reading: primer('sql-or-nosql', 'SQL or NoSQL — the decision list'),
  },
  {
    phase: 'Primitives',
    topic: 'Data structures behind databases',
    prompt: 'Why does a B-tree suit reads and an LSM tree suit writes?',
    kind: 'concept',
    video: { id: 'W_v05d_2RTo', title: '8 Key Data Structures That Power Modern Databases', seconds: 274, channel: 'ByteByteGo' },
  },
  {
    phase: 'Primitives',
    topic: 'LSM trees',
    prompt: 'What does an LSM tree trade away to make writes fast?',
    kind: 'concept',
    video: { id: 'I6jB0nM9SKU', title: 'The Secret Sauce Behind NoSQL: LSM Tree', seconds: 455, channel: 'ByteByteGo' },
  },
  {
    phase: 'Primitives',
    topic: 'ACID',
    prompt: 'What does each of the four letters actually guarantee?',
    kind: 'concept',
    video: { id: 'GAe5oB742dw', title: 'ACID Properties in Databases With Examples', seconds: 297, channel: 'ByteByteGo' },
  },
  {
    phase: 'Primitives',
    topic: 'Indexes and query execution',
    prompt: 'Why does an index speed reads and slow writes?',
    kind: 'concept',
    video: { id: 'BHwzDmr6d7s', title: 'Secret To Optimizing SQL Queries - Understand The SQL Execution Order', seconds: 357, channel: 'ByteByteGo' },
  },
  {
    phase: 'Primitives',
    topic: 'NoSQL',
    prompt: 'Which NoSQL family fits which access pattern?',
    kind: 'concept',
    video: { id: 'xQnIN9bW0og', title: 'Introduction to NoSQL databases', seconds: 1560, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Primitives',
    topic: 'Replication',
    prompt: 'Leader-follower: what happens the moment the leader dies?',
    kind: 'concept',
    video: { id: 'GeGxgmPTe4c', title: 'Distributed Consensus and Data Replication strategies on the server', seconds: 900, channel: 'Gaurav Sen' },
    reading: primer('replication', 'Master-slave and master-master replication'),
  },
  {
    phase: 'Primitives',
    topic: 'Scaling the database',
    prompt: 'List the seven levers in the order you would reach for them.',
    kind: 'concept',
    video: { id: '_1IKwnbscQU', title: '7 Must-know Strategies to Scale Your Database', seconds: 522, channel: 'ByteByteGo' },
  },
  {
    phase: 'Primitives',
    topic: 'Sharding',
    prompt: 'Range vs hash vs directory — the failure mode of each?',
    kind: 'concept',
    video: { id: '5faMjKuB9bc', title: 'What is DATABASE SHARDING?', seconds: 536, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Primitives',
    topic: 'Consistent hashing',
    prompt: 'Why does adding one node not reshuffle every key?',
    kind: 'concept',
    video: { id: 'UF9Iqmg94tk', title: 'Consistent Hashing | Algorithms You Should Know #1', seconds: 484, channel: 'ByteByteGo' },
  },
  {
    phase: 'Primitives',
    topic: 'Hot partitions',
    prompt: 'One celebrity user melts a shard. What do you actually do?',
    kind: 'concept',
    reading: builders('workload-isolation-using-shuffle-sharding', 'Shuffle sharding — isolating the noisy tenant'),
  },
  {
    phase: 'Primitives',
    topic: 'CAP, honestly',
    prompt: 'Why is "this database is CP" a sloppy thing to say?',
    kind: 'concept',
    video: { id: 'BHqjEjzAicA', title: 'CAP Theorem Simplified', seconds: 333, channel: 'ByteByteGo' },
    reading: { label: 'Please stop calling databases CP or AP', url: 'https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html', source: 'Martin Kleppmann' },
  },
  {
    phase: 'Primitives',
    topic: 'Consistency models',
    prompt: 'Strong vs eventual vs causal — a product example of each.',
    kind: 'concept',
    video: { id: 'm4q7VkgDWrM', title: 'Data Consistency and Tradeoffs in Distributed Systems', seconds: 1500, channel: 'Gaurav Sen' },
    reading: { label: 'The consistency model map', url: 'https://jepsen.io/consistency', source: 'Jepsen' },
  },
  {
    phase: 'Primitives',
    topic: 'Consistency patterns',
    prompt: 'Which pattern would you pick for a bank, and which for a feed?',
    kind: 'concept',
    reading: primer('consistency-patterns', 'Weak, eventual and strong consistency'),
  },
  {
    phase: 'Primitives',
    topic: 'Consensus and Raft',
    prompt: 'What does consensus solve that plain replication does not?',
    kind: 'concept',
    reading: { label: 'Raft, visualised — play the animation', url: 'https://raft.github.io/', source: 'raft.github.io' },
  },
  {
    phase: 'Primitives',
    topic: 'Leader election',
    prompt: 'Why is a lease safer than a lock for electing a leader?',
    kind: 'concept',
    reading: builders('leader-election-in-distributed-systems', 'Leader election in distributed systems'),
  },
  {
    phase: 'Primitives',
    topic: 'Message queues',
    prompt: 'What does making a call async actually buy you?',
    kind: 'concept',
    video: { id: 'oUJbuFMyBDk', title: 'What is a MESSAGE QUEUE and Where is it used?', seconds: 599, channel: 'Gaurav Sen' },
    reading: primer('message-queues', 'Message queues and task queues'),
  },
  {
    phase: 'Primitives',
    topic: 'Kafka vs the rest',
    prompt: 'A log versus a broker — when does the difference decide your design?',
    kind: 'concept',
    video: { id: 'x4k1XEjNzYQ', title: 'Kafka vs. RabbitMQ vs. Messaging Middleware vs. Pulsar', seconds: 271, channel: 'ByteByteGo' },
  },
  {
    phase: 'Primitives',
    topic: 'Why Kafka is fast',
    prompt: 'Name the two design choices that give Kafka its throughput.',
    kind: 'concept',
    video: { id: 'UNUz1-msbOM', title: 'System Design: Why is Kafka fast?', seconds: 302, channel: 'ByteByteGo' },
  },
  {
    phase: 'Primitives',
    topic: 'Pub/sub and event-driven',
    prompt: 'When does an event-driven design stop helping and start hurting?',
    kind: 'concept',
    video: { id: 'FMhbR_kQeHw', title: 'What is the Publisher Subscriber Model?', seconds: 685, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Primitives',
    topic: 'Review: storage and messaging',
    prompt: 'Can you justify a database choice in three sentences?',
    kind: 'review',
    selfWork: 'Write three sentences each for: a chat app, an analytics dashboard, a bank ledger.',
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Distributed systems are different',
    prompt: 'Which single-machine assumption breaks first over a network?',
    kind: 'concept',
    reading: builders('challenges-with-distributed-systems', 'Challenges with distributed systems'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Distributed system patterns',
    prompt: 'Which of the seven have you used without naming it?',
    kind: 'concept',
    video: { id: 'nH4qjmP2KEE', title: 'Top 7 Most-Used Distributed System Patterns', seconds: 374, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Idempotency',
    prompt: 'A payment request retries. How do you not charge twice?',
    kind: 'concept',
    reading: builders('making-retries-safe-with-idempotent-APIs', 'Making retries safe with idempotent APIs'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Timeouts, retries and backoff',
    prompt: 'Why do naive retries turn a blip into an outage?',
    kind: 'concept',
    reading: builders('timeouts-retries-and-backoff-with-jitter', 'Timeouts, retries, and backoff with jitter'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Load shedding',
    prompt: 'Under overload, why is rejecting work kinder than queueing it?',
    kind: 'concept',
    reading: builders('using-load-shedding-to-avoid-overload', 'Using load shedding to avoid overload'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Queue backlogs',
    prompt: 'Your consumer is an hour behind. What are your options, in order?',
    kind: 'concept',
    reading: builders('avoiding-insurmountable-queue-backlogs', 'Avoiding insurmountable queue backlogs'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Back pressure',
    prompt: 'Where should back pressure be applied — producer, queue, or consumer?',
    kind: 'concept',
    reading: primer('back-pressure', 'Back pressure and the costs of async'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Rate limiting',
    prompt: 'Token bucket vs leaky bucket vs sliding window — pick one and defend it.',
    kind: 'concept',
    reading: primer('security', 'The security checklist'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Health checks',
    prompt: 'Why can a naive health check take down a healthy fleet?',
    kind: 'concept',
    reading: builders('implementing-health-checks', 'Implementing health checks'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Fallbacks considered harmful',
    prompt: 'Why does AWS argue against fallback paths?',
    kind: 'concept',
    reading: builders('avoiding-fallback-in-distributed-systems', 'Avoiding fallback in distributed systems'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Fault tolerance',
    prompt: 'Name three things you would shed first under load.',
    kind: 'concept',
    video: { id: '3Lis4w4_bBc', title: '8 Most Important Tips for Designing Fault-Tolerant System', seconds: 311, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Single points of failure',
    prompt: 'Find the SPOF in your own last project.',
    kind: 'concept',
    video: { id: '-BOysyYErLY', title: 'How to avoid a single point of failure in distributed systems ✅', seconds: 394, channel: 'Gaurav Sen' },
    reading: primer('availability-patterns', 'Fail-over and replication'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Constant work',
    prompt: 'Why is a system that always does the same work more reliable?',
    kind: 'concept',
    reading: builders('reliability-and-constant-work', 'Reliability, constant work, and a good cup of coffee'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Static stability',
    prompt: 'What does it mean to survive a dependency being down?',
    kind: 'concept',
    reading: builders('static-stability-using-availability-zones', 'Static stability using availability zones'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Review: the reliability toolkit',
    prompt: 'From memory, list every defence against one slow dependency.',
    kind: 'review',
    selfWork: 'Aim for six, then re-read the timeouts article and see what you missed.',
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Microservices — the honest version',
    prompt: 'What does splitting genuinely cost you?',
    kind: 'concept',
    video: { id: 'lTAcCNbJ7KE', title: 'What Are Microservices Really All About? (And When Not To Use It)', seconds: 285, channel: 'ByteByteGo' },
    reading: primer('microservices', 'Microservices and service discovery'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Microservice architecture',
    prompt: 'Where would you draw the first service boundary?',
    kind: 'concept',
    video: { id: 'qYhRvH9tJKw', title: 'What is a MICROSERVICE ARCHITECTURE and what are its advantages?', seconds: 499, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'API styles',
    prompt: 'REST, gRPC, GraphQL — one scenario each, justified in a line.',
    kind: 'concept',
    video: { id: 'PNRbanEKGtw', title: 'Top 6 Most Popular API Architecture Styles', seconds: 74, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'REST in practice',
    prompt: 'What makes an API RESTful rather than just HTTP?',
    kind: 'concept',
    video: { id: '-mN3VyJuCjM', title: 'What Is REST API? Examples And How To Use It: Crash Course System Design #3', seconds: 321, channel: 'ByteByteGo' },
    reading: primer('representational-state-transfer-rest', 'RPC and REST compared'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'gRPC and RPC',
    prompt: 'When is RPC the better fit than REST?',
    kind: 'concept',
    video: { id: 'gnchfOojMk4', title: 'What is RPC? gRPC Introduction.', seconds: 369, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'GraphQL',
    prompt: 'What problem does GraphQL solve, and what does it create?',
    kind: 'concept',
    video: { id: 'yWzKJPw_VzM', title: 'What Is GraphQL? REST vs. GraphQL', seconds: 315, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Designing an API',
    prompt: 'What makes an API pleasant to use a year later?',
    kind: 'concept',
    video: { id: '_YlYuNMTCc8', title: 'What is an API and how do you design it? 🗒️✅', seconds: 900, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Pagination',
    prompt: 'Why is offset pagination a trap at scale?',
    kind: 'concept',
    video: { id: '14K_a2kKTxU', title: 'API Pagination: Making Billions of Products Scrolling Possible', seconds: 192, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'API performance',
    prompt: 'Which of the seven levers would you try first, and why?',
    kind: 'concept',
    video: { id: 'zvWKqUiovAM', title: 'Top 7 Ways to 10x Your API Performance', seconds: 365, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Sessions vs JWT',
    prompt: 'What does JWT make hard that sessions make easy?',
    kind: 'concept',
    video: { id: 'fyTxwIa-1U0', title: 'Session Vs JWT: The Differences You May Not Know!', seconds: 420, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Why JWT is popular',
    prompt: 'What is actually inside the token?',
    kind: 'concept',
    video: { id: 'P2CPd9ynFLg', title: 'Why is JWT popular?', seconds: 314, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'OAuth 2',
    prompt: 'Who holds what secret, at each step of the flow?',
    kind: 'concept',
    video: { id: 'ZV5yTm4pT8g', title: 'OAuth 2 Explained In Simple Terms', seconds: 272, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Storing passwords',
    prompt: 'Why is salted-and-hashed still not the whole answer?',
    kind: 'concept',
    video: { id: 'zt8Cocdy15c', title: 'System Design: How to store passwords in the database?', seconds: 224, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'TLS and HTTPS',
    prompt: 'What does the handshake establish, and why does it cost a round trip?',
    kind: 'concept',
    video: { id: 'j9QmMEWmcfo', title: 'SSL, TLS, HTTPS Explained', seconds: 354, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'API security',
    prompt: 'Which two of the twelve are missing from most side projects?',
    kind: 'concept',
    video: { id: '6WZ6S-qmtqY', title: 'Top 12 Tips For API Security', seconds: 587, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Observability',
    prompt: 'Logs, metrics, traces — which answers "why is this request slow"?',
    kind: 'concept',
    reading: builders('instrumenting-distributed-systems-for-operational-visibility', 'Instrumenting for operational visibility'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Deployment strategies',
    prompt: 'Blue-green vs canary vs rolling — which fails safest?',
    kind: 'concept',
    video: { id: 'AWVTKBUnoIg', title: 'Top 5 Most-Used Deployment Strategies', seconds: 600, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Rollback safety',
    prompt: 'How do you roll back a deploy that already changed the schema?',
    kind: 'concept',
    reading: builders('ensuring-rollback-safety-during-deployments', 'Ensuring rollback safety during deployments'),
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'How big tech ships code',
    prompt: 'What is in the pipeline between commit and production?',
    kind: 'concept',
    video: { id: 'xSPA2yBgDgA', title: 'How Big Tech Ships Code to Production', seconds: 268, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'HTTP/1 → 2 → 3',
    prompt: 'What problem does each version solve that the last had?',
    kind: 'concept',
    video: { id: 'a-sBfyiXysI', title: 'HTTP/1 to HTTP/2 to HTTP/3', seconds: 247, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Bloom filters',
    prompt: 'What does a Bloom filter let you skip, and what can it never tell you?',
    kind: 'concept',
    video: { id: 'V3pzxngeLqw', title: 'Bloom Filters | Algorithms You Should Know #2 | Real-world Examples', seconds: 340, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Fundamental data structures',
    prompt: 'Which of the ten show up in system design answers most?',
    kind: 'concept',
    video: { id: 'ouipSd_5ivQ', title: '10 Key Data Structures We Use Every Day', seconds: 523, channel: 'ByteByteGo' },
  },
  {
    phase: 'Patterns & Reliability',
    topic: 'Review: the service checklist',
    prompt: 'What would you demand before putting a service in production?',
    kind: 'review',
    selfWork: 'Write the checklist, then compare it against the observability and health-check articles.',
  },
  {
    phase: 'Case Studies',
    topic: 'URL shortener',
    prompt: 'How do you generate short keys without coordinating between servers?',
    kind: 'case',
    reading: primer('design-pastebincom-or-bitly', 'Design Pastebin / Bit.ly — full walkthrough'),
  },
  {
    phase: 'Case Studies',
    topic: 'Key-value store',
    prompt: 'How does the store heal after a node comes back?',
    kind: 'case',
    video: { id: 'Dwt8R0KPu7k', title: 'How Key value Stores Work (Redis, DynamoDB, Memcached)?', seconds: 360, channel: 'ByteByteGo' },
    reading: primer('design-a-key-value-store-for-a-search-engine', 'Design a key-value store'),
  },
  {
    phase: 'Case Studies',
    topic: 'Redis internals',
    prompt: 'Why is single-threaded Redis fast rather than slow?',
    kind: 'case',
    video: { id: '5TRFpFBccQM', title: 'System Design: Why is single-threaded Redis so fast?', seconds: 219, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Redis in practice',
    prompt: 'Which five jobs is Redis genuinely the right tool for?',
    kind: 'case',
    video: { id: 'a4yX7RUgTxI', title: 'Top 5 Redis Use Cases', seconds: 388, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'What Redis really is',
    prompt: 'When would you not reach for Redis?',
    kind: 'case',
    video: { id: 'z_NbVtbgBJw', title: 'What Is Redis Really About? Why Is It So Popular?', seconds: 541, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Web crawler',
    prompt: 'How do you avoid crawling the same page forever?',
    kind: 'case',
    video: { id: '6u25GckPhLU', title: 'Design a Web Crawler: FAANG Interview Question', seconds: 341, channel: 'ByteByteGo' },
    reading: primer('design-a-web-crawler', 'Design a web crawler — full walkthrough'),
  },
  {
    phase: 'Case Studies',
    topic: 'News feed',
    prompt: 'Fanout on write or on read — and what breaks when a celebrity posts?',
    kind: 'case',
    video: { id: 'QmX2NPkJTKg', title: 'Designing INSTAGRAM: System Design of News Feed', seconds: 1440, channel: 'Gaurav Sen' },
    reading: primer('design-the-twitter-timeline-and-search-or-facebook-feed-and-search', 'Design the Twitter timeline — full walkthrough'),
  },
  {
    phase: 'Case Studies',
    topic: 'Chat system',
    prompt: 'How do you guarantee ordering within one conversation?',
    kind: 'case',
    video: { id: 'okrR1KXNLtA', title: 'FAANG System Design Interview: Design A Chat System (WhatsApp, Facebook Messenger, Discord, Slack)', seconds: 525, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Chat, deeper',
    prompt: 'Where does presence state live, and what happens when it is wrong?',
    kind: 'case',
    video: { id: 'vvhC64hQZMk', title: 'WHATSAPP System Design: Chat Messaging Systems for Interviews', seconds: 1500, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Case Studies',
    topic: 'How Discord stores messages',
    prompt: 'Why did they move stores, and what did it cost?',
    kind: 'case',
    video: { id: 'O3PwuzCvAjI', title: 'How Discord Stores TRILLIONS of Messages', seconds: 431, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'YouTube / video',
    prompt: 'Why is transcoding fundamentally a queue problem?',
    kind: 'case',
    video: { id: 'jWRW2xGMqSw', title: 'System Design: Design YouTube', seconds: 433, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Video processing at scale',
    prompt: 'What happens before a title is ever watchable?',
    kind: 'case',
    video: { id: 'x9Hrn0oNmJM', title: 'How NETFLIX onboards new content: Video Processing at scale 🎥', seconds: 644, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Case Studies',
    topic: 'Live streaming',
    prompt: 'What changes when the video is live rather than stored?',
    kind: 'case',
    video: { id: '7AMRfNKwuYo', title: 'How Does Live Streaming Platform Work? (YouTube live, Twitch, TikTok Live)', seconds: 325, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Capacity planning, applied',
    prompt: 'How much does YouTube actually store in a day?',
    kind: 'case',
    video: { id: '0myM0k1mjZw', title: 'Capacity Planning and Estimation: How much data does YouTube store daily?', seconds: 792, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Case Studies',
    topic: 'Location-based service',
    prompt: 'How do you answer "what is near me" without scanning everything?',
    kind: 'case',
    video: { id: 'M4lR_Va97cQ', title: 'FAANG System Design Interview: Design A Location Based Service (Yelp, Google Places)', seconds: 1440, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Geospatial indexing',
    prompt: 'What does a quadtree give you that a lat/long index does not?',
    kind: 'case',
    video: { id: 'OcUKFIjhKu0', title: 'Designing a location database: QuadTrees and Hilbert Curves', seconds: 1320, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Case Studies',
    topic: 'Search',
    prompt: 'How does an inverted index turn text into a fast lookup?',
    kind: 'case',
    video: { id: 'TByRaraQqW4', title: 'How Search Really Works', seconds: 558, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Storing the web',
    prompt: 'Where does Google actually keep trillions of pages?',
    kind: 'case',
    video: { id: 'nBvDtj-p6VM', title: 'Trillions of Web Pages: Where Does Google Store Them?', seconds: 516, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Tinder as microservices',
    prompt: 'Which service boundary would you draw differently?',
    kind: 'case',
    video: { id: 'tndzLznxq40', title: 'System Design: TINDER as a microservice architecture', seconds: 2160, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Case Studies',
    topic: 'TikTok architecture',
    prompt: 'What dominates the design — the feed, or the video pipeline?',
    kind: 'case',
    video: { id: '07BVxmVFDGY', title: 'System Design Interview: TikTok architecture with @sudoCODE', seconds: 2700, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Case Studies',
    topic: 'Payments',
    prompt: 'Why is a ledger append-only?',
    kind: 'case',
    video: { id: 'cHv8LqkbPHk', title: 'How Does Apple/Google Pay Work?', seconds: 373, channel: 'ByteByteGo' },
    reading: primer('design-mintcom', 'Design Mint.com — full walkthrough'),
  },
  {
    phase: 'Case Studies',
    topic: 'Scan to pay',
    prompt: 'What is actually encoded in the QR, and what stops replay?',
    kind: 'case',
    video: { id: 'XS8ACikD2qs', title: 'Scan To Pay in 2 Minutes', seconds: 140, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Scaling writes with a log',
    prompt: 'How does treating the log as source of truth change things?',
    kind: 'case',
    video: { id: '_5vrfuwhvlQ', title: 'How databases scale writes: The power of the log ✍️🗒️', seconds: 1020, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Case Studies',
    topic: 'Event-driven systems',
    prompt: 'What does an event log let you rebuild that a database cannot?',
    kind: 'case',
    video: { id: 'rJHTK2TfZ1I', title: 'What\'s an Event Driven System?', seconds: 899, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Case Studies',
    topic: 'Hotstar: a billion emojis',
    prompt: 'How do you absorb a spike 100x normal for ten seconds?',
    kind: 'case',
    video: { id: 'UN1kW5AHid4', title: 'How Disney Hotstar Captures One Billion Emojis!', seconds: 275, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Stack Overflow architecture',
    prompt: 'Why does it run on so few machines?',
    kind: 'case',
    video: { id: 'fKc050dvNIE', title: 'Uncovering Stack Overflow\'s Shocking Architecture', seconds: 249, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'When serverless was wrong',
    prompt: 'What did Prime Video learn, and does it generalise?',
    kind: 'case',
    video: { id: 'JTp0TY_2hXM', title: 'Amazon Prime Video Ditches AWS Serverless, Saves 90%', seconds: 255, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Netflix API evolution',
    prompt: 'What forced each architectural change?',
    kind: 'case',
    video: { id: 'Uu32ggF-DWg', title: 'Demystifying the Unusual Evolution of the Netflix API Architecture', seconds: 252, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Monorepo at scale',
    prompt: 'Why would you put a billion lines in one repository?',
    kind: 'case',
    video: { id: 'x3cANGNPyx0', title: 'Why Google and Meta Put Billion Lines of Code In 1 Repository?', seconds: 429, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Kafka use cases',
    prompt: 'Which of these would you have solved with a queue instead?',
    kind: 'case',
    video: { id: 'Ajz6dBp_EB4', title: 'Top Kafka Use Cases You Should Know', seconds: 356, channel: 'ByteByteGo' },
  },
  {
    phase: 'Case Studies',
    topic: 'Scale to millions on AWS',
    prompt: 'At which user count does each component become necessary?',
    kind: 'case',
    reading: primer('design-a-system-that-scales-to-millions-of-users-on-aws', 'Scaling to millions of users — step by step'),
  },
  {
    phase: 'Case Studies',
    topic: 'Social graph structures',
    prompt: 'How do you store a friend graph so lookups stay cheap?',
    kind: 'case',
    reading: primer('design-the-data-structures-for-a-social-network', 'Data structures for a social network'),
  },
  {
    phase: 'Case Studies',
    topic: 'Sales ranking',
    prompt: 'How do you rank by category without recomputing everything?',
    kind: 'case',
    reading: primer('design-amazons-sales-ranking-by-category-feature', 'Amazon\'s sales ranking by category'),
  },
  {
    phase: 'Case Studies',
    topic: 'Review: pattern-match the cases',
    prompt: 'Group every case by its dominant constraint.',
    kind: 'review',
    selfWork: 'Read-heavy, write-heavy, real-time, storage-heavy — put each case in a bucket.',
  },
  {
    phase: 'Interview Craft',
    topic: 'Cracking the round',
    prompt: 'What does a strong candidate do in the first five minutes?',
    kind: 'concept',
    video: { id: 'o-k7h2G3Gco', title: 'How to Crack Any System Design Interview', seconds: 499, channel: 'ByteByteGo' },
  },
  {
    phase: 'Interview Craft',
    topic: 'The biggest mistakes',
    prompt: 'Which do you personally do — jumping to a solution, or over-engineering?',
    kind: 'concept',
    video: { id: 'OvufRkoD-D0', title: 'System Design Interview – BIGGEST Mistakes to Avoid', seconds: 408, channel: 'ByteByteGo' },
  },
  {
    phase: 'Interview Craft',
    topic: 'Trade-off vocabulary',
    prompt: 'Say "it depends" without saying it — name the axis instead.',
    kind: 'concept',
    video: { id: '1nENigGr-a0', title: 'System Design Was HARD - Until You Knew the Trade-Offs', seconds: 309, channel: 'ByteByteGo' },
  },
  {
    phase: 'Interview Craft',
    topic: 'The concepts checklist',
    prompt: 'Of the twenty, which three are still shaky?',
    kind: 'review',
    video: { id: 'uq-JpclPQV4', title: '20 System Design Concepts You Must Know - Final Part', seconds: 565, channel: 'ByteByteGo' },
  },
  {
    phase: 'Interview Craft',
    topic: 'Eight core concepts',
    prompt: 'Can you explain all eight without notes?',
    kind: 'review',
    video: { id: 'BTjxUS_PylA', title: '8 Most Important System Design Concepts You Should Know', seconds: 365, channel: 'ByteByteGo' },
  },
  {
    phase: 'Interview Craft',
    topic: 'Architecture patterns',
    prompt: 'Which pattern fits the system you last built?',
    kind: 'concept',
    video: { id: 'f6zXyq4VPP8', title: 'Top 5 Most Used Architecture Patterns', seconds: 353, channel: 'ByteByteGo' },
  },
  {
    phase: 'Interview Craft',
    topic: 'Interview tips',
    prompt: 'What will you change about how you open the round?',
    kind: 'concept',
    video: { id: 'CtmBGH8MkX4', title: '5 Tips for System Design Interviews', seconds: 499, channel: 'Gaurav Sen' },
  },
  {
    phase: 'Interview Craft',
    topic: 'Mock: read-heavy system',
    prompt: '45 minutes, no notes. Pick a feed or a catalogue.',
    kind: 'review',
    selfWork: 'Time yourself, then grade against the 4-step framework.',
  },
  {
    phase: 'Interview Craft',
    topic: 'Mock: write-heavy system',
    prompt: '45 minutes, no notes. Pick metrics ingestion or click aggregation.',
    kind: 'review',
    selfWork: 'Time yourself. Note where you ran out of things to say.',
  },
  {
    phase: 'Interview Craft',
    topic: 'Mock: real-time system',
    prompt: '45 minutes, no notes. Pick chat or ride matching.',
    kind: 'review',
    selfWork: 'Did you handle ordering and presence explicitly?',
  },
  {
    phase: 'Interview Craft',
    topic: 'Mock: storage system',
    prompt: '45 minutes, no notes. Pick a drive or a key-value store.',
    kind: 'review',
    selfWork: 'Did you cover replication, failure and repair?',
  },
  {
    phase: 'Interview Craft',
    topic: 'Final sweep: weak spots',
    prompt: 'Which case study still feels shaky? Redo it today.',
    kind: 'review',
    reading: primer('index-of-system-design-topics', 'Index — check yourself against it'),
    selfWork: 'Pick the one you avoided. That is the one they will ask.',
  },
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

export const videoUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`

export function runtimeLabel(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
