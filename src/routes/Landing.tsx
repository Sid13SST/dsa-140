import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { PRICE_RUPEES } from '../lib/pricing'
import { AUTH_ENABLED, PAYMENTS_ENABLED } from '../lib/flags'
import { useCountUp, usePrefersReducedMotion, useReveal, useTilt } from './useLandingMotion'
import './landing.css'

/**
 * The public page.
 *
 * Everything here is marketing copy and summary counts — deliberately NOT
 * imported from the data files, because importing them would pull the whole
 * curriculum into the public bundle.
 *
 * The cost of that choice is that these numbers can drift from the generators.
 * They are correct as of the 200-day rail: 50 + 30 + 25 + 25 + 35 + 25 domain
 * days plus 10 rest, 50 + 50 practice questions, 24 + 24 interview questions.
 * If you change a generator, change them here too.
 */
const NUMBERS = [
  { value: 503, label: 'DSA problems', sub: 'across 140 dated days' },
  { value: 200, label: 'days of fundamentals', sub: '~20 minutes each' },
  { value: 100, label: 'practice questions', sub: 'self-graded on rubrics' },
  { value: 48, label: 'mock interviews', sub: 'with an AI that pushes back' },
]

const DOMAINS = [
  { name: 'Backend', days: 50, what: 'APIs, concurrency, caching, queues, auth, testing', glyph: '⌗' },
  { name: 'Databases', days: 30, what: 'Indexes, query plans, joins, replication, sharding', glyph: '⛁' },
  { name: 'Linux & networking', days: 25, what: 'TCP, TLS, sockets, virtual memory, the kernel', glyph: '⌁' },
  { name: 'DevOps', days: 25, what: 'Containers, CI, SLOs, incidents, postmortems', glyph: '⬡' },
  { name: 'System design', days: 35, what: 'Estimation, consistency, reliability, case studies', glyph: '⬢' },
  { name: 'AI/ML engineering', days: 25, what: 'Serving, retrieval, evaluation, monitoring', glyph: '◉' },
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

/**
 * A real day from the rail, quoted verbatim.
 *
 * Hardcoded rather than imported, for the same reason the counts are: importing
 * the track would pull the whole curriculum into the public bundle. These three
 * are days 12, 88 and 47 of src/data/track200.ts — if you regenerate the rail,
 * re-check them.
 */
const SAMPLE_DAYS = [
  {
    day: 12,
    domain: 'Databases',
    tone: 'text-ac border-ac/40 bg-ac/10',
    topic: 'Choosing a database',
    prompt: 'Give the one question that eliminates half the options immediately.',
    cost: '6:12 video',
  },
  {
    day: 47,
    domain: 'System design',
    tone: 'text-brand-deep border-brand/40 bg-brand/10',
    topic: 'Consistent hashing',
    prompt: 'Why does adding one server reshuffle almost every key without it?',
    cost: '8:04 video',
  },
  {
    day: 88,
    domain: 'DevOps',
    tone: 'text-miss border-miss/40 bg-miss/10',
    topic: 'Dev/prod parity',
    prompt: 'Name the three gaps this principle is trying to close.',
    cost: '~10m read',
  },
]

function Stat({
  value,
  label,
  sub,
  animate,
}: {
  value: number
  label: string
  sub: string
  animate: boolean
}) {
  const { ref, value: shown } = useCountUp(value, animate)
  return (
    <div className="min-w-0">
      <span
        ref={ref}
        className="block font-mono text-3xl sm:text-5xl font-bold tabular-nums leading-none text-brand"
      >
        {shown}
      </span>
      <span className="block text-[13px] font-semibold mt-2">{label}</span>
      <span className="block text-[11px] text-muted mt-0.5">{sub}</span>
    </div>
  )
}

/**
 * Three consecutive-ish days, shown the way the app shows them.
 *
 * This replaces an earlier decorative grid of 200 coloured squares. That grid
 * looked like a chart but was coloured by index modulo six — a made-up pattern,
 * not the real rail — so it implied information it did not carry. These are
 * real days with their real questions, which is both honest and a better
 * argument for the product.
 */
function DayPreview() {
  return (
    <div className="scene grid md:grid-cols-3 gap-3 mt-5">
      {SAMPLE_DAYS.map((d) => (
        <article key={d.day} className="card card-3d p-4 min-w-0 reveal text-left">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-[11px] text-muted">
              day {String(d.day).padStart(3, '0')}
            </span>
            <span className="font-mono text-[10px] text-muted shrink-0">{d.cost}</span>
          </div>

          <h3 className="font-display font-bold text-base mt-1.5">{d.topic}</h3>

          <span
            className={`inline-block mt-2 font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${d.tone}`}
          >
            {d.domain}
          </span>

          {/* The question is the day. Watching the video is not the deliverable. */}
          <p className="text-[13px] mt-3 leading-relaxed border-l-2 border-brand/50 pl-3">
            {d.prompt}
          </p>
        </article>
      ))}
    </div>
  )
}

export default function Landing() {
  const { status, me } = useAuth()
  const signedIn = status === 'signed-in'
  const reduced = usePrefersReducedMotion()
  const animate = !reduced

  useReveal(animate)
  const heroRef = useTilt<HTMLDivElement>(animate)

  /*
   * With accounts off, opening the dashboard IS the call to action — there is
   * nothing to sign up for, and advertising a price nothing can charge would
   * be a lie on the first screen.
   */
  const ctaTo = !AUTH_ENABLED
    ? '/app'
    : signedIn
      ? PAYMENTS_ENABLED
        ? '/plans'
        : '/app'
      : '/signin?mode=signup'
  /*
   * Three calls to action on one page is normal — header, hero, close. Three
   * calls to action reading "Open the dashboard" is not: it reads as a stutter
   * and gives the eye nothing new at the bottom of the page. Each one names a
   * different moment instead.
   */
  const heroCta = !AUTH_ENABLED
    ? 'Start day 1'
    : PAYMENTS_ENABLED
      ? `Get access — ₹${PRICE_RUPEES} once`
      : 'Create a free account'
  const closingCta = !AUTH_ENABLED ? 'Start tonight' : heroCta
  const ctaNote = !AUTH_ENABLED
    ? 'No account needed. Your progress is saved in this browser.'
    : PAYMENTS_ENABLED
      ? 'One payment. No subscription, no renewal, no card stored.'
      : 'Free while in development. One click with Google.'

  return (
    <div className="min-h-full relative overflow-x-clip">
      {/* ------------------------- ambient background ------------------------- */}
      <div className="aurora" aria-hidden="true">
        <span />
        <span />
      </div>

      <header className="relative z-10 border-b border-rule/70 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <span className="font-display font-bold text-lg tracking-tight">
            Backend<span className="text-brand">200</span>
          </span>
          <div className="flex items-center gap-2">
            {!AUTH_ENABLED ? (
              <Link className="btn btn-primary text-xs" to="/app">
                Open dashboard
              </Link>
            ) : signedIn ? (
              <Link className="btn btn-primary text-xs" to={ctaTo}>
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
        <div className="hairline h-px w-full" aria-hidden="true" />
      </header>

      <main className="relative z-10">
        {/* -------------------------------- hero -------------------------------- */}
        <section className="scene relative px-4 pt-14 pb-20">
          <div className="grid-floor" aria-hidden="true" />
          <div ref={heroRef} className="tilt max-w-5xl mx-auto relative">
            <div className="tilt-layer max-w-3xl">
              <span className="eyebrow">a 200-day plan, not a playlist</span>
              <h1 className="font-display text-4xl sm:text-6xl font-bold mt-3 leading-[1.05] shine">
                Become a backend engineer who can actually pass the interview.
              </h1>
              <p className="text-base sm:text-lg text-muted mt-5 leading-relaxed max-w-2xl">
                Most prep is a pile of bookmarks. This is a dated plan: 503 DSA problems on a
                140-day schedule, and one twenty-minute thread beside it covering backend,
                databases, Linux, networking, DevOps, system design and AI/ML — finishing the
                same week your DSA plan does.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-7">
                <Link className="btn btn-primary text-sm px-5 py-2.5" to={ctaTo}>
                  {heroCta} <span aria-hidden="true">→</span>
                </Link>
                <span className="text-[12px] text-muted">{ctaNote}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------- numbers ------------------------------ */}
        <section className="px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 py-10 border-y border-rule reveal">
            {NUMBERS.map((n) => (
              <Stat key={n.label} {...n} animate={animate} />
            ))}
          </div>
        </section>

        {/* ----------------------------- a real day ---------------------------- */}
        <section className="px-4 pt-16">
          <div className="max-w-5xl mx-auto">
            <div className="reveal">
              <span className="eyebrow">what a day actually looks like</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1 max-w-2xl">
                One topic, one question, and the exact minutes it will cost you.
              </h2>
              <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
                Three real days from the rail, unedited. Subjects rotate rather than running in
                blocks, so a bad week costs a little of everything instead of all of one thing —
                and every twentieth day is deliberately empty.
              </p>
            </div>
            <DayPreview />
          </div>
        </section>

        {/* --------------------------------- how -------------------------------- */}
        <section className="px-4 pt-10">
          <div className="max-w-5xl mx-auto">
            <span className="eyebrow reveal">how it works</span>
            <div className="grid md:grid-cols-3 gap-4 mt-3">
              {STEPS.map((s) => (
                <div key={s.n} className="card card-3d p-5 min-w-0 reveal">
                  <span className="font-mono text-xs text-brand font-bold">{s.n}</span>
                  <h3 className="font-display font-bold text-base mt-1.5">{s.title}</h3>
                  <p className="text-[13px] text-muted mt-2 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------- domains ------------------------------ */}
        <section className="px-4 pt-16">
          <div className="max-w-5xl mx-auto">
            <div className="reveal">
              <span className="eyebrow">what the 200 days cover</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1">
                Six subjects, none of them monopolising a month.
              </h2>
            </div>
            <div className="scene grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
              {DOMAINS.map((d) => (
                <div key={d.name} className="card card-3d p-4 min-w-0 reveal">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display font-bold text-sm">
                      <span aria-hidden="true" className="text-brand mr-1.5 font-mono">
                        {d.glyph}
                      </span>
                      {d.name}
                    </span>
                    <span className="font-mono text-[10px] text-muted shrink-0">
                      {d.days} days
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-1.5 leading-snug">{d.what}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ what else ----------------------------- */}
        <section className="px-4 pt-16">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-4">
            <div className="card card-3d p-5 reveal">
              <span className="eyebrow">an interviewer that does not flatter you</span>
              <p className="text-[13px] text-muted mt-2 leading-relaxed">
                48 mock rounds across system design and AI/ML. One question at a time, straight
                at the weakest thing you just said, with a whiteboard it can actually read. It
                grades from the transcript at the end — so it credits what you said, not what
                you meant.
              </p>
            </div>
            <div className="card card-3d p-5 reveal">
              <span className="eyebrow">tracking that tells the truth</span>
              <p className="text-[13px] text-muted mt-2 leading-relaxed">
                A 140-day run grid where a broken streak is visible instantly, live contest
                listings from LeetCode, Codeforces, CodeChef and AtCoder, topic coverage, pace
                against plan, and a printable PDF report of the lot.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------- honesty ------------------------------ */}
        <section className="px-4 pt-16">
          <div className="max-w-5xl mx-auto card p-5 border-warn/40 reveal">
            <span className="eyebrow">what this is not</span>
            <p className="text-[13px] text-muted mt-2 leading-relaxed max-w-3xl">
              It is not a course and there are no lectures of ours. Every day points at one
              specific video or one deep-linked article from people who teach this better than we
              could — all of it checked as live. What this adds is the sequencing, the question
              set, the interviewer and the tracking. The underlying sources are all public and
              free, and if you would rather assemble them yourself, you should.
            </p>
          </div>
        </section>

        {/* --------------------------------- cta -------------------------------- */}
        <section className="scene px-4 py-20">
          <div className="max-w-5xl mx-auto text-center reveal">
            <h2 className="font-display text-2xl sm:text-4xl font-bold shine">
              Day one is a video and one question.
            </h2>
            <p className="text-sm text-muted mt-3">
              Twenty minutes, one question, and you are on the board.
            </p>
            <Link className="btn btn-primary mt-6 text-sm px-6 py-3" to={ctaTo}>
              {closingCta} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-rule">
        <div className="max-w-5xl mx-auto px-4 py-5 text-[11px] text-muted flex flex-wrap gap-x-4 gap-y-1 justify-between">
          <span>Backend 200</span>
          <span>
            {!AUTH_ENABLED
              ? 'No accounts yet — progress is stored in your browser. Back it up from DSA → Analytics.'
              : PAYMENTS_ENABLED
                ? 'Payments processed by Razorpay. We never see or store your card details.'
                : 'Sign-in by Google. We receive your name, email and picture — nothing else.'}
          </span>
        </div>
      </footer>
    </div>
  )
}
