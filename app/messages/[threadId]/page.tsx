'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { ArrowLeft } from '@/components/Icons'
import { createBrowserClient } from '@/lib/supabase-client'
import { format, parseISO } from 'date-fns'

const QUICK_REPLIES = [
  { label: 'Play today?', body: 'Want to play today?' },
  { label: 'At the courts', body: "I'm at the courts — come join if you're free!" },
  { label: 'Good game', body: 'Good game — thanks for the hit!' },
]

type Sender = { id: string; name: string | null; image: string | null }
type Msg = {
  id: string
  sender_id: string
  body: string
  embed_match_id: string | null
  created_at: string
  sender: Sender
}

type MatchCard = {
  id: string
  opponent_name: string
  sport_name: string
  sport_icon: string | null
  status: string
  scheduled_at: string | null
  location_label: string | null
  score_jsonb: unknown
  score_reported_by: string | null
  score_confirmed_by: string | null
}

function MatchEmbed({ matchId, viewerId }: { matchId: string; viewerId: string | null }) {
  const [m, setM] = useState<MatchCard | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/matches/${matchId}`, { credentials: 'include' })
      if (!cancelled && res.ok) setM(await res.json())
    })()
    return () => {
      cancelled = true
    }
  }, [matchId])

  if (!m) {
    return (
      <div className="mt-2 p-3 rounded-xl bg-beige/80 border border-stone-soft text-xs text-stone">Loading match…</div>
    )
  }

  const scoreStr =
    m.score_jsonb && typeof m.score_jsonb === 'object' && m.score_jsonb !== null && 'sets' in m.score_jsonb
      ? JSON.stringify((m.score_jsonb as { sets: unknown }).sets)
      : null

  return (
    <div className="mt-2 p-4 rounded-xl bg-white border border-terracotta/25 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg" aria-hidden>
          {m.sport_icon || '🎾'}
        </span>
        <p className="font-semibold text-ink text-sm">Match vs {m.opponent_name}</p>
      </div>
      <p className="text-xs text-stone capitalize">{m.status.replace('_', ' ')}</p>
      {m.scheduled_at && (
        <p className="text-xs text-stone mt-1">{format(parseISO(m.scheduled_at), 'EEE MMM d · h:mm a')}</p>
      )}
      {m.location_label && <p className="text-xs text-stone mt-0.5">{m.location_label}</p>}
      {scoreStr && <p className="text-xs text-ink mt-2 font-mono">Score: {scoreStr}</p>}
      {m.score_reported_by && !m.score_confirmed_by && m.score_reported_by !== viewerId && (
        <p className="text-xs text-terracotta mt-2 font-medium">Waiting for you to confirm the score in Matches.</p>
      )}
      <Link
        href="/matches"
        className="inline-block mt-3 min-h-[40px] px-4 py-2 text-sm font-semibold text-terracotta border border-terracotta/35 rounded-xl hover:bg-terracotta/10"
      >
        Open matches
      </Link>
    </div>
  )
}

export default function ChatThreadPage() {
  const params = useParams()
  const threadId = typeof params.threadId === 'string' ? params.threadId : params.threadId?.[0] ?? ''
  const bottomRef = useRef<HTMLDivElement>(null)

  const [title, setTitle] = useState('Chat')
  const [messages, setMessages] = useState<Msg[]>([])
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [enabled, setEnabled] = useState(true)

  const loadMeta = useCallback(async () => {
    if (!threadId) return
    const res = await fetch(`/api/chat/threads/${threadId}`, { credentials: 'include' })
    if (res.ok) {
      const j = await res.json()
      setTitle(j.title || 'Chat')
    }
  }, [threadId])

  const loadMessages = useCallback(async () => {
    if (!threadId) return
    const res = await fetch(`/api/chat/threads/${threadId}/messages`, { credentials: 'include' })
    if (res.ok) {
      const j = await res.json()
      setMessages(j.messages ?? [])
    }
  }, [threadId])

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getSession().then(({ data: { session } }) => setViewerId(session?.user.id ?? null))
  }, [])

  useEffect(() => {
    fetch('/api/runtime-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (cfg?.feature_flags?.chat === false) setEnabled(false)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!threadId) return
    if (!enabled) return
    setLoading(true)
    Promise.all([loadMeta(), loadMessages()]).finally(() => setLoading(false))
    fetch(`/api/chat/threads/${threadId}/read`, { method: 'POST', credentials: 'include' })
  }, [threadId, loadMeta, loadMessages, enabled])

  useEffect(() => {
    if (!threadId || !enabled) return
    const supabase = createBrowserClient()
    const ch = supabase
      .channel(`thread:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        () => loadMessages()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [threadId, loadMessages, enabled])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async (body: string, quickKey?: string) => {
    const t = body.trim()
    if (!enabled || !t || sending || !threadId) return
    setSending(true)
    try {
      const res = await fetch(`/api/chat/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: t, quick_reply_key: quickKey ?? null }),
      })
      if (res.ok) {
        setDraft('')
        await loadMessages()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 pt-20 md:pt-24 pb-0 min-h-0">
          <Link
            href="/messages"
            className="inline-flex items-center gap-2 text-sm font-medium text-stone hover:text-ink mb-3 min-h-[44px] shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            All messages
          </Link>
          <h1 className="text-xl font-display text-ink mb-4 shrink-0 truncate">{title}</h1>
          {!enabled && (
            <div className="bg-white border border-stone-soft rounded-2xl p-6 text-center shadow-sm mb-4">
              <p className="text-ink font-medium">Chat is temporarily under maintenance.</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto min-h-[200px] space-y-3 pb-4">
            {loading ? (
              <p className="text-stone text-sm">Loading…</p>
            ) : (
              messages.map((msg) => {
                const mine = viewerId && msg.sender_id === viewerId
                return (
                  <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        mine ? 'bg-terracotta text-white' : 'bg-white border border-stone-soft text-ink'
                      }`}
                    >
                      {!mine && (
                        <p className="text-xs font-semibold opacity-80 mb-1">{msg.sender.name || 'Player'}</p>
                      )}
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      {msg.embed_match_id && (
                        <MatchEmbed matchId={msg.embed_match_id} viewerId={viewerId} />
                      )}
                      <p className={`text-[10px] mt-2 ${mine ? 'text-white/80' : 'text-stone'}`}>
                        {format(parseISO(msg.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {enabled && <div
            className="sticky bottom-0 left-0 right-0 bg-beige/95 backdrop-blur border-t border-stone-soft pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shrink-0 -mx-4 px-4"
          >
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  disabled={sending}
                  onClick={() => send(q.body, q.label)}
                  className="shrink-0 min-h-[40px] px-3 rounded-full border border-stone-soft bg-white text-xs font-medium text-ink hover:border-terracotta/40"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send(draft)
                  }
                }}
                rows={2}
                placeholder="Message…"
                className="flex-1 min-h-[48px] max-h-32 px-4 py-3 rounded-xl border-2 border-terracotta/25 text-ink bg-white resize-y"
              />
              <button
                type="button"
                disabled={sending || !draft.trim()}
                onClick={() => send(draft)}
                className="min-h-[48px] min-w-[88px] btn-premium text-white rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>}
        </div>
      </div>
    </ProtectedRoute>
  )
}
