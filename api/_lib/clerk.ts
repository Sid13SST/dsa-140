import { createClerkClient, verifyToken } from '@clerk/backend'

/**
 * Server-side Clerk access.
 *
 * CLERK_SECRET_KEY must never be prefixed with VITE_ — anything so prefixed is
 * compiled into the browser bundle. This key can read and modify every user in
 * the instance, including the paid flag, so it belongs only in the host's
 * environment variables.
 */
function secretKey(): string {
  const key = process.env.CLERK_SECRET_KEY
  if (!key) throw new HttpError(500, 'CLERK_SECRET_KEY is not set on the server')
  return key
}

export const clerk = () => createClerkClient({ secretKey: secretKey() })

/** Whose email gets the admin console. Checked HERE, not taken from the client. */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'siddhant.prasad8@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export const isAdminEmail = (email: string | null | undefined): boolean =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase())

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export interface AuthedUser {
  id: string
  email: string
  isAdmin: boolean
}

/**
 * Verify the caller's session token and load the user.
 *
 * verifyToken checks the signature against Clerk's published keys and the
 * expiry, so a forged or stale token never reaches a handler. The email is then
 * read from Clerk rather than from the token's claims, because the admin check
 * hangs off it and claims are only as trustworthy as what was minted into them.
 */
export async function requireUser(req: {
  headers: Record<string, unknown>
}): Promise<AuthedUser> {
  const header = String(req.headers['authorization'] ?? req.headers['Authorization'] ?? '')
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw new HttpError(401, 'Not signed in')

  let sub: string
  try {
    const claims = await verifyToken(token, { secretKey: secretKey() })
    sub = String(claims.sub)
  } catch {
    throw new HttpError(401, 'Session is not valid')
  }

  const user = await clerk().users.getUser(sub)
  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ?? ''

  return { id: user.id, email, isAdmin: isAdminEmail(email) }
}

/** Uniform error handling, so a thrown HttpError never leaks a stack trace. */
export function fail(res: { status: (n: number) => { json: (b: unknown) => void } }, e: unknown) {
  if (e instanceof HttpError) {
    res.status(e.status).json({ error: e.message })
    return
  }
  console.error(e)
  res.status(500).json({ error: 'Something went wrong. Please try again.' })
}
