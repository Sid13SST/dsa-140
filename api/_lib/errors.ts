/**
 * How this API fails.
 *
 * One rule, applied everywhere: the CLIENT gets a status and a sentence it can
 * act on; the LOG gets everything else. An error message that names the reason
 * a token was rejected — expired, wrong origin, no such user — is a probing
 * oracle, so the reason goes to the log under a request id and the caller is
 * told only that they are not signed in.
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Short machine-readable reason, for the log only. Never sent. */
    public code = 'error',
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

interface Responder {
  status: (n: number) => { json: (b: unknown) => void }
  setHeader?: (name: string, value: string) => void
}

/**
 * Headers every response from this API carries, whether it succeeded or not.
 *
 * `no-store` matters more than it looks: these responses are per-user, and a
 * shared cache holding one is the kind of bug that hands a stranger someone
 * else's admin list. `Vary: Authorization` says the same thing to any cache
 * that ignores the first header.
 */
export function applySecurityHeaders(res: Responder) {
  if (!res.setHeader) return
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.setHeader('Vary', 'Authorization, Origin')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  // Nothing here is meant to be framed, and none of it is a document anyway.
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
}

/** Uniform error handling, so a thrown error never leaks a stack trace. */
export function fail(res: Responder, e: unknown, requestId = '') {
  applySecurityHeaders(res)

  if (e instanceof HttpError) {
    // 4xx are the caller's problem and are logged thin; 5xx are ours.
    console.warn(
      JSON.stringify({ requestId, status: e.status, code: e.code, message: e.message }),
    )
    res.status(e.status).json({ error: e.message, requestId })
    return
  }

  console.error(JSON.stringify({ requestId, status: 500, code: 'unhandled' }), e)
  res.status(500).json({ error: 'Something went wrong. Please try again.', requestId })
}
