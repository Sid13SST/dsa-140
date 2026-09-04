/**
 * Clerk configuration.
 *
 * The publishable key is PUBLIC by design — it is compiled into the bundle and
 * identifies the instance; it grants nothing. The secret key never appears on
 * this side and lives only in the server environment.
 *
 * Why Clerk and not Supabase: not security — the ceiling is the same, and
 * Supabase Auth was never the weak part. It is setup cost. Supabase needed a
 * SQL schema, RLS policies, a Google Cloud OAuth client and three dashboard
 * settings before a single person could sign in, and that stalled three times.
 * Clerk needs one key and a provider toggle.
 */
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined

/** Whether auth can run at all. Missing config is a normal state, not a crash. */
export const clerkConfigured = Boolean(CLERK_PUBLISHABLE_KEY)

/**
 * Who gets the admin console.
 *
 * Not secret — it is an email address, and it ships in the bundle either way.
 * This value decides what the UI SHOWS. What the admin endpoint actually
 * SERVES is decided by the same check running again on the server, because a
 * constant in a bundle is editable by whoever is reading it.
 */
export const ADMIN_EMAILS = ['siddhant.prasad8@gmail.com']

export const isAdminEmail = (email: string | null | undefined): boolean =>
  !!email && ADMIN_EMAILS.some((a) => a.toLowerCase() === email.toLowerCase())

/**
 * The single super admin.
 *
 * Same caveat as above and more so: this decides whether the /super link is
 * DRAWN. /api/insights decides what is served, against SUPER_ADMIN_EMAIL in
 * the server's environment, and answers 404 to everyone else — editing this
 * constant in devtools gets you an empty page and a 404 in the network tab.
 */
export const SUPER_ADMIN_EMAIL = 'siddhant.prasad8@gmail.com'

export const isSuperAdminEmail = (email: string | null | undefined): boolean =>
  !!email && email.normalize('NFKC').trim().toLowerCase() === SUPER_ADMIN_EMAIL
