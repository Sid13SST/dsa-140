import { adminClient, fail, HttpError, isAdmin, requireUser } from './_lib/supabase'

/**
 * GET /api/admin — the super-admin view: who signed up, who paid.
 *
 * The admin check happens HERE, against the admins table, not in React. A
 * frontend route guard only stops an honest user from wandering in; this stops
 * anyone else from calling the endpoint directly with their own token.
 */
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') throw new HttpError(405, 'Use GET')

    const user = await requireUser(req)
    if (!(await isAdmin(user.email))) {
      // Deliberately the same message a signed-out caller would get for a
      // missing route: do not confirm that an admin surface exists.
      throw new HttpError(404, 'Not found')
    }

    const db = adminClient()

    const { data: users, error: usersError } = await db
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false })
    if (usersError) throw new HttpError(500, 'Could not load users')

    const { data: payments, error: payError } = await db
      .from('payments')
      .select('email, razorpay_order_id, razorpay_payment_id, status, amount, currency, confirmed_by, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (payError) throw new HttpError(500, 'Could not load payments')

    const paidRows = (payments ?? []).filter((p) => p.status === 'paid')
    const signedUp = users?.length ?? 0
    const paid = (users ?? []).filter((u) => u.has_paid).length

    res.status(200).json({
      users: users ?? [],
      payments: payments ?? [],
      totals: {
        signedUp,
        paid,
        // Paise in the database, rupees at the edge — one conversion, here.
        revenueRupees: paidRows.reduce((n, p) => n + (p.amount ?? 0), 0) / 100,
        conversionPct: signedUp ? Math.round((paid / signedUp) * 100) : 0,
        failed: (payments ?? []).filter((p) => p.status === 'failed').length,
      },
    })
  } catch (e) {
    fail(res, e)
  }
}
