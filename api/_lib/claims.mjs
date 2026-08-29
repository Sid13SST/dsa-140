/**
 * The session-token policy: what a Clerk JWT must look like to be accepted.
 *
 * Deliberately PURE — no network, no clock of its own, no environment. Every
 * input is an argument, which is what makes it testable: scripts/check-auth.mjs
 * runs a table of forged, expired, replayed and mis-issued tokens through these
 * functions on every build. A security rule nobody can execute is a security
 * rule nobody can check.
 *
 * This runs AFTER Clerk's verifyToken has checked the RS256 signature against
 * the instance's JWKS, so nothing here is load-bearing for authenticity — a
 * token that reaches these functions is already cryptographically ours. What
 * they add is defence against what a valid signature does not cover: a token
 * minted for a different application on the same instance, one replayed long
 * after it was issued, one whose session is no longer active, and one from an
 * instance that is not ours at all.
 *
 * .mjs rather than .ts so the check script runs it under bare node with no
 * build step; claims.d.mts types it for the handlers.
 */

/** Everything here throws this: a `code` for the log, nothing for the caller. */
export class ClaimError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ClaimError'
    this.code = code
  }
}

/**
 * Pull the bearer token out of an Authorization header.
 *
 * Strict on purpose. The scheme is matched case-insensitively because RFC 6750
 * says it is case-insensitive, but everything after it must be one non-empty
 * token of the JWT alphabet: no spaces, no second credential, and no empty
 * string that would sail through a truthiness check further down.
 */
export function parseBearer(headerValue) {
  if (typeof headerValue !== 'string') return null
  const m = /^Bearer +([A-Za-z0-9._~+/-]+=*)$/i.exec(headerValue.trim())
  if (!m) return null
  const token = m[1]
  // A JWT is exactly three dot-separated segments. Anything else is not one,
  // and rejecting it here keeps malformed input away from the verifier.
  if (token.split('.').length !== 3) return null
  // Far beyond any real Clerk session token. Past this it is someone probing
  // for a parser that allocates before it validates.
  if (token.length > 8192) return null
  return token
}

/**
 * A Clerk DEVELOPMENT issuer: `https://<slug>.clerk.accounts.dev`.
 *
 * Suffix-matched, never prefix-matched. The obvious rule — "the host starts
 * with clerk." — accepts `clerk.accounts.dev.evil.com`, which is a host anyone
 * can register, and the check-auth suite catches exactly that case.
 *
 * Production instances issue from `clerk.<your-domain>`, which cannot be
 * recognised by shape without knowing the domain. Those must be named in
 * CLERK_ISSUER instead, and assertSessionClaims treats that value as
 * authoritative when it is set.
 */
