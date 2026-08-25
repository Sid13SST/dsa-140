import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { PRICE_RUPEES } from '../lib/pricing'

/**
 * The public page. Everything here is marketing copy and summary counts —
 * deliberately NOT imported from the data files, because importing them would
 * pull the whole curriculum into the public bundle and undo the paywall. These
 * numbers are checked against the generators by scripts/check-landing-counts.cjs.
 */
const NUMBERS = [
  { value: '503', label: 'DSA problems', sub: 'across 140 dated days' },
  { value: '200', label: 'days of fundamentals', sub: '~20 minutes each' },
  { value: '100', label: 'practice questions', sub: 'self-graded on rubrics' },
  { value: '48', label: 'mock interviews', sub: 'with an AI that pushes back' },
]

const DOMAINS = [
  { name: 'Backend', days: 50, what: 'APIs, concurrency, caching, queues, auth, testing' },
  { name: 'Databases', days: 30, what: 'Indexes, query plans, joins, replication, sharding' },
  { name: 'Linux & networking', days: 25, what: 'TCP, TLS, sockets, virtual memory, the kernel' },
  { name: 'DevOps', days: 25, what: 'Containers, CI, SLOs, incidents, postmortems' },
  { name: 'System design', days: 35, what: 'Estimation, consistency, reliability, case studies' },
  { name: 'AI/ML engineering', days: 25, what: 'Serving, retrieval, evaluation, monitoring' },
]

const STEPS = [
  {
    n: '01',
    title: 'Open one page a day',
    body: 'Today’s DSA problems, and one twenty-minute item from the rail. Not six tracks competing for your attention — one thing to do.',
  },
  {
    n: '02',
    title: 'Answer the question, not the video',
    body: 'Every day names the single question you should be able to answer when the time is up. Watching is not the same as knowing, and the day is scored on the second one.',
  },
  {
    n: '03',
    title: 'Get graded honestly',
    body: 'Practice questions carry rubrics. The AI interviewer refuses hand-waving, goes after your weakest answer, and grades from the transcript — so it can only credit what you actually said.',
  },
]

function Stat({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-3xl sm:text-4xl font-bold tabular-nums leading-none text-brand">
        {value}
      </div>
      <div className="text-[13px] font-semibold mt-1.5">{label}</div>
      <div className="text-[11px] text-muted mt-0.5">{sub}</div>
    </div>
  )
}

export default function Landing() {
  const { status, me } = useAuth()
  const signedIn = status === 'signed-in'

  return (
    <div className="min-h-full">
      <header className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <span className="font-display font-bold text-lg">
            Backend<span className="text-brand">200</span>
          </span>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Link className="btn btn-primary text-xs" to={me?.hasPaid ? '/app' : '/plans'}>
                {me?.hasPaid ? 'Open dashboard' : 'Continue'}
              </Link>
            ) : (
              <>
                <Link className="btn text-xs" to="/signin">
                  Sign in
                </Link>
                <Link className="btn btn-primary text-xs" to="/signin?mode=signup">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        {/* ------------------------------- hero ------------------------------- */}
        <section className="max-w-3xl">
          <span className="eyebrow">a 200-day plan, not a playlist</span>
          <h1 className="font-display text-3xl sm:text-5xl font-bold mt-2 leading-[1.1]">
            Become a backend engineer who can actually pass the interview.
          </h1>
          <p className="text-base sm:text-lg text-muted mt-4 leading-relaxed">
            Most prep is a pile of bookmarks. This is a dated plan: 503 DSA problems on a
            140-day schedule, and one twenty-minute thread beside it covering backend,
            databases, Linux, networking, DevOps, system design and AI/ML — finishing the
            same week your DSA plan does.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link className="btn btn-primary" to={signedIn ? '/plans' : '/signin?mode=signup'}>
              Get access — &#8377;{PRICE_RUPEES} once &rarr;
            </Link>
            <span className="text-[12px] text-muted">
              One payment. No subscription, no renewal, no card stored.
            </span>
          </div>
        </section>

        {/* ------------------------------ numbers ----------------------------- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-6 border-y border-rule">
          {NUMBERS.map((n) => (
            <Stat key={n.label} {...n} />
          ))}
        </section>

        {/* ------------------------------- how -------------------------------- */}
        <section>
          <span className="eyebrow">how it works</span>
          <div className="grid md:grid-cols-3 gap-4 mt-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card p-4 min-w-0">
                <span className="font-mono text-[11px] text-brand font-bold">{s.n}</span>
                <h3 className="font-display font-bold text-base mt-1">{s.title}</h3>
                <p className="text-[13px] text-muted mt-1.5 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ----------------------------- the rail ----------------------------- */}
        <section>
          <span className="eyebrow">what the 200 days cover</span>
          <h2 className="font-display text-2xl font-bold mt-1">
            Six subjects, interleaved so none of them monopolises a month.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {DOMAINS.map((d) => (
              <div key={d.name} className="card p-3 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display font-bold text-sm">{d.name}</span>
                  <span className="font-mono text-[10px] text-muted shrink-0">{d.days} days</span>
                </div>
                <p className="text-[11px] text-muted mt-1 leading-snug">{d.what}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ----------------------------- what else ---------------------------- */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="card p-4">
            <span className="eyebrow">an interviewer that does not flatter you</span>
            <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
              48 mock rounds across system design and AI/ML. One question at a time, straight
              at the weakest thing you just said, with a whiteboard it can actually read. It
              grades from the transcript at the end — so it credits what you said, not what
              you meant.
            </p>
          </div>
          <div className="card p-4">
            <span className="eyebrow">tracking that tells the truth</span>
            <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
              A 140-day run grid where a broken streak is visible instantly, live contest
              listings from LeetCode, Codeforces, CodeChef and AtCoder, topic coverage, pace
              against plan, and a printable PDF report of the lot.
            </p>
          </div>
        </section>

        {/* ------------------------------ honesty ----------------------------- */}
        <section className="card p-4 border-warn/40">
          <span className="eyebrow">what this is not</span>
          <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
            It is not a course and there are no lectures of ours. Every day points at one
            specific video or one deep-linked article from people who teach this better than we
            could — all of it checked as live. What you are paying for is the sequencing, the
            question set, the interviewer and the tracking. If that is not worth twenty rupees
            to you, the sources are all public and you should go read them.
          </p>
        </section>

        {/* -------------------------------- cta ------------------------------- */}
        <section className="text-center py-4">
          <h2 className="font-display text-2xl font-bold">Day one is a video and one question.</h2>
          <p className="text-sm text-muted mt-2">Start it tonight.</p>
          <Link className="btn btn-primary mt-4" to={signedIn ? '/plans' : '/signin?mode=signup'}>
            Get access — &#8377;{PRICE_RUPEES} once &rarr;
          </Link>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="max-w-5xl mx-auto px-4 py-4 text-[11px] text-muted flex flex-wrap gap-x-4 gap-y-1 justify-between">
          <span>Backend 200</span>
          <span>Payments processed by Razorpay. We never see or store your card details.</span>
        </div>
      </footer>
    </div>
  )
}
