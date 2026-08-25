# Backend 200 — setup

Everything you have to do by hand, in order. Nothing in this file requires
sending a secret to anyone; every key goes straight from the provider's
dashboard into Vercel's environment variables.

> **Rotate first.** A Supabase `service_role` key and a Razorpay key secret were
> pasted into a chat earlier in this project's history. Treat both as public and
> regenerate them before going anywhere near live mode.

---

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com). Note the **Project
   URL** and the **anon** key from Settings → API.
2. Copy the **service_role** key from the same page. This one bypasses every
   access rule — it belongs only in Vercel, never in the repo or the browser.
3. **Auth → Providers → Google**: enable it. You will need a Google OAuth client
   (Google Cloud Console → APIs & Services → Credentials → OAuth client ID,
   type *Web application*). Paste the callback URL Supabase shows you into the
   Google client's *Authorised redirect URIs*, then paste Google's client ID and
   secret back into Supabase.
4. **Auth → URL Configuration**: set *Site URL* to your Vercel domain and add
   `https://<your-domain>/plans` to *Redirect URLs*. Add
   `http://localhost:5173/plans` too if you want sign-in to work locally.
5. **SQL Editor**: paste all of [`supabase/schema.sql`](supabase/schema.sql) and
   run it once. It creates `profiles`, `payments` and `admins`, turns on Row
   Level Security, and inserts `siddhant.prasad8@gmail.com` as the only admin.

To change who the admin is later, edit the `admins` table — no redeploy needed.

---

## 2. Razorpay

1. Sign up at [razorpay.com](https://razorpay.com) and complete KYC: PAN,
   address proof, and your bank account plus IFSC. **The bank account number is
   typed into Razorpay's dashboard and nowhere else.** Test mode works
   immediately; live mode activates once KYC is approved.
2. **Settings → API Keys → Generate Key.** You get a `key_id` (`rzp_test_…`,
   safe to expose) and a `key_secret` (shown once, server only).
3. **Settings → Webhooks → Add New Webhook**
   - URL: `https://<your-domain>/api/webhook`
   - Active events: `payment.captured`, `payment.failed`, `order.paid`
   - Copy the **webhook secret** it generates.

The webhook is what actually grants access. The browser round-trip through
`/api/verify` is only there so the user is not left staring at a spinner — if
they close the tab mid-payment, the webhook still marks them paid.

---

## 3. Vercel environment variables

Project → Settings → Environment Variables. Add all six, to every environment
you deploy.

| Name | Value | Visible to the browser? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL | yes — harmless |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | yes — harmless, RLS guards the data |
| `VITE_RAZORPAY_KEY_ID` | `rzp_test_…` / `rzp_live_…` | yes — it is a public identifier |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | **no — never** |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret | **no — never** |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret | **no — never** |

**Anything prefixed `VITE_` is compiled into the JavaScript bundle and is public.**
That is fine for the first three and fatal for the last three. If you ever
prefix `SUPABASE_SERVICE_ROLE_KEY` with `VITE_`, anyone can read every row in
your database and mark themselves paid.

---

## 4. Deployment

This app now has serverless functions in `api/`, so it must be deployed on
**Vercel**. The GitHub Pages workflow (`.github/workflows/deploy.yml`) can only
serve the static half — sign-in and payments will not work there. Either delete
that workflow or accept that the Pages copy is a broken preview.

`vercel.json` already excludes `/api/*` from the SPA rewrite, so the functions
are reachable while every other path falls through to `index.html`.

---

## 5. Testing the payment flow

In test mode Razorpay accepts UPI id `success@razorpay` and its published test
cards — no real money moves.

What to check:

1. Sign in with Google → you land on `/plans`, not the dashboard.
2. Pay → you land on `/app`.
3. **Close the tab mid-payment.** Reload `/plans`. You should be let through
   anyway, because the webhook confirmed it independently. This is the case that
   matters and the one most implementations get wrong.
4. Open `/admin` as `siddhant.prasad8@gmail.com` → the Payments tab shows the
   order with `confirmed_by = webhook`.
5. Open `/admin` as any other account → you get bounced, and calling
   `/api/admin` directly with that account's token returns 404.

---

## What is enforced where

| Rule | Enforced by |
| --- | --- |
| You are who you say you are | Supabase verifies the token on every API call |
| You paid | `profiles.has_paid`, writable only by the service-role key |
| A payment is genuine | HMAC-SHA256 signature check against the key secret |
| You cannot read another user's rows | Postgres Row Level Security |
| You cannot mark yourself paid | RLS plus a trigger that rejects the write |
| Only you see the admin console | `admins` table, checked server-side in `/api/admin` |

The React route guards are convenience only. They decide what to *show*; the
server decides what to *serve*.

### Known gap

The curriculum still ships inside the JavaScript bundle. A determined visitor
can download `assets/App-*.js` and read the 200 rail days and the question banks
without paying. Closing that means moving the generated data behind an
authenticated `/api/content` endpoint — planned, not yet done. Until then the
paywall gates the *product*, not the *text*.
