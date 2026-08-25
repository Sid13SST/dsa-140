/**
 * Generates src/data/track200.ts — the 200-day backend rail.
 *
 *   OUT=data/backend-raw.json node scripts/scrape-backend-videos.cjs
 *   RAW=data/backend-raw.json node scripts/gen-track200.cjs > src/data/track200.ts
 *
 * WHAT THIS IS. One 20-minute thread that runs beside the DSA plan, replacing
 * the two separate System Design and AI/ML sections that were competing for the
 * same attention. Three obligations became two: DSA, and this.
 *
 * WHY IT INTERLEAVES. The domains are not studied in blocks. A weighted
 * round-robin spreads them so no single subject monopolises a month — better
 * retention than blocking, and it means a bad week costs you a little of
 * everything rather than all of one thing.
 *
 * WHY DESIGN AND AI/ML ARE REFERENCES, NOT COPIES. Those two tracks already
 * exist, verified, at 122 and 130 days. Four months each as a second-priority
 * subject is not realistic, so the rail cherry-picks 35 and 25 of their days by
 * NUMBER. The full tracks stay browsable in the Library. One source of truth —
 * nothing is duplicated and nothing needs re-verifying.
 *
 * Video ids are never typed. Title fragments must resolve to exactly one
 * scraped video or this exits non-zero.
 */
const fs = require('fs')
const https = require('https')

const raw = JSON.parse(fs.readFileSync(process.env.RAW || 'data/backend-raw.json', 'utf8'))

const problems = []

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

/** Resolve a title fragment to exactly one scraped video. `^` anchors to start. */
function v(list, fragment) {
  const pool = raw[list]
  if (!pool) {
    problems.push(`unknown playlist key "${list}"`)
    return null
  }
  const anchored = fragment.startsWith('^')
  const needle = (anchored ? fragment.slice(1) : fragment).toLowerCase()
  const hits = pool.filter((x) =>
    anchored ? x.title.toLowerCase().startsWith(needle) : x.title.toLowerCase().includes(needle),
  )
  if (hits.length !== 1) {
    problems.push(
      `"${fragment}" in ${list} matched ${hits.length}` +
        (hits.length > 1 ? ` (${hits.map((h) => h.title).join(' | ')})` : ''),
    )
    return null
  }
  if (!hits[0].seconds) {
    problems.push(`"${hits[0].title}" has no runtime`)
    return null
  }
  return { kind: 'video', id: hits[0].id, title: hits[0].title, seconds: hits[0].seconds, channel: null }
}

const r = (url, label, source) => ({ kind: 'reading', url, label, source })
const rest = (text) => ({ kind: 'rest', text })

const UTIL = (p, l) => r(`https://use-the-index-luke.com/sql/${p}`, l, 'Use The Index, Luke')
const HPBN = (p, l) => r(`https://hpbn.co/${p}/`, l, 'High Performance Browser Networking')
const SRE = (p, l) => r(`https://sre.google/sre-book/${p}/`, l, 'Google SRE Book')
const TF = (p, l) => r(`https://12factor.net/${p}`, l, 'The Twelve-Factor App')
const DOC = (u, l, s) => r(u, l, s)

/* ------------------------------------------------------------------ *
 * The four new domains. [topic, prompt, resource]
 * ------------------------------------------------------------------ */

