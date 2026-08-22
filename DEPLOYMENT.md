# Deploying DSA 140 (Vercel + Supabase + Razorpay)

Everything below needs your own accounts — the code is ready, but the keys are
yours to create. Budget ~30 minutes.

**Security note up front:** the client-side checks in `App.tsx` decide what to
*render*. They are not the security boundary. The real enforcement is:

- **Row Level Security** in `supabase/schema.sql` — a user can only read their
  own rows, and `profiles.has_paid` has **no user-writable policy at all**.
- **`api/verify-payment.ts`** — the only code that sets `has_paid = true`, and
  it does so only after verifying Razorpay's HMAC signature *and* re-fetching
  the order from Razorpay to confirm it was actually paid in full.

So someone flipping a boolean in devtools sees the static 140-day schedule
(which is in the JS bundle anyway) — not anyone's data, and not a paid account.

---

## The five values you need to collect

Everything reduces to these. Sections 1 and 2 below say exactly where each lives.

| # | Value | Where to get it | Secret? |
|---|---|---|---|
| 1 | Supabase **Project URL** | Supabase → Project Settings → API | no |
| 2 | Supabase **anon** key | Supabase → Project Settings → API | no |
| 3 | Supabase **service_role** key | Supabase → Project Settings → API → *Reveal* | **yes** |
| 4 | Razorpay **Key Id** | Razorpay → Settings → API Keys → Generate Test Key | no |
| 5 | Razorpay **Key Secret** | shown once in that same popup | **yes** |

They become seven env vars because the URL and anon key are needed on both the
client (`VITE_` prefix) and the server (no prefix). See the table in section 3.

**Never paste values 3 and 5 into a chat, an issue, a commit, or any file in
this repo.** Type them straight into Vercel's environment-variable settings.
Nobody — including me — needs to see them to help you.

---

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com). Your $25 credit is
   far more than this needs — the free tier would do.
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
   This creates `profiles`, `login_events`, `payments`, `progress`, the RLS
   policies, the admin overview view, and a trigger that auto-creates a profile
   on signup (auto-promoting `siddhant.prasad8@gmail.com` to `admin` with access
   already granted, so you never see the paywall).
3. **Authentication → Providers → Email**: enable it. Magic-link sign-in is what
   the app uses, so you can leave "Confirm email" on and skip passwords.
4. **Authentication → URL Configuration**: set **Site URL** to your Vercel domain
   (e.g. `https://dsa-140.vercel.app`) and add it under **Redirect URLs** too.
   Add `http://localhost:5173` as well if you want local sign-in to work.
5. **Getting the keys.** Click the gear icon (**Project Settings**) in the left
   sidebar → **API**. That page has all three values:

   | On the page | Looks like | Goes into |
   |---|---|---|
   | **Project URL** | `https://abcdefgh.supabase.co` | `VITE_SUPABASE_URL` **and** `SUPABASE_URL` |
   | **Project API keys → `anon` `public`** | long `eyJ…` string | `VITE_SUPABASE_ANON_KEY` **and** `SUPABASE_ANON_KEY` |
   | **Project API keys → `service_role` `secret`** | long `eyJ…`, hidden behind *Reveal* | `SUPABASE_SERVICE_ROLE_KEY` |

   The URL and `anon` key are *designed* to be public — they're safe in the
   browser because RLS restricts what they can reach.

   ⚠️ The **`service_role`** key bypasses RLS entirely. Anyone holding it can
   read and modify every row in your database, including marking themselves as
   paid. Never commit it, never put it in a `VITE_` variable, never paste it into
   a chat or an issue. It goes in exactly one place: Vercel's env var settings.

   (Newer Supabase projects may label these *publishable* and *secret* keys
   instead of *anon* / *service_role* — same things, same roles.)

## 2. Razorpay

### How you actually receive the money

This trips people up, so read it once:

- **Customers can pay by UPI** — PhonePe, Google Pay, Paytm, any UPI app.
  Checkout is configured to open on UPI first (`config.display` in
  `AuthGate.tsx`), with card/netbanking still available underneath.
- **You receive settlements into a bank account, not into PhonePe.** Razorpay
  holds the money and settles it to the bank account you register during KYC,
  typically on a T+1 cycle. There is no "settle to my PhonePe wallet" option.
- In practice this is the same money: PhonePe is just an interface to a bank
  account. Register **the bank account your PhonePe is linked to** and the
  payouts land where you expect — you'll see them in PhonePe as bank credits.
