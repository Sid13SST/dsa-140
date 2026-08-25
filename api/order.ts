import { CURRENCY, PRICE_PAISE, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from './_lib/env'
import { adminClient, fail, HttpError, requireUser } from './_lib/supabase'

/**
 * POST /api/order — create a Razorpay order for the signed-in user.
 *
 * The AMOUNT IS DECIDED HERE, not sent by the browser. If the client could name
 * its own price, the paywall would be a suggestion. The order is recorded
 * before the user ever reaches Razorpay, so a payment that arrives by webhook
 * can always be matched back to a person.
 */
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST')

    const user = await requireUser(req)
    const db = adminClient()

    // Already paid? Do not take money twice.
    const { data: profile } = await db
      .from('profiles')
      .select('has_paid')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.has_paid) throw new HttpError(409, 'You already have access')

    const auth = Buffer.from(`${RAZORPAY_KEY_ID()}:${RAZORPAY_KEY_SECRET()}`).toString('base64')
    const created = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: PRICE_PAISE,
        currency: CURRENCY,
        // Lets the webhook find the user even if the browser never comes back.
        notes: { user_id: user.id, email: user.email },
      }),
    })

    if (!created.ok) {
      const detail = await created.text()
      console.error('razorpay order failed', created.status, detail)
      throw new HttpError(502, 'Could not reach the payment provider. Try again in a moment.')
    }

    const order = (await created.json()) as { id: string; amount: number; currency: string }

    const { error } = await db.from('payments').insert({
      user_id: user.id,
      email: user.email,
      razorpay_order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: 'created',
    })
    if (error) {
      console.error('payments insert failed', error)
      throw new HttpError(500, 'Could not start the payment. Try again.')
    }

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID(),
    })
  } catch (e) {
    fail(res, e)
  }
}