const BACKEND = [
  ['What a backend engineer does', 'Name the three things a backend engineer is actually accountable for.', v('hnBackendBeginner', 'How to Become a Good Backend Engineer')],
  ['The request path, end to end', 'Trace a GET from browser to database and back, naming every hop.', v('hnBackendAdvanced', 'Following an HTTP GET')],
  ['REST, concretely', 'What makes an API RESTful, and which rule do most APIs break?', v('bbgFundamentals', 'What Is REST API? Examples And How To Use It')],
  ['HTTP status codes', 'When is 400 wrong and 422 right? When is 503 wrong and 429 right?', v('bbgFundamentals', 'HTTP Status Codes Explained In 5 Minutes')],
  ['Sync vs async', 'What is the caller doing while the work happens? That is the whole distinction.', v('hnBackendBeginner', 'Synchronous vs Asynchronous Applications')],
  ['Threads, async, processes', 'Pick one per workload: CPU-bound, IO-bound, and needs-isolation.', v('hnBackendBeginner', 'Asynchronous vs Multithreading and Multiprocessing')],
  ['When do you use threads', 'Give a case where adding threads makes it slower.', v('hnBackendIntermediate', 'When do you use threads?')],
  ['Concurrency vs parallelism', 'State the difference in one sentence without using either word twice.', v('bbgFundamentals', 'Concurrency Vs Parallelism')],
  ['Race conditions', 'Two users book the last seat at once. Walk through what actually happens.', v('hnDistributed', 'How to Avoid Double Booking and Race Conditions')],
  ['Concurrent requests, unique keys', 'Why does a uniqueness check in application code not make it unique?', v('hnDistributed', 'Concurrent Requests and Unique  Keys')],
  ['Optimistic vs pessimistic locking', 'Which one do you pick under high contention, and why is that counterintuitive?', v('hnBackendIntermediate', 'Optimistic or Pessimistic Concurrency Control')],
  ['Connection pooling', 'Why is opening a database connection per request a disaster at scale?', v('hnBackendIntermediate', 'Connection Pooling in PostgresSQL')],
  ['Leaking connections', 'What does a pool exhaustion incident look like from the outside?', v('hnBackendBeginner', 'backend leaking Postgres database connections')],
  ['Timeouts', 'What is the default timeout in your HTTP client? If you do not know, that is the lesson.', v('hnBackendBeginner', 'Frontend and Backends Timeouts')],
  ['Timeouts and load balancers', 'How do two mismatched timeouts create an outage neither side can see?', v('hnBackendIntermediate', 'How timeouts can make or break your Backend load balancers')],
  ['Tail latency', 'Why does p99 matter more than the mean for a page that makes 20 calls?', v('hnBackendBeginner', 'Percentile Tail Latency Explained')],
  ['Caching techniques', 'Write-through vs write-back vs write-around — pick one per use case.', v('hnDistributed', 'Basic Caching Techniques Explained')],
  ['Caching pitfalls', 'Name three ways a cache makes a system worse.', v('bbgFundamentals', 'Caching Pitfalls Every Developer Should Know')],
  ['Caching is hard', 'What is the hardest part — and it is not eviction?', v('hnBackendAdvanced', 'Caching is hard')],
  ['What Redis really is', 'Why is calling Redis "a cache" an understatement?', v('bbgFundamentals', 'What Is Redis Really About')],
  ['Redis use cases', 'Pick the right Redis structure for a leaderboard, a queue, and a rate limiter.', v('bbgFundamentals', 'Top 5 Redis Use Cases')],
  ['Why Redis is fast', 'Single-threaded and fast. Explain why those are not in tension.', v('bbgDatabase', 'Why is single-threaded Redis so fast')],
  ['Message queues', 'What problem does a queue solve that a direct call cannot?', v('hnQueues', 'What is a Message Queue and When should you use')],
  ['Publish-subscribe', 'How does pub/sub change who needs to know about whom?', v('hnQueues', 'Publish-Subscribe Architecture')],
  ['Kafka, how it works', 'What is a partition, and why is it the unit that decides your throughput?', v('hnQueues', 'What is Kafka and How does it work')],
  ['When to use Kafka', 'Name a case where Kafka is the wrong answer and RabbitMQ is right.', v('hnQueues', 'When to use a Publish-Subscribe System Like Kafka')],
  ['Consumer groups', 'Why does adding consumers past the partition count do nothing?', v('hnQueues', 'Kafka Consumer Group is a Brilliant Design')],
  ['Microservices, honestly', 'Name the cost you pay on day one, before any benefit arrives.', v('hnQueues', 'Microservices Explained and their Pros')],
  ['Distributed transactions', 'Why can you not just use a transaction across two services?', v('hnBackendAdvanced', 'What is a Distributed Transaction in Microservices')],
  ['Two-phase commit', 'Where exactly does 2PC block, and what happens if the coordinator dies?', v('hnDistributed', 'Distributed Transactions are Hard')],
  ['gRPC and RPC', 'When is gRPC clearly better than REST, and when is it clearly worse?', v('bbgFundamentals', 'What is RPC? gRPC Introduction')],
  ['GraphQL vs REST', 'What does GraphQL move from the server to the client, and what does that cost?', v('bbgFundamentals', 'What Is GraphQL? REST vs. GraphQL')],
  ['Optimising an API', 'Name three speedups that are not caching.', v('hnBackendIntermediate', '7 Tips to Optimize Your Backend API Without Caching')],
  ['Sessions vs JWT', 'Which one can you revoke instantly, and why does that decide most designs?', v('bbgFundamentals', 'Session Vs JWT')],
  ['Why JWT is popular', 'What is JWT genuinely good at, separate from the hype?', v('bbgFundamentals', 'Why is JWT popular')],
  ['OAuth 2', 'Who are the four parties, and what is the code exchanged for?', v('bbgFundamentals', 'OAuth 2 Explained In Simple Terms')],
  ['Stateless vs stateful', 'What forces a backend to be stateful, and how do you push back?', v('hnBackendIntermediate', 'When to Build a Stateless vs Stateful Back-ends')],
  ['Proxy vs reverse proxy', 'Who is being hidden in each case?', v('hnBackendBeginner', 'Proxy vs Reverse Proxy Server Explained')],
  ['Layer 4 vs layer 7', 'What can an L7 proxy do that an L4 one cannot, and what does it cost?', v('hnBackendIntermediate', 'Layer 4 vs Layer 7 Proxying')],
  ['Load balancer vs reverse proxy', 'They overlap. Name the case where they are genuinely different.', v('hnHighAvailability', 'Load Balancer vs Reverse Proxy')],
  ['API gateway', 'What belongs in a gateway and what belongs in the service?', v('bbgFundamentals', 'Reverse Proxy vs API Gateway vs Load Balancer')],
  ['Polling, SSE and push', 'Pick one for a notification feed and defend it against the other two.', v('hnQueues', 'Long Polling and how it differs from Push')],
  ['WebSockets, really', 'What does the upgrade handshake actually do to the TCP connection?', v('hnWebSockets', 'What Really Happens During a WebSockets Connection')],
  ['The testing pyramid', 'Why do most teams end up with an ice cream cone instead?', DOC('https://martinfowler.com/articles/practical-test-pyramid.html', 'The practical test pyramid', 'Martin Fowler')],
  ['What makes a good tester', 'What is the mindset difference between writing code and breaking it?', v('hnBackendBeginner', 'What makes a GOOD Software Tester')],
  ['Config in the environment', 'Why is a config file checked into the repo a bug, not a convenience?', TF('config', 'Store config in the environment')],
  ['Backing services', 'Why should swapping local Postgres for RDS require zero code change?', TF('backing-services', 'Treat backing services as attached resources')],
  ['Stateless processes', 'What breaks the moment you run two copies of your app?', TF('processes', 'Execute the app as stateless processes')],
  ['Disposability', 'Your process gets SIGTERM mid-request. What should happen?', TF('disposability', 'Fast startup and graceful shutdown')],
  ['Designing before coding', 'What do you write down before the first line of code?', v('hnBackendBeginner', 'My Process of Designing and Architecting Software')],
]

