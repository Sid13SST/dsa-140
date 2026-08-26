/**
 * Generates src/data/fde.ts — the 135-day Forward Deployed Engineer track.
 *
 *   OUT=data/backend-raw.json node scripts/scrape-backend-videos.cjs
 *   RAW=data/backend-raw.json node scripts/gen-fde-track.cjs > src/data/fde.ts
 *
 * WHY THIS TRACK EXISTS, AND WHY IT LOOKS DIFFERENT.
 *
 * A Forward Deployed Engineer is embedded with a customer: they run discovery,
 * write production code against that customer's data, own the rollout, and are
 * still the one paged when it breaks six months later. The job is judgment and
 * communication at least as much as code, so this track is deliberately
 * reading-heavy where the 200-day rail is video-heavy.
 *
 * It is also PHASE-SEQUENTIAL rather than interleaved. The rail interleaves
 * because its six subjects are independent. This one is a narrative — understand
 * the role, learn to talk to customers, integrate, move data, deploy, add AI,
 * keep it compliant — and shuffling that would break the story.
 *
 * NO OVERLAP WITH THE RAIL. The generator fails if any video here is already
 * used in src/data/track200.ts. Two tracks running at once must not spend the
 * user's time teaching the same thing twice.
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
const self = (text) => ({ kind: 'self', text })

const AZ = (slug, label) =>
  r(`https://learn.microsoft.com/en-us/azure/architecture/patterns/${slug}`, label, 'Azure patterns')
const GAPI = (slug, label) => r(`https://cloud.google.com/apis/design/${slug}`, label, 'Google API design')
const K8S = (path, label) => r(`https://kubernetes.io/docs/concepts/${path}/`, label, 'Kubernetes docs')
const SRE = (path, label) => r(`https://sre.google/${path}/`, label, 'Google SRE')
const EIP = (name, label) =>
  r(
    `https://www.enterpriseintegrationpatterns.com/patterns/messaging/${name}.html`,
    label,
    'Enterprise Integration Patterns',
  )
const MF = (path, label) => r(`https://martinfowler.com/${path}`, label, 'Martin Fowler')
const STRIPE = (path, label) => r(`https://docs.stripe.com/${path}`, label, 'Stripe docs')
const DBT = (path, label) => r(`https://docs.getdbt.com/${path}`, label, 'dbt docs')
const TW = (path, label) => r(`https://developers.google.com/tech-writing/${path}`, label, 'Google Tech Writing')

/* ------------------------------------------------------------------ *
 * The curriculum. [topic, prompt, resource]
 * ------------------------------------------------------------------ */

