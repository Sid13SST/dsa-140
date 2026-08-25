-- Backend 200 — database schema and access policies.
--
-- Paste this whole file into the Supabase SQL editor and run it once.
--
-- THE POINT OF THIS FILE. Every access rule lives here, in Postgres, not in
-- React. A frontend check is a suggestion — anyone can edit the JavaScript or
-- call the API directly. These policies are the actual enforcement: even with a
-- valid login and a browser console open, the database will not return another
-- user's rows and will not let anyone mark themselves paid.
--
-- The only key that can bypass all of this is the service_role key. It lives in
-- Vercel's environment variables, is used only by the serverless functions, and
-- must never appear in the repo, the browser bundle, or a chat window.

-- ---------------------------------------------------------------------------
-- profiles: one row per signed-in user, created automatically on sign-up.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_url    text,
  -- Set ONLY by the payment webhook and the verify endpoint, both of which run
  -- server-side with the service_role key. No client can write this column.
  has_paid      boolean not null default false,
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- payments: an audit trail. One row per Razorpay order, updated as it settles.
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  email               text not null,
  razorpay_order_id   text not null unique,
  razorpay_payment_id text,
  -- created → paid | failed. Nothing else is a valid state.
  status              text not null default 'created'
                        check (status in ('created', 'paid', 'failed')),
  -- Paise, because Razorpay speaks paise. 2000 = twenty rupees.
  amount              integer not null,
  currency            text not null default 'INR',
  -- Which surface confirmed it: the browser round-trip or the webhook. Useful
  -- when reconciling, because the webhook is the one you can trust.
  confirmed_by        text check (confirmed_by in ('verify', 'webhook')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_status_idx on public.payments (status);

-- ---------------------------------------------------------------------------
-- Who is the super admin. Kept in the database rather than in the frontend,
-- so changing it does not require a deploy — and so the check runs where it
-- cannot be edited by the person being checked.
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

insert into public.admins (email)
values ('siddhant.prasad8@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security. Nothing is readable until a policy says so.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.payments enable row level security;
alter table public.admins   enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- A user may edit their display fields. has_paid is deliberately excluded by
-- the trigger below rather than by trusting the client to leave it alone.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- The hard stop: if a normal client tries to change payment state, reject the
-- write outright. Only the service_role key skips RLS and reaches this table
-- with elevated rights, and it sets the flag through the server functions.
create or replace function public.guard_paid_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if new.has_paid is distinct from old.has_paid
       or new.paid_at is distinct from old.paid_at then
      raise exception 'has_paid and paid_at are set by the payment webhook only';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_paid_columns on public.profiles;
create trigger guard_paid_columns
  before update on public.profiles
  for each row execute function public.guard_paid_columns();

-- payments ------------------------------------------------------------------
-- Readable by the payer and the admin. Never writable from a browser: every
-- insert and update goes through a serverless function.
drop policy if exists "read own payments" on public.payments;
create policy "read own payments"
  on public.payments for select
  using (auth.uid() = user_id or public.is_admin());

-- admins --------------------------------------------------------------------
drop policy if exists "admins readable by admins" on public.admins;
create policy "admins readable by admins"
  on public.admins for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Create a profile row the moment someone signs up, so the app never has to
-- handle a logged-in user with no profile.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Admin view: who signed up, who paid. Reads through the policies above, so a
-- non-admin selecting from it gets an empty result rather than an error.
-- ---------------------------------------------------------------------------
create or replace view public.admin_users
with (security_invoker = true)
as
  select
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.has_paid,
    p.paid_at,
    p.created_at,
    p.last_seen_at,
    (select count(*) from public.payments pay
      where pay.user_id = p.id and pay.status = 'paid') as successful_payments,
    (select count(*) from public.payments pay
      where pay.user_id = p.id and pay.status = 'failed') as failed_payments
  from public.profiles p;
