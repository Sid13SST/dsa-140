import { createClerkClient, verifyToken } from '@clerk/backend'
import {
  assertRecentAuth,
  assertSessionClaims,
  ClaimError,
  parseAuthorizedParties,
  parseBearer,
} from './claims.mjs'
import type { SessionClaims } from './claims.mjs'
import { HttpError } from './errors.js'

/**
 * Server-side Clerk access, and the only place a caller's identity is decided.
 *
 * CLERK_SECRET_KEY must never be prefixed with VITE_ — anything so prefixed is
 * compiled into the browser bundle. This key can read and modify every user in
 * the instance, including the paid flag, so it belongs only in the host's
 * environment variables.
 *
 * The chain a request has to survive, in order:
 *
 *   1. A well-formed `Authorization: Bearer <jwt>` header. Cookies are never
 *      read, which is what makes this API immune to CSRF by construction: a
 *      cross-site form post cannot attach a header.
 *   2. RS256 signature verified against the instance's JWKS (Clerk's
 *      verifyToken), with the authorized parties and clock skew pinned.
 *   3. Our own claim policy — issuer, subject, session, freshness, azp,
 *      session status. See claims.mjs; it is pure and it is tested.
 *   4. The live user record: banned, locked, and unverified-email accounts are
 *      turned away even while holding a technically valid token.
 *   5. For admin: the session is confirmed still active with Clerk, and the
 *      first factor must have been proved recently.
 *
 * Steps 4 and 5 cost a round trip to Clerk. That is the deliberate trade: they
 * are the only steps that can react to something that happened AFTER the token
 * was minted, which is exactly when it matters.
 */

function secretKey(): string {
  const key = process.env.CLERK_SECRET_KEY
  if (!key) throw new HttpError(500, 'Authentication is not configured on this server', 'no_secret')
  return key
}

/**
 * One client per warm instance.
 *
 * createClerkClient sets up an HTTP client and a JWKS cache; building a new one
 * per request threw both away every time and re-fetched the keys.
 */
let cached: ReturnType<typeof createClerkClient> | null = null
export function clerk() {
  if (!cached) cached = createClerkClient({ secretKey: secretKey() })
  return cached
}

/**
 * Origins whose tokens this API accepts, e.g.
 * `https://dsa140.vercel.app,https://sid13sst.github.io,http://localhost:5173`.
 *
 * Unset means the check cannot run — see the note in claims.mjs on why that
 * fails open rather than taking the site down. It is logged every time so the
 * gap is visible in the function logs rather than only in this comment.
 */
let warnedAboutParties = false
export function authorizedParties(): string[] {
  const parties = parseAuthorizedParties(process.env.CLERK_AUTHORIZED_PARTIES)
  if (parties.length === 0 && !warnedAboutParties) {
    warnedAboutParties = true
    console.warn(
      JSON.stringify({
        code: 'no_authorized_parties',
        message:
          'CLERK_AUTHORIZED_PARTIES is not set, so tokens are accepted from any origin on this ' +
          'Clerk instance. Set it to the comma-separated origins of your deployments.',
      }),
    )
  }
  return parties
}

/** Whose email gets the admin console. Checked HERE, not taken from the client. */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'siddhant.prasad8@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export const isAdminEmail = (email: string | null | undefined): boolean =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase())

export interface AuthedUser {
  id: string
  email: string
  isAdmin: boolean
  /** The session this token came from — the unit Clerk can revoke. */
  sessionId: string
  /** How old the presented token was, in ms. Logged, to make replay visible. */
  tokenAgeMs: number
}

/** Everything the caller is ever told about an auth failure. */
const UNAUTHENTICATED = 'Not signed in'

/**
 * Verify the caller's session token and load the user.
 *
 * Throws HttpError(401) for anything that fails, with the specific reason on
 * the error's `code` for the log and never in the message. A caller who can
 * tell "expired" from "wrong origin" from "no such user" can map the surface;
 * a caller who only ever sees "Not signed in" cannot.
 */