const PHASES = [
  ['The role', [
    ['What an FDE actually is', 'Name the one thing an FDE owns that a normal engineer does not.', r('https://newsletter.pragmaticengineer.com/p/forward-deployed-engineers', 'Forward Deployed Engineers, and why they are in demand', 'The Pragmatic Engineer')],
    ['Where the role came from', 'Why did this start at Palantir, and what did the AI labs copy?', r('https://en.wikipedia.org/wiki/Forward_Deployed_Engineer', 'Forward Deployed Engineer — the origin and the model', 'Wikipedia')],
    ['Reading a system from its API', 'Given only a public API, what can you infer about the backend behind it?', v('hnBackendAdvanced', 'How much can you learn about the Backend from its API?')],
    ['The engineer who stays', 'Why does the person who scoped it also have to be the person who is paged?', SRE('sre-book/being-on-call', 'Being on call')],
    ['What you are actually optimising', 'Write the difference between shipping a feature and delivering an outcome.', self('In your own words, one page: a product engineer is measured on the feature working; an FDE is measured on the customer succeeding. List three decisions where those two point in opposite directions, and say which you would take.')],
    ['Positioning yourself', 'Which of your existing projects would you put in front of an FDE interviewer, and why?', self('Pick two things you have built. For each, write the three-sentence version you would give a non-technical stakeholder, then the three-sentence version you would give the engineer who has to maintain it. The gap between them is the skill this role is testing.')],
  ]],

  ['Discovery & communication', [
    ['Short sentences', 'Rewrite your last paragraph of technical writing at half the length.', TW('one/short-sentences', 'Short sentences')],
    ['Writing for engineers', 'What are the two questions every technical document must answer in its first paragraph?', TW('one', 'Technical Writing One')],
    ['Editing your own work', 'What survives when you cut a document by 30%?', TW('two', 'Technical Writing Two')],
    ['Documentation principles', 'Who is the reader, and what do they already know?', r('https://www.writethedocs.org/guide/writing/docs-principles/', 'Documentation principles', 'Write the Docs')],
    ['The README as a contract', 'What must a README contain before a stranger can run your code?', r('https://google.github.io/styleguide/docguide/READMEs.html', 'How to write a README', 'Google style guide')],
    ['Design docs', 'What decisions does a design doc record that code never can?', MF('articles/consumerDrivenContracts.html', 'Consumer-driven contracts — agreeing an interface in writing')],
    ['Asynchronous by default', 'Why does writing things down beat a meeting when the customer is in another timezone?', r('https://about.gitlab.com/handbook/', 'The GitLab handbook — a company that writes everything down', 'GitLab')],
    ['Discovery: the wrong question', 'A customer asks for a dashboard. What do you ask before agreeing?', self('Write ten questions you would ask before building a dashboard someone requested. At least four must be about what decision the dashboard is meant to change. If you cannot name the decision, the dashboard is decoration.')],
    ['Scoping to a demo', 'What is the smallest thing you could show in two weeks that would prove the idea?', self('Take any feature you have wanted to build. Cut it to what one person could demo in ten days. Write what you deliberately left out, and the sentence you would use to explain that omission to the customer.')],
    ['Saying no', 'How do you refuse a request without losing the account?', self('Write three refusals: something technically impossible, something possible but a bad idea, and something out of contract. Each should offer the nearest thing you CAN do. That last part is the whole skill.')],
    ['The status update', 'What does a stakeholder need weekly that is not a list of tickets?', self('Write a one-paragraph status update for a project that is running late. It must state the slip, the cause, the new date, and what you need — without hedging and without blame.')],
    ['Demoing', 'What goes wrong in a live demo, and what do you prepare instead?', self('Plan a five-minute demo of something you built: the one sentence of setup, the three things you will show in order, the question you expect, and the fallback if the network dies. Rehearse it once out loud.')],
    ['Incident communication', 'What do you tell a customer in the first ten minutes of an outage?', SRE('workbook/incident-response', 'Incident response')],
    ['Postmortems without blame', 'Why does blaming a person make the next outage more likely?', SRE('workbook/postmortem-culture', 'Postmortem culture in practice')],
    ['Service level objectives', 'Write an SLO you would be willing to put in front of a customer.', SRE('workbook/implementing-slos', 'Implementing SLOs')],
    ['Alerting on what matters', 'Why alert on symptoms rather than causes?', SRE('workbook/alerting-on-slos', 'Alerting on SLOs')],
  ]],

  ['Integration engineering', [
    ['API design, from the top', 'What makes an API easy for a stranger to integrate against?', r('https://cloud.google.com/apis/design', 'API design guide', 'Google API design')],
    ['Resources, not verbs', 'Rewrite three RPC-style endpoints as resources.', GAPI('resources', 'Resource-oriented design')],
    ['Naming', 'Why does a consistent name matter more than a clever one?', GAPI('naming_convention', 'Naming conventions')],
    ['Versioning', 'How do you change an API without breaking the customer who integrated last year?', GAPI('versioning', 'Versioning')],
    ['Errors that help', 'What does a good error response contain beyond a status code?', GAPI('errors', 'Errors')],
    ['Design patterns in APIs', 'Which patterns recur in every mature API?', GAPI('design_patterns', 'Design patterns')],
    ['The other guideline', 'Where do Microsoft and Google disagree, and does it matter?', r('https://github.com/microsoft/api-guidelines', 'Microsoft REST API guidelines', 'Microsoft')],
    ['REST in practice', 'When is REST the wrong shape for the problem?', r('https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design', 'API design best practices', 'Azure')],
    ['Standard methods', 'Which five verbs cover ninety percent of an API, and when do you need a custom one?', GAPI('standard_methods', 'Standard methods')],
    ['Idempotency', 'The customer retries a payment request. How do you not charge them twice?', STRIPE('api/idempotent_requests', 'Idempotent requests')],
    ['Idempotent receivers', 'Where does deduplication belong — sender or receiver?', EIP('IdempotentReceiver', 'Idempotent receiver')],
    ['Webhooks', 'How does the customer know something happened without polling you?', STRIPE('webhooks', 'Webhooks')],
    ['Pagination', 'Why does offset pagination break on a table that is being written to?', STRIPE('api/pagination', 'Pagination')],
    ['Rate limits', 'What should your client do when it is throttled?', STRIPE('rate-limits', 'Rate limits')],
    ['Handling their errors', 'How do you tell a transient failure from a permanent one?', STRIPE('error-low-level', 'Error handling')],
    ['Retries and backoff', 'Why does naive retrying turn a blip into an outage?', r('https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/', 'Timeouts, retries and backoff with jitter', "AWS Builders' Library")],
    ['The retry pattern', 'Where do you put the retry — client, gateway, or queue?', AZ('retry', 'Retry pattern')],
    ['Circuit breakers', 'What does a circuit breaker protect, and from whom?', AZ('circuit-breaker', 'Circuit breaker pattern')],
    ['Throttling', 'How do you protect your service from one customer’s bad script?', AZ('throttling', 'Throttling pattern')],
    ['Bulkheads', 'How do you stop one failing integration taking the rest down?', AZ('bulkhead', 'Bulkhead pattern')],
    ['Fallbacks considered harmful', 'Why is a fallback path often the thing that fails?', r('https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/', 'Avoiding fallback in distributed systems', "AWS Builders' Library")],
    ['Message translation', 'Their schema is not your schema. Where does the mapping live?', EIP('MessageTranslator', 'Message translator')],
    ['Dead letters', 'What happens to a message you can never process?', EIP('DeadLetterChannel', 'Dead letter channel')],
    ['The anti-corruption layer', 'How do you stop a legacy system’s model infecting yours?', AZ('anti-corruption-layer', 'Anti-corruption layer')],
    ['OAuth 2', 'Who are the four parties, and what is the code exchanged for?', r('https://developers.google.com/identity/protocols/oauth2', 'Using OAuth 2.0', 'Google Identity')],
    ['OpenID Connect', 'What does OIDC add that OAuth alone does not give you?', r('https://openid.net/developers/how-connect-works/', 'How OpenID Connect works', 'OpenID Foundation')],
    ['SAML', 'Why does every enterprise ask for SAML, and what does it cost you?', r('https://auth0.com/docs/authenticate/protocols/saml', 'SAML protocol', 'Auth0')],
    ['Single sign-on', 'Draw the redirect chain from clicking Login to landing back signed in.', v('bbgSecurity', 'What Is Single Sign-on (SSO)? How It Works')],
    ['SCIM', 'When an employee leaves, how does your app find out?', r('https://scim.cloud/', 'SCIM — system for cross-domain identity management', 'SCIM')],
    ['Reading a JWT', 'What is signed, what is not, and what must you never trust?', r('https://www.rfc-editor.org/rfc/rfc7519', 'RFC 7519 — JSON Web Token', 'IETF')],
    ['Federated identity', 'Their identity provider is the source of truth, not yours. What follows?', AZ('federated-identity', 'Federated identity pattern')],
    ['A canonical model', 'Five customers, five schemas. What sits in the middle?', EIP('CanonicalDataModel', 'Canonical data model')],
  ]],

  ['Data plumbing', [
    ['Sources', 'Where does the data come from, and who owns it when it is wrong?', DBT('docs/build/sources', 'Declaring sources')],
    ['Testing data', 'What assertions would have caught the last bad load?', DBT('docs/build/data-tests', 'Data tests')],
    ['Incremental models', 'Reprocessing everything nightly stops scaling. What replaces it?', DBT('docs/build/incremental-models', 'Incremental models')],
    ['Practices that hold up', 'Which of these would you adopt on day one of an engagement?', DBT('best-practices', 'dbt best practices')],
    ['Change data capture', 'How do you learn about a row that changed in a database you do not own?', r('https://debezium.io/documentation/reference/stable/tutorial.html', 'Debezium tutorial — CDC in practice', 'Debezium')],
    ['Pipes and filters', 'Why break one transformation into stages?', AZ('pipes-and-filters', 'Pipes and filters')],
    ['Queue-based load levelling', 'The customer sends a year of data on Monday morning. Now what?', AZ('queue-based-load-leveling', 'Queue-based load levelling')],
    ['The claim check', 'How do you put a 2GB file through a message queue?', AZ('claim-check', 'Claim-check pattern')],
    ['Compensating transactions', 'Half the import succeeded. How do you undo the other half?', AZ('compensating-transaction', 'Compensating transaction')],
    ['Sagas', 'What replaces a transaction when the steps span systems?', r('https://microservices.io/patterns/data/saga.html', 'The saga pattern', 'microservices.io')],
    ['Data lakes, honestly', 'When does a lake become a swamp?', MF('bliki/DataLake.html', 'Data lake')],
    ['Data mesh principles', 'Who should own a dataset — the producer or the platform?', MF('articles/data-mesh-principles.html', 'Data mesh principles')],
    ['Guaranteed delivery', 'The network dies mid-import. Which messages are you sure survived?', EIP('GuaranteedMessaging', 'Guaranteed delivery')],
    ['CQRS, and the madness', 'When is separating reads from writes worth the complexity?', v('hnBackendIntermediate', 'CQRS is probably the cause of the Microservices madness')],
    ['Mapping a schema', 'Their field names are wrong, inconsistent, and sometimes lies. Proceed.', self('Take any two public APIs with overlapping concepts — say GitHub issues and Jira issues. Write the field mapping between them, including the three fields that do not map cleanly, and how you would represent each.')],
    ['Data you must not keep', 'Which columns in a typical customer export are you not allowed to store?', r('https://gdpr.eu/what-is-gdpr/', 'What is GDPR', 'gdpr.eu')],
    ['Where the data may live', 'The customer says the data cannot leave the country. What changes?', r('https://cloud.google.com/architecture/framework/security/data-residency-sovereignty', 'Data residency and sovereignty', 'Google Cloud')],
    ['A first import, end to end', 'Design the whole path for one messy file.', self('Design the ingestion of a 500MB CSV a customer emails you monthly: validation, where it lands, how bad rows are handled, how you prove it loaded correctly, and what the customer sees if it fails at 2am.')],
  ]],

  ['Shipping into customer environments', [
    ['How an image is built', 'Why does layer order decide whether their air-gapped rebuild takes 2 minutes or 40?', r('https://docs.docker.com/build/concepts/overview/', 'Docker build concepts', 'Docker docs')],
    ['Kubernetes in six minutes', 'Name the four objects you cannot avoid.', v('bbgFundamentals', 'Kubernetes Explained in 6 Minutes')],
    ['What Kubernetes is for', 'What problem does it solve that a VM and a script do not?', K8S('overview', 'Kubernetes overview')],
    ['Pods', 'Why is the pod the unit rather than the container?', K8S('workloads/pods', 'Pods')],
    ['Deployments', 'How does a rolling update avoid downtime, and when does it not?', K8S('workloads/controllers/deployment', 'Deployments')],
    ['Services', 'How does traffic find a pod whose IP changes?', K8S('services-networking/service', 'Services')],
    ['ConfigMaps', 'What belongs in config rather than in the image?', K8S('configuration/configmap', 'ConfigMaps')],
    ['Secrets', 'Why is a Kubernetes Secret not actually secret by default?', K8S('configuration/secret', 'Secrets')],
    ['Persistent volumes', 'Where does state go when the pod is cattle?', K8S('storage/persistent-volumes', 'Persistent volumes')],
    ['RBAC', 'What is the least privilege your deployment can run with?', K8S('security/rbac-good-practices', 'RBAC good practices')],
    ['Helm', 'How do you ship the same app to five customers with different config?', r('https://helm.sh/docs/chart_template_guide/getting_started/', 'Helm chart templates', 'Helm docs')],
    ['The API gateway', 'What belongs in the gateway rather than in your service?', v('bbgFundamentals', 'What is API Gateway?')],
    ['Anatomy of a proxy', 'What is actually happening inside the thing in front of your app?', v('hnBackendAdvanced', 'The Anatomy of a Proxy Server')],
    ['Layer 4 proxying', 'When can the proxy not read the request, and why does that help?', v('hnNginx', 'Layer 4 Proxying in NginX')],
    ['Frontend timeouts', 'Which of the six nginx timeouts has bitten you without you knowing?', v('hnNginx', '6 NginX FrontEnd Timeouts Explained in Details')],
    ['Upstream timeouts', 'Their backend is slow. Where does the request die?', v('hnNginx', 'Nginx backend upstream timeouts Explained')],
    ['502 Bad Gateway', 'List every cause. The customer will hit at least three.', v('hnBackendAdvanced', 'HTTP Code 502 Bad Gateway Explained')],
    ['The TLS handshake', 'What is exchanged, in order, before the first byte of your request?', v('hnBackendAdvanced', 'The TLS Handshake Explained with Example')],
    ['Certificates', 'The customer’s internal CA is not in your trust store. Now what?', v('hnTls', 'What are SSL/TLS Certificates? Why do we Need them?')],
    ['Certificate pinning', 'Why would a customer pin, and what breaks when they do?', v('hnTls', 'TLS/SSL Certificate Pinning Explained')],
    ['Revocation', 'A certificate is compromised at 3am. What actually happens?', v('hnTls', 'Certificates Gone Bad!')],
    ['The ambassador', 'How do you add retries and TLS to a client you cannot modify?', AZ('ambassador', 'Ambassador pattern')],
    ['Gateway aggregation', 'The customer’s network is slow. How do you reduce round trips?', AZ('gateway-aggregation', 'Gateway aggregation')],
    ['Observability, from zero', 'You have no access to their logs. What do you instrument first?', r('https://opentelemetry.io/docs/concepts/observability-primer/', 'Observability primer', 'OpenTelemetry')],
    ['Traces', 'Why is a trace more useful than a log line in someone else’s environment?', r('https://opentelemetry.io/docs/concepts/signals/traces/', 'Traces', 'OpenTelemetry')],
    ['Failover, hands on', 'Build the two-node cluster and pull the plug on one.', v('hnHighAvailability', 'Setup Active-Passive Cluster with Keepalived')],
    ['Strangling a legacy system', 'How do you replace a system nobody is allowed to switch off?', MF('articles/patterns-legacy-displacement/', 'Patterns of legacy displacement')],
    ['The strangler fig', 'Where do you put the seam?', AZ('strangler-fig', 'Strangler fig pattern')],
    ['Container security', 'What does their security team ask about the image you shipped?', r('https://docs.docker.com/engine/security/', 'Docker security', 'Docker docs')],
    ['Health endpoints', 'What should /health actually check, and what must it never do?', AZ('health-endpoint-monitoring', 'Health endpoint monitoring')],
  ]],

  ['AI delivery', [
    ['Building with LLMs in production', 'What breaks when a prototype meets a customer?', r('https://huyenchip.com/2023/04/11/llm-engineering.html', 'Building LLM applications for production', 'Chip Huyen')],
    ['The pitfalls', 'Which of these were you about to walk into?', r('https://huyenchip.com/2025/01/16/ai-engineering-pitfalls.html', 'Common AI engineering pitfalls', 'Chip Huyen')],
    ['LLM patterns', 'Name the pattern you would reach for first on a new engagement.', r('https://eugeneyan.com/writing/llm-patterns/', 'Patterns for building LLM systems', 'Eugene Yan')],
    ['Prompting that survives evaluation', 'Which techniques hold up once you measure them?', r('https://eugeneyan.com/writing/prompting/', 'Prompting fundamentals', 'Eugene Yan')],
    ['Fine-tune, retrieve, or prompt', 'The model does not know their domain. Choose, and defend it.', r('https://eugeneyan.com/writing/finetuning/', 'When and how to fine-tune', 'Eugene Yan')],
    ['Evals', 'How do you build an eval set from a customer who has no labelled data?', r('https://eugeneyan.com/writing/evals/', 'Task-specific evals that work', 'Eugene Yan')],
    ['LLM as judge', 'When can a model grade a model, and how do you check the grader?', r('https://eugeneyan.com/writing/llm-evaluators/', 'LLM evaluators', 'Eugene Yan')],
    ['The platform underneath', 'Draw the reference architecture and say what you would build first.', r('https://huyenchip.com/2024/07/25/genai-platform.html', 'Building a generative AI platform', 'Chip Huyen')],
    ['Agents and tools', 'What makes an agent different from a loop with tool calls?', r('https://huyenchip.com/2025/01/07/agents.html', 'Agents — planning, tools and failure modes', 'Chip Huyen')],
    ['Guardrails', 'The model said something to their customer that it should not have. Prevent it.', r('https://owasp.org/www-project-api-security/', 'OWASP API Security Project', 'OWASP')],
    ['Retrieval over their documents', 'Their permissions are per-document. Where does that filter go?', self('Design RAG over a customer wiki where every document has an access list. State exactly where the permission filter is applied and why applying it after generation is a data leak, not a bug.')],
    ['Grounding and citation', 'How does a sceptical user check the answer?', r('https://eugeneyan.com/writing/abstractive/', 'Evaluation metrics for text generation', 'Eugene Yan')],
    ['Cost per request', 'Work out what one request costs, end to end.', self('For an assistant answering questions over 50k customer documents: estimate embedding cost once, retrieval cost per query, generation cost per query, and the monthly bill at 500 queries a day. State every assumption. Then name the one lever that changes it most.')],
    ['Monitoring a model you shipped', 'Labels never arrive. What do you alert on?', r('https://huyenchip.com/2022/02/07/data-distribution-shifts-and-monitoring.html', 'Data distribution shifts and monitoring', 'Chip Huyen')],
    ['The first rule', 'When should you tell the customer not to use ML at all?', r('https://eugeneyan.com/writing/first-rule-of-ml/', 'The first rule of machine learning', 'Eugene Yan')],
    ['Scoping an AI engagement', 'What do you promise in week one?', self('A customer wants "AI for our support tickets". Write the two-week scope: the one workflow you will touch, what success is measured as, what data you need from them by Friday, and the three things you are explicitly not doing.')],
    ['The demo that survives contact', 'What goes wrong when the customer types their own question?', self('Take any LLM feature. Write ten inputs a real user would try that you have not tested: the ambiguous one, the hostile one, the one in another language, the one with a typo, the empty one. Predict which break it.')],
    ['Handover', 'You leave. Can their team keep it running?', self('Write the runbook for an AI feature you have deployed: how to tell it is broken, the three most likely causes, how to roll back, how to re-run evals, and who to call. If a competent stranger cannot follow it, it is not done.')],
  ]],

  ['Security & compliance', [
    ['API security top ten', 'Which of these would a customer’s pentest find in your integration?', r('https://owasp.org/API-Security/editions/2023/en/0x11-t10/', 'OWASP API Security Top 10', 'OWASP')],
    ['Consuming an API well', 'What does a well-behaved client do that a naive one does not?', r('https://docs.github.com/en/rest/guides/best-practices-for-using-the-rest-api', 'Best practices for using a REST API', 'GitHub docs')],
    ['Security by design', 'What does the customer’s security review actually ask for?', r('https://cloud.google.com/architecture/framework/security', 'Security in the architecture framework', 'Google Cloud')],
    ['SOC 2, in plain terms', 'What does a SOC 2 report tell a customer, and what does it not?', r('https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2', 'SOC 2 — what it covers', 'AICPA')],
    ['Compression can leak secrets', 'Why can a compressed HTTPS response reveal a token?', v('hnHttp2', 'How HTTP Compression Can Leak Sessions and JWTs')],
    ['Proxy security holes', 'How does a request smuggled past a proxy reach the wrong backend?', v('hnHttp2', 'Researcher bypasses Azure and Cloudflare Reverse Proxy Security')],
    ['Contract testing', 'How do you prove you have not broken their integration?', MF('bliki/IntegrationTest.html', 'Integration test')],
    ['Least privilege in practice', 'What is the smallest set of permissions your deployment needs?', self('Take a service you have written. List every credential it holds, what each can do, and what an attacker could do with each. Then write the reduced version. Most services hold at least one credential they never use.')],
    ['The security questionnaire', 'Answer forty questions without lying or overpromising.', self('Write honest answers to five questions a customer will ask: where is data stored, who can access it, how is it encrypted in transit and at rest, how long do you retain it, and what happens on breach. If you do not know an answer, that is the finding.')],
    ['Handling PII', 'Which fields do you refuse to accept in the first place?', self('Design an intake that minimises PII: what you genuinely need, what you can hash, what you can drop, and what you would push back on the customer for sending. Not collecting it is the only guarantee.')],
    ['Review: the integration checklist', 'No new material — write the checklist you would use on every engagement.', self('From this whole track, write your one-page pre-launch checklist: auth, idempotency, retries, rate limits, error handling, data mapping, observability, rollback, runbook, security answers. You will use this in interviews as much as in the job.')],
    ['Review: your FDE story', 'What is the story you tell in the interview?', self('Write the five-minute walkthrough of one project as an FDE would tell it: the customer problem, what you scoped and what you cut, the integration that was hardest, what broke in production, and what you would do differently. Practise it out loud once.')],
  ]],

  ['Consolidate', [
    ['Rest', 'Nothing new. The plan assumes you take this.', self('Nothing new today. Re-read one note you wrote that you no longer fully understand.')],
    ['Rest', 'Nothing new. Recover.', self('Nothing new today. Rest is part of the plan, not a failure of it.')],
    ['Final sweep', 'Which phase felt weakest, and what will you do about it?', self('Rank the seven phases by how confident you feel. Take the weakest and list the three specific days you would redo. Put them in your calendar. A plan you finish without knowing your gaps was not a plan.')],
  ]],
]

