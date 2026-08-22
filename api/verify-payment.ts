import { createHmac, timingSafeEqual } from 'node:crypto'
import { json, requireEnv, serviceClient, userFromRequest } from './_lib'

/**
 * POST /api/verify-payment
 * The only place `profiles.has_paid` is ever set to true.
 *
 * Razorpay's checkout callback is client-side and therefore forgeable, so the
 * signature is recomputed here with the secret and compared in constant time.
 * The order is also re-fetched from Razorpay so a valid signature over an
 * unpaid/underpaid order can't unlock access.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  try {
    const user = await userFromRequest(req.headers.authorization)
    if (!user?.email) return json(res, 401, { error: 'Not signed in' })

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const orderId = body?.razorpay_order_id as string | undefined
    const paymentId = body?.razorpay_payment_id as string | undefined
    const signature = body?.razorpay_signature as string | undefined
    if (!orderId || !paymentId || !signature) {
      return json(res, 400, { error: 'Missing payment fields' })
    }

    const keyId = requireEnv('RAZORPAY_KEY_ID')
    const keySecret = requireEnv('RAZORPAY_KEY_SECRET')
    const db = serviceClient()

    // The order must be one we created for THIS user.
    const { data: record } = await db
      .from('payments')
      .select('user_id, amount_paise')
      .eq('razorpay_order_id', orderId)
      .maybeSingle()
    if (!record || record.user_id !== user.id) {
      return json(res, 403, { error: 'Order does not belong to this account' })
    }

    // 1. Signature check.
    const expected = createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')
    // Uint8Array rather than Buffer: timingSafeEqual's signature wants an
    // ArrayBufferView and Buffer no longer satisfies it under strict @types/node.
    const a = new Uint8Array(Buffer.from(expected, 'utf8'))
    const b = new Uint8Array(Buffer.from(signature, 'utf8'))
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      await db.from('payments').update({ status: 'failed' }).eq('razorpay_order_id', orderId)
      return json(res, 400, { error: 'Invalid payment signature' })
    }

    // 2. Confirm with Razorpay that the order is actually paid for the full amount.
    const auth = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
    const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      headers: { Authorization: auth },
    })
    if (!orderRes.ok) {
      console.error('Razorpay order lookup failed:', orderRes.status)
      return json(res, 502, { error: 'Could not confirm payment' })
    }
    const order = (await orderRes.json()) as { status: string; amount_paid: number }
    if (order.status !== 'paid' || order.amount_paid < record.amount_paise) {
      await db.from('payments').update({ status: 'failed' }).eq('razorpay_order_id', orderId)
      return json(res, 400, { error: 'Payment not completed' })
    }

    // 3. Grant access.
    const now = new Date().toISOString()
    await db
      .from('payments')
      .update({ status: 'paid', razorpay_payment_id: paymentId, paid_at: now })
      .eq('razorpay_order_id', orderId)
    await db.from('profiles').update({ has_paid: true, paid_at: now }).eq('id', user.id)

    return json(res, 200, { ok: true })
  } catch (e) {
    console.error('verify-payment error:', e)
    return json(res, 500, { error: 'Server error' })
  }
}