const DB = [
  ['A route through SQL', 'Which SQL features do you actually need before "advanced" is a distraction?', v('bbgDatabase', 'Roadmap for Learning SQL')],
  ['SQL execution order', 'Why can you not use a SELECT alias in the WHERE clause?', v('bbgDatabase', 'Secret To Optimizing SQL Queries')],
  ['Choosing a database', 'Give the one question that eliminates half the options immediately.', v('bbgDatabase', 'How To Choose The Right Database')],
  ['Structures behind databases', 'Match the structure to the workload: B-tree, LSM, hash, inverted index.', v('bbgDatabase', '8 Key Data Structures That Power Modern Databases')],
  ['ACID', 'Which letter do distributed databases usually weaken, and what breaks?', v('bbgDatabase', 'ACID Properties in Databases With Examples')],
  ['LSM trees', 'Why are writes fast and reads potentially slow?', v('bbgDatabase', 'The Secret Sauce Behind NoSQL: LSM Tree')],
  ['B-tree vs B+ tree', 'Why do databases store data only in the leaves?', v('hnBackendIntermediate', 'B-tree vs B+ tree in Database Systems')],
  ['Indexing, concretely', 'What does an index cost you on every write?', v('hnBackendBeginner', 'Database Indexing Explained')],
  ['Anatomy of an index', 'An index is two structures, not one. Name both.', UTIL('anatomy', 'Anatomy of an index')],
  ['The index tree', 'How many reads to find a row in a million-row table?', UTIL('anatomy/the-tree', 'The B-tree, from the top')],
  ['The leaf nodes', 'What is stored in a leaf, and why does that make range scans cheap?', UTIL('anatomy/the-leaf-nodes', 'The leaf nodes, and the doubly linked list')],
  ['Why indexes go slow', 'You have an index and it is still slow. Name the three usual causes.', UTIL('anatomy/slow-indexes', 'Slow indexes, part one')],
  ['The WHERE clause', 'Why does a function on an indexed column kill the index?', UTIL('where-clause', 'The WHERE clause and index usage')],
  ['Clustering data', 'What does clustering actually reduce — and it is not CPU?', UTIL('clustering', 'Clustering data')],
  ['Covering indexes', 'When can the database answer entirely from the index?', UTIL('clustering/index-only-scan-covering-index', 'Index-only scans and covering indexes')],
  ['The N+1 problem', 'Where does N+1 come from, and why does the ORM hide it?', UTIL('join/nested-loops-join-n1-problem', 'Nested loops and the N+1 problem')],
  ['Hash joins', 'When does a hash join beat nested loops?', UTIL('join/hash-join-partial-objects', 'Hash join')],
  ['Sort-merge joins', 'What must be true for a sort-merge join to be the cheap option?', UTIL('join/sort-merge-join', 'Sort-merge join')],
  ['Reading an explain plan', 'What is the single number you look at first?', UTIL('explain-plan', 'Execution plans, and how to read them')],
  ['Postgres EXPLAIN', 'Explain vs explain analyze — what is the difference and when is it dangerous?', v('hnBackendIntermediate', 'Postgres Explain Explained')],
  ['Index scan vs index-only', 'Why is index-only not always possible even with a covering index?', v('hnBackendIntermediate', 'Index Scan vs Index Only Scan')],
  ['Combining indexes', 'Two single-column indexes or one composite? Justify with the access pattern.', v('hnBackendIntermediate', 'Combining Database Indexes')],
  ['Key vs non-key columns', 'What does INCLUDE buy you, and what does it cost?', v('hnBackendAdvanced', 'Explaining Key vs Non-Key Column Database Indexing')],
  ['Partial indexes', 'When is indexing 2% of a table the right answer?', v('hnBackendAdvanced', 'Partial Indexing')],
  ['When the planner ignores you', 'Why would the optimiser skip a perfectly good index?', v('hnBackendIntermediate', 'Watch out before Adding Indexes to Your Table')],
  ['Why this query is fast', 'Work backwards from a fast query to the reason it is fast.', v('hnBackendAdvanced', 'Why this query is fast')],
  ['COUNT(*) is slow', 'Why is counting rows expensive, and what do you do instead?', v('hnBackendIntermediate', 'SELECT COUNT(*) is Slow')],
  ['Replication', 'What exactly is replicated — statements, rows, or the write-ahead log?', v('hnBackendAdvanced', 'Database Replication Crash Course')],
  ['Partitioning', 'Horizontal or vertical — which one are people usually talking about?', v('hnBackendIntermediate', 'Horizontal vs Vertical Database Partitioning')],
  ['When to shard', 'Name three things to try before sharding.', v('hnDistributed', 'When should you shard your database?')],
]

