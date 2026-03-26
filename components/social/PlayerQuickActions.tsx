'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function PlayerQuickActions({
  userId,
  compact = false,
}: {
  userId: string
  compact?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState(false)

  const openMessage = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/chat/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Could not open chat')
      router.push(`/messages/${j.thread_id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not open chat')
    } finally {
      setBusy(false)
    }
  }

  const sendConnect = async () => {
    if (busy || connected) return
    setBusy(true)
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ to_user_id: userId }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not send connection request')
      }
      setConnected(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not connect')
    } finally {
      setBusy(false)
    }
  }

  const cls = compact
    ? 'min-h-[32px] px-2.5 text-[11px] rounded-lg'
    : 'min-h-[40px] px-3 text-xs rounded-xl'

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      <button
        type="button"
        onClick={openMessage}
        disabled={busy}
        className={`${cls} border border-stone-soft bg-white text-ink font-medium hover:bg-beige disabled:opacity-60`}
      >
        {busy ? '...' : 'Message'}
      </button>
      <button
        type="button"
        onClick={sendConnect}
        disabled={busy || connected}
        className={`${cls} border border-stone-soft bg-white text-ink font-medium hover:bg-beige disabled:opacity-60`}
      >
        {connected ? 'Connected' : 'Connect'}
      </button>
      <Link
        href={`/players/${encodeURIComponent(userId)}`}
        className={`${cls} inline-flex items-center border border-terracotta/35 text-terracotta font-semibold hover:bg-terracotta/10`}
      >
        Challenge
      </Link>
      <Link
        href={`/players/${encodeURIComponent(userId)}`}
        className={`${cls} inline-flex items-center border border-stone-soft text-stone font-medium hover:bg-beige`}
      >
        Profile
      </Link>
    </div>
  )
}
