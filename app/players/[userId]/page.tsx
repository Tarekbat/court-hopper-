'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { UserPlus, MapPin, ArrowLeft } from '@/components/Icons'
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
}

type PublicPayload = {
  user: { id: string; name: string | null; image: string | null; city: string | null }
  playProfiles: PlayProfile[]
  viewerIsSelf: boolean
}

export default function PublicPlayerProfilePage() {
  const params = useParams()
  const userId = typeof params.userId === 'string' ? params.userId : params.userId?.[0] ?? ''

  const [data, setData] = useState<PublicPayload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [requestingSportId, setRequestingSportId] = useState<string | null>(null)
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />

        <main className="max-w-3xl mx-auto px-5 py-10 md:py-12">
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
                    <h1 className="font-display text-3xl text-ink mb-1">
                      {data.user.name || 'Player'}
                    </h1>
                    {data.user.city && (
                      <p className="text-stone text-sm flex items-center gap-1.5 mb-4">
                        <MapPin className="w-4 h-4 shrink-0" />
                        {data.user.city}
                      </p>
                    )}
                    {data.viewerIsSelf ? (
                      <Link
                        href="/profile"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige"
                      >
                        Edit my profile
                      </Link>
                    ) : null}
                  </div>
                </div>
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
                          {p.skill_level != null && (
                            <span className="ml-2 px-2 py-0.5 bg-stone-soft/80 rounded text-xs font-sans">
                              Level {p.skill_level}
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
