import { clerk, fail, HttpError, requireUser } from './_lib/clerk'
import type { PaymentRow } from './_lib/payments'

/**
 * GET /api/admin — who signed up, who paid.
 *
 * The admin check happens HERE, against the server's own list, not in React. A
 * frontend guard only stops an honest user wandering in; this stops anyone else
 * calling the endpoint directly with their own valid token.
 *
 * It answers 404 rather than 403 to non-admins, so the response does not
 * confirm that an admin surface exists at all.
 */
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') throw new HttpError(405, 'Use GET')

    const caller = await requireUser(req)
    if (!caller.isAdmin) throw new HttpError(404, 'Not found')

    const client = clerk()

    // Clerk paginates; 500 is far beyond anything this will see, and asking for
    // everything in one call keeps the handler simple.
    const list = await client.users.getUserList({ limit: 500, orderBy: '-created_at' })

    const users = list.data.map((u) => {
      const meta = (u.publicMetadata ?? {}) as { hasPaid?: boolean; paidAt?: string }
      const payments = ((u.privateMetadata ?? {}) as { payments?: PaymentRow[] }).payments ?? []
      return {
        id: u.id,
        email:
          u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? '—',
        full_name: [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
        has_paid: !!meta.hasPaid,
        paid_at: meta.paidAt ?? null,
        created_at: new Date(u.createdAt).toISOString(),
        last_seen_at: new Date(u.lastActiveAt ?? u.createdAt).toISOString(),
        successful_payments: (payments as PaymentRow[]).filter((p) => p.status === 'paid').length,
        failed_payments: (payments as PaymentRow[]).filter((p) => p.status === 'failed').length,
      }
    })

    // The audit trail lives in each user's privateMetadata — never readable by
    // the browser, only through this endpoint.
    const payments: (PaymentRow & { email: string })[] = list.data.flatMap((u) => {
      const rows = ((u.privateMetadata ?? {}) as { payments?: PaymentRow[] }).payments ?? []
      const email =
        u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? '—'
      return rows.map((p) => ({ ...p, email }))
    })
    payments.sort((a, b) => b.created_at.localeCompare(a.created_at))

    const paid = users.filter((u) => u.has_paid).length
    const paidRows = payments.filter((p) => p.status === 'paid')

    res.status(200).json({
      users,
      payments,
      totals: {
        signedUp: users.length,
        paid,
        revenueRupees:
          paidRows.reduce((n, p) => n + Number(p.amount ?? 0), 0) / 100,
        conversionPct: users.length ? Math.round((paid / users.length) * 100) : 0,
        failed: payments.filter((p) => p.status === 'failed').length,
      },
    })
  } catch (e) {
    fail(res, e)
  }
}
