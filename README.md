# DSA 140

A 140-day interview-prep tracker running **22 Aug 2026 → 8 Jan 2027**, with an
interview-ready checkpoint on **31 Dec 2026** (day 132).

- **503 curated LeetCode problems**, every one linked directly to its problem page
- 1–7 problems a day, sequenced by topic across 5 phases
- Daily hours input, absent marking, per-problem checkboxes, and notes
- A 140-cell consistency grid and a month calendar
- Upcoming Codeforces + LeetCode contests, refreshed automatically
- Backlog view that surfaces anything you missed
- Works offline in local mode; optional sign-in syncs across devices

---

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL. That's it — no accounts, no keys. Progress saves to this
browser's local storage.

## Build

```bash
npm run build     # type-checks, then bundles to dist/
npm run preview   # serve the production build locally
```

---

## The schedule

| Phase | Days | Topics |
|---|---|---|
| Foundations | 1–39 | Arrays & Hashing, Two Pointers, Sliding Window, Strings |
| Core Structures | 40–92 | Stack, Binary Search, Linked List, Trees, Tries, Heaps |
| Recursion & Graphs | 93–117 | Backtracking, Graphs, Union Find |
| Dynamic Programming | 118–134 | 1-D DP, 2-D DP |
| Optimization & Sim | 135–140 | Greedy, Intervals, Bit Manipulation, Math, final revision |

Difficulty mix: 161 Easy · 311 Medium · 59 Hard.

Sundays are lighter (contest days). Every 14th day is a revision day. The last
four days are re-solves of 28 high-frequency problems rather than new material.

**Day 1 is the day you sign in**, not a date baked into the generated plan. The
schedule ships dated from a fixed start; on first load it is re-dated so day 1
is your first day, and that start is then frozen (progress is keyed by date, so
a start that moved would orphan your log). Sunday contest days and the LeetCode
Weekly/Biweekly markers are recomputed against the real calendar, so they still
land on actual Sundays and Saturdays. A run started before this change keeps its
original dates.

### Regenerating the schedule

The schedule is generated, not hand-written. To change phase lengths, problems
per day, or the problem pool:

```bash
cd scripts
python3 gen_schedule.py    # rewrites src/data/schedule.ts
```

Edit `scripts/pool.py` to add or remove problems, and the `PHASES` list in
`scripts/gen_schedule.py` to reshape the timeline. The script asserts that phase
day counts sum to exactly 140, so it fails loudly if the arithmetic is off.

### Verifying the problem links

```bash
npm run check:links
```

Hits every unique slug and reports 404s. LeetCode rate-limits, so some results
come back inconclusive — re-run later to confirm those.

---

## Contests

**Codeforces, CodeChef and AtCoder** rounds are fetched **server-side**, because
they have to be: of the three, only Codeforces sends CORS headers, so a browser
calling CodeChef or AtCoder directly gets nothing. There are two server paths,
in this order:

1. **`/api/contests`** — a serverless function (`api/contests.ts`) that fetches
   all three per request, cached 15 minutes at the edge. Always current, on any
   branch or preview deploy. Needs a host that runs functions (Vercel).
2. **`public/contests.json`** — a snapshot committed by a scheduled Action
   (`.github/workflows/update-contests.yml`) every 3 hours, for hosts that serve
   static files only (GitHub Pages). The file is only committed on the default
   branch, so a build from any other branch carries the snapshot from when that
   branch was cut — which is why it is the fallback and not the source of truth.

Both read the same fetchers in `api/_lib/contest-sources.mjs`. If neither
answers, the client tops up from Codeforces alone, which is all CORS allows.

**LeetCode** contests are computed from the fixed recurring schedule — Weekly
every Sunday 08:00 IST, Biweekly on alternate Saturdays 20:00 IST — because
LeetCode's GraphQL endpoint also blocks browser requests. These are labelled
`recurring` in the UI.

> One thing to set once: `BIWEEKLY_ANCHOR` in `src/lib/contests.ts` must be a
> Saturday on which a Biweekly actually ran. Check
> [leetcode.com/contest](https://leetcode.com/contest/), set it, and the
> alternating series stays correct from then on.

---

## Optional: sign-in and cross-device sync

Without configuration the app runs in **local mode** — everything works, progress
lives in this browser. Use Export/Import in the sidebar to move it or keep a backup.

To sync across devices:

1. Create a project at [supabase.com](https://supabase.com) (free tier is enough).
2. In the SQL editor, run:

```sql
create table public.progress (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "own rows" on public.progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

3. Copy `.env.example` to `.env` and fill in your project URL and anon key
   (Settings → API). The anon key is safe in a browser — row-level security is
   what protects the data.
4. Restart `npm run dev`. A **Sign in** button appears; it sends a magic link, so
   there's no password to manage.

For the deployed site, add the same two values as repository secrets named
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Settings → Secrets and
variables → Actions). The deploy workflow reads them at build time.

---

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`. Enable it once:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

The site then publishes to `https://<username>.github.io/<repo>/`. The Vite `base`
is `'./'`, so it works from a subpath without further configuration.

Vercel and Netlify also work with no changes — build command `npm run build`,
output directory `dist`.

---

## Layout

```
src/
  data/schedule.ts     generated — 140 days, 531 problem entries
  lib/contests.ts      contest loading (API → file → live) + LeetCode schedule
  lib/runStart.ts      pins day 1 to your sign-in day and re-dates the plan
  lib/storage.ts       local storage read/write, export/import
  lib/auth.tsx         Clerk-backed sign-in (no-ops when auth is off)
  components/          Header, Overview, DayPanel, Panels
api/
  contests.ts          GET /api/contests — live rounds, fetched server-side
  _lib/contest-sources.mjs  the three fetchers, shared with the CI script
scripts/
  pool.py              the 503-problem curated pool
  gen_schedule.py      distributes the pool across 140 days
  fetch-contests.mjs   run by CI to refresh contests.json
  check-links.mjs      validates every LeetCode slug
```

## Notes

- Marking a day **absent** excuses it: it won't break your streak, and its
  problems move to the backlog instead of counting as missed.
- Checking off every problem on a day marks that day done automatically.
- "On-pace" compares problems solved against problems scheduled through today —
  not against the full 503 — so it stays meaningful early on.
