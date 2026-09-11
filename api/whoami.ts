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
      /*
       * How this server is configured — for admins only, and deliberately so.
       *
       * `authorizedPartiesConfigured` is the sharp one: false means the azp
       * check cannot run, so a token minted for another application on the same
       * Clerk instance would be accepted here. That is a useful thing for the
       * owner to see and precisely the wrong thing to hand to a stranger who
       * asked politely. `adminListConfigured` is milder but has no audience
       * outside the person who can change it.
       *
       * Losing it costs the diagnostic nothing. A non-admin who is nevertheless
       * signed in as the owner's address already has their answer from the two
       * fields above: right address, `isAdmin: false` — so the server's list is
       * pointed at something else.
       */
      ...(user.isAdmin
        ? {
            server: {
              adminListConfigured,
              authorizedPartiesConfigured: Boolean(
                (process.env.CLERK_AUTHORIZED_PARTIES ?? '').trim(),
              ),
            },
          }
        : {}),
      /*
       * One line, said plainly, so someone stuck on this can read it and know
       * what to do next.
       *
       * For a non-admin it says only who they are signed in as. It used to name
       * the admin list and tell them to add themselves to it, which is advice
       * no ordinary user can act on and which announces that an admin console
       * exists — undoing the reason /api/admin answers 404 rather than 403. The
       * pages that DO need that detail compose it themselves, and only show it
       * to someone who asked for /admin by name.
       */
      verdict: user.isSuperAdmin
        ? 'This account reaches both /admin and /super.'
        : user.isAdmin
          ? 'This account reaches /admin. /super is restricted to the single super-admin address.'
          : `Signed in as ${user.email}.`,
    })
  },
)
