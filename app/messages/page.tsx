'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { ArrowRight } from '@/components/Icons'
import { format, parseISO } from 'date-fns'

type ThreadRow = {
  id: string
  kind: string
  title: string
  last_message_preview: string
  last_message_at: string
  unread_count: number
}

export default function MessagesPage() {
  const [enabled, setEnabled] = useState(true)
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/chat/threads', { credentials: 'include' })
      if (!res.ok) {
        setThreads([])
        return
      }
      const j = await res.json()
      setThreads(j.threads ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/runtime-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (cfg?.feature_flags?.chat === false) setEnabled(false)
      })
      .catch(() => {})
    load()
  }, [load])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />
        <main className="max-w-2xl mx-auto px-4 pt-24 pb-12 md:pt-28">
          <h1 className="text-2xl font-display text-ink mb-2">Messages</h1>
          <p className="text-sm text-stone mb-8">Direct chats and group rooms.</p>
          {!enabled && (
            <div className="bg-white border border-stone-soft rounded-2xl p-6 text-center shadow-sm mb-4">
              <p className="text-ink font-medium">Chat is temporarily under maintenance.</p>
              <p className="text-sm text-stone mt-1">Please check back soon.</p>
            </div>
          )}

          {!enabled ? null : loading ? (
            <p className="text-stone">Loading…</p>
          ) : threads.length === 0 ? (
            <div className="bg-white border border-stone-soft rounded-2xl p-8 text-center shadow-sm">
              <p className="text-ink font-medium mb-2">No conversations yet</p>
              <p className="text-sm text-stone mb-4">Wave someone from the home screen or accept a play request.</p>
              <Link href="/find-players" className="text-terracotta font-medium text-sm hover:underline">
                Find players
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/messages/${t.id}`}
                    className="flex items-center gap-3 min-h-[56px] px-4 py-3 bg-white border border-stone-soft rounded-2xl shadow-sm hover:border-terracotta/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-ink truncate">{t.title}</p>
                        {t.unread_count > 0 && (
                          <span className="shrink-0 min-w-[22px] h-[22px] px-1 flex items-center justify-center rounded-full bg-terracotta text-white text-xs font-semibold">
                            {t.unread_count > 9 ? '9+' : t.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone truncate">{t.last_message_preview}</p>
                      <p className="text-xs text-stone mt-0.5">
                        {format(parseISO(t.last_message_at), 'MMM d · h:mm a')}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
