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
5. **Project Settings → API** — copy these three:
   - Project URL
   - `anon` / public key
   - `service_role` key ⚠️ **secret — treat it like a password, never commit it,
     never prefix it with `VITE_`**

## 2. Razorpay

1. Sign up at [razorpay.com](https://razorpay.com). **Settings → API Keys →
   Generate Test Key** gives you `rzp_test_…` keys that work immediately.
2. Live keys require KYC (PAN, bank account, business details) and take a few
   days to approve. **Test mode is enough to build and demo** — use test card
   `4111 1111 1111 1111`, any future expiry, any CVV.
3. Copy the **Key ID** and **Key Secret**.

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
