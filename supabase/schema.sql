-- DSA 140 — Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- SECURITY MODEL
-- The client can never grant itself access. `profiles.has_paid` and
-- `profiles.role` are writable ONLY by the service role, which lives in the
-- Vercel serverless functions (api/verify-payment.ts) and never reaches the
-- browser. Row Level Security lets a user read only their own row; the admin
-- reads everything. Hiding the dashboard in React is presentation only — the
-- policies below are the actual enforcement.

-- Change this if you ever move the super-admin address.
create or replace function public.admin_email() returns text
language sql immutable as $$ select 'siddhant.prasad8@gmail.com'::text $$;

/* ------------------------------- profiles ------------------------------- */

create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  email         text not null,
  role          text not null default 'user' check (role in ('user', 'admin')),
  has_paid      boolean not null default false,
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);

alter table public.profiles enable row level security;

-- Helper: is the caller the super admin? Checks the JWT email directly so it
-- works even before the caller's own profile row exists.
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = public.admin_email()
$$;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

-- Deliberately no INSERT/UPDATE/DELETE policy for regular users: rows are
-- created by the trigger below and only ever modified by the service role.
-- Users may update nothing, so has_paid cannot be self-granted.

drop policy if exists "admin updates profiles" on public.profiles;
create policy "admin updates profiles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

/* --------------------------- new-user handling --------------------------- */

-- Create a profile automatically on signup, and auto-promote the super admin.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, has_paid, paid_at)
  values (
    new.id,
    new.email,
    case when new.email = public.admin_email() then 'admin' else 'user' end,
    -- The admin never pays.
    new.email = public.admin_email(),
    case when new.email = public.admin_email() then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* ------------------------------ login_events ----------------------------- */
-- "Who logged in" for the admin view. Users may insert their own events so the
-- app can record a sign-in, but only the admin can read the table.

create table if not exists public.login_events (
  id          bigserial primary key,
  user_id     uuid not null references auth.users on delete cascade,
  email       text not null,
  occurred_at timestamptz not null default now(),
  user_agent  text
);

create index if not exists login_events_occurred_idx
  on public.login_events (occurred_at desc);

alter table public.login_events enable row level security;

drop policy if exists "insert own login event" on public.login_events;
create policy "insert own login event" on public.login_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "admin reads login events" on public.login_events;
create policy "admin reads login events" on public.login_events
  for select using (public.is_admin());

/* -------------------------------- payments ------------------------------- */
-- Written only by the service role (the verify-payment function). Users can
-- read their own payments; the admin reads all of them.

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users on delete cascade,
  email               text not null,
  razorpay_order_id   text not null,
  razorpay_payment_id text,
  amount_paise        integer not null,
  currency            text not null default 'INR',
  status              text not null default 'created'
                        check (status in ('created', 'paid', 'failed')),
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);

create unique index if not exists payments_order_idx
  on public.payments (razorpay_order_id);

alter table public.payments enable row level security;

drop policy if exists "read own payments" on public.payments;
create policy "read own payments" on public.payments
  for select using (auth.uid() = user_id or public.is_admin());
-- No user-writable policy: only the service role inserts/updates payments.

/* -------------------------------- progress ------------------------------- */
-- Pre-existing table for cross-device sync; policies included so a fresh
-- project is complete after running this file once.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

drop policy if exists "own progress" on public.progress;
create policy "own progress" on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

/* ------------------------------ admin views ------------------------------ */
-- Convenience view for the admin dashboard: one row per user with payment and
-- activity rolled up. RLS on the underlying tables still applies.

create or replace view public.admin_users_overview
with (security_invoker = on) as
  select
    p.id,
    p.email,
    p.role,
    p.has_paid,
    p.paid_at,
    p.created_at,
    p.last_seen_at,
    (select count(*) from public.login_events le where le.user_id = p.id) as login_count,
    (select max(le.occurred_at) from public.login_events le where le.user_id = p.id) as last_login_at,
    (select coalesce(sum(pay.amount_paise), 0) from public.payments pay
       where pay.user_id = p.id and pay.status = 'paid') as total_paid_paise
  from public.profiles p;
