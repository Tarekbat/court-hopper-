'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { Trophy, Calendar, MapPin } from '@/components/Icons'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { format, parseISO } from 'date-fns'

type Sport = { id: string; slug: string; name: string; icon: string | null }
type Tournament = {
  id: string
  name: string
  description: string | null
  sport_id: string
  organizer_id: string
  registration_opens_at: string | null
  registration_closes_at: string | null
  starts_at: string
  ends_at: string | null
  status: string
  bracket_type: string
  max_participants: number | null
  location: string | null
  created_at: string
  sport: Sport | null
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const [sportFilter, setSportFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const res = await fetch('/api/sports')
        if (res.ok) setSports(await res.json())
      } catch (e) {
        console.error(e)
      }
    }
    fetchSports()
  }, [])

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (sportFilter) params.set('sport_id', sportFilter)
        if (statusFilter) params.set('status', statusFilter)
        const res = await fetch(`/api/tournaments?${params}`)
        if (res.ok) {
          const data = await res.json()
          setTournaments(data)
        } else {
          setTournaments([])
        }
      } catch (e) {
        setTournaments([])
      } finally {
        setLoading(false)
      }
    }
    fetchTournaments()
  }, [sportFilter, statusFilter])

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-stone-soft/80 text-stone border border-stone-soft',
      registration_open: 'bg-accent-green/15 text-accent-green border border-accent-green/30',
      registration_closed: 'bg-terracotta/10 text-terracotta border border-terracotta/25',
      live: 'bg-accent-green/15 text-accent-green border border-accent-green/30',
      completed: 'bg-stone-soft/80 text-stone border border-stone-soft',
    }
    const label: Record<string, string> = {
      draft: 'Draft',
      registration_open: 'Registration open',
      registration_closed: 'Registration closed',
      live: 'Live',
      completed: 'Completed',
    }
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${map[status] ?? map.draft}`}>
        {label[status] ?? status}
      </span>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-display text-ink">
              Tournaments
            </h1>
            <Link
              href="/tournaments/create"
              className="btn-premium inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm"
            >
              <Trophy className="w-5 h-5" />
              Create tournament
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-stone-soft bg-white text-ink text-sm font-medium focus:ring-2 focus:ring-terracotta focus:border-terracotta"
            >
              <option value="">All sports</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-stone-soft bg-white text-ink text-sm font-medium focus:ring-2 focus:ring-terracotta focus:border-terracotta"
            >
              <option value="">All statuses</option>
              <option value="registration_open">Registration open</option>
              <option value="registration_closed">Registration closed</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {loading ? (
            <LoadingSkeleton count={3} variant="card" />
          ) : tournaments.length === 0 ? (
            <EmptyState
              icon={<Trophy className="w-14 h-14 text-stone mx-auto" />}
              title="No tournaments yet"
              description="No tournaments match your filters. Check back later or try different filters."
            />
          ) : (
            <div className="space-y-4">
              {tournaments.map((t) => (
                <Link key={t.id} href={`/tournaments/${t.id}`}>
                  <div className="card-premium rounded-2xl p-6 cursor-pointer">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{t.sport?.icon ?? '🎾'}</span>
                          {statusBadge(t.status)}
                        </div>
                        <h2 className="text-lg font-display text-ink group-hover:text-terracotta transition-colors">
                          {t.name}
                        </h2>
                        {t.description && (
                          <p className="text-stone text-sm mt-1 line-clamp-2">{t.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-stone">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {format(parseISO(t.starts_at), 'MMM d, yyyy')}
                          </span>
                          {t.location && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {t.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-terracotta font-medium text-sm">View →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
