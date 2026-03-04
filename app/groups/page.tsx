'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { Users, Plus, MapPin, X } from '@/components/Icons'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'

type Sport = { id: string; slug: string; name: string; icon: string | null }
type Group = {
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
  member_count: number
  is_member: boolean
  is_creator: boolean
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'my' | 'discover'>('my')
  const [sportFilter, setSportFilter] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    sport_id: '',
    city: '',
    is_public: true,
  })

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const res = await fetch('/api/sports')
        if (res.ok) {
          const data = await res.json()
          setSports(data)
          if (data.length && !form.sport_id) setForm((f) => ({ ...f, sport_id: data[0].id }))
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchSports()
  }, [])

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (tab === 'my') params.set('my', 'true')
        if (sportFilter) params.set('sport_id', sportFilter)
        const res = await fetch(`/api/groups?${params}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setGroups(data)
      } catch (e) {
        console.error(e)
        setGroups([])
      } finally {
        setLoading(false)
      }
    }
    fetchGroups()
  }, [tab, sportFilter])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    if (!form.name.trim() || !form.sport_id) {
      setCreateError('Name and sport are required.')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          sport_id: form.sport_id,
          city: form.city.trim() || undefined,
          is_public: form.is_public,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message ?? data.error ?? 'Failed to create group')
      }
      const group = await res.json()
      setShowCreateModal(false)
      setForm({ name: '', description: '', sport_id: sports[0]?.id ?? '', city: '', is_public: true })
      window.location.href = `/groups/${group.id}`
    } catch (err: any) {
      setCreateError(err.message ?? 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-display text-ink">
              Sports groups
            </h1>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="btn-premium inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm"
            >
              <Plus className="w-5 h-5" />
              Create group
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <div className="bg-white rounded-xl p-1 border border-stone-soft shadow-sm flex">
              <button
                type="button"
                onClick={() => setTab('my')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'my' ? 'bg-ink text-white' : 'text-stone hover:bg-beige'
                }`}
              >
                My groups
              </button>
              <button
                type="button"
                onClick={() => setTab('discover')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'discover' ? 'bg-ink text-white' : 'text-stone hover:bg-beige'
                }`}
              >
                Discover
              </button>
            </div>
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
          </div>

          {loading ? (
            <LoadingSkeleton count={3} variant="card" />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={<Users className="w-14 h-14 text-stone mx-auto" />}
              title={tab === 'my' ? 'No groups yet' : 'No groups to discover'}
              description={
                tab === 'my'
                  ? 'Create a group or join one from Discover to plan play days with others.'
                  : 'No public groups match your filter. Try another sport or create your own.'
              }
              action={
                tab === 'my' ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="btn-premium inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl font-semibold text-sm"
                  >
                    <Plus className="w-5 h-5" />
                    Create group
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTab('my')}
                    className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige text-sm font-medium"
                  >
                    View my groups
                  </button>
                )
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => (
                <Link key={g.id} href={`/groups/${g.id}`}>
                  <div className="card-premium rounded-2xl p-6 cursor-pointer h-full flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-2xl" title={g.sport?.name}>{g.sport?.icon ?? '🎾'}</span>
                      {g.is_member && (
                        <span className="px-2.5 py-1 bg-terracotta/10 text-terracotta rounded-lg text-xs font-medium border border-terracotta/25">
                          Member
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-display text-ink mb-1 group-hover:text-terracotta transition-colors">
                      {g.name}
                    </h2>
                    {g.description && (
                      <p className="text-sm text-stone line-clamp-2 mb-3">{g.description}</p>
                    )}
                    {g.creator && (
                      <div className="flex items-center gap-2 text-stone text-sm mb-2">
                        {g.creator.image ? (
                          <img src={g.creator.image} alt="" className="w-5 h-5 rounded-full object-cover border border-stone-soft" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-stone-soft flex items-center justify-center text-ink text-xs font-medium">
                            {(g.creator.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>Created by {g.creator.name || 'Unknown'}</span>
                      </div>
                    )}
                    {g.city && (
                      <div className="flex items-center gap-1.5 text-stone text-sm mb-3">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span>{g.city}</span>
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between text-sm text-stone">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {g.member_count} {g.member_count === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-stone-soft shadow-xl max-w-md w-full p-6 relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display text-ink">Create a group</h2>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateError('') }}
                  className="p-2 text-stone hover:text-ink rounded-lg hover:bg-beige transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {createError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                  {createError}
                </div>
              )}
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-ink mb-2">Group name</label>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta focus:border-terracotta text-ink bg-white"
                    placeholder="e.g. Downtown Tennis Crew"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="sport" className="block text-sm font-bold text-ink mb-2">Sport</label>
                  <select
                    id="sport"
                    value={form.sport_id}
                    onChange={(e) => setForm((f) => ({ ...f, sport_id: e.target.value }))}
                    className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta focus:border-terracotta text-ink bg-white"
                    required
                  >
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-bold text-ink mb-2">Description (optional)</label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta focus:border-terracotta text-ink bg-white resize-none"
                    rows={3}
                    placeholder="What's this group about?"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-bold text-ink mb-2">City (optional)</label>
                  <input
                    id="city"
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta focus:border-terracotta text-ink bg-white"
                    placeholder="e.g. Orlando"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="is_public"
                    type="checkbox"
                    checked={form.is_public}
                    onChange={(e) => setForm((f) => ({ ...f, is_public: e.target.checked }))}
                    className="rounded border-stone focus:ring-terracotta"
                  />
                  <label htmlFor="is_public" className="text-sm font-medium text-ink">Public (others can discover and join)</label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setCreateError('') }}
                    className="flex-1 px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-70"
                  >
                    {creating ? 'Creating…' : 'Create group'}
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
