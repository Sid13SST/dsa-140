import { clerk } from './_lib/clerk.js'
import { secure } from './_lib/http.js'
import type { PaymentRow } from './_lib/payments.js'

/**
 * GET /api/admin — who signed up, who paid.
 *
 * `auth: 'admin'` is the whole access decision, and it is made in the guard
 * before this function runs: a verified token, a session Clerk still calls
 * active, a first factor proved within the hour, an account that is neither
 * banned nor locked, and an email on the server's own ADMIN_EMAILS list. A
 * frontend guard only stops an honest user wandering in; this stops anyone
 * else calling the endpoint directly with a perfectly valid token of their
 * own, and answers 404 so the response does not confirm the surface exists.
 *
 * The per-user limit is tight because this endpoint reads every user in the
 * instance: it is the most expensive call in the API and the most attractive
 * one to scrape.
 */
export default secure(
  { name: 'admin', methods: ['GET'], auth: 'admin', rateLimit: { limit: 20 }, userRateLimit: { limit: 30 } },
  async (_req, res) => {
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
        revenueRupees: paidRows.reduce((n, p) => n + Number(p.amount ?? 0), 0) / 100,
        conversionPct: users.length ? Math.round((paid / users.length) * 100) : 0,
        failed: payments.filter((p) => p.status === 'failed').length,
      },
    })
  },
)
