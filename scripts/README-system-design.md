# Regenerating the system design track

`src/data/systemDesign.ts` is **generated**. Do not hand-edit video ids in it —
an early hand-typed pass had 35 of 74 ids wrong, pointing at unrelated videos
or at nothing. Ids come only from a live scrape.

```bash
# 1. scrape the playlists (ids, titles, real durations)
VIDEOS=/tmp/videos.json node scripts/scrape-sd-videos.cjs

# 2. resolve every day's video by title fragment; fails loudly on no match
VIDEOS=/tmp/videos.json OUT_JSON=/tmp/track.json node scripts/gen-sd-track.cjs

# 3. emit the TypeScript
IN_JSON=/tmp/track.json OUT_TS=src/data/systemDesign.ts node scripts/emit-sd-track.cjs

# 4. verify: every id must exist in the scrape, plus a live oEmbed sample
SD_FILE=src/data/systemDesign.ts VIDEOS=/tmp/videos.json node scripts/verify-sd-ids.cjs
```

To add or change a day, edit the `ROWS` table in `gen-sd-track.cjs` — each row
names a **title fragment**, not an id — then re-run steps 2–4.

Step 4 must report `ids absent from scrape: 0` and a fully passing live sample.

## Practice question bank

`src/data/sdPractice.ts` is generated the same way — reference video ids are
resolved by title fragment, never typed.

```bash
VIDEOS=/tmp/videos.json OUT_TS=src/data/sdPractice.ts node scripts/gen-sd-practice.cjs
SD_FILE=src/data/sdPractice.ts VIDEOS=/tmp/videos.json node scripts/verify-sd-ids.cjs
```

Each question carries a rubric because system design has no judge: seven
universal framework points (shared, defined once in the generator) plus five
specific to that system. The UI hides the rubric until an attempt is finished,
so it cannot be used as a checklist while designing.
