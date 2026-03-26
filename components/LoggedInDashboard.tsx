'use client'

import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase-client'
import UpcomingBookings from '@/components/UpcomingBookings'
import ActivityFeed from '@/components/home/ActivityFeed'
import { Calendar, Users, ArrowRight } from '@/components/Icons'
import { format, parseISO } from 'date-fns'

export interface DashboardBooking {
  id: string
  courtId: string
  courtNumber: string
  bookingDate: string | null
  startTime: string
  endTime: string
  duration: number
  price: number
  status: string
  isRecurring: boolean
  court: {
    id: string
    name: string
    address: string
    city: string
    state: string
    zipCode: string
  } | null
}

export interface DashboardGroup {
  id: string
  name: string
  description: string | null
  city: string | null
  sport_id: string
  sport: { id: string; slug: string; name: string; icon: string | null } | null
  member_count: number
  is_creator: boolean
}

export interface DashboardEvent {
  id: string
  group_id: string
  group_name: string
  title: string
  scheduled_at: string
  location: string | null
}

export interface NearbyPlayer {
  id: string
  user_id: string
  sport_id: string
  sport: { id: string; slug: string; name: string; icon: string | null } | null
  skill_level: number
  name: string | null
  image: string | null
}

export interface DashboardData {
  nextBookings: DashboardBooking[]
  myGroups: DashboardGroup[]
  upcomingEvents: DashboardEvent[]
  userCity?: string | null
}

