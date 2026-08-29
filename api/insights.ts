import { clerk } from './_lib/clerk.js'
import { secure } from './_lib/http.js'

/**
 * GET /api/insights — the super-admin view of who signed up.
 *
 * `auth: 'super'` means exactly one address reaches this, checked against
 * SUPER_ADMIN_EMAIL rather than the admin list. Someone added to ADMIN_EMAILS
 * gets /api/admin and still gets a 404 here.
 *
 * EVERYTHING BELOW IS DERIVED FROM CLERK, and that is the honest boundary of
 * what this can show. Study progress lives in each person's localStorage and
 * is never sent anywhere, so "who is actually doing the problems" is not a
 * question this endpoint can answer — only "who has an account, how they made
 * it, and when they last came back". Inventing engagement numbers out of
 * sign-in timestamps would be worse than not having them.
 */

const DAY = 86_400_000

/** A day bucket, in UTC, so the series does not shift with the reader's clock. */
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export default secure(
  {
    name: 'insights',
    methods: ['GET'],
    auth: 'super',
    rateLimit: { limit: 20 },
    userRateLimit: { limit: 30 },
  },
  async (_req, res) => {
    const list = await clerk().users.getUserList({ limit: 500, orderBy: '-created_at' })
    const now = Date.now()

    const people = list.data.map((u) => {
      const primary = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
      /*
       * How the account was made. An external account means an OAuth provider
       * (Google here); a password means the email form. Both can be true if
       * someone added a password later, so the provider wins for labelling —
       * it is how they actually got in the door.
       */
      const provider = u.externalAccounts[0]?.provider ?? null
      const lastActive = u.lastActiveAt ?? u.lastSignInAt ?? null

      return {
        id: u.id,
        email: primary?.emailAddress ?? '—',
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
        avatarUrl: u.hasImage ? u.imageUrl : null,
        createdAt: new Date(u.createdAt).toISOString(),
        lastSignInAt: u.lastSignInAt ? new Date(u.lastSignInAt).toISOString() : null,
        lastActiveAt: lastActive ? new Date(lastActive).toISOString() : null,
        signedUpWith: provider ? provider.replace(/^oauth_/, '') : u.passwordEnabled ? 'email' : '—',
        emailVerified: primary?.verification?.status === 'verified',
        twoFactor: u.twoFactorEnabled,
        banned: u.banned,
        locked: u.locked,
        /** Days between signing up and the last sign of life. 0 = never returned. */
        daysActive: lastActive ? Math.max(0, Math.round((lastActive - u.createdAt) / DAY)) : 0,
        /** True when the account was made and never used again. */
        neverReturned: !lastActive || lastActive - u.createdAt < 5 * 60_000,
      }
    })

    const since = (days: number) => now - days * DAY
    const signedUpSince = (days: number) =>
      people.filter((p) => Date.parse(p.createdAt) >= since(days)).length
    const activeSince = (days: number) =>
      people.filter((p) => p.lastActiveAt && Date.parse(p.lastActiveAt) >= since(days)).length

    /*
     * Thirty day-buckets, oldest first, including the empty days — a signup
     * chart that silently omits the days nobody joined flatters itself.
     */
    const series: { day: string; signups: number }[] = []
    for (let i = 29; i >= 0; i--) {
      series.push({ day: dayKey(now - i * DAY), signups: 0 })
    }
    const index = new Map(series.map((point, i) => [point.day, i]))
    for (const p of people) {
      const slot = index.get(dayKey(Date.parse(p.createdAt)))
      if (slot !== undefined) series[slot].signups++
    }

    const byMethod: Record<string, number> = {}
    for (const p of people) byMethod[p.signedUpWith] = (byMethod[p.signedUpWith] ?? 0) + 1

    const thisWeek = signedUpSince(7)
    const lastWeek =
      people.filter((p) => {
        const at = Date.parse(p.createdAt)
        return at >= since(14) && at < since(7)
      }).length

    res.status(200).json({
      generatedAt: new Date().toISOString(),
      totals: {
        signedUp: people.length,
        activeToday: activeSince(1),
        active7d: activeSince(7),
        active30d: activeSince(30),
        signedUp7d: thisWeek,
        signedUp30d: signedUpSince(30),
        /*
         * Percentage change week on week. Null rather than 0 or Infinity when
         * last week was empty: "up 100%" from a base of nobody is a number that
         * reads like a fact and is not one.
         */
        weekOverWeekPct: lastWeek === 0 ? null : Math.round(((thisWeek - lastWeek) / lastWeek) * 100),
        verified: people.filter((p) => p.emailVerified).length,
        twoFactor: people.filter((p) => p.twoFactor).length,
        neverReturned: people.filter((p) => p.neverReturned).length,
        suspended: people.filter((p) => p.banned || p.locked).length,
      },
      byMethod,
      series,
      people,
    })
  },
)
