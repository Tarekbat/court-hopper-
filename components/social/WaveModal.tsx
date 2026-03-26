'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from '@/components/Icons'

type UserHit = { id: string; name: string | null; image: string | null }

export default function WaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<UserHit[]>([])
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) {
      setQ('')
      setHits([])
      setErr('')
    }
  }, [open])

  const runSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setHits([])
      return
    }
    setSearching(true)
    setErr('')
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(term.trim())}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setHits(Array.isArray(data) ? data : [])
    } catch {
      setHits([])
      setErr('Could not search. Try again.')
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => runSearch(q), 280)
    return () => clearTimeout(t)
  }, [q, runSearch])

  const waveAt = async (userId: string) => {
    setSending(userId)
    setErr('')
    try {
      const res = await fetch('/api/social/wave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ to_user_id: userId }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Wave failed')
      onClose()
      router.push(`/messages/${j.thread_id}`)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Wave failed')
    } finally {
      setSending(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-stone-soft shadow-xl max-h-[min(90dvh,640px)] flex flex-col"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-soft shrink-0">
          <div>
            <h2 className="text-lg font-display text-ink">Wave at someone</h2>
            <p className="text-xs text-stone mt-0.5">We&apos;ll open a chat so you can plan a hit.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-beige text-stone"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-3 shrink-0">
          <label htmlFor="wave-search" className="sr-only">
            Search players by name
          </label>
          <input
            id="wave-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name (2+ letters)"
            autoComplete="off"
            className="w-full min-h-[48px] px-4 rounded-xl border-2 border-terracotta/30 text-ink bg-white focus:ring-2 focus:ring-terracotta"
          />
        </div>
        {err && <p className="px-5 text-sm text-red-700 mb-2">{err}</p>}
        <ul className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {searching && <li className="text-center text-sm text-stone py-6">Searching…</li>}
          {!searching &&
            hits.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  disabled={!!sending}
                  onClick={() => waveAt(u.id)}
                  className="w-full flex items-center gap-3 min-h-[52px] px-3 rounded-xl hover:bg-beige text-left border border-transparent hover:border-stone-soft transition-colors"
                >
                  {u.image ? (
                    <img src={u.image} alt="" className="w-10 h-10 rounded-full object-cover border border-stone-soft" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-terracotta/15 flex items-center justify-center text-terracotta font-semibold">
                      {(u.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-ink flex-1 truncate">{u.name || 'Player'}</span>
                  <span className="text-sm text-terracotta font-medium shrink-0">
                    {sending === u.id ? '…' : 'Wave'}
                  </span>
                </button>
              </li>
            ))}
          {!searching && q.trim().length >= 2 && hits.length === 0 && (
            <li className="text-center text-sm text-stone py-8">No players match that name.</li>
          )}
          {!searching && q.trim().length < 2 && (
            <li className="text-center text-sm text-stone py-8 px-4">
              Type a name to find someone you&apos;ve seen on SETRA.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