/* --------------------------- assemble --------------------------- */

const days = []
for (const [phase, entries] of PHASES) {
  for (const [topic, prompt, res] of entries) {
    days.push({ day: days.length + 1, phase, topic, prompt, res })
  }
}

const EXPECTED = 135
if (days.length !== EXPECTED) {
  problems.push(`expected ${EXPECTED} days, built ${days.length}`)
}
for (const d of days) {
  if (!d.res) problems.push(`day ${d.day} (${d.topic}) has no resource`)
}

// No video twice within this track.
const seen = new Map()
for (const d of days) {
  if (d.res && d.res.kind === 'video') {
    if (seen.has(d.res.id)) {
      problems.push(`day ${d.day} reuses the video from day ${seen.get(d.res.id)}`)
    }
    seen.set(d.res.id, d.day)
  }
}

/*
 * And no video shared with the 200-day rail. Both tracks run at the same time,
 * so an overlap would spend the user's evening twice on one video. This is the
 * assertion that keeps the two genuinely different rather than nominally so.
 */
const railIds = new Set(
  [...fs.readFileSync('src/data/track200.ts', 'utf8').matchAll(/id: "([\w-]{11})"/g)].map(
    (m) => m[1],
  ),
)
const railUrls = new Set(
  [...fs.readFileSync('src/data/track200.ts', 'utf8').matchAll(/url: "([^"]+)"/g)].map((m) => m[1]),
)
for (const d of days) {
  if (!d.res) continue
  if (d.res.kind === 'video' && railIds.has(d.res.id)) {
    problems.push(`day ${d.day} uses a video the 200-day rail already teaches (${d.res.id})`)
  }
  // Readings count too. An identical article is the same wasted evening as an
  // identical video, and only checking ids would have let four through.
  if (d.res.kind === 'reading' && railUrls.has(d.res.url)) {
    problems.push(`day ${d.day} uses a URL the 200-day rail already teaches (${d.res.url})`)
  }
}

