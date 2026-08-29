/** Types for roles.mjs — see claims.d.mts on why these are hand-written. */

/** Lossy normalisation for comparison only: NFKC, trimmed, lowercased. */
export declare function normaliseEmail(email: unknown): string

/** Parse a comma-separated address list from the environment. */
export declare function parseEmailList(raw: unknown): string[]

/** True only for the single configured super admin. Empty never matches. */
export declare function isSuperAdmin(email: unknown, configured: unknown): boolean

/** True for the admin list, and always true for the super admin. */
export declare function isAdmin(
  email: unknown,
  adminList: unknown,
  superAdminEmail: unknown,
): boolean
