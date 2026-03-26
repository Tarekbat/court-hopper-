'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { UserPlus, Users, Search, Map as MapIcon, List, X } from '@/components/Icons'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import DiscoveryFiltersSheet, { type DiscoveryFilters } from '@/components/discovery/DiscoveryFiltersSheet'
import PlayerDiscoveryCard, { type DiscoveryCardProfile } from '@/components/discovery/PlayerDiscoveryCard'

type Sport = { id: string; slug: string; name: string; icon: string | null }
type MyProfile = {
  id: string
  user_id: string
  sport_id: string
  sport: Sport | null
  skill_level: number | null
  ntrp_rating_override?: number | null
  available_now_until?: string | null
  preferred_locations: string[]
  preferred_days_times: Record<string, unknown>
  notes: string | null
  is_active: boolean
  updated_at: string
}
type DiscoverProfile = MyProfile & { name: string | null; image: string | null }

export default function FindPlayersPage() {
  const [sports, setSports] = useState<Sport[]>([])
  const [myProfiles, setMyProfiles] = useState<MyProfile[]>([])
  const [discover, setDiscover] = useState<DiscoverProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [tab, setTab] = useState<'discover' | 'my'>('discover')
  const [showAddProfile, setShowAddProfile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [form, setForm] = useState({
    sport_id: '',
    skill_level: '' as string | number,
    ntrp_rating_override: '' as string | number,
    available_now: false,
    notes: '',
    is_active: true,
  })
  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [requestModalUserId, setRequestModalUserId] = useState<string | null>(null)
  const [requestModalSportId, setRequestModalSportId] = useState<string | null>(null)
  const [nearYouFilter, setNearYouFilter] = useState(false)
  const [userCity, setUserCity] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'city'>('grid')
  const [filters, setFilters] = useState<DiscoveryFilters>({
    sport_id: '',
    ntrp_min: '',
    ntrp_max: '',
    sort: 'recent',
  })

  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string | null; image: string | null }>>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [sportsRes, meRes, profileRes] = await Promise.all([
          fetch('/api/sports'),
          fetch('/api/play-partners/me'),
          fetch('/api/profile', { credentials: 'include' }),
        ])
        if (cancelled) return
        if (sportsRes.ok) {
          const data = await sportsRes.json()
          setSports(data)
          if (data.length) setForm((f) => (f.sport_id ? f : { ...f, sport_id: data[0].id }))
        }
        if (meRes.ok) {
          const data = await meRes.json()
          setMyProfiles(data)
        }
        if (profileRes.ok) {
          const data = await profileRes.json()
          if (data.city) setUserCity(data.city)
        }
      } catch (e) {
        if (!cancelled) console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const fetchDiscover = async () => {
      setDiscoverLoading(true)
      try {
        const params = new URLSearchParams()
        if (filters.sport_id) params.set('sport_id', filters.sport_id)
        if (filters.ntrp_min) params.set('ntrp_min', filters.ntrp_min)
        if (filters.ntrp_max) params.set('ntrp_max', filters.ntrp_max)
        if (filters.sort) params.set('sort', filters.sort)
        const baseUrl = nearYouFilter && userCity
          ? `/api/play-partners/nearby?city=${encodeURIComponent(userCity)}`
          : '/api/play-partners'
        const url = nearYouFilter && userCity
          ? `${baseUrl}&${params.toString()}`
          : `/api/play-partners?${params.toString()}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setDiscover(data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setDiscoverLoading(false)
      }
    }
    if (tab === 'discover') fetchDiscover()
  }, [tab, filters, nearYouFilter, userCity])

  useEffect(() => {
    if (!loading) setLoading(false)
  }, [myProfiles])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const q = searchQ.trim()
      if (q.length < 2) {
        setSearchResults([])
        return
      }
      setSearching(true)
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const j = await res.json()
        if (!cancelled) setSearchResults(Array.isArray(j) ? j : [])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [searchQ])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    if (!form.sport_id) return
    setSaving(true)
    try {
      const res = await fetch('/api/play-partners/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport_id: form.sport_id,
          skill_level: form.skill_level === '' ? null : Number(form.skill_level),
          ntrp_rating_override: form.ntrp_rating_override === '' ? null : Number(form.ntrp_rating_override),
          available_now_until: form.available_now ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : null,
          notes: form.notes.trim() || null,
          is_active: form.is_active,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
      const meRes = await fetch('/api/play-partners/me')
      if (meRes.ok) {
        const list = await meRes.json()
        setMyProfiles(list)
      }
      setShowAddProfile(false)
      setForm({ sport_id: sports[0]?.id ?? '', skill_level: '', ntrp_rating_override: '', available_now: false, notes: '', is_active: true })
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const openRequestModal = (userId: string, sportId: string | null) => {
    if (!sportId) return
    setRequestModalUserId(userId)
    setRequestModalSportId(sportId)
    setRequestMessage('')
  }

  const sendRequest = async () => {
    if (!requestModalUserId || !requestModalSportId) return
    setRequestingId(requestModalUserId)
    try {
      const res = await fetch('/api/play-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_user_id: requestModalUserId,
          sport_id: requestModalSportId,
          message: requestMessage.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Failed to send request')
        return
      }
      setRequestModalUserId(null)
      setRequestModalSportId(null)
      setDiscover((prev) => prev.filter((p) => !(p.user_id === requestModalUserId && p.sport_id === requestModalSportId)))
    } catch (e) {
      alert('Failed to send request')
    } finally {
      setRequestingId(null)
    }
  }

  const connectWithPlayer = async (
    userId: string,
    status?: 'none' | 'pending_sent' | 'pending_received' | 'connected'
  ) => {
    if (!userId || connectingId) return
    setConnectingId(userId)
    try {
      if (status === 'none' || !status) {
        const res = await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ to_user_id: userId }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          alert(j.error ?? 'Failed to send connection request')
          return
        }
      } else if (status === 'pending_received') {
        const listRes = await fetch('/api/connections', { credentials: 'include' })
        if (!listRes.ok) throw new Error('Could not load connections')
        const j = await listRes.json()
        const edge = (j.connections ?? []).find(
          (c: any) =>
            c.status === 'pending' && c.requester_id === userId
        )
        if (!edge?.id) throw new Error('No pending request found')
        const acceptRes = await fetch(`/api/connections/${edge.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'accepted' }),
        })
        if (!acceptRes.ok) {
          const err = await acceptRes.json().catch(() => ({}))
          throw new Error(err.error || 'Could not accept connection')
        }
      } else {
        return
      }
      setDiscover((prev) =>
        prev.map((p: any) =>
          p.user_id !== userId
            ? p
            : {
                ...p,
                connection_status:
                  status === 'pending_received'
                    ? 'connected'
                    : 'pending_sent',
              }
        )
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Connection update failed')
    } finally {
      setConnectingId(null)
    }
  }

  const loadingState = loading && myProfiles.length === 0

  const discoverCards: DiscoveryCardProfile[] = (discover as any[]).map((p: any) => ({
    id: p.id,
    user_id: p.user_id,
    sport_id: p.sport_id ?? null,
    sport: p.sport ?? null,
    name: p.name ?? null,
    image: p.image ?? null,
    notes: p.notes ?? null,
    city: p.city ?? null,
    display_ntrp: p.display_ntrp ?? null,
    match_score_pct: p.match_score_pct ?? null,
    available_now: p.available_now === true,
    connection_status: p.connection_status ?? 'none',
    mutual_connections: p.mutual_connections ?? 0,
    played_together: p.played_together === true,
  }))

  const cityGroups = (() => {
    const map = new globalThis.Map<string, { city: string; count: number; top: DiscoveryCardProfile[] }>()
    for (const p of discoverCards) {
      const city = (p.city || 'Unknown').trim() || 'Unknown'
      const existing = map.get(city) ?? { city, count: 0, top: [] }
      existing.count += 1
      existing.top.push(p)
      map.set(city, existing)
    }
    return Array.from(map.values()).map((g) => ({
      ...g,
      top: g.top
        .sort((a, b) => (b.match_score_pct ?? 0) - (a.match_score_pct ?? 0))
        .slice(0, 3),
    })).sort((a, b) => b.count - a.count)
  })()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />

        <main className="max-w-7xl mx-auto px-5 py-10 md:py-12">
          <div className="internal-page-header">
            <h1 className="internal-page-title">
              Find players
            </h1>
            <button
              type="button"
              onClick={() => setShowAddProfile(true)}
              className="internal-page-btn inline-flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Add profile
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <div className="bg-white rounded-xl p-1 border border-stone-soft shadow-sm flex touch-manipulation">
              <button
                type="button"
                onClick={() => { setTab('discover'); window.scrollTo(0, 0) }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'discover' ? 'bg-ink text-white' : 'text-stone hover:bg-beige'
                }`}
              >
                Discover
              </button>
              <button
                type="button"
                onClick={() => { setTab('my'); window.scrollTo(0, 0) }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'my' ? 'bg-ink text-white' : 'text-stone hover:bg-beige'
                }`}
              >
                My play profile
              </button>
            </div>
            {tab === 'discover' && (
              <>
                <DiscoveryFiltersSheet
                  sports={sports}
                  value={filters}
                  onChange={(next) => setFilters(next)}
                  canUseNearYou={Boolean(userCity)}
                  nearYouEnabled={nearYouFilter}
                  onToggleNearYou={() => setNearYouFilter((v) => !v)}
                  nearYouLabel={userCity ? `City: ${userCity}` : 'Set your city in Profile'}
                />
                <div className="relative flex-1 min-w-[220px] max-w-md">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-soft bg-white text-ink text-sm font-medium focus-within:ring-2 focus-within:ring-terracotta focus-within:border-terracotta">
                    <Search className="w-4 h-4 text-stone" />
                    <input
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="Search players by name…"
                      className="w-full bg-transparent outline-none text-ink placeholder:text-stone"
                      inputMode="search"
                    />
                    {searchQ && (
                      <button
                        type="button"
                        onClick={() => { setSearchQ(''); setSearchResults([]) }}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-beige"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {searchQ.trim().length >= 2 && (searching || searchResults.length > 0) && (
                    <div className="absolute z-40 mt-2 w-full bg-white rounded-2xl border border-stone-soft shadow-lg overflow-hidden">
                      {searching && (
                        <div className="p-4 text-sm text-stone">Searching…</div>
                      )}
                      {!searching && searchResults.length === 0 && (
                        <div className="p-4 text-sm text-stone">No players found.</div>
                      )}
                      {!searching && searchResults.length > 0 && (
                        <div className="max-h-72 overflow-auto">
                          {searchResults.map((u) => (
                            <Link
                              key={u.id}
                              href={`/players/${encodeURIComponent(u.id)}`}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-beige focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
                              onClick={() => { setSearchQ(''); setSearchResults([]) }}
                            >
                              {u.image ? (
                                <img src={u.image} alt="" className="w-9 h-9 rounded-full object-cover border border-stone-soft" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-terracotta text-white flex items-center justify-center font-semibold">
                                  {(u.name || '?').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-ink truncate">{u.name || 'Player'}</div>
                                <div className="text-xs text-stone">View profile</div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-xl p-1 border border-stone-soft shadow-sm flex touch-manipulation">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2 ${
                      viewMode === 'grid' ? 'bg-ink text-white' : 'text-stone hover:bg-beige'
                    }`}
                    aria-label="Grid view"
                  >
                    <List className="w-4 h-4" />
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('city')}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2 ${
                      viewMode === 'city' ? 'bg-ink text-white' : 'text-stone hover:bg-beige'
                    }`}
                    aria-label="City view"
                  >
                    <MapIcon className="w-4 h-4" />
                    Cities
                  </button>
                </div>
              </>
            )}
            {tab === 'my' && (
              <button
                type="button"
                onClick={() => {
                  setForm({ sport_id: sports[0]?.id ?? '', skill_level: '', ntrp_rating_override: '', available_now: false, notes: '', is_active: true })
                  setShowAddProfile(true)
                }}
                className="px-5 py-2.5 bg-terracotta text-white rounded-xl hover:bg-terracotta-dark text-sm font-semibold btn-premium"
              >
                Add sport
              </button>
            )}
          </div>

          {tab === 'discover' && (
            <>
              {discoverLoading ? (
                <LoadingSkeleton count={6} variant="card" />
              ) : discoverCards.length === 0 ? (
                <EmptyState
                  icon={<UserPlus className="w-14 h-14 text-stone mx-auto" />}
                  title="No players found"
                  description="Try expanding your filters, switching sports, or turning off Near you."
                  action={
                    <button
                      type="button"
                      onClick={() => setTab('my')}
                      className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige text-sm font-medium"
                    >
                      Set up my profile
                    </button>
                  }
                />
              ) : (
                <>
                  {viewMode === 'city' ? (
                    <div className="space-y-4">
                      {cityGroups.map((g) => (
                        <div key={g.city} className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-display text-lg text-ink truncate">{g.city}</p>
                              <p className="text-stone text-sm">{g.count} player{g.count === 1 ? '' : 's'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (g.city === 'Unknown') return
                                setNearYouFilter(true)
                                setUserCity(g.city)
                                setViewMode('grid')
                              }}
                              className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige text-sm font-medium"
                              disabled={g.city === 'Unknown'}
                            >
                              View
                            </button>
                          </div>
                          {g.top.length > 0 && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {g.top.map((p) => (
                                <div key={p.id} className="rounded-2xl border border-stone-soft p-4 bg-beige/30">
                                  <p className="text-sm font-semibold text-ink truncate">{p.name || 'Player'}</p>
                                  <p className="text-xs text-stone mt-0.5">
                                    {p.display_ntrp != null ? `${p.display_ntrp} NTRP` : 'NTRP not set'}
                                    {p.match_score_pct != null ? ` · ${Math.round(p.match_score_pct)}%` : ''}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {discoverCards.map((p) => (
                        <PlayerDiscoveryCard
                          key={p.id}
                          profile={p}
                          onRequest={(userId, sportId) => openRequestModal(userId, sportId)}
                          onConnect={(userId, status) => connectWithPlayer(userId, status as any)}
                          connecting={connectingId === p.user_id}
                          requesting={requestingId === p.user_id}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'my' && (
            <>
              {myProfiles.length === 0 && !showAddProfile ? (
                <EmptyState
                  icon={<Users className="w-14 h-14 text-stone mx-auto" />}
                  title="No play profile yet"
                  description="Add the sports you play and your level so others can find you for a game."
                  action={
                    <button
                      type="button"
                      onClick={() => setShowAddProfile(true)}
                      className="btn-premium inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl font-semibold text-sm"
                    >
                      Add sport
                    </button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {myProfiles.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-display text-lg text-ink flex items-center gap-2">
                          <span>{p.sport?.icon} {p.sport?.name}</span>
                          {p.is_active ? (
                            <span className="px-2.5 py-1 bg-accent-green/15 text-accent-green rounded-lg text-xs font-medium border border-accent-green/30">Visible</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-stone-soft/80 text-stone rounded-lg text-xs font-medium">Hidden</span>
                          )}
                        </p>
                        {p.skill_level != null && (
                          <p className="text-stone text-sm mt-1">Skill level: {p.skill_level}/5</p>
                        )}
                        {p.notes && <p className="text-stone text-sm mt-1">{p.notes}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            sport_id: p.sport_id,
                            skill_level: p.skill_level ?? '',
                            ntrp_rating_override: (p as any).ntrp_rating_override ?? '',
                            available_now: Boolean((p as any).available_now_until && String((p as any).available_now_until) > new Date().toISOString()),
                            notes: p.notes ?? '',
                            is_active: p.is_active,
                          })
                          setShowAddProfile(true)
                        }}
                        className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige text-sm font-medium"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                  {showAddProfile && (
                    <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6">
                      <h3 className="text-lg font-display text-ink mb-4">Add or update sport</h3>
                      {saveError && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                          {saveError}
                        </div>
                      )}
                      <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-ink mb-2">Sport</label>
                          <select
                            value={form.sport_id}
                            onChange={(e) => setForm((f) => ({ ...f, sport_id: e.target.value }))}
                            className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta text-ink bg-white"
                            required
                          >
                            {sports.map((s) => (
                              <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-ink mb-2">Skill level (1–5, optional)</label>
                          <select
                            value={form.skill_level}
                            onChange={(e) => setForm((f) => ({ ...f, skill_level: e.target.value }))}
                            className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta text-ink bg-white"
                          >
                            <option value="">Not set</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-ink mb-2">NTRP override (optional)</label>
                          <input
                            type="number"
                            step="0.5"
                            min={1}
                            max={7}
                            value={form.ntrp_rating_override}
                            onChange={(e) => setForm((f) => ({ ...f, ntrp_rating_override: e.target.value }))}
                            className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta text-ink bg-white"
                            placeholder="e.g. 3.5"
                          />
                          <p className="text-xs text-stone mt-1">If set, this will show on your card for this sport.</p>
                        </div>
                        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-stone-soft bg-beige/40">
                          <div>
                            <p className="text-sm font-bold text-ink">Looking to play now</p>
                            <p className="text-xs text-stone">Shows “Available now” for the next 2 hours.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, available_now: !f.available_now }))}
                            className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                              form.available_now
                                ? 'bg-accent-green/15 border-accent-green/30 text-accent-green'
                                : 'border-stone-soft bg-white text-stone hover:bg-beige'
                            }`}
                            aria-pressed={form.available_now}
                          >
                            {form.available_now ? 'On' : 'Off'}
                          </button>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-ink mb-2">Notes (optional)</label>
                          <textarea
                            value={form.notes}
                            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                            className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta text-ink bg-white resize-none"
                            rows={3}
                            placeholder="e.g. Prefer weekday evenings, looking for doubles"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            id="is_active"
                            type="checkbox"
                            checked={form.is_active}
                            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                            className="rounded border-stone focus:ring-terracotta"
                          />
                          <label htmlFor="is_active" className="text-sm font-medium text-ink">Visible to others (they can find and request you)</label>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => { setShowAddProfile(false); setSaveError('') }}
                            className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige text-sm font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={saving}
                            className="btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-70"
                          >
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>

        {requestModalUserId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-stone-soft shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-display text-ink mb-4">Request to play</h2>
              <p className="text-stone text-sm mb-4">Send a short message (optional). They can accept or decline.</p>
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
                  onClick={() => { setRequestModalUserId(null); setRequestModalSportId(null) }}
                  className="flex-1 px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={sendRequest}
                  disabled={requestingId !== null}
                  className="flex-1 btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-70"
                >
                  {requestingId ? 'Sending…' : 'Send request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