- If you truly want money to arrive without a gateway in the middle, the
  alternative is a plain UPI QR / UPI ID to yourself. **Don't do that here** —
  there'd be no way for the server to confirm a payment, so anyone could claim
  they paid and unlock access. The whole point of the Razorpay flow is the
  signed, server-verifiable confirmation.
- If you'd rather not use Razorpay at all, **PhonePe Payment Gateway**
  (PhonePe Business) is the direct competitor and also settles to a bank
  account. Switching would mean rewriting the two files in `api/`.

### Getting the keys

1. Sign up at [razorpay.com](https://razorpay.com).
2. Make sure the mode switch at the top of the dashboard says **Test Mode**.
3. Go to **Settings → API Keys → Generate Test Key**.
4. A popup shows **Key Id** (`rzp_test_…`) and **Key Secret**. **Download or copy
   both now — the secret is shown exactly once** and can never be viewed again
   (you'd have to regenerate, which invalidates the old pair).
   - `Key Id` → `RAZORPAY_KEY_ID`
   - `Key Secret` → `RAZORPAY_KEY_SECRET`
5. Test mode works immediately with no KYC. Test card `4111 1111 1111 1111`,
   any future expiry, any CVV. Test-mode UPI gives you a simulated success/failure
   screen rather than a real UPI app.
6. **Going live** needs KYC — PAN, bank account details, and business/ID proof —
   and takes a few days to approve. Once approved, switch the dashboard to **Live
   Mode**, generate a *live* key pair the same way, and replace the two Vercel
   env vars. Live UPI also requires your account to be activated for it.

> Razorpay charges roughly 2% as a platform fee. On a ₹20 payment that's ~₹0.40,
> so you net about ₹19.60 per unlock. Confirm current rates on their pricing page.

## 3. Vercel

1. Push this repo to GitHub, then **Add New → Project** on
   [vercel.com](https://vercel.com) and import it. `vercel.json` already sets the
   Vite build and SPA rewrites, and `api/*.ts` deploys automatically as
   serverless functions.
2. **Settings → Environment Variables** — add all seven (see `.env.example`):

   | Name | Value | Exposed to browser? |
   |---|---|---|
   | `VITE_SUPABASE_URL` | Supabase project URL | yes (fine) |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon key | yes (fine) |
   | `SUPABASE_URL` | same project URL | no |
   | `SUPABASE_ANON_KEY` | same anon key | no |
   | `SUPABASE_SERVICE_ROLE_KEY` | **service_role key** | **no — never** |
   | `RAZORPAY_KEY_ID` | `rzp_test_…` | no |
   | `RAZORPAY_KEY_SECRET` | Razorpay secret | **no — never** |

   Only the two `VITE_`-prefixed vars are bundled into the browser. Anything
   without that prefix stays server-side. **Do not add `VITE_` to the service
   role or Razorpay secret** — that would publish them and let anyone unlock
   access for free.
3. Deploy. Then go back to Supabase step 1.4 and set the Site URL to the real
   deployed domain.

## 4. Verify it works

1. Open the site in a private window → you should see the **sign-in screen**.
2. Sign in with a *non-admin* address → you should hit the **₹20 paywall**.
3. Pay with the test card → the Razorpay modal closes, `verify-payment` runs, and
   the dashboard unlocks. Check Supabase: that user's `profiles.has_paid` is now
   `true` and there's a `paid` row in `payments`.
4. Sign in as `siddhant.prasad8@gmail.com` → **no paywall**, and an extra
   **Admin** tab appears with users, logins and payments.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the two VITE_ vars
npm run dev
```

With the `VITE_` vars **unset**, the app runs in local-only mode: no sign-in, no
paywall, progress in `localStorage`. That's the fastest way to work on the UI.

The `/api` functions don't run under `npm run dev` (that's Vite alone). To
exercise sign-in and payment locally you need the Vercel CLI, which serves both:

```bash
npm i -g vercel
vercel dev
```

## Changing the price or the admin address

- **Price**: `ACCESS_PRICE_PAISE` in `api/_lib.ts` (server, authoritative) and
  `src/lib/account.ts` (display only). Value is in paise — `2000` = ₹20.
- **Admin address**: `ADMIN_EMAIL` in `api/_lib.ts` and `src/lib/account.ts`,
  **and** the `admin_email()` function at the top of `supabase/schema.sql`
  (re-run that function definition after editing). Existing rows keep their old
  role, so also update the affected row in the `profiles` table.
