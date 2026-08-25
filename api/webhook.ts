import crypto from 'node:crypto'
import { RAZORPAY_WEBHOOK_SECRET } from './_lib/env'
import { adminClient } from './_lib/supabase'

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
 */
export const config = { api: { bodyParser: false } }

function readRaw(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => (data += chunk.toString('utf8')))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' })
    return
  }

  try {
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

    const db = adminClient()
    const now = new Date().toISOString()

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const { data: row } = await db
        .from('payments')
        .select('user_id')
        .eq('razorpay_order_id', orderId)
        .maybeSingle()

      // Fall back to the notes attached when the order was created, in case the
      // row insert failed but the payment still went through.
      const userId = row?.user_id ?? payment?.notes?.user_id
      if (userId) {
        await db
          .from('payments')
          .update({
            status: 'paid',
            razorpay_payment_id: payment.id,
            confirmed_by: 'webhook',
            updated_at: now,
          })
          .eq('razorpay_order_id', orderId)

        await db.from('profiles').update({ has_paid: true, paid_at: now }).eq('id', userId)
      }
    } else if (event.event === 'payment.failed') {
      await db
        .from('payments')
        .update({ status: 'failed', razorpay_payment_id: payment.id, updated_at: now })
        .eq('razorpay_order_id', orderId)
    }

    res.status(200).json({ ok: true })
  } catch (e) {
    // A 500 makes Razorpay retry, which is what we want for a transient fault.
    console.error('webhook failed', e)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}
