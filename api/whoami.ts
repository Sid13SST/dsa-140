import { secure } from './_lib/http.js'

/**
 * GET /api/whoami — the server's verdict about the caller, and only the caller.
 *
 * This exists because "I am signed in but /admin sends me away" was impossible
 * to diagnose from the outside. The client decides whether to DRAW the admin
 * console from a constant in its own bundle; the server decides whether to
 * SERVE it from environment variables. When those two disagree the user is
 * bounced to the dashboard with no explanation at all, and neither side says
 * why.
 *
 * So this reports every gate that stands between a signed-in user and the admin
 * surfaces, for their own account only:
 *
 *   - which address the session actually belongs to (the usual answer: they
 *     signed in with a different one than they expected)
 *   - whether that address is verified, which requireUser demands
 *   - the server's isAdmin / isSuperAdmin verdict
 *   - whether the server has an admin list configured at all
 *
 * `auth: 'user'` — any signed-in user may ask about themselves. It reveals
 * nothing about anyone else, and it deliberately does NOT echo the configured
 * admin addresses back: a non-admin learning the exact address that would work
 * is a phishing target, so they get a boolean and a count instead.
 */
export default secure(
  {
    name: 'whoami',
    methods: ['GET'],
    auth: 'user',
    rateLimit: { limit: 60 },
    userRateLimit: { limit: 60 },
  },
  async (_req, res, { user }) => {
    const adminListConfigured = Boolean(
      (process.env.ADMIN_EMAILS ?? '').trim() || (process.env.SUPER_ADMIN_EMAIL ?? '').trim(),
    )

    res.status(200).json({
      // requireUser already refused unverified addresses, banned and locked
      // accounts, so reaching this line proves all three passed.
      email: user.email,
      emailVerified: true,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      sessionId: user.sessionId,
      tokenAgeMs: user.tokenAgeMs,
      server: {
        /*
         * Both default to the owner's address when unset, so "not configured"
         * is not the same as "nobody is admin" — it means the defaults are in
         * play. Worth showing, because setting ADMIN_EMAILS to the wrong thing
         * looks identical to leaving it unset until you can see this flag.
         */
        adminListConfigured,
        authorizedPartiesConfigured: Boolean(
          (process.env.CLERK_AUTHORIZED_PARTIES ?? '').trim(),
        ),
      },
      /*
       * Said plainly, because the whole point is that someone stuck on this can
       * read one line and know what to do next.
       */
      verdict: user.isSuperAdmin
        ? 'This account reaches both /admin and /super.'
        : user.isAdmin
          ? 'This account reaches /admin. /super is restricted to the single super-admin address.'
          : `Signed in as ${user.email}, which is not on the server's admin list. Sign in with the admin address, or add this one to ADMIN_EMAILS.`,
    })
  },
)
