import { useEffect, useState } from 'react'
import { cloudEnabled, signInWithEmail, signOut } from '../lib/supabase'

interface Props {
  dayNumber: number | null
  totalDays: number
  userEmail: string | null
  syncState: 'idle' | 'saving' | 'error'
}

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const time = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const date = now.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="text-right">
      <div className="font-mono text-2xl sm:text-3xl font-bold tabular-nums leading-none">
        {time}
      </div>
      <div className="eyebrow mt-1">{date}</div>
    </div>
  )
}

function AuthControl({ userEmail }: { userEmail: string | null }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  if (!cloudEnabled) {
    return (
      <span className="eyebrow" title="Set Supabase env vars to enable sign-in and cross-device sync.">
        local mode
      </span>
    )
  }

  if (userEmail) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted hidden sm:inline">{userEmail}</span>
        <button className="btn" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        Sign in
      </button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {sent ? (
        <span className="text-xs text-ac font-medium">
          Check {email} for your sign-in link.
        </span>
      ) : (
        <div className="flex gap-1">
          <input
            className="field w-48"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={async () => {
              setErr(null)
              try {
                await signInWithEmail(email)
                setSent(true)
              } catch (e) {
                setErr(e instanceof Error ? e.message : 'Sign-in failed.')
              }
            }}
          >
            Send link
          </button>
        </div>
      )}
      {err && <span className="text-xs text-miss">{err}</span>}
    </div>
  )
}

export default function Header({ dayNumber, totalDays, userEmail, syncState }: Props) {
  return (
    <header className="border-b border-rule bg-surface/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight leading-none">
            DSA 140
          </h1>
          <div className="eyebrow mt-1">
            {dayNumber === null ? (
              <>schedule starts 22 Aug 2026</>
            ) : (
              <>
                day <span className="text-ink font-bold">{dayNumber}</span> of {totalDays}
              </>
            )}
            {syncState === 'saving' && <span className="ml-2 text-muted">saving…</span>}
            {syncState === 'error' && <span className="ml-2 text-miss">sync failed</span>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AuthControl userEmail={userEmail} />
          <Clock />
        </div>
      </div>
    </header>
  )
}
