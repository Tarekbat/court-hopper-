'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { UserPlus, Users, MapPin, X } from '@/components/Icons'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'

type Sport = { id: string; slug: string; name: string; icon: string | null }
type MyProfile = {
  id: string
  user_id: string
  sport_id: string
  sport: Sport | null
  skill_level: number | null
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
  const [sportFilter, setSportFilter] = useState('')
  const [tab, setTab] = useState<'discover' | 'my'>('discover')
  const [showAddProfile, setShowAddProfile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [form, setForm] = useState({
    sport_id: '',
    skill_level: '' as string | number,
    notes: '',
    is_active: true,
  })
  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [requestModalUserId, setRequestModalUserId] = useState<string | null>(null)
  const [requestModalSportId, setRequestModalSportId] = useState('')
  const [nearYouFilter, setNearYouFilter] = useState(false)
  const [userCity, setUserCity] = useState<string | null>(null)

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
        if (sportFilter) params.set('sport_id', sportFilter)
        const baseUrl = nearYouFilter && userCity
          ? `/api/play-partners/nearby?city=${encodeURIComponent(userCity)}`
          : '/api/play-partners'
        const url = nearYouFilter && userCity
          ? `${baseUrl}${sportFilter ? `&sport_id=${sportFilter}` : ''}`
          : `/api/play-partners?${params}`
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
  }, [tab, sportFilter, nearYouFilter, userCity])

  useEffect(() => {
    if (!loading) setLoading(false)
  }, [myProfiles])

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
      setForm({ sport_id: sports[0]?.id ?? '', skill_level: '', notes: '', is_active: true })
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const openRequestModal = (userId: string, sportId: string) => {
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
      setRequestModalSportId('')
      setDiscover((prev) => prev.filter((p) => !(p.user_id === requestModalUserId && p.sport_id === requestModalSportId)))
    } catch (e) {
      alert('Failed to send request')
    } finally {
      setRequestingId(null)
    }
  }

  const loadingState = loading && myProfiles.length === 0

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
                {userCity && (
                  <button
                    type="button"
                    onClick={() => setNearYouFilter((v) => !v)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      nearYouFilter
                        ? 'bg-terracotta/10 border-terracotta/30 text-terracotta'
                        : 'border-stone-soft bg-white text-stone hover:bg-beige'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    Near you ({userCity})
                  </button>
                )}
              </>
            )}
            {tab === 'my' && (
              <button
                type="button"
                onClick={() => {
                  setForm({ sport_id: sports[0]?.id ?? '', skill_level: '', notes: '', is_active: true })
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
                <LoadingSkeleton count={3} variant="row" />
              ) : discover.length === 0 ? (
                <EmptyState
                  icon={<UserPlus className="w-14 h-14 text-stone mx-auto" />}
                  title="No players found"
                  description="No one is currently looking for play partners in this sport. Try another sport or add your own profile so others can find you."
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
                <div className="space-y-4">
                  {discover.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        {p.image ? (
                          <img src={p.image} alt="" className="w-14 h-14 rounded-full object-cover border border-stone-soft" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-terracotta flex items-center justify-center text-white text-xl font-semibold">
                            {(p.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-display text-lg text-ink">{p.name || 'Player'}</p>
                          <p className="text-stone text-sm flex items-center gap-1.5 mt-0.5">
                            <span>{p.sport?.icon} {p.sport?.name}</span>
                            {p.skill_level != null && (
                              <span className="px-2 py-0.5 bg-stone-soft/80 rounded text-xs">Level {p.skill_level}</span>
                            )}
                          </p>
                          {p.notes && <p className="text-stone text-sm mt-1 line-clamp-2">{p.notes}</p>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openRequestModal(p.user_id, p.sport_id)}
                        disabled={requestingId === p.user_id}
                        className="btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-70"
                      >
                        <UserPlus className="w-4 h-4" />
                        {requestingId === p.user_id ? 'Sending…' : 'Request to play'}
                      </button>
                    </div>
                  ))}
                </div>
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
                  onClick={() => { setRequestModalUserId(null); setRequestModalSportId('') }}
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
