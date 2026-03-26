'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { ArrowLeft, Users, Calendar, MapPin, Plus, X, Clock } from '@/components/Icons'
import ErrorState from '@/components/ui/ErrorState'
import GroupEventRsvp from '@/components/groups/GroupEventRsvp'
import GroupFeed from '@/components/groups/GroupFeed'
import PlayerQuickActions from '@/components/social/PlayerQuickActions'
import { format, parseISO } from 'date-fns'

type Sport = { id: string; slug: string; name: string; icon: string | null }
type Member = { user_id: string; role: string; joined_at: string; name: string | null; image: string | null; skill_level?: number | null }
type Event = {
  id: string
  title: string
  scheduled_at: string
  location: string | null
  max_capacity: number | null
  created_by: string
  created_at: string
}

type GroupDetail = {
  id: string
  name: string
  description: string | null
  city: string | null
  region: string | null
  is_public: boolean
  created_at: string
  sport_id: string
  sport: Sport | null
  created_by: string
  creator?: { id: string; name: string | null; image: string | null } | null
  members: Member[]
  upcoming_events: Event[]
  member_count: number
  is_member: boolean
  is_creator: boolean
  my_role: string | null
  viewer_id?: string
}

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventForm, setEventForm] = useState({ title: '', scheduled_at: '', location: '', max_capacity: '' })
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [eventError, setEventError] = useState('')
  const [chatOpening, setChatOpening] = useState(false)
  const [leaderboard, setLeaderboard] = useState<
    Array<{ user_id: string; name: string | null; image: string | null; completed_matches: number }>
  >([])

  const fetchGroup = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`/api/groups/${id}`)
      if (!res.ok) {
        if (res.status === 404) setError('Group not found')
        else setError('Failed to load group')
        setGroup(null)
        return
      }
      const data = await res.json()
      setGroup(data)
    } catch (e) {
      console.error(e)
      setError('Failed to load group')
      setGroup(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchGroup()
  }, [id])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const res = await fetch(`/api/groups/${id}/leaderboard`, { credentials: 'include' })
        if (!res.ok) return
        const j = await res.json()
        setLeaderboard(j.leaderboard ?? [])
      } catch {
        setLeaderboard([])
      }
    })()
  }, [id])

  const handleJoin = async () => {
    setJoining(true)
    try {
      const res = await fetch(`/api/groups/${id}/join`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Failed to join')
        return
      }
      await fetchGroup()
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!confirm('Leave this group? You can rejoin later if it\'s public.')) return
    setLeaving(true)
    try {
      const res = await fetch(`/api/groups/${id}/leave`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Failed to leave')
        return
      }
      router.push('/groups')
      router.refresh()
    } finally {
      setLeaving(false)
    }
  }

  const openGroupChat = async () => {
    if (!id) return
    setChatOpening(true)
    try {
      const res = await fetch(`/api/groups/${id}/chat`, { credentials: 'include' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not open chat')
      router.push(`/messages/${j.thread_id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not open chat')
    } finally {
      setChatOpening(false)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setEventError('')
    if (!eventForm.title.trim() || !eventForm.scheduled_at) {
      setEventError('Title and date/time are required.')
      return
    }
    let maxCap: number | null = null
    if (eventForm.max_capacity.trim() !== '') {
      const n = Number.parseInt(eventForm.max_capacity.trim(), 10)
      if (!Number.isFinite(n) || n < 1 || n > 500) {
        setEventError('Max players must be between 1 and 500, or leave blank for unlimited.')
        return
      }
      maxCap = n
    }
    setCreatingEvent(true)
    try {
      const res = await fetch(`/api/groups/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventForm.title.trim(),
          scheduled_at: new Date(eventForm.scheduled_at).toISOString(),
          location: eventForm.location.trim() || undefined,
          max_capacity: maxCap,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        const msg =
          typeof data.error === 'string'
            ? data.error
            : data.error?.message ?? data.error?.formErrors?.join?.(', ') ?? 'Failed to create event'
        throw new Error(msg)
      }
      setShowEventModal(false)
      setEventForm({ title: '', scheduled_at: '', location: '', max_capacity: '' })
      await fetchGroup()
    } catch (err: any) {
      setEventError(err.message ?? 'Failed to create event')
    } finally {
      setCreatingEvent(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-beige">
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10 md:pt-28 md:pb-12">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-stone-soft/80 rounded w-48" />
              <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6">
                <div className="h-10 bg-stone-soft/80 rounded w-1/3 mb-4" />
                <div className="h-4 bg-stone-soft/80 rounded w-full mb-2" />
                <div className="h-4 bg-stone-soft/80 rounded w-2/3" />
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !group) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-beige">
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10 md:pt-28 md:pb-12">
            <ErrorState
              message={error || 'Group not found'}
              onRetry={fetchGroup}
              backLink={
                <Link href="/groups" className="inline-block px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige text-sm font-medium">
                  Back to groups
                </Link>
              }
            />
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  const canManageEvents = group.is_member && (group.my_role === 'admin' || group.is_creator)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10 md:pt-28 md:pb-12">
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 text-stone hover:text-terracotta transition-colors text-sm font-medium mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to groups
          </Link>

          <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6 md:p-8 mb-8">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl" title={group.sport?.name}>{group.sport?.icon ?? '🎾'}</span>
                <div>
                  <h1 className="text-2xl md:text-3xl font-display text-ink">{group.name}</h1>
                  {group.city && (
                    <div className="flex items-center gap-1.5 text-stone text-sm mt-1">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      {group.city}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {group.is_member && (
                  <button
                    type="button"
                    onClick={openGroupChat}
                    disabled={chatOpening}
                    className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-terracotta/40 hover:bg-beige text-sm font-medium disabled:opacity-50 min-h-[44px]"
                  >
                    {chatOpening ? 'Opening…' : 'Group chat'}
                  </button>
                )}
                {group.is_member ? (
                  <button
                    type="button"
                    onClick={handleLeave}
                    disabled={leaving || group.is_creator}
                    className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {leaving ? 'Leaving…' : group.is_creator ? 'Creator' : 'Leave group'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={joining}
                    className="btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-70"
                  >
                    {joining ? 'Joining…' : 'Join group'}
                  </button>
                )}
              </div>
            </div>
            {group.description && (
              <p className="text-stone mb-6">{group.description}</p>
            )}
            {group.creator && (
              <div className="flex items-center gap-3 mb-6 p-4 bg-beige/50 rounded-xl border border-stone-soft">
                {group.creator.image ? (
                  <img src={group.creator.image} alt="" className="w-10 h-10 rounded-full object-cover border border-stone-soft" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-terracotta/20 flex items-center justify-center text-terracotta text-sm font-semibold">
                    {(group.creator.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-stone uppercase tracking-wide">Group creator</p>
                  <p className="font-medium text-ink">{group.creator.name || 'Unknown'}</p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 bg-terracotta/10 text-terracotta rounded-lg text-xs font-medium border border-terracotta/25">
                {group.sport?.name ?? 'Sport'}
              </span>
              {group.is_public && (
                <span className="px-2.5 py-1 bg-stone-soft/80 text-stone rounded-lg text-xs font-medium border border-stone-soft">
                  Public
                </span>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-base font-display text-ink mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-accent-green rounded-full" />
                Members ({group.member_count})
              </h2>
              <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6">
                <ul className="space-y-3">
                  {group.members.map((m) => (
                    <li key={m.user_id} className="flex items-center gap-3">
                      {m.image ? (
                        <img src={m.image} alt="" className="w-10 h-10 rounded-full object-cover border border-stone-soft" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-terracotta flex items-center justify-center text-white text-sm font-semibold">
                          {(m.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink truncate">{m.name || 'Member'}</p>
                        <p className="text-xs text-stone">{m.role === 'admin' ? 'Admin' : 'Member'}</p>
                        {group.viewer_id && m.user_id !== group.viewer_id && (
                          <PlayerQuickActions userId={m.user_id} compact />
                        )}
                      </div>
                      <div className="text-sm text-stone">
                        {m.skill_level != null ? `Level ${m.skill_level}` : '–'}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6 mt-5">
                <h3 className="text-sm font-semibold text-stone uppercase tracking-wide mb-3">
                  Group leaderboard
                </h3>
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-stone">No completed matches yet in this group.</p>
                ) : (
                  <ol className="space-y-2">
                    {leaderboard.slice(0, 5).map((r, idx) => (
                      <li key={r.user_id} className="flex items-center gap-3">
                        <span className="w-6 text-sm font-semibold text-stone">{idx + 1}</span>
                        {r.image ? (
                          <img src={r.image} alt="" className="w-8 h-8 rounded-full object-cover border border-stone-soft" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-terracotta/15 flex items-center justify-center text-terracotta text-xs font-semibold">
                            {(r.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <p className="text-sm font-medium text-ink flex-1 truncate">{r.name || 'Member'}</p>
                        <p className="text-xs text-stone">{r.completed_matches} matches</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-display text-ink flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent-green rounded-full" />
                  Upcoming play days
                </h2>
                {canManageEvents && (
                  <button
                    type="button"
                    onClick={() => setShowEventModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-terracotta hover:bg-terracotta/10 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Plan play day
                  </button>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6">
                {group.upcoming_events.length === 0 ? (
                  <p className="text-stone text-sm">No upcoming play days. {canManageEvents && 'Plan one!'}</p>
                ) : (
                  <ul className="space-y-4">
                    {group.upcoming_events.map((ev) => (
                      <li
                        key={ev.id}
                        className="pb-4 border-b border-stone-soft last:border-0 last:pb-0 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-terracotta flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-ink">{ev.title}</p>
                            <p className="text-sm text-stone flex items-center gap-1.5 mt-1">
                              <Clock className="w-4 h-4 flex-shrink-0" />
                              {format(parseISO(ev.scheduled_at), 'EEE, MMM d, yyyy · h:mm a')}
                            </p>
                            {ev.location && (
                              <p className="text-sm text-stone flex items-center gap-1.5 mt-1">
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                {ev.location}
                              </p>
                            )}
                            {ev.max_capacity != null && (
                              <p className="text-xs text-stone mt-1">Max {ev.max_capacity} players (waitlist after full)</p>
                            )}
                          </div>
                        </div>
                        <GroupEventRsvp groupId={id} eventId={ev.id} isMember={group.is_member} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <section className="mt-10 md:mt-12" aria-labelledby="group-wall-heading">
            <h2 id="group-wall-heading" className="text-base font-display text-ink mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-accent-green rounded-full" />
              Group wall
            </h2>
            <GroupFeed
              groupId={id}
              isMember={group.is_member}
              viewerId={group.viewer_id ?? null}
              canModerate={canManageEvents}
            />
          </section>
        </main>

        {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-stone-soft shadow-xl max-w-md w-full p-6 relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display text-ink">Plan a play day</h2>
                <button
                  type="button"
                  onClick={() => { setShowEventModal(false); setEventError('') }}
                  className="p-2 text-stone hover:text-ink rounded-lg hover:bg-beige transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {eventError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                  {eventError}
                </div>
              )}
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label htmlFor="event-title" className="block text-sm font-bold text-ink mb-2">Title</label>
                  <input
                    id="event-title"
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta focus:border-terracotta text-ink bg-white"
                    placeholder="e.g. Saturday morning doubles"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="event-datetime" className="block text-sm font-bold text-ink mb-2">Date & time</label>
                  <input
                    id="event-datetime"
                    type="datetime-local"
                    value={eventForm.scheduled_at}
                    onChange={(e) => setEventForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                    className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta focus:border-terracotta text-ink bg-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="event-location" className="block text-sm font-bold text-ink mb-2">Location (optional)</label>
                  <input
                    id="event-location"
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta focus:border-terracotta text-ink bg-white"
                    placeholder="e.g. Central Park Courts"
                  />
                </div>
                <div>
                  <label htmlFor="event-capacity" className="block text-sm font-bold text-ink mb-2">
                    Max players (optional)
                  </label>
                  <input
                    id="event-capacity"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={500}
                    value={eventForm.max_capacity}
                    onChange={(e) => setEventForm((f) => ({ ...f, max_capacity: e.target.value }))}
                    className="w-full min-h-[44px] px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta focus:border-terracotta text-ink bg-white"
                    placeholder="Unlimited — or e.g. 8 for two courts"
                  />
                  <p className="text-xs text-stone mt-1.5">When full, extra going responses join a waitlist in order.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowEventModal(false); setEventError('') }}
                    className="flex-1 px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingEvent}
                    className="flex-1 btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-70"
                  >
                    {creatingEvent ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
