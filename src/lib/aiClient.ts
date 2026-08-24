import Anthropic from '@anthropic-ai/sdk'

/**
 * Bring-your-own-key, called straight from the browser.
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
 * server-side function.
 */

const KEY_STORAGE = 'dsa140:anthropicKey:v1'

export const MODEL = 'claude-opus-5'

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

function client(): Anthropic {
  const apiKey = loadApiKey().trim()
  if (!apiKey) throw new Error('No API key set. Add one in the interview settings.')
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
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

function toMessages(turns: Turn[]): Anthropic.MessageParam[] {
  return turns.map((t) => {
    if (t.role === 'user' && t.image) {
      return {
        role: 'user' as const,
        content: [
          {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: t.image.mediaType,
              data: t.image.base64,
            },
          },
          { type: 'text' as const, text: t.text || 'Here is my current diagram.' },
        ],
      }
    }
    return { role: t.role, content: t.text }
  })
}

/**
 * Streams a reply. Streaming matters here because interviewer turns can be long
 * and a 45-minute session accumulates a lot of context — a non-streaming call
 * risks an HTTP timeout.
 */
export async function streamReply(
  system: string,
  turns: Turn[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const stream = client().messages.stream(
    {
      model: MODEL,
      max_tokens: 4000,
      system,
      messages: toMessages(turns),
    },
    { signal },
  )

  stream.on('text', (delta) => onDelta(delta))
  const final = await stream.finalMessage()
  return final.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
}

/** One-shot call used for the final grade, where no streaming UI is needed. */
export async function completeOnce(
  system: string,
  turns: Turn[],
  maxTokens = 4000,
): Promise<string> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: toMessages(turns),
  })
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
}

/** Cheap round-trip to tell a bad key from a network problem before a session starts. */
export async function testKey(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await client().messages.create({
      model: MODEL,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
    })
    return { ok: true }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, error: 'That key was rejected.' }
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: 'Rate limited — the key works but is throttled.' }
    if (e instanceof Anthropic.APIError) return { ok: false, error: `API error ${e.status}: ${e.message}` }
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
