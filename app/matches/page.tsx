'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { format, parseISO } from 'date-fns'

type Match = {
  id: string
  opponent_id: string
  opponent_name: string | null
  sport: { name: string; icon: string | null } | null
  match_type: string
  status: string
  scheduled_at: string | null
  location_label: string | null
  score_jsonb: unknown
  score_reported_by: string | null
  score_confirmed_by: string | null
  i_am_player_a: boolean
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [scheduleForm, setScheduleForm] = useState({ when: '', where: '' })
  const [scoreRaw, setScoreRaw] = useState('[[6,4],[6,3]]')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/matches', { credentials: 'include' })
      if (!res.ok) {
        setMatches([])
        return
      }
      const j = await res.json()
      setMatches(j.matches ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error || 'Update failed')
        return
      }
      await load()
      setExpanded(null)
    } finally {
      setBusy(null)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />
        <main className="max-w-2xl mx-auto px-4 pt-24 pb-12 md:pt-28">
          <h1 className="text-2xl font-display text-ink mb-2">Matches</h1>
          <p className="text-sm text-stone mb-8">Schedule hits and log scores with your partners.</p>

          {loading ? (
            <p className="text-stone">Loading…</p>
          ) : matches.length === 0 ? (
            <div className="bg-white border border-stone-soft rounded-2xl p-8 text-center shadow-sm">
              <p className="text-ink font-medium mb-2">No matches yet</p>
              <p className="text-sm text-stone mb-4">Accept a play request to create your first match card.</p>
              <Link href="/find-players" className="text-terracotta font-medium text-sm hover:underline">
                Find players
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {matches.map((m) => (
                <li key={m.id} className="bg-white border border-stone-soft rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg text-ink">
                        {m.sport?.icon} vs {m.opponent_name || 'Opponent'}
                      </p>
                      <p className="text-sm text-stone capitalize mt-1">
                        {m.match_type} · {m.status.replace('_', ' ')}
                      </p>
                      {m.scheduled_at && (
                        <p className="text-sm text-stone mt-1">
                          {format(parseISO(m.scheduled_at), 'EEE MMM d · h:mm a')}
                        </p>
                      )}
                      {m.location_label && <p className="text-sm text-stone">{m.location_label}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded(expanded === m.id ? null : m.id)
                        setScheduleForm({
                          when: m.scheduled_at ? parseISO(m.scheduled_at).toISOString().slice(0, 16) : '',
                          where: m.location_label || '',
                        })
                      }}
                      className="min-h-[44px] px-4 text-sm font-medium text-terracotta border border-terracotta/30 rounded-xl shrink-0"
                    >
                      {expanded === m.id ? 'Close' : 'Update'}
                    </button>
                  </div>

                  {m.score_jsonb != null && (
                    <p className="text-xs font-mono text-stone mt-3 break-all">Score data: {JSON.stringify(m.score_jsonb)}</p>
                  )}
                  {m.score_reported_by && !m.score_confirmed_by && (
                    <button
                      type="button"
                      disabled={busy === m.id}
                      onClick={() => patch(m.id, { confirm_score: true })}
                      className="mt-3 min-h-[44px] px-4 rounded-xl btn-premium text-white text-sm font-semibold disabled:opacity-50"
                    >
                      Confirm score
                    </button>
                  )}

                  {expanded === m.id && (
                    <div className="mt-4 pt-4 border-t border-stone-soft space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone mb-1">When</label>
                        <input
                          type="datetime-local"
                          value={scheduleForm.when}
                          onChange={(e) => setScheduleForm((f) => ({ ...f, when: e.target.value }))}
                          className="w-full min-h-[44px] px-3 rounded-xl border border-stone-soft"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone mb-1">Where</label>
                        <input
                          type="text"
                          value={scheduleForm.where}
                          onChange={(e) => setScheduleForm((f) => ({ ...f, where: e.target.value }))}
                          placeholder="Court name or address"
                          className="w-full min-h-[44px] px-3 rounded-xl border border-stone-soft"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={busy === m.id}
                        onClick={() =>
                          patch(m.id, {
                            scheduled_at: scheduleForm.when
                              ? new Date(scheduleForm.when).toISOString()
                              : null,
                            location_label: scheduleForm.where.trim() || null,
                          })
                        }
                        className="min-h-[44px] w-full sm:w-auto px-6 rounded-xl btn-premium text-white text-sm font-semibold disabled:opacity-50"
                      >
                        Save schedule
                      </button>

                      <div>
                        <label className="block text-xs font-semibold text-stone mb-1">
                          Sets (JSON array e.g. [[6,4],[3,6],[6,2]] — your games first)
                        </label>
                        <textarea
                          value={scoreRaw}
                          onChange={(e) => setScoreRaw(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 rounded-xl border border-stone-soft font-mono text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={busy === m.id}
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(scoreRaw)
                            patch(m.id, { score_jsonb: { sets: parsed }, status: 'in_progress' })
                          } catch {
                            alert('Invalid JSON for sets')
                          }
                        }}
                        className="min-h-[44px] px-6 rounded-xl border border-ink bg-ink text-white text-sm font-semibold disabled:opacity-50"
                      >
                        Save score
                      </button>

                      <button
                        type="button"
                        disabled={busy === m.id}
                        onClick={() => patch(m.id, { status: 'cancelled' })}
                        className="min-h-[44px] px-4 text-sm text-stone underline"
                      >
                        Cancel match
                      </button>
                    </div>
                  )}

                  <Link
                    href={`/players/${m.opponent_id}`}
                    className="inline-block mt-3 text-sm font-medium text-terracotta hover:underline min-h-[44px] leading-[44px]"
                  >
                    View opponent profile
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