export function isClerkIssuer(iss) {
  if (typeof iss !== 'string') return false
  let url
  try {
    url = new URL(iss)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  return url.hostname.endsWith('.clerk.accounts.dev')
}

/**
 * The whole policy, in one place.
 *
 * @param claims   the verified JWT payload
 * @param options  now, clockSkewMs, maxTokenAgeMs, authorizedParties, issuer
 */
export function assertSessionClaims(claims, options = {}) {
  const {
    now = Date.now(),
    clockSkewMs = 5_000,
    /*
     * Clerk mints session tokens with a 60-second lifetime and the client
     * refreshes them continuously. Anything materially older than that window
     * has been sitting somewhere it should not have been.
     */
    maxTokenAgeMs = 5 * 60_000,
    authorizedParties = [],
    issuer = null,
  } = options

  if (!claims || typeof claims !== 'object') {
    throw new ClaimError('malformed', 'Token payload is not an object')
  }

  const { sub, sid, iss, exp, nbf, iat, azp, sts } = claims

  // Subject and session. `sub` is who you are; `sid` is which sign-in said so,
  // and without it a token cannot be tied back to a revocable session at all.
  if (typeof sub !== 'string' || !sub.startsWith('user_')) {
    throw new ClaimError('bad_subject', 'Token has no usable subject')
  }
  if (typeof sid !== 'string' || !sid.startsWith('sess_')) {
    throw new ClaimError('bad_session', 'Token has no usable session id')
  }

  /*
   * Issuer. The signature already binds the token to our instance's keys, so
   * this is defence in depth: it catches a token from a different Clerk
   * instance and any future misconfiguration of the networkless jwtKey path.
   *
   * CLERK_ISSUER, when set, is authoritative and exact — that is the only way
   * to accept a production instance on a custom domain, because `clerk.<any
   * domain at all>` is not a shape that can be trusted on sight. Unset, only
   * development issuers are recognised. This one fails CLOSED, unlike the azp
   * check: a wrong issuer means the token is not from the instance we think we
   * are talking to, which is not a configuration gap to shrug at.
   */
  if (issuer) {
    if (iss !== issuer) throw new ClaimError('wrong_issuer', 'Issuer is not this instance')
  } else if (!isClerkIssuer(iss)) {
    throw new ClaimError('bad_issuer', 'Issuer is not a known Clerk instance')
  }

  // Timestamps must be finite numbers, not merely truthy: 0, NaN and "1700000"
  // all have to fail closed rather than compare their way through.
  for (const [name, value] of [
    ['exp', exp],
    ['nbf', nbf],
    ['iat', iat],
  ]) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new ClaimError('bad_time', `Claim ${name} is not a number`)
    }
  }

  const expMs = exp * 1000
  const nbfMs = nbf * 1000
  const iatMs = iat * 1000

  if (nbfMs > expMs) throw new ClaimError('bad_time', 'Token is valid only after it expires')
  if (now >= expMs + clockSkewMs) throw new ClaimError('expired', 'Token has expired')
  if (now + clockSkewMs < nbfMs) throw new ClaimError('not_yet_valid', 'Token is not valid yet')
  if (iatMs > now + clockSkewMs) {
    throw new ClaimError('issued_in_future', 'Token was issued in the future')
  }

  /*
   * Freshness, independent of exp. A stolen token is at its most useful
   * immediately, and one presented long after it was minted means something is
   * replaying it. Kept separate from exp so that a token lifetime widened in
   * the dashboard cannot silently widen this window too.
   */
  if (now - iatMs > maxTokenAgeMs + clockSkewMs) {
    throw new ClaimError('stale', 'Token is older than this API accepts')
  }

  /*
   * Authorized party — the origin the token was minted for. This is what stops
   * a token issued to another application on the same Clerk instance being
   * spent here. Enforced only when origins are configured: an empty list means
   * the deployment has not set CLERK_AUTHORIZED_PARTIES, and rejecting every
   * request on a missing variable would take the site down rather than secure
   * it. api/_lib/clerk.ts logs loudly while it is unset.
   */
  if (authorizedParties.length > 0) {
    if (typeof azp !== 'string' || !authorizedParties.includes(azp)) {
      throw new ClaimError('bad_azp', 'Token was minted for a different origin')
    }
  }

  // Session status, when the instance sends it. Only active counts — pending
  // means a factor is still outstanding, which is not signed in.
  if (typeof sts === 'string' && sts !== 'active') {
    throw new ClaimError('inactive_session', `Session status is ${sts}`)
  }

  return { userId: sub, sessionId: sid, issuedAt: iatMs, expiresAt: expMs, azp: azp ?? null }
}

/**
 * Step-up check, for the admin console.
 *
 * `fva` is Clerk's factor-verification age: [minutes since first factor,
 * minutes since second factor], where -1 means never. Requiring a recent first
 * factor means a session someone walked away from cannot be used to stroll
 * into the admin surface hours later — whoever is there proved themselves
 * recently.
 *
 * Skipped when the instance does not send the claim: failing closed on an
 * experimental claim would lock the admin out of their own console.
 */
export function assertRecentAuth(claims, { maxAgeMinutes = 60, requireSecondFactor = false } = {}) {
  const fva = claims?.fva
  if (!Array.isArray(fva) || fva.length < 2) return { enforced: false }

  const [firstFactorAge, secondFactorAge] = fva
  if (typeof firstFactorAge !== 'number' || firstFactorAge < 0) {
    throw new ClaimError('no_first_factor', 'No first factor on this session')
  }
  if (firstFactorAge > maxAgeMinutes) {
    throw new ClaimError('stale_auth', 'Sign in again to use this surface')
  }
  if (requireSecondFactor && (typeof secondFactorAge !== 'number' || secondFactorAge < 0)) {
    throw new ClaimError('no_second_factor', 'This surface requires multi-factor authentication')
  }
  return { enforced: true, firstFactorAge, secondFactorAge }
}

/** Origins allowed to mint tokens for this API, from `CLERK_AUTHORIZED_PARTIES`. */
export function parseAuthorizedParties(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return []
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}