;(async () => {
  for (const d of days) {
    if (d.res && d.res.kind === 'video') {
      const meta = await oembed(d.res.id)
      if (!meta) {
        problems.push(`day ${d.day}: video ${d.res.id} did not resolve via oEmbed`)
        continue
      }
      d.res.channel = meta.author_name
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
 * The 135-day Forward Deployed Engineer track.
 *
 * An FDE is embedded with a customer: they run discovery, write production code
 * against that customer's data, own the rollout, and are still the one paged
 * when it breaks six months later. The job is judgment and communication at
 * least as much as code, which is why this track is reading-heavy where the
 * 200-day rail is video-heavy, and why a third of its days are exercises you
 * write rather than things you watch.
 *
 * PHASE-SEQUENTIAL, not interleaved. The rail interleaves because its six
 * subjects are independent. This is a narrative — understand the role, learn to
 * talk to customers, integrate, move data, deploy, add AI, keep it compliant —
 * and shuffling it would break the story.
 *
 * NO OVERLAP WITH THE RAIL, asserted by the generator: both run at once, so a
 * shared video would spend the same evening twice.
 *
 * GENERATED by scripts/gen-fde-track.cjs — edit that, not this. Video ids are
 * resolved by title fragment against scraped playlist data and must match
 * exactly one video; channels come from oEmbed; every URL was checked for a 200.
 */
import type { SdReading, SdVideo } from './systemDesign'

export interface FdeDay {
  day: number
  phase: string
  topic: string
  /** The single question you should be able to answer when the time is up. */
  prompt: string
  video?: SdVideo
  reading?: SdReading
  /** Written work. A third of this track is exercises, not consumption. */
  selfWork?: string
}

export const FDE_TRACK: FdeDay[] = [`)

  for (const d of days) {
    const lines = [
      `  {`,
      `    day: ${d.day},`,
      `    phase: ${s(d.phase)},`,
      `    topic: ${s(d.topic)},`,
      `    prompt: ${s(d.prompt)},`,
    ]
    if (d.res.kind === 'video') {
      lines.push(
        `    video: { id: ${s(d.res.id)}, title: ${s(d.res.title)}, seconds: ${d.res.seconds}, channel: ${s(d.res.channel)} },`,
      )
    } else if (d.res.kind === 'reading') {
      lines.push(
        `    reading: { label: ${s(d.res.label)}, url: ${s(d.res.url)}, source: ${s(d.res.source)} },`,
      )
    } else {
      lines.push(`    selfWork: ${s(d.res.text)},`)
    }
    lines.push(`  },`)
    out.push(lines.join('\n'))
  }

  const counts = {}
  for (const d of days) counts[d.phase] = (counts[d.phase] || 0) + 1
  const kinds = { video: 0, reading: 0, selfWork: 0 }
  for (const d of days) kinds[d.res.kind === 'self' ? 'selfWork' : d.res.kind]++

  out.push(`]

export const FDE_TOTAL_DAYS = FDE_TRACK.length
export const FDE_PHASES = ${s(PHASES.map(([p]) => p))}
export const FDE_PHASE_COUNTS: Record<string, number> = ${s(counts)}

/** What the track is made of — reading and writing, mostly. */
export const FDE_MIX = ${s(kinds)}

/** Shown once at the top rather than repeated on every day. */
export const FDE_GENERAL: SdReading[] = [
  { label: 'Forward Deployed Engineers, and why they are in demand', url: 'https://newsletter.pragmaticengineer.com/p/forward-deployed-engineers', source: 'The Pragmatic Engineer' },
  { label: 'Enterprise Integration Patterns — the catalogue', url: 'https://www.enterpriseintegrationpatterns.com/patterns/messaging/index.html', source: 'Hohpe & Woolf' },
  { label: 'Google API design guide', url: 'https://cloud.google.com/apis/design', source: 'Google' },
  { label: "AWS Builders' Library", url: 'https://aws.amazon.com/builders-library/', source: 'AWS' },
]
`)

  process.stdout.write(out.join('\n'))
})()