const LINUX = [
  ['The OSI model', 'Which layers do you actually touch as a backend engineer?', v('hnBackendBeginner', 'The OSI Model - Explained by Example')],
  ['The TCP handshake', 'How many round trips before your first byte of data moves?', v('hnBackendIntermediate', 'What is the TCP 3-Way Handshake')],
  ['TCP vs UDP', 'Name a backend case where UDP is correct and TCP is wrong.', v('hnBackendAdvanced', 'When to use UDP vs TCP in Building a Backend Application')],
  ['Latency and bandwidth', 'Why does more bandwidth stop helping past a point?', HPBN('primer-on-latency-and-bandwidth', 'Latency, bandwidth, and the speed of light')],
  ['Building blocks of TCP', 'What are slow start and congestion control costing your first request?', HPBN('building-blocks-of-tcp', 'Building blocks of TCP')],
  ['Building blocks of UDP', 'What does UDP not give you, stated as a list?', HPBN('building-blocks-of-udp', 'Building blocks of UDP')],
  ['DNS', 'Walk a lookup from the resolver to the authoritative server.', v('bbgFundamentals', 'Everything You Need to Know About DNS')],
  ['NAT', 'Why can a server not simply call back to a client behind NAT?', v('hnBackendBeginner', 'Network Address Translation')],
  ['HTTP/1 to 2 to 3', 'What problem does each version solve that the previous one had?', v('bbgFundamentals', 'HTTP 1 Vs HTTP 2 Vs HTTP 3')],
  ['How HTTP/2 works', 'What is multiplexing, and why did it not fix everything?', v('hnBackendIntermediate', 'How HTTP/2 Works, Performance, Pros')],
  ['Head-of-line blocking', 'Why does TCP undermine HTTP/2 multiplexing?', v('hnBackendAdvanced', 'HTTP/2 Critical Limitation that led to HTTP/3')],
  ['TLS 1.2 and 1.3', 'How many round trips does each handshake take?', v('hnBackendBeginner', 'Transport Layer Security, TLS 1.2 and 1.3')],
  ['Certificates and CAs', 'What is the chain of trust, and where does it start?', v('hnTls', 'Certificates and Certificate Authority Explained')],
  ['Symmetric vs asymmetric', 'Why does TLS use both instead of picking one?', v('hnBackendBeginner', 'Symmetrical vs asymmetrical Encryption')],
  ['TLS, in depth', 'What is in the handshake, message by message?', HPBN('transport-layer-security-tls', 'Transport Layer Security')],
  ['What a socket is', 'A socket is a file descriptor. What follows from that?', DOC('https://beej.us/guide/bgnet/html/#what-is-a-socket', "What is a socket? — Beej's Guide", 'Beej')],
  ['Closing sockets', 'What happens to a connection you never close?', v('hnOsFundamentals', 'Why you need to close sockets')],
  ['Sockets in the kernel', 'What data structures does the kernel keep per connection?', v('hnOsFundamentals', 'Socket management and Kernel Data structures')],
  ['Running out of ports', 'How does a machine run out of ports, and what is TIME_WAIT doing?', v('hnBackendAdvanced', 'Running out of TCP ports')],
  ['The accept queue', 'Where do connections wait before your code sees them?', v('hnOsFundamentals', 'How does the Kernel manage backend Connections')],
  ['Virtual memory', 'Why does your process think it has the whole address space?', v('hnOsFundamentals', 'What is Virtual memory?')],
  ['Page tables', 'How does a virtual address become a physical one?', v('hnOsFundamentals', 'The genius of Linux Page Tables')],
  ['Page faults', 'Which page faults are normal and which are a problem?', v('hnOsFundamentals', 'All Kernel Page Faults Explained')],
  ['User mode vs kernel mode', 'What does a syscall cost, roughly?', v('hnOsFundamentals', 'The Cost of Switching to Kernel Mode')],
  ['CPU efficiency', 'How would you tell whether your service is CPU-bound or waiting?', v('hnOsFundamentals', 'How CPU Efficient is your App?')],
]

