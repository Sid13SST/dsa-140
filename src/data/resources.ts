/**
 * Curated learning material, keyed by the topic names used in the schedule.
 *
 * Every URL here was checked to resolve, and every YouTube id was resolved
 * through the oEmbed API so the listed `source` is the real uploader rather
 * than a re-upload channel. When adding entries, verify the same way:
 *   curl "https://www.youtube.com/oembed?url=<encoded-url>&format=json"
 */

export type ResourceKind = 'video' | 'reading' | 'practice'

export interface Resource {
  label: string
  url: string
  kind: ResourceKind
  /** The uploader/publisher, shown so the learner knows what they're opening. */
  source: string
}

const yt = (id: string) => `https://www.youtube.com/playlist?list=${id}`
const ytv = (id: string) => `https://www.youtube.com/watch?v=${id}`

/** Shown on every day, under the topic-specific material. */
export const GENERAL_RESOURCES: Resource[] = [
  {
    label: "Striver's A2Z DSA Sheet — full structured syllabus",
    url: 'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/',
    kind: 'reading',
    source: 'takeUforward',
  },
  {
    label: 'NeetCode Practice — problems grouped by pattern',
    url: 'https://neetcode.io/practice',
    kind: 'practice',
    source: 'NeetCode',
  },
  {
    label: 'Big-O Cheat Sheet — complexity of every common structure',
    url: 'https://www.bigocheatsheet.com/',
    kind: 'reading',
    source: 'bigocheatsheet.com',
  },
]

const TUF_A2Z = yt('PLgUwDviBIf0oF6QL8m22w1hIDC1vJ_BHz')
const TUF_TWO_PTR_SW = yt('PLgUwDviBIf0q7vrFA_HEWcqRqMpCXzYAL')
const TUF_GRAPH = yt('PLgUwDviBIf0oE3gA41TKO2H5bHpPd7fzn')
const TUF_DP = yt('PLgUwDviBIf0qUlt5H_kiKYaNSqJ81PMMY')
const TUF_GREEDY = yt('PLgUwDviBIf0rF1w2Koyh78zafB0cz7tea')

