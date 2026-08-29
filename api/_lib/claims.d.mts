/**
 * Types for claims.mjs.
 *
 * Hand-written so the policy can stay plain .mjs — scripts/check-auth.mjs runs
 * it under bare node — while the handlers still type-check against it under
 * `npm run check:api`.
 */

/** A Clerk session-token payload, as far as this API cares. */
export interface SessionClaims {
  sub?: unknown
  sid?: unknown
  iss?: unknown
  exp?: unknown
  nbf?: unknown
  iat?: unknown
  azp?: unknown
  sts?: unknown
  /** [minutes since first factor, minutes since second factor]; -1 = never. */
  fva?: unknown
  [claim: string]: unknown
}

export interface VerifiedSession {
  userId: string
  sessionId: string
  /** Epoch ms. */
  issuedAt: number
  expiresAt: number
  azp: string | null
}

export interface ClaimPolicy {
  now?: number
  clockSkewMs?: number
  maxTokenAgeMs?: number
  authorizedParties?: string[]
  issuer?: string | null
}

export declare class ClaimError extends Error {
  constructor(code: string, message: string)
  code: string
}

export declare function parseBearer(headerValue: unknown): string | null
export declare function isClerkIssuer(iss: unknown): boolean
export declare function assertSessionClaims(
  claims: SessionClaims | null | undefined,
  options?: ClaimPolicy,
): VerifiedSession
export declare function assertRecentAuth(
  claims: SessionClaims | null | undefined,
  options?: { maxAgeMinutes?: number; requireSecondFactor?: boolean },
): { enforced: boolean; firstFactorAge?: number; secondFactorAge?: number }
export declare function parseAuthorizedParties(raw: unknown): string[]
