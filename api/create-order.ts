import {
  ACCESS_PRICE_PAISE,
  ADMIN_EMAIL,
  json,
  requireEnv,
  serviceClient,
  userFromRequest,
} from './_lib'

/**
 * POST /api/create-order
 * Creates a Razorpay order for the signed-in user and records it as `created`.
 * The amount is fixed here on the server — the client never sends a price.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  try {
    const user = await userFromRequest(req.headers.authorization)
    if (!user?.email) return json(res, 401, { error: 'Not signed in' })

    if (user.email === ADMIN_EMAIL) {
      return json(res, 400, { error: 'Admin account does not require payment' })
    }

    const db = serviceClient()

    // Already paid? Don't charge twice.
    const { data: profile } = await db
      .from('profiles')
      .select('has_paid')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.has_paid) return json(res, 400, { error: 'Access already unlocked' })

    const keyId = requireEnv('RAZORPAY_KEY_ID')
    const keySecret = requireEnv('RAZORPAY_KEY_SECRET')

    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: ACCESS_PRICE_PAISE,
        currency: 'INR',
        // Razorpay caps receipt at 40 chars.
        receipt: `dsa140_${user.id.replace(/-/g, '').slice(0, 24)}`,
        notes: { user_id: user.id, email: user.email },
      }),
    })

    if (!orderRes.ok) {
      const detail = await orderRes.text()
      console.error('Razorpay order creation failed:', orderRes.status, detail)
      return json(res, 502, { error: 'Could not create payment order' })
    }

    const order = (await orderRes.json()) as { id: string; amount: number; currency: string }

    await db.from('payments').upsert(
      {
        user_id: user.id,
        email: user.email,
        razorpay_order_id: order.id,
        amount_paise: order.amount,
        currency: order.currency,
        status: 'created',
      },
      { onConflict: 'razorpay_order_id' },
    )

    return json(res, 200, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId, // publishable; the secret stays server-side
    })
  } catch (e) {
    console.error('create-order error:', e)
    return json(res, 500, { error: 'Server error' })
  }
}
