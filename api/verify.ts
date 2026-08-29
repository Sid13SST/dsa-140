import crypto from 'node:crypto'
import { RAZORPAY_KEY_SECRET } from './_lib/env'
import { HttpError } from './_lib/errors'
import { secure } from './_lib/http'
import { findUserByOrder, settlePayment } from './_lib/payments'

/**
 * POST /api/verify — confirm a payment the browser just completed.
 *
 * Razorpay's checkout hands the browser three values. Any of them could be
 * forged by whoever controls the browser, so the ONLY thing that makes this
 * trustworthy is recomputing the signature here with the key secret:
 *
 *     HMAC_SHA256(order_id + "|" + payment_id, key_secret) === signature
 *
 * The secret never leaves the server, so a signature cannot be manufactured
 * client-side. The comparison is timing-safe because a naive === leaks how much
 * of a guessed signature was correct.
 *
 * This endpoint is the FAST path, for the user staring at a spinner. The
 * webhook is the RELIABLE path; if the user closes the tab mid-payment, the
 * webhook still grants access.
 *
 * The per-user limit is what turns the signature check into a wall rather than
 * a puzzle: without it, a caller could sit here grinding guesses at a 64-hex
 * signature. With it, they get a handful of attempts a minute forever.
 */
export default secure(
  {
    name: 'verify',
    methods: ['POST'],
    auth: 'user',
    requireJson: true,
    rateLimit: { limit: 20 },
    userRateLimit: { limit: 10 },
  },
  async (req, res, { user }) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {}
    if (
      typeof razorpay_order_id !== 'string' ||
      typeof razorpay_payment_id !== 'string' ||
      typeof razorpay_signature !== 'string'
    ) {
      throw new HttpError(400, 'Incomplete payment details', 'bad_payload')
    }

    const expected = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET())
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(String(razorpay_signature), 'utf8')
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b)

    if (!ok) {
      const owner = await findUserByOrder(razorpay_order_id)
      if (owner) await settlePayment(owner, razorpay_order_id, { status: 'failed' }, false)
      throw new HttpError(400, 'That payment could not be verified', 'bad_signature')
    }

    // The order must belong to the caller. Without this check a signed-in user
    // could replay somebody else's valid signature and be marked paid.
    const owner = await findUserByOrder(razorpay_order_id)
    if (!owner) throw new HttpError(404, 'That order is not recognised', 'unknown_order')
    if (owner !== user.id) {
      throw new HttpError(403, 'That order belongs to someone else', 'order_not_yours')
    }

    await settlePayment(
      user.id,
      razorpay_order_id,
      { status: 'paid', razorpay_payment_id, confirmed_by: 'verify' },
      true,
    )

    res.status(200).json({ ok: true })
  },
)
