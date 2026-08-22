import type { Progress } from '../types'

const KEY = 'dsa140:progress:v1'

export function loadLocal(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Progress) : {}
  } catch {
    return {}
  }
}

export function saveLocal(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // Storage can be full or blocked; progress stays in memory for this session.
  }
}

export function exportJSON(p: Progress): string {
  return JSON.stringify(p, null, 2)
}

export function importJSON(text: string): Progress {
  const parsed = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('That file is not a progress export.')
  }
  return parsed as Progress
}
