import crypto from 'node:crypto'
import { RAZORPAY_WEBHOOK_SECRET } from './_lib/env'
import { HttpError } from './_lib/errors'
import { secure } from './_lib/http'
import { findUserByOrder, settlePayment } from './_lib/payments'

/**
 * POST /api/webhook — Razorpay's server-to-server notification.
 *
 * This is the path that actually decides who has access. The browser round-trip
 * in verify.ts is a convenience; a user who pays and then closes the tab, loses
 * signal, or has a flaky network never reaches it. Razorpay retries this
 * endpoint until it gets a 2xx, so it is the one that must be right.
 *
 * The signature is computed over the RAW body. Parsing to JSON and
 * re-stringifying changes whitespace and key order, which changes the hash, so
 * the raw bytes are read off the stream before anything touches them.
 *
 * `auth: 'none'` and that is correct: the caller is Razorpay's server, which
 * has no Clerk session and never will. The shared webhook secret IS the
 * authentication here, and it is checked below on the exact bytes received.
 * The guard still supplies the method allowlist, the rate limit and the
 * no-store headers — and the body is read manually, so requireJson stays off.
 */
export const config = { api: { bodyParser: false } }

/**
 * Read the raw body, with a ceiling.
 *
 * Unbounded, this is a memory-exhaustion hole with a public URL: anyone who
 * knows the path can open a request and keep sending. A Razorpay event is a
 * couple of kilobytes, so a megabyte is already absurdly generous, and past it
 * the stream is destroyed rather than merely ignored — otherwise the sender
 * keeps writing to a socket that is still accepting.
 */
const MAX_WEBHOOK_BYTES = 1024 * 1024

function readRaw(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_WEBHOOK_BYTES) {
        req.destroy()
        reject(new HttpError(413, 'That request is too large', 'webhook_too_large'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export default secure(
  { name: 'webhook', methods: ['POST'], auth: 'none', rateLimit: { limit: 120 } },
  async (req, res) => {
    const raw = await readRaw(req)
    const signature = String(req.headers['x-razorpay-signature'] ?? '')

    const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET()).update(raw).digest('hex')

    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(signature, 'utf8')
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      // Someone posted here without the shared secret. Say nothing useful back.
      res.status(400).json({ error: 'Invalid signature' })
      return
    }

    const event = JSON.parse(raw)
    const payment = event?.payload?.payment?.entity
    const orderId: string | undefined = payment?.order_id
    if (!orderId) {
      // Not an event we act on. Answer 200 so Razorpay stops retrying it.
      res.status(200).json({ ok: true, ignored: event?.event ?? 'unknown' })
      return
    }

    const notesUser = payment?.notes?.user_id as string | undefined

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      // Prefer the recorded order; fall back to the notes attached at creation,
      // in case the metadata write failed but the payment still went through.
      const userId = (await findUserByOrder(orderId)) ?? notesUser
      if (userId) {
        await settlePayment(
          userId,
          orderId,
          {
            status: 'paid',
            razorpay_payment_id: payment.id,
            confirmed_by: 'webhook',
            amount: payment.amount ?? 0,
            currency: payment.currency ?? 'INR',
          },
          true,
        )
      }
    } else if (event.event === 'payment.failed') {
      const userId = (await findUserByOrder(orderId)) ?? notesUser
      if (userId) {
        await settlePayment(
          userId,
          orderId,
          { status: 'failed', razorpay_payment_id: payment.id },
          false,
        )
      }
    }

    res.status(200).json({ ok: true })
  },
)