const DEVOPS = [
  ['Metal, VMs and containers', 'What is a container actually isolating, and what is it not?', v('bbgFundamentals', 'Big Misconceptions about Bare Metal, Virtual Machines, and Containers')],
  ['Why Docker matters', 'What problem did Docker solve that VMs did not?', v('bbgFundamentals', 'System Design: Why Is Docker Important?')],
  ['Is Docker still relevant', 'What has changed, and what has not?', v('bbgFundamentals', 'Is Docker Still Relevant?')],
  ['Your first container', 'Containerise one service you have written and run it.', DOC('https://docs.docker.com/get-started/', 'Docker — get started', 'Docker docs')],
  ['Dockerfile discipline', 'Why does layer order decide your build time?', DOC('https://docs.docker.com/build/building/best-practices/', 'Dockerfile best practices', 'Docker docs')],
  ['One codebase, many deploys', 'What does it mean that the repo and the app are one-to-one?', TF('codebase', 'One codebase tracked in revision control')],
  ['Explicit dependencies', 'Why is "it works on my machine" a dependency-declaration failure?', TF('dependencies', 'Explicitly declare and isolate dependencies')],
  ['Build, release, run', 'Why must these three stages never be merged?', TF('build-release-run', 'Strictly separate build and run stages')],
  ['Logs as event streams', 'Why should an app never manage its own log files?', TF('logs', 'Treat logs as event streams')],
  ['Dev/prod parity', 'Name the three gaps this principle is trying to close.', TF('dev-prod-parity', 'Keep dev, staging and production similar')],
  ['Continuous integration', 'Set up a pipeline that runs your tests on every push.', DOC('https://docs.github.com/en/actions/quickstart', 'GitHub Actions quickstart', 'GitHub docs')],
  ['Nginx as an L7 proxy', 'What does Nginx do that your app should not?', v('hnNginx', 'NginX as a Layer 7 Proxy')],
  ['Nginx as a load balancer', 'Put two containers behind one Nginx and watch it distribute.', v('hnLoadBalancing', 'Spin up an Nginx Docker Container as a Load Balancer')],
  ['HAProxy in practice', 'How do you drain a backend for maintenance without dropping requests?', v('hnLoadBalancing', 'Getting Started with HAProxy Runtime API')],
  ['Active-active vs active-passive', 'Which one wastes capacity, and when is that the right trade?', v('hnHighAvailability', 'Active-Active vs Active-Passive Cluster')],
  ['Failover', 'What decides that a node is dead, and what if it is wrong?', v('hnHighAvailability', 'Fail-over and High-Availability')],
  ['The four golden signals', 'Name all four, and what each one catches that the others miss.', SRE('monitoring-distributed-systems', 'Monitoring distributed systems')],
  ['Error budgets', 'Why is 100% availability the wrong target?', SRE('embracing-risk', 'Embracing risk')],
  ['SLIs, SLOs and SLAs', 'Write an SLO for an endpoint you have built.', SRE('service-level-objectives', 'Service level objectives')],
  ['Toil', 'What makes work toil rather than engineering?', SRE('eliminating-toil', 'Eliminating toil')],
  ['Handling overload', 'What should a service do when it cannot keep up?', SRE('handling-overload', 'Handling overload')],
  ['Cascading failures', 'How does one slow dependency take down everything?', SRE('addressing-cascading-failures', 'Addressing cascading failures')],
  ['Troubleshooting method', 'What is the systematic order, rather than guessing?', SRE('effective-troubleshooting', 'Effective troubleshooting')],
  ['Blameless postmortems', 'Why does blame make the next outage more likely?', SRE('postmortem-culture', 'Postmortem culture')],
  ['Managing an incident', 'Who does what in the first ten minutes?', SRE('managing-incidents', 'Managing incidents')],
]

