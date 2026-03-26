'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { format, parseISO } from 'date-fns'

type Notif = {
  id: string
  category: string
  type: string
  title: string
  body: string | null
  link_url: string | null
  metadata: { play_request_id?: string; connection_id?: string; [k: string]: unknown }
  read_at: string | null
  created_at: string
}

type PlayReq = {
  id: string
  from_user_id: string
  sport_id: string
  sport: { name: string } | null
  message: string | null
  status: string
  created_at: string
  is_from_me: boolean
  from_name: string | null
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notif[]>([])
  const [requests, setRequests] = useState<PlayReq[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nRes, rRes] = await Promise.all([
        fetch('/api/notifications?limit=80', { credentials: 'include' }),
        fetch('/api/play-requests', { credentials: 'include' }),
      ])
      if (nRes.ok) {
        const j = await nRes.json()
        setNotifications(j.notifications ?? [])
      }
      if (rRes.ok) {
        const list = await rRes.json()
        setRequests(Array.isArray(list) ? list : [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids: [id] }),
    })
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
  }

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ read_all: true }),
    })
    load()
  }

  const respondRequest = async (id: string, status: 'accepted' | 'declined') => {
    setActing(id + status)
    try {
      const res = await fetch(`/api/play-requests/${id}`, {
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
      setActing(null)
    }
  }

  const respondConnection = async (id: string, status: 'accepted' | 'declined') => {
    setActing(id + status)
    try {
      const res = await fetch(`/api/connections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error || 'Could not update connection')
        return
      }
      await load()
    } finally {
      setActing(null)
    }
  }

  const incoming = requests.filter((r) => !r.is_from_me && r.status === 'pending')

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />
        <main className="max-w-2xl mx-auto px-4 pt-24 pb-12 md:pt-28">
          <div className="flex items-center justify-between gap-3 mb-8">
            <h1 className="text-2xl font-display text-ink">Notifications</h1>
            <button
              type="button"
              onClick={markAllRead}
              className="min-h-[44px] px-4 text-sm font-medium text-terracotta border border-terracotta/30 rounded-xl hover:bg-terracotta/10"
            >
              Mark all read
            </button>
          </div>

          {incoming.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm font-semibold text-stone uppercase tracking-wide mb-3">Play requests</h2>
              <ul className="space-y-3">
                {incoming.map((r) => (
                  <li
                    key={r.id}
                    className="bg-white border border-stone-soft rounded-2xl p-4 shadow-sm"
                  >
                    <p className="font-medium text-ink">{r.from_name || 'Player'} wants to play</p>
                    <p className="text-sm text-stone mt-1">
                      {r.sport?.name ?? 'Sport'}
                      {r.message ? ` · “${r.message}”` : ''}
                    </p>
                    <p className="text-xs text-stone mt-1">{format(parseISO(r.created_at), 'MMM d, h:mm a')}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        type="button"
                        disabled={!!acting}
                        onClick={() => respondRequest(r.id, 'accepted')}
                        className="min-h-[44px] px-5 rounded-xl btn-premium text-white text-sm font-semibold disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={!!acting}
                        onClick={() => respondRequest(r.id, 'declined')}
                        className="min-h-[44px] px-5 rounded-xl border border-stone-soft bg-white text-sm font-medium text-ink hover:bg-beige disabled:opacity-50"
                      >
                        Decline
                      </button>
                      <Link
                        href={`/players/${r.from_user_id}`}
                        className="min-h-[44px] inline-flex items-center px-4 text-sm font-medium text-terracotta"
                      >
                        View profile
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-sm font-semibold text-stone uppercase tracking-wide mb-3">Activity</h2>
            {loading ? (
              <p className="text-stone text-sm">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="text-stone text-sm">You&apos;re all caught up.</p>
            ) : (
              <ul className="divide-y divide-stone-soft border border-stone-soft rounded-2xl overflow-hidden bg-white shadow-sm">
                {notifications.map((n) => {
                  const row = (
                    <div className="flex items-start gap-3 py-4 px-4">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${n.read_at ? 'text-stone' : 'text-ink'}`}>
                          {!n.read_at && (
                            <span className="inline-block w-2 h-2 rounded-full bg-terracotta mr-2 align-middle" aria-hidden />
                          )}
                          {n.title}
                        </p>
                        {n.body && <p className="text-sm text-stone mt-0.5">{n.body}</p>}
                        <p className="text-xs text-stone mt-1">
                          {format(parseISO(n.created_at), 'MMM d · h:mm a')} · {n.category}
                        </p>
                        {n.type === 'play_request' && n.metadata?.play_request_id && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button
                              type="button"
                              disabled={!!acting}
                              onClick={(e) => {
                                e.preventDefault()
                                respondRequest(n.metadata.play_request_id as string, 'accepted')
                              }}
                              className="min-h-[40px] px-4 rounded-lg bg-terracotta text-white text-sm font-medium disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={!!acting}
                              onClick={(e) => {
                                e.preventDefault()
                                respondRequest(n.metadata.play_request_id as string, 'declined')
                              }}
                              className="min-h-[40px] px-4 rounded-lg border border-stone-soft text-sm font-medium"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        {n.type === 'connection_request' && n.metadata?.connection_id && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button
                              type="button"
                              disabled={!!acting}
                              onClick={(e) => {
                                e.preventDefault()
                                respondConnection(n.metadata.connection_id as string, 'accepted')
                              }}
                              className="min-h-[40px] px-4 rounded-lg bg-terracotta text-white text-sm font-medium disabled:opacity-50"
                            >
                              Connect
                            </button>
                            <button
                              type="button"
                              disabled={!!acting}
                              onClick={(e) => {
                                e.preventDefault()
                                respondConnection(n.metadata.connection_id as string, 'declined')
                              }}
                              className="min-h-[40px] px-4 rounded-lg border border-stone-soft text-sm font-medium"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )

                  if (n.link_url) {
                    return (
                      <li key={n.id}>
                        <Link
                          href={n.link_url}
                          onClick={() => !n.read_at && markRead(n.id)}
                          className="block hover:bg-beige/50 transition-colors"
                        >
                          {row}
                        </Link>
                      </li>
                    )
                  }

                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        className="w-full text-left hover:bg-beige/50 transition-colors"
                        onClick={() => !n.read_at && markRead(n.id)}
                      >
                        {row}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </main>
      </div>
    </ProtectedRoute>
  )
}
