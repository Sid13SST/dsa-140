import datetime, json, os
from pool import POOL

START = datetime.date(2026, 8, 22)
NDAYS = 140
CHECKPOINT = datetime.date(2026, 12, 31)  # interview-ready milestone (day 132)

# Phase blocks: (phase name, topics drawn from, number of days)
PHASES = [
    ("Foundations",      ["Arrays & Hashing"],                          12),
    ("Foundations",      ["Two Pointers"],                               7),
    ("Foundations",      ["Sliding Window"],                             7),
    ("Foundations",      ["Strings"],                                    8),
    ("Core Structures",  ["Stack"],                                      8),
    ("Core Structures",  ["Binary Search"],                              8),
    ("Core Structures",  ["Linked List"],                                8),
    ("Core Structures",  ["Trees"],                                     14),
    ("Core Structures",  ["Tries"],                                      4),
    ("Core Structures",  ["Heap / Priority Queue"],                      6),
    ("Recursion & Graphs",["Backtracking"],                              8),
    ("Recursion & Graphs",["Graphs"],                                   13),
    ("Recursion & Graphs",["Union Find"],                                4),
    ("Dynamic Programming",["1-D Dynamic Programming"],                  9),
    ("Dynamic Programming",["2-D Dynamic Programming"],                  8),
    ("Optimization",     ["Greedy", "Intervals"],                        6),
    ("Optimization",     ["Bit Manipulation", "Math & Geometry"],        6),
    ("Interview Sim",    ["MIXED"],                                      4),
]

assert sum(p[2] for p in PHASES) == NDAYS, sum(p[2] for p in PHASES)

# Build per-day topic assignment
day_topic = []   # list of (phase, [topics])
for phase, topics, n in PHASES:
    for _ in range(n):
        day_topic.append((phase, topics))

# Pointers into each topic list
ptr = {t: 0 for t in POOL}
used = set()

def take(topic, k):
    out = []
    lst = POOL[topic]
    while ptr[topic] < len(lst) and len(out) < k:
        item = lst[ptr[topic]]
        ptr[topic] += 1
        if item[0] in used:
            continue
        used.add(item[0])
        out.append(item)
    return out

# Leftovers pool for mixed/review days, in a sensible revision order
def leftovers():
    out = []
    for t, lst in POOL.items():
        for it in lst:
            if it[0] not in used:
                out.append((t, it))
    return out

