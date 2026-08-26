# Backend 200 — setup

Nothing here requires sending a secret to anyone. Every key goes straight from
the provider's dashboard into your host's environment variables.

> **Accounts are currently switched OFF** (`VITE_AUTH_ENABLED=false`). The
> dashboard opens straight from the landing page with no sign-in, and progress
> is stored in the browser. You do not need any of this to use the app.

> **Payments are also switched OFF** (`VITE_PAYMENTS_ENABLED=false`).

---

## 1. Authentication — Clerk

Two steps, and sign-in works. Clerk needs no database, no schema and no OAuth
client of your own.

1. Create an application at [clerk.com](https://dashboard.clerk.com). Choose the
   sign-in methods you want — Google and email are both one toggle.
2. Copy the **Publishable key** from API keys into `.env.local`:

   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   VITE_AUTH_ENABLED=true
   ```

3. Restart the dev server. That is sign-in done.

For the **admin console** at `/admin` you also need, in your host's environment
(never in the repo):

| Name | Value |
| --- | --- |
| `CLERK_SECRET_KEY` | from Clerk → API keys — **server only** |
| `ADMIN_EMAILS` | comma-separated; defaults to `siddhant.prasad8@gmail.com` |

The admin check runs on the server against that list. A non-admin calling
`/api/admin` with a perfectly valid token gets a 404.

### Hardening

Clerk gives you these as dashboard toggles rather than code:

| Setting | Where | Why |
| --- | --- | --- |
| Multi-factor | User & Authentication → Multi-factor | The single biggest gain, especially for the admin account |
| Bot protection | User & Authentication → Attack protection | Stops automated sign-up floods |
| Session lifetime | Sessions | Smaller window if a token leaks |
| Allowed origins | Domains | Stops the key being used from someone else's site |

### Why not Supabase

It was not a security decision — the ceiling is the same, and Supabase Auth was
never the weak part. It was setup cost: a SQL schema, RLS policies, a Google
Cloud OAuth client and three dashboard settings before one person could sign in.
That stalled three times. Clerk needs one key.

---

## 2. Payments — Razorpay *(optional, currently off)*

1. Sign up at [razorpay.com](https://razorpay.com) and complete KYC: PAN,
   address proof, bank account and IFSC. **The account number is typed into
   Razorpay's dashboard and nowhere else.**
2. Settings → API Keys → Generate. You get a `key_id` (public) and a
   `key_secret` (shown once, server only).
3. Settings → Webhooks → add `https://<your-domain>/api/webhook` for
   `payment.captured`, `payment.failed` and `order.paid`. Copy the webhook
   secret.

Payment state lives on the Clerk user — `publicMetadata.hasPaid` for the flag,
`privateMetadata.payments` for the audit trail — so there is still no database.

The webhook is what actually grants access; `/api/verify` is only there so the
user is not left on a spinner. Close the tab mid-payment and the webhook still
lets you in. That is the case worth testing.

---

## 3. Environment variables

Read at **build** time and compiled into the bundle, so setting them always
means a rebuild. A running deploy cannot be fixed by changing a setting.

- **Locally** — copy `.env.example` to `.env.local`, fill it in, restart `npm run dev`.
- **Vercel** — Project → Settings → Environment Variables.
- **GitHub Pages** — the workflow pins accounts and payments off, because
  `/admin` and the Razorpay flow both need `api/`, which Pages cannot run.

| Name | Public? |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | yes — it identifies the instance and grants nothing |
| `VITE_RAZORPAY_KEY_ID` | yes — a public identifier |
| `CLERK_SECRET_KEY` | **no — never** |
| `RAZORPAY_KEY_SECRET` | **no — never** |
| `RAZORPAY_WEBHOOK_SECRET` | **no — never** |

**Anything prefixed `VITE_` is compiled into the bundle and is public.** Fine for
the first two, fatal for the rest.

---

## 4. Deployment

- **GitHub Pages** serves the app with accounts off. Nothing calls `api/`.
- **Vercel** is required for sign-in with the admin console, and for payments,
  because both need the functions in `api/`. `vercel.json` already excludes
  `/api/*` from the SPA rewrite.

---

## What is enforced where

| Rule | Enforced by |
| --- | --- |
| You are who you say you are | Clerk signs the session token; the server verifies it against Clerk's public keys on every request |
| You cannot mark yourself paid | `publicMetadata` is writable only with the secret key |
| Only you see the admin console | `/api/admin` checks your email server-side and answers 404 otherwise |
| A payment is genuine | HMAC-SHA256 over `order_id\|payment_id`, compared timing-safely on the server |

React's route guards are convenience only. They decide what to *show*; the
server decides what it will *hand over*.

### Known gap

The curriculum still ships inside the JavaScript bundle, so a determined visitor
could read the tracks and question banks from `assets/App-*.js` without paying.
Closing that means serving the generated data from an authenticated endpoint —
planned, not done. While payments are off it costs nothing.