export const TOPIC_RESOURCES: Record<string, Resource[]> = {
  'Arrays & Hashing': [
    { label: 'Arrays — basics to advanced', url: yt('PLgUwDviBIf0rENwdL0nEH0uGom9no0nyB'), kind: 'video', source: 'take U forward' },
    { label: 'Array and String — guided card', url: 'https://leetcode.com/explore/learn/card/array-and-string/', kind: 'practice', source: 'LeetCode Explore' },
  ],
  'Two Pointers': [
    { label: 'Two Pointer & Sliding Window — full course', url: TUF_TWO_PTR_SW, kind: 'video', source: 'take U forward' },
    { label: 'Array and String — guided card', url: 'https://leetcode.com/explore/learn/card/array-and-string/', kind: 'practice', source: 'LeetCode Explore' },
  ],
  'Sliding Window': [
    { label: 'Two Pointer & Sliding Window — templates and patterns', url: TUF_TWO_PTR_SW, kind: 'video', source: 'take U forward' },
  ],
  Strings: [
    { label: 'A2Z DSA course — strings section', url: TUF_A2Z, kind: 'video', source: 'take U forward' },
    { label: 'Prefix function / KMP explained', url: 'https://cp-algorithms.com/string/prefix-function.html', kind: 'reading', source: 'CP-Algorithms' },
  ],
  Stack: [
    { label: 'Stack and Queue — full playlist', url: yt('PLgUwDviBIf0pOd5zvVVSzgpo6BaCpHT9c'), kind: 'video', source: 'take U forward' },
  ],
  'Binary Search': [
    { label: 'Binary Search — beginner to advanced', url: yt('PLgUwDviBIf0pMFMWuuvDNMAkoQFi-h0ZF'), kind: 'video', source: 'take U forward' },
    { label: 'Binary search & the search-on-answer trick', url: 'https://cp-algorithms.com/num_methods/binary_search.html', kind: 'reading', source: 'CP-Algorithms' },
  ],
  'Linked List': [
    { label: 'Linked List — beginner to advanced', url: yt('PLgUwDviBIf0rAuz8tVcM0AymmhTRsfaLU'), kind: 'video', source: 'take U forward' },
    { label: 'Linked List — guided card', url: 'https://leetcode.com/explore/learn/card/linked-list/', kind: 'practice', source: 'LeetCode Explore' },
  ],
  Trees: [
    { label: 'Binary Trees & BST — full series', url: yt('PLgUwDviBIf0q8Hkd7bK2Bpryj2xVJk8Vk'), kind: 'video', source: 'take U forward' },
    { label: 'Segment trees — range queries', url: 'https://cp-algorithms.com/data_structures/segment_tree.html', kind: 'reading', source: 'CP-Algorithms' },
  ],
  Tries: [
    { label: 'Trie series', url: yt('PLgUwDviBIf0pcIDCZnxhv0LkHf5KzG9zp'), kind: 'video', source: 'take U forward' },
    { label: 'Aho-Corasick — tries taken further', url: 'https://cp-algorithms.com/string/aho_corasick.html', kind: 'reading', source: 'CP-Algorithms' },
  ],
  'Heap / Priority Queue': [
    { label: 'Heap playlist — how to spot a heap problem', url: yt('PL_z_8CaSLPWdtY9W22VjnPxG30CXNZpI9'), kind: 'video', source: 'Aditya Verma' },
  ],
  Backtracking: [
    { label: 'Recursion & Backtracking — basics to advanced', url: yt('PLgUwDviBIf0rGlzIn_7rsaR2FQ5e6ZOL9'), kind: 'video', source: 'take U forward' },
    { label: 'Recursion I — guided card', url: 'https://leetcode.com/explore/learn/card/recursion-i/', kind: 'practice', source: 'LeetCode Explore' },
  ],
  Graphs: [
    { label: 'Graph series — interview centric', url: TUF_GRAPH, kind: 'video', source: 'take U forward' },
    { label: 'Breadth-first search', url: 'https://cp-algorithms.com/graph/breadth-first-search.html', kind: 'reading', source: 'CP-Algorithms' },
    { label: 'Depth-first search', url: 'https://cp-algorithms.com/graph/depth-first-search.html', kind: 'reading', source: 'CP-Algorithms' },
  ],
  'Union Find': [
    { label: 'Graph series — includes DSU', url: TUF_GRAPH, kind: 'video', source: 'take U forward' },
    { label: 'Disjoint Set Union — the definitive write-up', url: 'https://cp-algorithms.com/data_structures/disjoint_set_union.html', kind: 'reading', source: 'CP-Algorithms' },
  ],
  '1-D Dynamic Programming': [
    { label: 'DP series — recursion to tabulation', url: TUF_DP, kind: 'video', source: 'take U forward' },
    { label: 'Dynamic Programming 1D — full course', url: ytv('_i4Yxeh5ceQ'), kind: 'video', source: 'NeetCode' },
    { label: 'Introduction to DP', url: 'https://cp-algorithms.com/dynamic_programming/intro-to-dp.html', kind: 'reading', source: 'CP-Algorithms' },
  ],
  '2-D Dynamic Programming': [
    { label: 'DP series — grid and string DP', url: TUF_DP, kind: 'video', source: 'take U forward' },
    { label: 'Dynamic Programming 2D — full course', url: ytv('qMky6D6YtXU'), kind: 'video', source: 'NeetCode' },
  ],
  Greedy: [
    { label: 'Greedy algorithms — full playlist', url: TUF_GREEDY, kind: 'video', source: 'take U forward' },
  ],
  Intervals: [
    { label: 'Greedy playlist — merge/insert interval problems', url: TUF_GREEDY, kind: 'video', source: 'take U forward' },
  ],
  'Bit Manipulation': [
    { label: 'Bit manipulation — full course', url: yt('PLgUwDviBIf0rnqh8QsJaHyIX7KUiaPUv7'), kind: 'video', source: 'take U forward' },
    { label: 'Binary exponentiation', url: 'https://cp-algorithms.com/algebra/binary-exp.html', kind: 'reading', source: 'CP-Algorithms' },
  ],
  'Math & Geometry': [
    { label: 'Maths playlist', url: yt('PLgUwDviBIf0oFON1SRGcMqMIhiZ4EXx_F'), kind: 'video', source: 'take U forward' },
    { label: 'Basic geometry', url: 'https://cp-algorithms.com/geometry/basic-geometry.html', kind: 'reading', source: 'CP-Algorithms' },
    { label: 'Binomial coefficients', url: 'https://cp-algorithms.com/combinatorics/binomial-coefficients.html', kind: 'reading', source: 'CP-Algorithms' },
  ],
  'Mixed revision': [
    { label: 'A2Z DSA course — full syllabus revision', url: TUF_A2Z, kind: 'video', source: 'take U forward' },
  ],
}

/** Resources for a day: its own topic first, then the topics of its problems. */
export function resourcesForTopics(topics: string[]): Resource[] {
  const seen = new Set<string>()
  const out: Resource[] = []
  for (const t of topics) {
    for (const r of TOPIC_RESOURCES[t] ?? []) {
      if (seen.has(r.url)) continue
      seen.add(r.url)
      out.push(r)
    }
  }
  return out
}

/**
 * Per-problem help. Both links are constructed rather than curated: LeetCode's
 * solutions tab exists for every problem, and a YouTube search always resolves
 * — so neither can rot the way a hand-picked video id would.
 */
export function problemHelp(slug: string, title: string) {
  return {
    editorial: `https://leetcode.com/problems/${slug}/solutions/`,
    video: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} leetcode solution`)}`,
  }
}