export default function LoggedInDashboard() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([])
  const [nearbyGroups, setNearbyGroups] = useState<DashboardGroup[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return

    const fetchDashboard = async () => {
      setError(null)
      try {
        const res = await fetch('/api/dashboard', { credentials: 'include' })
        if (!res.ok) {
          if (res.status === 401) return
          throw new Error('Failed to load dashboard')
        }
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      }
    }

    fetchDashboard()
  }, [session])

  useEffect(() => {
    const city = data?.userCity
    if (!city) {
      setNearbyPlayers([])
      setNearbyGroups([])
      return
    }
    let cancelled = false
    setNearbyLoading(true)
    Promise.all([
      fetch(`/api/play-partners/nearby?city=${encodeURIComponent(city)}`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/groups?city=${encodeURIComponent(city)}`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([players, groups]) => {
      if (!cancelled) {
        setNearbyPlayers(Array.isArray(players) ? players.slice(0, 5) : [])
        setNearbyGroups(Array.isArray(groups) ? groups.slice(0, 5) : [])
      }
    }).catch(() => {
      if (!cancelled) {
        setNearbyPlayers([])
        setNearbyGroups([])
      }
    }).finally(() => {
      if (!cancelled) setNearbyLoading(false)
    })
    return () => { cancelled = true }
  }, [data?.userCity])

  if (loading || !session) return null
  if (error || !data) {
    return (
      <div className="mb-16 bg-white border border-stone-soft rounded-2xl p-6 md:p-8 shadow-sm">
        <p className="text-stone">{error ?? 'Unable to load dashboard.'}</p>
      </div>
    )
  }

  const hasAny =
    data.nextBookings.length > 0 ||
    data.myGroups.length > 0 ||
    data.upcomingEvents.length > 0 ||
    (data.userCity && (nearbyLoading || nearbyPlayers.length > 0 || nearbyGroups.length > 0))

  if (!hasAny) {
    return (
      <div className="mb-16 space-y-6">
        <ActivityFeed />
        <UpcomingBookings nextBookings={data.nextBookings} />
        <div className="bg-white border border-stone-soft rounded-2xl p-6 md:p-8 shadow-sm text-center">
          <p className="text-ink font-medium mb-2">Welcome back</p>
          <p className="text-stone text-sm mb-4">
            You don&apos;t have any upcoming bookings, groups, or play days yet.
          </p>
          <Link
            href="/courts"
            className="text-terracotta hover:text-terracotta-dark font-medium text-sm"
          >
            Find a court
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-16 space-y-6">
      <ActivityFeed />
      <UpcomingBookings nextBookings={data.nextBookings} />

      {data.myGroups.length > 0 && (
        <div className="bg-white border border-stone-soft rounded-2xl p-6 md:p-8 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display text-ink mb-0.5">Your groups</h2>
              <p className="text-sm text-stone">Groups you belong to</p>
            </div>
            <Link
              href="/groups"
              className="text-terracotta hover:text-terracotta-dark text-sm font-medium flex items-center gap-2 transition-all group"
            >
              View all
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <ul className="space-y-3">
            {data.myGroups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="flex items-center gap-3 p-4 border border-stone-soft rounded-xl hover:border-terracotta/40 transition-all bg-beige/30 hover:bg-beige/50 group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-terracotta/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-terracotta" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-ink group-hover:text-terracotta transition-colors truncate">
                      {g.name}
                    </p>
                    <p className="text-sm text-stone truncate">
                      {g.sport?.name ?? 'Sport'} · {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.upcomingEvents.length > 0 && (
        <div className="bg-white border border-stone-soft rounded-2xl p-6 md:p-8 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display text-ink mb-0.5">Upcoming play days</h2>
              <p className="text-sm text-stone">Group events</p>
            </div>
            <Link
              href="/groups"
              className="text-terracotta hover:text-terracotta-dark text-sm font-medium flex items-center gap-2 transition-all group"
            >
              View groups
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <ul className="space-y-3">
            {data.upcomingEvents.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/groups/${e.group_id}`}
                  className="flex items-center gap-3 p-4 border border-stone-soft rounded-xl hover:border-terracotta/40 transition-all bg-white hover:bg-beige group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-terracotta/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-terracotta" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-ink group-hover:text-terracotta transition-colors truncate">
                      {e.title}
                    </p>
                    <p className="text-sm text-stone truncate">
                      {e.group_name}
                      {e.scheduled_at && (
                        <> · {format(parseISO(e.scheduled_at), 'MMM d, h:mm a')}</>
                      )}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.userCity && (nearbyLoading || nearbyPlayers.length > 0 || nearbyGroups.length > 0) && (
        <div className="bg-white border border-stone-soft rounded-2xl p-6 md:p-8 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display text-ink mb-0.5">Near you</h2>
              <p className="text-sm text-stone">Players and groups in {data.userCity}</p>
            </div>
            <Link
              href="/find-players"
              className="text-terracotta hover:text-terracotta-dark text-sm font-medium flex items-center gap-2 transition-all group"
            >
              Find players
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          {nearbyLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 w-40 h-32 rounded-xl bg-stone-soft/60 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {nearbyPlayers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone uppercase tracking-wide mb-2">Players</p>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {nearbyPlayers.slice(0, 5).map((p) => (
                      <Link
                        key={p.id}
                        href={`/players/${p.user_id}`}
                        className="flex-shrink-0 flex flex-col items-center p-4 border border-stone-soft rounded-xl hover:border-terracotta/40 transition-all bg-beige/30 w-36"
                      >
                        {p.image ? (
                          <img src={p.image} alt="" className="w-12 h-12 rounded-full object-cover border border-stone-soft mb-2" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-terracotta/20 flex items-center justify-center text-terracotta text-lg font-semibold mb-2">
                            {(p.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <p className="font-medium text-ink text-sm truncate w-full text-center">{p.name || 'Player'}</p>
                        <p className="text-xs text-stone">Level {p.skill_level} · {p.sport?.name ?? 'Sport'}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {nearbyGroups.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone uppercase tracking-wide mb-2">Groups</p>
                  <ul className="space-y-2">
                    {nearbyGroups.slice(0, 3).map((g) => (
                      <li key={g.id}>
                        <Link
                          href={`/groups/${g.id}`}
                          className="flex items-center gap-3 p-3 border border-stone-soft rounded-xl hover:border-terracotta/40 transition-all bg-white hover:bg-beige group"
                        >
                          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-terracotta/20 flex items-center justify-center">
                            <Users className="w-4 h-4 text-terracotta" />
                          </div>
                          <span className="font-medium text-ink group-hover:text-terracotta transition-colors truncate">{g.name}</span>
                          <span className="text-xs text-stone flex-shrink-0">{g.member_count} members</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!nearbyLoading && nearbyPlayers.length === 0 && nearbyGroups.length === 0 && (
                <p className="text-sm text-stone">No players or groups found in {data.userCity}. Update your city in profile or try another area.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
