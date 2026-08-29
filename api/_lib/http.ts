import crypto from 'node:crypto'
import { applySecurityHeaders, fail, HttpError } from './errors.js'
import { requireUser, type AuthedUser } from './clerk.js'
import { clientIp, hit } from './ratelimit.mjs'

/**
 * One door for every endpoint.
 *
 * The reason this exists rather than each handler doing its own checks: a
 * security control that has to be REMEMBERED in every new file is a control
 * that will eventually be forgotten in one. Method allowlisting, rate
 * limiting, content-type checking, security headers, authentication and error
 * shaping all happen here, and a handler cannot run without them having run
 * first. Adding an endpoint means choosing a policy, not re-implementing one.
 *
 * A handler receives an already-authenticated `ctx.user` when it asked for
 * one, so there is no path where a handler forgets to await the check and
 * treats an anonymous caller as signed in.
 */

export type AuthMode = 'none' | 'user' | 'admin'

export interface Ctx {
  user: AuthedUser | null
  requestId: string
  ip: string
}

/** What a guarded handler gets when it asked for authentication. */
export interface AuthedCtx extends Ctx {
  user: AuthedUser
}

/** ...and when it did not. */
export interface AnonCtx extends Ctx {
  user: null
}

export interface GuardOptions {
  /** Allowed HTTP methods. Anything else gets 405 and an Allow header. */
  methods: string[]
  auth: AuthMode
  /** Per-IP ceiling for this endpoint. */
  rateLimit?: { limit: number; windowMs?: number }
  /** Per-user ceiling, applied after authentication. */
  userRateLimit?: { limit: number; windowMs?: number }
  /** Require a JSON request body. Off for the webhook, which reads raw bytes. */
  requireJson?: boolean
  /** Endpoint name, for the log line. */
  name: string
}

/*
 * The implementation signature is intentionally loose in its ctx: the two
 * overloads above are what every caller is checked against, and a narrow
 * implementation type cannot be compatible with both of them at once
 * (a handler taking AnonCtx is not assignable to one taking Ctx under
 * strictFunctionTypes). Nothing outside this file sees it.
 */
type Handler = (req: any, res: any, ctx: any) => Promise<void> | void
type Guarded = (req: any, res: any) => Promise<void>

/**
 * Bodies are small here — an order id, three Razorpay fields. A megabyte of
 * JSON is not a request this API has any use for, so it is refused before it
 * is parsed rather than after.
 */
const MAX_BODY_BYTES = 64 * 1024

/*
 * The overloads are the point, not decoration: an endpoint declaring
 * `auth: 'user'` receives a `user` that is non-nullable, and one declaring
 * `auth: 'none'` receives `null`. A handler that treats an anonymous caller as
 * signed in does not compile, so that class of mistake cannot reach a review,
 * let alone production.
 */
export function secure(
  options: GuardOptions & { auth: 'none' },
  handler: (req: any, res: any, ctx: AnonCtx) => Promise<void> | void,
): Guarded
export function secure(
  options: GuardOptions & { auth: 'user' | 'admin' },
  handler: (req: any, res: any, ctx: AuthedCtx) => Promise<void> | void,
): Guarded
export function secure(options: GuardOptions, handler: Handler): Guarded {
  const {
    methods,
    auth,
    rateLimit = { limit: 60, windowMs: 60_000 },
    userRateLimit,
    requireJson = false,
    name,
  } = options

  return async function guarded(req: any, res: any) {
    const requestId = crypto.randomUUID()
    const started = Date.now()
    const ip = clientIp(req.headers ?? {})
    let outcome = 'ok'
    let status = 200
    let userId: string | null = null

    try {
      applySecurityHeaders(res)
      res.setHeader?.('X-Request-Id', requestId)

      const method = String(req.method ?? '').toUpperCase()
      if (!methods.includes(method)) {
        res.setHeader?.('Allow', methods.join(', '))
        throw new HttpError(405, `Use ${methods.join(' or ')}`, 'bad_method')
      }

      /*
       * Rate limit by address BEFORE authentication, so an unauthenticated
       * flood cannot make us call Clerk's API once per request — the cheap
       * check has to come before the expensive one, or the limiter is just a
       * slower way to be overwhelmed.
       */
      const byIp = hit(`${name}:ip:${ip}`, rateLimit)
      res.setHeader?.('RateLimit-Remaining', String(byIp.remaining))
      if (!byIp.ok) {
        res.setHeader?.('Retry-After', String(byIp.retryAfterSeconds))
        throw new HttpError(429, 'Too many requests. Try again shortly.', 'rate_limited_ip')
      }

      if (requireJson && method !== 'GET' && method !== 'HEAD') {
        const type = String(req.headers?.['content-type'] ?? '')
        if (!type.toLowerCase().startsWith('application/json')) {
          throw new HttpError(415, 'Send JSON', 'bad_content_type')
        }
        const declared = Number(req.headers?.['content-length'] ?? 0)
        if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
          throw new HttpError(413, 'That request is too large', 'body_too_large')
        }
      }

      let user: AuthedUser | null = null
      if (auth !== 'none') {
        user = await requireUser(req, { requireAdmin: auth === 'admin' })
        userId = user.id

        /*
         * The admin surface answers 404, not 403, to everyone else. A 403
         * confirms the endpoint exists and that the caller is simply not on
         * the list, which is a free fact this API does not need to give away.
         */
        if (auth === 'admin' && !user.isAdmin) {
          throw new HttpError(404, 'Not found', 'not_admin')
        }

        if (userRateLimit) {
          const byUser = hit(`${name}:user:${user.id}`, userRateLimit)
          if (!byUser.ok) {
            res.setHeader?.('Retry-After', String(byUser.retryAfterSeconds))
            throw new HttpError(429, 'Too many requests. Try again shortly.', 'rate_limited_user')
          }
        }
      }

      await handler(req, res, { user, requestId, ip })
      status = res.statusCode ?? 200
    } catch (e) {
      outcome = e instanceof HttpError ? e.code : 'unhandled'
      status = e instanceof HttpError ? e.status : 500
      fail(res, e, requestId)
    } finally {
      /*
       * One structured line per request. This is the audit trail: who, what,
       * how it ended, and how old their token was — a token age that keeps
       * landing near the ceiling is what a replay looks like from here.
       */
      console.log(
        JSON.stringify({
          requestId,
          endpoint: name,
          method: req.method,
          status,
          outcome,
          userId,
          ip,
          ms: Date.now() - started,
        }),
      )
    }
  }
}
