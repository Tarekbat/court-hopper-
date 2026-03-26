'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { UserPlus, MapPin, ArrowLeft, CheckCircle } from '@/components/Icons'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'

type Sport = { id: string; slug: string; name: string; icon: string | null }
type PlayProfile = {
  id: string
  sport_id: string
  sport: Sport | null
  skill_level: number | null
  preferred_locations: string[]
  preferred_days_times: Record<string, unknown>
  notes: string | null
  updated_at: string
  display_ntrp?: number | null
  display_utr?: number | null
  available_now?: boolean
}

type PublicPayload = {
  user: {
    id: string
    name: string | null
    image: string | null
    city: string | null
    ntrp_rating?: number | null
    utr_rating?: number | null
    rating_verified?: boolean
    rating_source?: string | null
  }
  playProfiles: PlayProfile[]
  availability?: Array<{ weekday: number; day_part: 'morning' | 'afternoon' | 'evening' }>
  viewerIsSelf: boolean
  connection_status?: 'none' | 'pending_sent' | 'pending_received' | 'connected'
  connection_id?: string | null
  mutual_connections?: number
  played_together?: boolean
}

function formatNtrp(n: number) {
  const rounded = Math.round(n * 2) / 2
  return rounded % 1 === 0 ? `${rounded.toFixed(1)}` : `${rounded}`
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const dayParts = ['morning', 'afternoon', 'evening'] as const

export default function PublicPlayerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = typeof params.userId === 'string' ? params.userId : params.userId?.[0] ?? ''

  const [data, setData] = useState<PublicPayload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [requestingSportId, setRequestingSportId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [requestModalSportId, setRequestModalSportId] = useState('')
  const [requestMessage, setRequestMessage] = useState('')

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/public`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not load profile')
      }
      const json = (await res.json()) as PublicPayload
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const sendRequest = async () => {
    if (!userId || !requestModalSportId) return
    setRequestingSportId(requestModalSportId)
    try {
      const res = await fetch('/api/play-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_user_id: userId,
          sport_id: requestModalSportId,
          message: requestMessage.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error ?? 'Failed to send request')
        return
      }
      setRequestModalSportId('')
      setRequestMessage('')
      alert('Request sent!')
    } catch {
      alert('Failed to send request')
    } finally {
      setRequestingSportId(null)
    }
  }

  const sendConnection = async () => {
    if (!data || data.viewerIsSelf || connecting) return
    setConnecting(true)
    try {
      if (data.connection_status === 'pending_received' && data.connection_id) {
        const res = await fetch(`/api/connections/${data.connection_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'accepted' }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          alert(j.error ?? 'Could not accept connection')
          return
        }
      } else if (data.connection_status === 'none') {
        const res = await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ to_user_id: userId }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          alert(j.error ?? 'Could not send connection request')
          return
        }
      } else {
        return
      }
      await load()
    } finally {
      setConnecting(false)
    }
  }

  const blockUser = async () => {
    if (!data || data.viewerIsSelf || blocking) return
    if (!confirm('Block this player? You will no longer see each other.')) return
    setBlocking(true)
    try {
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: data.user.id }),
      })
      if (res.ok) {
        router.push('/find-players')
      }
    } finally {
      setBlocking(false)
    }
  }

  const reportUser = async () => {
    if (!data || data.viewerIsSelf) return
    const reason = prompt('Reason for report')
    if (!reason) return
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_kind: 'user', target_id: data.user.id, reason }),
    })
    alert('Report submitted. Thank you.')
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />

        <main className="max-w-3xl mx-auto px-5 pt-24 pb-10 md:pt-28 md:pb-12">
          <Link
            href="/find-players"
            className="inline-flex items-center gap-2 text-sm font-medium text-stone hover:text-ink mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Find players
          </Link>

          {loading ? (
            <LoadingSkeleton count={4} variant="row" />
          ) : error ? (
            <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-8 text-center">
              <p className="text-ink font-medium mb-2">{error}</p>
              <Link
                href="/find-players"
                className="text-terracotta text-sm font-medium hover:underline"
              >
                Return to Find players
              </Link>
            </div>
          ) : data ? (
            <>
          <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                  {data.user.image ? (
                    <img
                      src={data.user.image}
                      alt=""
                      className="w-24 h-24 rounded-full object-cover border border-stone-soft shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-terracotta flex items-center justify-center text-white text-3xl font-semibold shrink-0">
                      {(data.user.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="font-display text-3xl text-ink">
                    {data.user.name || 'Player'}
                  </h1>
                  {data.user.ntrp_rating != null && (
                    <span className="px-3 py-1 rounded-lg text-sm font-semibold border bg-terracotta/10 text-terracotta border-terracotta/25">
                      {formatNtrp(Number(data.user.ntrp_rating))} NTRP
                    </span>
                  )}
                  {data.user.rating_verified && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold border bg-accent-green/15 text-accent-green border-accent-green/30">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </span>
                  )}
                </div>
                    {data.user.city && (
                      <p className="text-stone text-sm flex items-center gap-1.5 mb-4">
                        <MapPin className="w-4 h-4 shrink-0" />
                        {data.user.city}
                      </p>
                    )}
                {(data.user.utr_rating != null || data.user.rating_source) && (
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {data.user.utr_rating != null && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-stone-soft/60 text-ink border-stone-soft">
                        UTR {Number(data.user.utr_rating).toFixed(2)}
                      </span>
                    )}
                    {data.user.rating_source && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white text-stone border-stone-soft">
                        {data.user.rating_source === 'usta_verified' ? 'USTA verified' : data.user.rating_source}
                      </span>
                    )}
                  </div>
                )}
                    {data.viewerIsSelf ? (
                      <Link
                        href="/profile"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige"
                      >
                        Edit my profile
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={sendConnection}
                        disabled={connecting || data.connection_status === 'connected' || data.connection_status === 'pending_sent'}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white btn-premium rounded-xl disabled:opacity-70"
                      >
                        <UserPlus className="w-4 h-4" />
                        {connecting
                          ? 'Please wait…'
                          : data.connection_status === 'connected'
                          ? 'Connected'
                          : data.connection_status === 'pending_sent'
                          ? 'Request sent'
                          : data.connection_status === 'pending_received'
                          ? 'Accept connection'
                          : 'Connect'}
                      </button>
                    )}
                    {!data.viewerIsSelf && (
                      <div className="mt-2 text-xs text-stone space-y-1">
                        <p>
                          {data.mutual_connections ?? 0} mutual connection
                          {(data.mutual_connections ?? 0) === 1 ? '' : 's'}
                        </p>
                        {data.played_together && (
                          <p className="text-accent-green font-semibold">Played together</p>
                        )}
                      </div>
                    )}
                    {!data.viewerIsSelf && (
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={reportUser} className="px-3 py-2 text-xs rounded-lg border border-stone-soft">
                          Report
                        </button>
                        <button type="button" onClick={blockUser} disabled={blocking} className="px-3 py-2 text-xs rounded-lg border border-red-300 text-red-700">
                          {blocking ? 'Blocking...' : 'Block'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

          <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-display text-ink">Availability</h2>
              {data.viewerIsSelf && (
                <Link
                  href="/find-players"
                  className="text-sm font-medium text-terracotta hover:underline"
                >
                  Edit
                </Link>
              )}
            </div>

            {((data.availability ?? []).length === 0) ? (
              <p className="text-stone text-sm">
                {data.viewerIsSelf
                  ? 'Add your availability so match scoring can find the best overlaps.'
                  : 'No availability shared yet.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[520px]">
                  <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] gap-2 text-xs font-semibold text-stone mb-2">
                    <div />
                    {weekdayLabels.map((d) => (
                      <div key={d} className="text-center">{d}</div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {dayParts.map((part) => {
                      const partLabel = part === 'morning' ? 'Morning' : part === 'afternoon' ? 'Afternoon' : 'Evening'
                      return (
                        <div key={part} className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] gap-2 items-center">
                          <div className="text-xs font-semibold text-ink">{partLabel}</div>
                          {weekdayLabels.map((_, weekday) => {
                            const on = (data.availability ?? []).some((s) => s.weekday === weekday && s.day_part === part)
                            return (
                              <div
                                key={`${weekday}:${part}`}
                                className={`h-10 rounded-xl border flex items-center justify-center text-xs font-semibold ${
                                  on
                                    ? 'bg-accent-green/15 border-accent-green/30 text-accent-green'
                                    : 'bg-white border-stone-soft text-stone'
                                }`}
                                aria-label={`${weekdayLabels[weekday]} ${partLabel} ${on ? 'available' : 'not available'}`}
                              >
                                {on ? '●' : ''}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

              <h2 className="text-lg font-display text-ink mb-4">Play profiles</h2>
              {data.playProfiles.length === 0 ? (
                <p className="text-stone text-sm">
                  {data.viewerIsSelf
                    ? 'Add sports from Find players → My play profile to appear in discovery.'
                    : 'No active play profiles.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {data.playProfiles.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                    >
                      <div>
                        <p className="font-display text-lg text-ink">
                          <span>{p.sport?.icon} {p.sport?.name ?? 'Sport'}</span>
                      {p.display_ntrp != null ? (
                        <span className="ml-2 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-terracotta/10 text-terracotta border-terracotta/25 font-sans">
                          {formatNtrp(Number(p.display_ntrp))} NTRP
                        </span>
                      ) : p.skill_level != null ? (
                        <span className="ml-2 px-2 py-0.5 bg-stone-soft/80 rounded text-xs font-sans">
                          Level {p.skill_level}
                        </span>
                      ) : null}
                      {p.available_now && (
                        <span className="ml-2 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-accent-green/15 text-accent-green border-accent-green/30 font-sans">
                          Available now
                        </span>
                      )}
                        </p>
                        {p.notes && (
                          <p className="text-stone text-sm mt-2 whitespace-pre-wrap">{p.notes}</p>
                        )}
                        {p.preferred_locations?.length > 0 && (
                          <p className="text-stone text-sm mt-2">
                            <span className="font-medium text-ink">Locations: </span>
                            {p.preferred_locations.join(', ')}
                          </p>
                        )}
                      </div>
                      {!data.viewerIsSelf && p.sport_id && (
                        <button
                          type="button"
                          onClick={() => {
                            setRequestModalSportId(p.sport_id)
                            setRequestMessage('')
                          }}
                          disabled={requestingSportId !== null}
                          className="btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm inline-flex items-center gap-2 shrink-0 disabled:opacity-70"
                        >
                          <UserPlus className="w-4 h-4" />
                          Request to play
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </main>

        {requestModalSportId && data && !data.viewerIsSelf && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-stone-soft shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-display text-ink mb-4">Request to play</h2>
              <p className="text-stone text-sm mb-4">
                Send a short message (optional). They can accept or decline.
              </p>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta text-ink bg-white resize-none mb-4"
                rows={3}
                placeholder="e.g. Hi, I'd love to hit sometime this week!"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRequestModalSportId('')}
                  className="flex-1 px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={sendRequest}
                  disabled={requestingSportId !== null}
                  className="flex-1 btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-70"
                >
                  {requestingSportId ? 'Sending…' : 'Send request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