/* --------- curated references into the two library tracks --------- */

const DESIGN_REFS = [
  [1, 'Why these interviews exist'], [2, 'The step-by-step framework'], [3, 'Latency numbers'],
  [4, 'Back-of-envelope estimation'], [11, 'Vertical vs horizontal scaling'], [14, 'Cache update strategies'],
  [15, 'Cache failure modes'], [16, 'CDNs'], [18, 'Choosing a database'], [27, 'Consistent hashing'],
  [28, 'Hot partitions'], [29, 'CAP, honestly'], [30, 'Consistency models'], [32, 'Consensus and Raft'],
  [33, 'Leader election'], [39, 'Distributed systems are different'], [40, 'Distributed system patterns'],
  [41, 'Idempotency'], [42, 'Timeouts, retries and backoff'], [43, 'Load shedding'], [45, 'Back pressure'],
  [46, 'Rate limiting'], [49, 'Fault tolerance'], [50, 'Single points of failure'], [52, 'Static stability'],
  [54, 'Microservices — the honest version'], [60, 'Designing an API'], [69, 'Observability'],
  [70, 'Deployment strategies'], [77, 'URL shortener'], [83, 'News feed'], [84, 'Chat system'],
  [93, 'Search'], [97, 'Payments'], [111, 'Cracking the round'],
]

const AIML_REFS = [
  [1, 'What ML actually is'], [2, 'Framing an ML problem'], [3, 'The first rule of ML'],
  [27, 'Bias and variance'], [28, 'Cross validation'], [30, 'Precision and recall'], [31, 'ROC and AUC'],
  [33, 'Overfitting'], [49, 'What a neural network is'], [50, 'Gradient descent'], [51, 'Backpropagation'],
  [64, 'Embeddings in production'], [69, 'Transformers'], [70, 'Self-attention, step by step'],
  [75, 'LLMs, briefly'], [77, 'Tokenisation'], [81, 'Sampling and decoding'], [86, 'Building with LLMs'],
  [97, 'Cosine similarity'], [98, 'RAG end to end'], [106, 'Evals'], [111, 'Production ML systems'],
  [113, 'Serving models'], [121, 'Feature stores'], [128, 'Monitoring'],
]

/* ----------------------------- assembly ----------------------------- */

const TOTAL = 200
/** Every twentieth day is deliberately empty. Rest you have to earn is rest you skip. */
const REST_DAYS = new Set([20, 40, 60, 80, 100, 120, 140, 160, 180, 200])

