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

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com/sign-in)
   (the bare dashboard root 404s — use the sign-in link). Choose the sign-in
   methods you want; Google and email are each one toggle.
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
| `CLERK_AUTHORIZED_PARTIES` | not secret, but server-side — see below |
| `CLERK_ISSUER` | not secret, but server-side — see below |
| `ADMIN_EMAILS` | not secret, but server-side — this is the admin list |
| `SUPER_ADMIN_EMAIL` | not secret, but server-side — a single address, see roles below |

**Anything prefixed `VITE_` is compiled into the bundle and is public.** Fine for
the first two, fatal for the rest.

### The two variables the auth policy wants

Neither is a secret; both change what the API will accept, so they belong in the
host's environment rather than the bundle.

**`CLERK_AUTHORIZED_PARTIES`** — comma-separated origins allowed to mint tokens
for this API, e.g. `https://your-app.vercel.app,http://localhost:5173`. It is
what stops a token issued to some other application on the same Clerk instance
being spent here. Leaving it unset does not break anything — the check simply
cannot run, and every function logs `no_authorized_parties` until you set it.

**`CLERK_ISSUER`** — required the day you move from a development Clerk instance
to a **production** one, because production instances issue from
`clerk.<your-domain>` and that is not a shape any check can trust on sight
(`clerk.anything-at-all.com` is registrable by anyone). Development instances on
`*.clerk.accounts.dev` are recognised without it. This one fails **closed**: set
it wrong and every request answers 401 with `wrong_issuer` in the function logs.

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
| You are who you say you are | Clerk signs the session token; the server verifies the RS256 signature against Clerk's published keys on every request |
| The token was minted for THIS app | the `azp` claim is checked against `CLERK_AUTHORIZED_PARTIES` |
| The token was minted for this INSTANCE | the `iss` claim, against `CLERK_ISSUER` or the development-issuer shape |
| An old token cannot be replayed | `iat` must be within five minutes, independently of `exp` |
| A revoked session dies immediately | the admin path re-checks the session with Clerk rather than trusting the token's minute |
| A banned or locked account is out | the live user record is read on every authenticated request |
| The admin console needs recent proof | the `fva` claim — first factor within the hour — on top of the email list |
| You cannot mark yourself paid | `publicMetadata` is writable only with the secret key |
| Only you see the admin console | `/api/admin` checks your email server-side and answers **404**, not 403, to everyone else |
| No cross-site request can act as you | the API reads the `Authorization` header only and never a cookie, so there is nothing for a forged form post to carry |
| One caller cannot exhaust the API | per-IP and per-user rate limits in front of every endpoint |
| A rule cannot rot unnoticed | `npm run check:auth` runs 46 hostile-input checks against the policy in the build |

Run `npm run check:auth` on its own to see what the policy actually refuses.

### Two admin levels

| Role | Who | Sees |
| --- | --- | --- |
| **admin** | anyone on `ADMIN_EMAILS` | `/admin` — accounts and payment attempts |
| **super admin** | the one address in `SUPER_ADMIN_EMAIL` | all of the above, plus `/super` — who signed up, how, and whether they came back |

They are separate so `ADMIN_EMAILS` can grow — a collaborator, someone covering
while you are away — without that also handing over the signup and usage view.
Adding an address to `ADMIN_EMAILS` gets a **404** from `/api/insights`, not a
403: the endpoint does not confirm it exists to anyone who is not the one
address. The super admin is always an admin, whatever the list says.

Both default to `siddhant.prasad8@gmail.com` when unset. The comparison is
NFKC-normalised and case-insensitive, so a fullwidth-unicode lookalike of the
owner's address does not match — `npm run check:auth` proves it, along with the
case where an empty address meets an unset variable and must not compare equal.

`/super` shows only what Clerk knows: signup date and method, last activity,
email verification, MFA, ban and lock state. **Study progress is not there and
cannot be** — it lives in each person's localStorage and is never sent anywhere.

### The response headers

`vercel.json` sets them, and it takes **no comments** — the schema rejects even a
`"//"` key, so the reasoning lives here instead. They apply to documents and
assets only; the `api/` responses set their own in `api/_lib/errors.ts`, because
those need `no-store` and must not be fought over by a second source.

| Header | Why |
| --- | --- |
| `Strict-Transport-Security` | two years, subdomains included — stops the first request of a session being downgraded to http and read in transit |
| `X-Content-Type-Options: nosniff` | stops a response being reinterpreted as script because a sniffing browser liked the bytes |
| `X-Frame-Options: DENY` | nothing here should ever be framed, and a sign-in page that can be is the classic clickjacking target |
| `Referrer-Policy` | no full URLs leak to third parties |
| `Permissions-Policy` | denies the powerful APIs this app has no use for, so a compromised dependency cannot reach for them |
| `Content-Security-Policy-Report-Only` | see below — it reports and blocks nothing until you flip it |

### What this is NOT

Worth being straight about, because "hardened" is not "invulnerable":

- **The rate limiter counts per warm serverless instance**, not per deployment.
  It stops a stuck client and casual probing; it is not a defence against a
  distributed flood. That belongs at the edge, and Clerk's own bot protection
  and lockout handle the sign-in side.
- **The CSP ships in Report-Only mode**, so it currently reports violations and
  blocks nothing. Load every route once, read the console, widen the list in
  `vercel.json` to cover the legitimate sources, then rename the header to
  `Content-Security-Policy` to enforce it.
- **Anyone with your `CLERK_SECRET_KEY` is you.** No amount of claim checking
  survives that, which is why it lives only in the host's environment.
- **MFA is a dashboard toggle, not code.** The step-up check above can require a
  second factor, but only if you have turned one on in Clerk.
| A payment is genuine | HMAC-SHA256 over `order_id\|payment_id`, compared timing-safely on the server |

React's route guards are convenience only. They decide what to *show*; the
server decides what it will *hand over*.

### Known gap

The curriculum still ships inside the JavaScript bundle, so a determined visitor
could read the tracks and question banks from `assets/App-*.js` without paying.
Closing that means serving the generated data from an authenticated endpoint —
planned, not done. While payments are off it costs nothing.
