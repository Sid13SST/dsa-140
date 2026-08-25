import { adminClient, fail, HttpError, isAdmin, requireUser } from './_lib/supabase'

/**
 * GET /api/me — who am I, have I paid, am I the admin.
 *
 * The client never decides any of these. It asks, and the server answers from
 * the database. Editing the response in devtools changes nothing, because every
 * protected endpoint re-checks for itself rather than trusting a flag the
 * browser is holding.
 */
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') throw new HttpError(405, 'Use GET')
    const user = await requireUser(req)
    const db = adminClient()

    const { data: profile } = await db
      .from('profiles')
      .select('email, full_name, avatar_url, has_paid, paid_at')
      .eq('id', user.id)
      .maybeSingle()

    // Cheap presence tracking, so the admin page can show who is actually active.
    await db.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)

    res.status(200).json({
      id: user.id,
      email: user.email,
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      hasPaid: !!profile?.has_paid,
      paidAt: profile?.paid_at ?? null,
      isAdmin: await isAdmin(user.email),
    })
  } catch (e) {
    fail(res, e)
  }
}
