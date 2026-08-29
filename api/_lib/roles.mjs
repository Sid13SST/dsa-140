/**
 * Who is who. Two levels, deliberately not one.
 *
 *   admin        — anyone on ADMIN_EMAILS. Sees the operations console at
 *                  /admin: accounts and payment attempts.
 *   super admin  — exactly ONE address, SUPER_ADMIN_EMAIL. Sees everything an
 *                  admin sees, plus the super-admin dashboard at /super.
 *
 * The distinction exists so that ADMIN_EMAILS can grow later — a collaborator,
 * a contractor, someone covering while you are away — without that also handing
 * out the view of who signed up and how the product is being used. A role that
 * can only be granted by adding a name to a list is a role that will eventually
 * be granted by accident.
 *
 * Pure, like claims.mjs, and for the same reason: scripts/check-auth.mjs runs
 * these against the ways an email comparison usually goes wrong — case, spaces,
 * unicode lookalikes, an empty string matching an unset variable.
 */

/**
 * Normalise an address for COMPARISON only. Never for display, never for
 * sending mail: this is lossy on purpose.
 *
 * NFKC first, because `siddhant.prasad8@gmail.com` and a version of it written
 * with fullwidth characters are different strings that a person cannot tell
 * apart. Lowercasing after that, because the domain is case-insensitive and no
 * real provider treats the local part as case-sensitive.
 */
export function normaliseEmail(email) {
  if (typeof email !== 'string') return ''
  return email.normalize('NFKC').trim().toLowerCase()
}

/** Parse a comma-separated address list from the environment. */
export function parseEmailList(raw) {
  if (typeof raw !== 'string') return []
  return raw.split(',').map(normaliseEmail).filter(Boolean)
}

/**
 * Is this address the single super admin?
 *
 * Both sides are normalised, and an empty address can never match — otherwise a
 * user with no email and an unset SUPER_ADMIN_EMAIL would compare equal and
 * quietly become the super admin.
 */
export function isSuperAdmin(email, configured) {
  const who = normaliseEmail(email)
  const superAdmin = normaliseEmail(configured)
  if (!who || !superAdmin) return false
  return who === superAdmin
}

/** Is this address on the admin list? The super admin always counts. */
export function isAdmin(email, adminList, superAdminEmail) {
  const who = normaliseEmail(email)
  if (!who) return false
  if (isSuperAdmin(who, superAdminEmail)) return true
  return parseEmailList(adminList).includes(who)
}
