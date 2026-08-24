import { GoogleGenAI, type Content, type Part } from '@google/genai'

/**
 * Gemini, called straight from the browser with your own key.
 *
 * This app is a static site with no backend, so there is nowhere server-side to
 * hide a shared key — and a key in the bundle would be public and drained. For
 * a single-user personal tool the honest answer is your own key, kept in your
 * own browser's localStorage and never committed or bundled.
 *
 * The trade-off, stated plainly: localStorage is readable by any script running
 * on this page. That is acceptable here because the app loads no third-party
 * scripts, but it is why you should use a key you can rotate, and why this
 * should not be turned into a multi-user product without moving the key to a
 * server-side function. Google says the same thing about client-side keys.
 */

const KEY_STORAGE = 'dsa140:geminiKey:v1'
const MODEL_STORAGE = 'dsa140:geminiModel:v1'

export function loadApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function saveApiKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key)
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    // Storage blocked; the key stays in memory for this session only.
  }
}

export const hasApiKey = () => loadApiKey().trim().length > 0

export function loadModel(): string {
  try {
    return localStorage.getItem(MODEL_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function saveModel(id: string) {
  try {
    if (id) localStorage.setItem(MODEL_STORAGE, id)
  } catch {
    /* non-fatal */
  }
}

function client(): GoogleGenAI {
  const apiKey = loadApiKey().trim()
  if (!apiKey) throw new Error('No API key set. Add one in the interview settings.')
  return new GoogleGenAI({ apiKey })
}

/**
 * Model names are discovered from the key rather than hard-coded. Gemini's
 * lineup moves quickly and a name baked in here would eventually 404 for
 * everyone; asking the account what it can actually run cannot go stale.
 */
export async function listModels(): Promise<string[]> {
  const pager = await client().models.list({ config: { queryBase: true, pageSize: 100 } })
  const out: string[] = []
  for await (const m of pager) {
    const supports = m.supportedActions ?? []
    // Some listings omit supportedActions; keep those rather than hide a usable model.
    if (supports.length && !supports.includes('generateContent')) continue
    const name = (m.name ?? '').replace(/^models\//, '')
    if (!name) continue
    // Skip specialised endpoints that cannot hold an interview.
    if (/embedding|aqa|imagen|veo|tts|image-generation/i.test(name)) continue
    out.push(name)
  }
  return out
}

/** Prefer a capable text model, then fall back to whatever the key offers. */
export function pickDefaultModel(models: string[]): string {
  const score = (m: string) => {
    let s = 0
    if (/-pro/.test(m)) s += 40
    else if (/-flash/.test(m)) s += 20
    // Newer generation first: gemini-3.7 beats 3.5 beats 2.5.
    const gen = /gemini-(\d+(?:\.\d+)?)/.exec(m)
    if (gen) s += Math.min(Number(gen[1]) * 4, 30)
    if (/preview|exp|thinking/i.test(m)) s -= 6
    if (/lite/i.test(m)) s -= 10
    return s
  }
  return [...models].sort((a, b) => score(b) - score(a))[0] ?? ''
}

/** A whiteboard snapshot, already stripped of the data-URL prefix. */
export interface Snapshot {
  mediaType: 'image/png'
  base64: string
}

export interface Turn {
  role: 'user' | 'assistant'
  text: string
  /** Attached to a user turn when they submit the whiteboard for review. */
  image?: Snapshot
}

/** Gemini calls the assistant role "model". */
function toContents(turns: Turn[]): Content[] {
  return turns.map((t) => {
    const parts: Part[] = []
    if (t.role === 'user' && t.image) {
      parts.push({ inlineData: { mimeType: t.image.mediaType, data: t.image.base64 } })
    }
    parts.push({ text: t.text || 'Here is my current diagram.' })
    return { role: t.role === 'user' ? 'user' : 'model', parts }
  })
}

function activeModel(): string {
  const m = loadModel()
  if (!m) throw new Error('No model selected. Reopen the API key settings and pick one.')
  return m
}

/**
 * Streams a reply. Streaming matters here because interviewer turns can be long
 * and a 45-minute session accumulates a lot of context — a single blocking call
 * risks an HTTP timeout and shows nothing until it finishes.
 */
export async function streamReply(
  system: string,
  turns: Turn[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const stream = await client().models.generateContentStream({
    model: activeModel(),
    contents: toContents(turns),
    config: {
      systemInstruction: system,
      maxOutputTokens: 4000,
      ...(signal ? { abortSignal: signal } : {}),
    },
  })

  let full = ''
  for await (const chunk of stream) {
    const t = chunk.text
    if (t) {
      full += t
      onDelta(t)
    }
  }
  if (!full.trim()) throw new Error('The model returned an empty response. Try again.')
  return full
}

/** One-shot call used for the final grade, where no streaming UI is needed. */
export async function completeOnce(
  system: string,
  turns: Turn[],
  maxTokens = 4000,
): Promise<string> {
  const res = await client().models.generateContent({
    model: activeModel(),
    contents: toContents(turns),
    config: { systemInstruction: system, maxOutputTokens: maxTokens },
  })
  const text = res.text ?? ''
  if (!text.trim()) throw new Error('The model returned an empty grade. Try again.')
  return text
}

/**
 * Cheap round-trip that both validates the key and reports what it can run, so
 * a bad key is distinguishable from a network problem before a session starts.
 */
export async function testKey(): Promise<
  { ok: true; models: string[] } | { ok: false; error: string }
> {
  try {
    const models = await listModels()
    if (models.length === 0) {
      return { ok: false, error: 'The key works but no text models are available on it.' }
    }
    return { ok: true, models }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/API_KEY_INVALID|API key not valid|401|403/i.test(msg)) {
      return { ok: false, error: 'That key was rejected by Google.' }
    }
    if (/quota|429/i.test(msg)) {
      return { ok: false, error: 'Rate limited or out of quota — the key works but is throttled.' }
    }
    if (/fetch|network|Failed to fetch/i.test(msg)) {
      return { ok: false, error: `Could not reach Google: ${msg}` }
    }
    return { ok: false, error: msg }
  }
}