const REST_TEXT = [
  'Nothing new today. Re-read one note you wrote that you no longer fully understand.',
  'Nothing new today. Pick the last topic that felt shaky and explain it out loud.',
  'Nothing new today. Skim back over the week and write one sentence per topic.',
  'Nothing new today. Rest is part of the plan, not a failure of it.',
]

const DOMAINS = [
  { key: 'backend', label: 'Backend', items: BACKEND, startDay: 1 },
  { key: 'linux', label: 'Linux & networking', items: LINUX, startDay: 1 },
  { key: 'db', label: 'Databases', items: DB, startDay: 6 },
  { key: 'design', label: 'System design', items: DESIGN_REFS, startDay: 10, ref: 'sd' },
  { key: 'devops', label: 'DevOps', items: DEVOPS, startDay: 40, ref: null },
  { key: 'aiml', label: 'AI/ML', items: AIML_REFS, startDay: 65, ref: 'aiml' },
]

const totalItems = DOMAINS.reduce((n, d) => n + d.items.length, 0)
if (totalItems + REST_DAYS.size !== TOTAL) {
  problems.push(`domains hold ${totalItems} + ${REST_DAYS.size} rest, expected ${TOTAL}`)
}

/**
 * Weighted round-robin: on each day, take from whichever domain is furthest
 * behind its own even pace. Keeps subjects interleaved rather than blocked,
 * and keeps each domain's internal order intact.
 */
function interleave() {
  const used = Object.fromEntries(DOMAINS.map((d) => [d.key, 0]))
  const days = []
  for (let day = 1; day <= TOTAL; day++) {
    if (REST_DAYS.has(day)) {
      days.push({ domain: 'rest', item: null })
      continue
    }
    let pool = DOMAINS.filter((d) => used[d.key] < d.items.length && day >= d.startDay)
    // If every open domain is exhausted, let a gated one start early rather
    // than emit a hole.
    if (pool.length === 0) pool = DOMAINS.filter((d) => used[d.key] < d.items.length)
    if (pool.length === 0) {
      problems.push(`ran out of material at day ${day}`)
      break
    }
    let best = pool[0]
    let bestDeficit = -Infinity
    for (const d of pool) {
      const span = Math.max(1, TOTAL - d.startDay + 1)
      const elapsed = Math.max(0, day - d.startDay + 1)
      const target = (elapsed / span) * d.items.length
      const deficit = target - used[d.key]
      if (deficit > bestDeficit) {
        bestDeficit = deficit
        best = d
      }
    }
    days.push({ domain: best.key, item: best.items[used[best.key]++], ref: best.ref })
  }
  for (const d of DOMAINS) {
    if (used[d.key] !== d.items.length) {
      problems.push(`${d.key}: placed ${used[d.key]} of ${d.items.length}`)
    }
  }
  return days
}

const laid = interleave()

/* Reference days must point at a day that exists in the library track. */
function trackLength(file, marker) {
  const s = fs.readFileSync(file, 'utf8')
  return (s.match(new RegExp(marker, 'g')) || []).length
}
const SD_LEN = trackLength('src/data/systemDesign.ts', "phase: '")
const AIML_LEN = trackLength('src/data/aiml.ts', '    day: ')
for (const d of laid) {
  if (d.ref === 'sd' && (d.item[0] < 1 || d.item[0] > SD_LEN)) {
    problems.push(`design ref day ${d.item[0]} is outside 1..${SD_LEN}`)
  }
  if (d.ref === 'aiml' && (d.item[0] < 1 || d.item[0] > AIML_LEN)) {
    problems.push(`aiml ref day ${d.item[0]} is outside 1..${AIML_LEN}`)
  }
}

