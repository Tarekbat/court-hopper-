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
    const label: Record<string, string> = {
      draft: 'Draft',
      registration_open: 'Registration open',
      registration_closed: 'Registration closed',
      live: 'Live',
      completed: 'Completed',
    }
    const isLive = status === 'live'
    const isRegClosed = status === 'registration_closed'
    return (
      <span
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          padding: '4px 12px',
          borderRadius: '100px',
          ...(isLive
            ? { background: 'rgba(196,30,42,0.08)', color: '#C41E2A' }
            : isRegClosed
              ? { background: 'rgba(138,130,121,0.1)', color: '#8A8279' }
              : { background: 'rgba(138,130,121,0.1)', color: '#8A8279' }),
        }}
      >
        {label[status] ?? status}
      </span>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />

        <main className="max-w-7xl mx-auto px-5 py-10 md:py-12">
          <div className="internal-page-header">
            <h1 className="internal-page-title">
              Tournaments
            </h1>
            <Link
              href="/tournaments/create"
              className="internal-page-btn inline-flex items-center justify-center gap-2"
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
            <div>
              {tournaments.map((t) => (
                <Link key={t.id} href={`/tournaments/${t.id}`} className="tournament-card">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="rounded-full bg-[#C41E2A] shrink-0"
                          style={{ width: 8, height: 8 }}
                          aria-hidden
                        />
                        {statusBadge(t.status)}
                      </div>
                      <h2
                        className="font-medium text-[#1A1A1A]"
                        style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px' }}
                      >
                        {t.name}
                      </h2>
                      {t.description && (
                        <p
                          className="mt-1 line-clamp-2 text-[#8A8279]"
                          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', fontWeight: 300 }}
                        >
                          {t.description}
                        </p>
                      )}
                      <div
                        className="flex flex-wrap items-center gap-1.5 mt-3 text-[#8A8279]"
                        style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 400 }}
                      >
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 shrink-0" />
                          {format(parseISO(t.starts_at), 'MMM d, yyyy')}
                        </span>
                        {t.location && (
                          <>
                            <span aria-hidden>·</span>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 shrink-0" />
                              {t.location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      className="shrink-0 font-medium uppercase tracking-[0.06em] text-[#C41E2A]"
                      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px' }}
                    >
                      View →
                    </span>
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
