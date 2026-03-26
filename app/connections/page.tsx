'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { format, parseISO } from 'date-fns'

type Connection = {
  id: string
  requester_id: string
  recipient_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  requester?: { id: string; name: string | null; image: string | null } | null
  recipient?: { id: string; name: string | null; image: string | null } | null
}

export default function ConnectionsPage() {
  const [rows, setRows] = useState<Connection[]>([])
  const [me, setMe] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [meRes, listRes] = await Promise.all([
        fetch('/api/profile', { credentials: 'include' }),
        fetch('/api/connections', { credentials: 'include' }),
      ])
      if (meRes.ok) {
        const meJson = await meRes.json()
        setMe(meJson.id ?? null)
      }
      if (listRes.ok) {
        const j = await listRes.json()
        setRows(j.connections ?? [])
      } else {
        setRows([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const respond = async (id: string, status: 'accepted' | 'declined') => {
    setBusy(id + status)
    try {
      const res = await fetch(`/api/connections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error || 'Could not update request')
        return
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  const incomingPending = useMemo(
    () => rows.filter((r) => r.status === 'pending' && r.recipient_id === me),
    [rows, me]
  )
  const accepted = useMemo(() => rows.filter((r) => r.status === 'accepted'), [rows])

  const otherParty = (r: Connection) =>
    r.requester_id === me ? r.recipient : r.requester
  const otherPartyId = (r: Connection) =>
    r.requester_id === me ? r.recipient_id : r.requester_id

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />
        <main className="max-w-3xl mx-auto px-4 pt-24 pb-12 md:pt-28">
          <h1 className="text-2xl font-display text-ink mb-2">Connections</h1>
          <p className="text-sm text-stone mb-8">Your social graph and incoming requests.</p>

          <section className="mb-8">
            <h2 className="text-sm font-semibold text-stone uppercase tracking-wide mb-3">
              Incoming requests
            </h2>
            {loading ? (
              <p className="text-sm text-stone">Loading…</p>
            ) : incomingPending.length === 0 ? (
              <p className="text-sm text-stone">No pending requests.</p>
            ) : (
              <ul className="space-y-3">
                {incomingPending.map((r) => (
                  <li key={r.id} className="bg-white border border-stone-soft rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      {otherParty(r)?.image ? (
                        <img
                          src={otherParty(r)?.image || ''}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-stone-soft"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-terracotta text-white flex items-center justify-center font-semibold">
                          {(otherParty(r)?.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink truncate">
                          {otherParty(r)?.name || 'Player'}
                        </p>
                        <p className="text-xs text-stone">
                          {format(parseISO(r.created_at), 'MMM d · h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => respond(r.id, 'accepted')}
                        className="min-h-[44px] px-4 rounded-xl btn-premium text-white text-sm font-semibold disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => respond(r.id, 'declined')}
                        className="min-h-[44px] px-4 rounded-xl border border-stone-soft text-sm font-medium text-ink disabled:opacity-60"
                      >
                        Decline
                      </button>
                      <Link
                        href={`/players/${encodeURIComponent(otherPartyId(r))}`}
                        className="min-h-[44px] inline-flex items-center px-4 text-sm font-medium text-terracotta"
                      >
                        View profile
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-stone uppercase tracking-wide mb-3">
              Connected players
            </h2>
            {loading ? (
              <p className="text-sm text-stone">Loading…</p>
            ) : accepted.length === 0 ? (
              <p className="text-sm text-stone">No connections yet.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accepted.map((r) => (
                  <li key={r.id} className="bg-white border border-stone-soft rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      {otherParty(r)?.image ? (
                        <img
                          src={otherParty(r)?.image || ''}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-stone-soft"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-terracotta text-white flex items-center justify-center font-semibold">
                          {(otherParty(r)?.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink truncate">
                          {otherParty(r)?.name || 'Player'}
                        </p>
                        <p className="text-xs text-stone">
                          Connected {format(parseISO(r.created_at), 'MMM d')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Link
                        href={`/players/${encodeURIComponent(otherPartyId(r))}`}
                        className="min-h-[40px] inline-flex items-center px-3 rounded-lg border border-stone-soft text-sm"
                      >
                        Profile
                      </Link>
                      <Link
                        href={`/find-players`}
                        className="min-h-[40px] inline-flex items-center px-3 rounded-lg border border-terracotta/30 text-terracotta text-sm"
                      >
                        Challenge
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </ProtectedRoute>
  )
}
