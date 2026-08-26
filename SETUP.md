# Backend 200 — setup

Everything you have to do by hand, in order. Nothing in this file requires
sending a secret to anyone; every key goes straight from the provider's
dashboard into Vercel's environment variables.

> **Accounts are currently switched OFF** (`VITE_AUTH_ENABLED=false`). The
> dashboard opens straight from the landing page with no sign-in, and progress
> is stored in the browser. None of this section is needed to use the app — do
> it when you want accounts, not before.

> **Payments are also switched OFF** (`VITE_PAYMENTS_ENABLED=false`).
> In this mode you need only steps 1 and 3, and no serverless functions at all:
> signing in with Google is the whole requirement, and every read is authorised
> by Row Level Security. Sections 2 and 5 apply when you switch the paywall on.

> **Rotate first.** A Supabase `service_role` key and a Razorpay key secret were
> pasted into a chat earlier in this project's history. Treat both as public and
> regenerate them before going anywhere near live mode. (The *anon* key is
> public by design and does not need rotating — it ships in the browser bundle.)

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
4. **Auth → URL Configuration**: set *Site URL* to your deployed domain, and add
   these to *Redirect URLs* — sign-in lands on `/app` while payments are off and
   on `/plans` once they are on, so allow both:
   - `https://<your-domain>/app` and `https://<your-domain>/plans`
   - `https://sid13sst.github.io/dsa-140/app` if you use the Pages deploy
   - `http://localhost:5173/app` for local development
5. **SQL Editor**: paste all of [`supabase/schema.sql`](supabase/schema.sql) and
   run it once. It creates `profiles`, `payments` and `admins`, turns on Row
   Level Security, and inserts `siddhant.prasad8@gmail.com` as the only admin.

To change who the admin is later, edit the `admins` table — no redeploy needed.

### Hardening the sign-in

The client already uses the **PKCE** flow rather than the implicit one, so an
intercepted auth code is useless without a verifier this browser never sent.
That is the only part that is code. The rest are dashboard settings, and they
matter more than which auth vendor you pick:

| Setting | Where | Why |
| --- | --- | --- |
| Enable MFA (TOTP) | Auth → Providers → MFA | The single biggest gain for an admin account |
| Enable captcha | Auth → Settings → Bot and abuse protection | Stops automated sign-up floods |
| Shorten JWT expiry | Auth → Settings → JWT expiry | Smaller window if a token ever leaks |
| Restrict redirect URLs | Auth → URL Configuration | An open redirect is how OAuth flows get hijacked |
| Leave RLS on everywhere | Already in schema.sql | The actual enforcement layer |

Google sign-in means no password is ever stored here, so there is no password
database to leak — which is worth more than any provider comparison.

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

## 3. Environment variables

These are read at **build** time and compiled into the bundle, so setting them
always means a rebuild. A running deploy cannot be fixed by changing a setting.

- **Locally** — copy `.env.example` to `.env.local`, fill it in, restart `npm run dev`.
- **GitHub Pages** — repo → Settings → Secrets and variables → Actions →
  **Variables** tab → New repository variable. Add `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`. The workflow reads variables first and falls back to
  secrets, so either tab works; Variables is the honest one, because these two
  end up publicly readable in the bundle regardless.
  Then re-run the deploy workflow (Actions → Deploy to GitHub Pages → Run workflow).
- **Vercel** — Project → Settings → Environment Variables.

With payments off you need only the first two, plus
`VITE_PAYMENTS_ENABLED=false`.

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

**With payments off, GitHub Pages works fully.** Nothing calls `api/`, so the
existing workflow at `https://sid13sst.github.io/dsa-140/` serves the whole app,
sign-in included. The build sets its base path automatically.

**With payments on you need Vercel**, because the Razorpay flow depends on the
serverless functions in `api/`, which Pages cannot run. `vercel.json` already
excludes `/api/*` from the SPA rewrite so the functions stay reachable.

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
| You are who you say you are | Supabase validates the session on every request |
| You cannot read another user's rows | Postgres Row Level Security |
| Only you see the admin console | A policy on `admins` that returns rows to admins only, so a non-admin's query comes back empty |
| You cannot mark yourself paid | RLS plus a trigger that rejects the write outright |
| A payment is genuine *(when on)* | HMAC-SHA256 signature check against the key secret, server-side |

The React route guards are convenience only. They decide what to *show*;
Postgres decides what it will *hand over*. Running the app's own queries from a
browser console gets a non-admin an empty array, not a leak.

### Known gaps

**Payments are off.** The Razorpay flow, the `has_paid` gate and the revenue
columns are all written and wired, but dormant behind `VITE_PAYMENTS_ENABLED`.
Switch it to `true`, add the three server secrets, and the paywall comes back
without further code changes.

**Content is not gated.** The curriculum still ships inside the JavaScript
bundle. A determined visitor
can download `assets/App-*.js` and read the 200 rail days and the question banks
without paying. Closing that means moving the generated data behind an
authenticated `/api/content` endpoint — planned, not yet done. Until then the
paywall gates the *product*, not the *text*.
