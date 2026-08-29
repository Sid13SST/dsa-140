import { clerk } from './clerk.js'

/**
 * Payment state, stored on the Clerk user rather than in a database.
 *
 * publicMetadata  — hasPaid / paidAt. Readable by that user's browser so the UI
 *                   can react instantly; writable only with the secret key.
 * privateMetadata — the payment audit trail. Never sent to any browser; it
 *                   reaches the admin console only through /api/admin.
 *
 * This is why dropping Supabase cost nothing: the only rows that ever existed
 * were "has this person paid" and "what did they attempt", and both belong to
 * the user record anyway. It would stop being the right shape at the point
 * payments need reporting across users, or refunds, or invoices.
 */
export interface PaymentRow {
  razorpay_order_id: string
  razorpay_payment_id?: string | null
  status: 'created' | 'paid' | 'failed'
  amount: number
  currency: string
  confirmed_by?: 'verify' | 'webhook'
  created_at: string
  updated_at?: string
}

/** Find which user an order belongs to, without a database to query. */
export async function findUserByOrder(orderId: string): Promise<string | null> {
  const list = await clerk().users.getUserList({ limit: 500, orderBy: '-created_at' })
  for (const u of list.data) {
    const rows = ((u.privateMetadata ?? {}) as { payments?: PaymentRow[] }).payments ?? []
    if (rows.some((p) => p.razorpay_order_id === orderId)) return u.id
  }
  return null
}

/**
 * Update one payment row in place, and optionally flip the paid flag.
 *
 * Re-reads the user first so two concurrent writes — the browser round-trip and
 * the webhook, which routinely race — do not clobber each other's rows.
 */
export async function settlePayment(
  userId: string,
  orderId: string,
  patch: Partial<PaymentRow>,
  markPaid: boolean,
): Promise<void> {
  const client = clerk()
  const user = await client.users.getUser(userId)
  const priv = (user.privateMetadata ?? {}) as { payments?: PaymentRow[] }
  const rows = priv.payments ?? []

  const now = new Date().toISOString()
  const next = rows.map((p) =>
    p.razorpay_order_id === orderId ? { ...p, ...patch, updated_at: now } : p,
  )
  // A webhook can arrive for an order we never recorded; keep it rather than
  // dropping evidence that money moved.
  if (!next.some((p) => p.razorpay_order_id === orderId)) {
    next.push({
      razorpay_order_id: orderId,
      status: 'paid',
      amount: 0,
      currency: 'INR',
      created_at: now,
      ...patch,
    } as PaymentRow)
  }

  await client.users.updateUser(userId, {
    privateMetadata: { ...priv, payments: next },
    ...(markPaid
      ? {
          publicMetadata: {
            ...(user.publicMetadata ?? {}),
            hasPaid: true,
            paidAt: now,
          },
        }
      : {}),
  })
}