# --- Pass 1: build the day skeleton (kind, phase, topic) ---
days = []
d = START
for i in range(NDAYS):
    phase, topics = day_topic[i]
    dow = d.weekday()  # Mon=0 .. Sun=6
    daynum = i + 1

    is_sunday = dow == 6
    is_biweekly_sat = (dow == 5) and (((d - START).days // 7) % 2 == 0)
    is_review = (daynum % 14 == 0)

    if topics == ["MIXED"]:
        kind = "mixed"
    elif is_review:
        kind = "review"
    elif is_sunday:
        kind = "contest"
    else:
        kind = "study"

    days.append({
        "day": daynum,
        "date": d.isoformat(),
        "phase": phase,
        "topic": topics[0] if topics != ["MIXED"] else "Mixed revision",
        "_topics": topics,
        "kind": kind,
        "lcWeekly": is_sunday,
        "lcBiweekly": is_biweekly_sat,
        "isCheckpoint": d == CHECKPOINT,
        "problems": [],
    })
    d += datetime.timedelta(days=1)

# --- Pass 2: distribute each phase block's problems evenly over its days ---
# Contest days carry half weight so Sundays stay light.
WEIGHT = {"study": 2, "review": 2, "contest": 1, "mixed": 2}

idx = 0
for phase, topics, n in PHASES:
    block = days[idx:idx + n]
    idx += n
    if topics == ["MIXED"]:
        continue  # filled from leftovers in pass 3

    items = []
    for t in topics:
        for it in POOL[t]:
            if it[0] not in used:
                items.append((t, it))
                used.add(it[0])

    weights = [WEIGHT[b["kind"]] for b in block]
    tw = sum(weights)
    # Largest-remainder apportionment so every problem lands somewhere
    exact = [len(items) * w / tw for w in weights]
    counts = [int(e) for e in exact]
    rem = len(items) - sum(counts)
    order = sorted(range(len(block)), key=lambda k: exact[k] - counts[k], reverse=True)
    for k in order[:rem]:
        counts[k] += 1

    pos = 0
    for b, c in zip(block, counts):
        for t, it in items[pos:pos + c]:
            b["problems"].append(
                {"slug": it[0], "title": it[1], "difficulty": it[2], "topic": t}
            )
        pos += c

# --- Pass 3: leftovers go to the mixed revision days at the end ---
mixed_days = [x for x in days if x["kind"] == "mixed"]
rest = leftovers()
for j, (t, it) in enumerate(rest):
    tgt = mixed_days[j % len(mixed_days)]
    tgt["problems"].append(
        {"slug": it[0], "title": it[1], "difficulty": it[2], "topic": t}
    )
    used.add(it[0])

# --- Pass 4: final days get a high-value revisit set (re-solve, not new) ---
REVISIT = [
 "two-sum","longest-substring-without-repeating-characters","3sum","merge-intervals",
 "product-of-array-except-self","minimum-window-substring","valid-parentheses",
 "daily-temperatures","search-in-rotated-sorted-array","reverse-linked-list",
 "lru-cache","merge-k-sorted-lists","binary-tree-level-order-traversal",
 "validate-binary-search-tree","lowest-common-ancestor-of-a-binary-tree",
 "implement-trie-prefix-tree","find-median-from-data-stream","subsets",
 "combination-sum","word-search","number-of-islands","course-schedule",
 "coin-change","longest-increasing-subsequence","word-break","house-robber",
 "unique-paths","longest-common-subsequence",
]
# Resolve slugs against the pool so titles/difficulties stay accurate
INDEX = {}
for t, lst in POOL.items():
    for s_, ti_, df_ in lst:
        INDEX[s_] = (t, ti_, df_)

revisit_resolved = []
for s_ in REVISIT:
    if s_ in INDEX:
        t, ti_, df_ = INDEX[s_]
        revisit_resolved.append({"slug": s_, "title": ti_, "difficulty": df_,
                                 "topic": t, "revisit": True})
    else:
        print("  !! revisit slug not in pool, dropped:", s_)

for j, item in enumerate(revisit_resolved):
    mixed_days[j % len(mixed_days)]["problems"].append(item)

for x in days:
    del x["_topics"]

total = sum(len(x["problems"]) for x in days)
by_diff = {}
for x in days:
    for p in x["problems"]:
        by_diff[p["difficulty"]] = by_diff.get(p["difficulty"], 0) + 1

print("days:", len(days))
print("total problems scheduled:", total)
print("unique used:", len(used))
print("by difficulty:", by_diff)
print("kinds:", {k: sum(1 for x in days if x["kind"] == k) for k in ("study","review","contest","mixed")})
print("max/day:", max(len(x["problems"]) for x in days), "min/day:", min(len(x["problems"]) for x in days))

ts = "// AUTO-GENERATED. Do not edit by hand. See scripts/gen_schedule.py\n"
ts += "import type { Day } from '../types';\n\n"
ts += "export const START_DATE = '%s';\n" % START.isoformat()
ts += "export const TOTAL_DAYS = %d;\n" % NDAYS
ts += "export const CHECKPOINT_DATE = '%s';\n\n" % CHECKPOINT.isoformat()
ts += "export const SCHEDULE: Day[] = " + json.dumps(days, indent=1) + ";\n"

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "data")
os.makedirs(OUT_DIR, exist_ok=True)
with open(os.path.join(OUT_DIR, "schedule.ts"), "w") as f:
    f.write(ts)
print("written to", os.path.join(OUT_DIR, "schedule.ts"))