;(async () => {
  // Real uploader per video, from oEmbed — never a hand-typed channel map.
  for (const d of laid) {
    if (d.domain === 'rest' || d.ref) continue
    const res = d.item[2]
    if (!res) {
      problems.push(`day has no resource: ${d.item[0]}`)
      continue
    }
    if (res.kind === 'video') {
      const meta = await oembed(res.id)
      if (!meta) {
        problems.push(`video ${res.id} did not resolve via oEmbed`)
        continue
      }
      res.channel = meta.author_name
    }
  }

  // A video used twice is a copy-paste slip, not a curriculum.
  const seen = new Map()
  for (const [i, d] of laid.entries()) {
    const res = d.domain === 'rest' || d.ref ? null : d.item[2]
    if (res && res.kind === 'video') {
      if (seen.has(res.id)) problems.push(`day ${i + 1} reuses video from day ${seen.get(res.id)}`)
      seen.set(res.id, i + 1)
    }
  }

  if (problems.length) {
    console.error('GENERATION FAILED:')
    for (const p of problems) console.error('  - ' + p)
    process.exit(1)
  }

  const s = (x) => JSON.stringify(x)
  const out = []

  out.push(`/**
 * The 200-day backend rail — ONE twenty-minute thread beside the DSA plan.
 *
 * Replaces the two separate System Design and AI/ML sections, which were two
 * streaks and two ways to feel behind. DSA is untouched and stays the priority;
 * this is the single secondary obligation.
 *
 * Domains interleave rather than block, so a bad week costs a little of
 * everything instead of all of one subject. Every twentieth day is deliberately
 * empty — rest you have to earn is rest you skip.
 *
 * Design and AI/ML days are REFERENCES into the full library tracks by day
 * number, not copies. Those tracks are 122 and 130 days; four months each as a
 * second-priority subject is not realistic, so the rail takes 35 and 25 of the
 * best and leaves the rest browsable. One source of truth, nothing duplicated.
 *
 * GENERATED by scripts/gen-track200.cjs — edit that, not this. Video ids are
 * resolved from scraped playlist data by title fragment and must match exactly
 * one video; channel names come from oEmbed. Every URL was checked for a 200.
 */
import type { SdReading, SdVideo } from './systemDesign'

export type RailDomain = 'backend' | 'db' | 'linux' | 'devops' | 'design' | 'aiml' | 'rest'

export interface RailDay {
  day: number
  domain: RailDomain
  topic: string
  prompt: string
  video?: SdVideo
  reading?: SdReading
  /** Rest days, and any day whose work is thinking rather than reading. */
  selfWork?: string
  /** Set on curated days: the resource lives in a library track, not here. */
  ref?: { track: 'sd' | 'aiml'; day: number }
}

export const RAIL: RailDay[] = [`)

  for (const [i, d] of laid.entries()) {
    const day = i + 1
    const lines = [`  {`, `    day: ${day},`, `    domain: ${s(d.domain)},`]
    if (d.domain === 'rest') {
      lines.push(`    topic: "Rest day",`)
      lines.push(`    prompt: "Recover. The plan assumes you take this.",`)
      lines.push(`    selfWork: ${s(REST_TEXT[(day / 20 - 1) % REST_TEXT.length])},`)
    } else if (d.ref) {
      lines.push(`    topic: ${s(d.item[1])},`)
      lines.push(
        `    prompt: ${s(d.ref === 'sd' ? 'From the system design track — the resource and question live there.' : 'From the AI/ML track — the resource and question live there.')},`,
      )
      lines.push(`    ref: { track: ${s(d.ref)}, day: ${d.item[0]} },`)
    } else {
      const [topic, prompt, res] = d.item
      lines.push(`    topic: ${s(topic)},`)
      lines.push(`    prompt: ${s(prompt)},`)
      if (res.kind === 'video') {
        lines.push(
          `    video: { id: ${s(res.id)}, title: ${s(res.title)}, seconds: ${res.seconds}, channel: ${s(res.channel)} },`,
        )
      } else {
        lines.push(
          `    reading: { label: ${s(res.label)}, url: ${s(res.url)}, source: ${s(res.source)} },`,
        )
      }
    }
    lines.push(`  },`)
    out.push(lines.join('\n'))
  }

  const counts = {}
  for (const d of laid) counts[d.domain] = (counts[d.domain] || 0) + 1

  out.push(`]

export const RAIL_TOTAL_DAYS = RAIL.length

export const RAIL_DOMAIN_META: Record<RailDomain, { label: string; blurb: string }> = {
  backend: { label: 'Backend', blurb: 'APIs, concurrency, caching, queues, auth' },
  db: { label: 'Databases', blurb: 'Indexes, query plans, transactions, replication' },
  linux: { label: 'Linux & net', blurb: 'TCP, TLS, sockets, memory, the kernel' },
  devops: { label: 'DevOps', blurb: 'Containers, CI, observability, incidents' },
  design: { label: 'System design', blurb: 'Curated from the full library track' },
  aiml: { label: 'AI/ML', blurb: 'Curated from the full library track' },
  rest: { label: 'Rest', blurb: 'Deliberately empty' },
}

/** How many days each domain holds, for the progress breakdown. */
export const RAIL_DOMAIN_COUNTS: Record<RailDomain, number> = ${s(counts)}
`)

  process.stdout.write(out.join('\n'))
})()