export async function requireUser(
  req: { headers: Record<string, unknown> },
  { requireAdmin = false }: { requireAdmin?: boolean } = {},
): Promise<AuthedUser> {
  const header = req.headers['authorization'] ?? req.headers['Authorization']
  const token = parseBearer(header)
  if (!token) throw new HttpError(401, UNAUTHENTICATED, 'no_bearer')

  const parties = authorizedParties()

  let claims: SessionClaims
  try {
    claims = (await verifyToken(token, {
      secretKey: secretKey(),
      // Checked by Clerk AND again in our policy: this one rejects the token
      // before a network call, ours rejects it if the library's behaviour ever
      // changes underneath us.
      ...(parties.length > 0 ? { authorizedParties: parties } : {}),
      // Enough for honest clock drift between hosts, not enough to be useful
      // for replaying an expired token.
      clockSkewInMs: 5_000,
    })) as SessionClaims
  } catch (e) {
    // Signature, expiry or JWKS failure. Nothing here is safe to echo back.
    console.warn(JSON.stringify({ code: 'verify_failed', detail: String(e) }))
    throw new HttpError(401, UNAUTHENTICATED, 'verify_failed')
  }

  let verified
  try {
    verified = assertSessionClaims(claims, {
      authorizedParties: parties,
      issuer: process.env.CLERK_ISSUER || null,
    })
  } catch (e) {
    const code = e instanceof ClaimError ? e.code : 'claims_failed'
    throw new HttpError(401, UNAUTHENTICATED, code)
  }

  /*
   * The admin surface is held to a higher standard, and both extra checks cost
   * a round trip, so they run only for admin:
   *
   *   - the session must still be ACTIVE at Clerk. A session revoked from
   *     another device is dead the moment it is revoked, rather than at the
   *     end of the current token's minute.
   *   - the first factor must have been proved recently, so a session left
   *     open on an unattended machine cannot be walked into.
   */
  if (requireAdmin) {
    try {
      assertRecentAuth(claims, { maxAgeMinutes: 60 })
    } catch (e) {
      const code = e instanceof ClaimError ? e.code : 'stale_auth'
      throw new HttpError(401, 'Sign in again to use the admin console', code)
    }

    const session = await clerk()
      .sessions.getSession(verified.sessionId)
      .catch(() => null)
    if (!session || session.status !== 'active') {
      throw new HttpError(401, UNAUTHENTICATED, 'session_not_active')
    }
    if (session.userId !== verified.userId) {
      // The token's subject and the session's owner disagree. This should be
      // impossible; treat it as hostile rather than as a curiosity.
      console.error(
        JSON.stringify({ code: 'session_user_mismatch', sid: verified.sessionId }),
      )
      throw new HttpError(401, UNAUTHENTICATED, 'session_user_mismatch')
    }
  }

  const user = await clerk()
    .users.getUser(verified.userId)
    .catch(() => null)
  if (!user) throw new HttpError(401, UNAUTHENTICATED, 'no_such_user')

  // A ban or a lockout has to bite immediately, not when the last token
  // expires. Both are set by Clerk (lockout comes from failed-attempt
  // protection), and neither is visible in the token itself.
  if (user.banned) throw new HttpError(403, 'This account is suspended', 'banned')
  if (user.locked) throw new HttpError(403, 'This account is temporarily locked', 'locked')

  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
  const email = primary?.emailAddress ?? ''

  /*
   * The email is read from Clerk, never from the token's claims, because the
   * admin check hangs off it and a claim is only as trustworthy as whatever
   * was minted into it. It must also be VERIFIED: an unverified address is a
   * string someone typed, and ADMIN_EMAILS compares against exactly that.
   */
  const emailVerified = primary?.verification?.status === 'verified'
  if (!emailVerified) {
    throw new HttpError(403, 'Verify your email address to continue', 'email_unverified')
  }

  return {
    id: user.id,
    email,
    isAdmin: isAdminEmail(email),
    sessionId: verified.sessionId,
    tokenAgeMs: Date.now() - verified.issuedAt,
  }
}
