'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { ArrowLeft, Plus, X } from '@/components/Icons'

type Sport = { id: string; slug: string; name: string; icon: string | null }

export default function CreateTournamentPage() {
  const router = useRouter()
  const [sports, setSports] = useState<Sport[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    sport_id: '',
    starts_at: '',
    location: '',
    bracket_type: 'single_elimination' as 'single_elimination' | 'group_knockout',
    team_size: 1 as 1 | 2,
    groups_count: 2,
    divisions: [{ name: 'Open', skill_level_min: '', skill_level_max: '', max_participants: '' }],
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

  const addDivision = () => {
    setForm((f) => ({
      ...f,
      divisions: [...f.divisions, { name: '', skill_level_min: '', skill_level_max: '', max_participants: '' }],
    }))
  }

  const removeDivision = (i: number) => {
    if (form.divisions.length <= 1) return
    setForm((f) => ({
      ...f,
      divisions: f.divisions.filter((_, j) => j !== i),
    }))
  }

  const updateDivision = (i: number, field: string, value: string | number) => {
    setForm((f) => ({
      ...f,
      divisions: f.divisions.map((d, j) =>
        j === i ? { ...d, [field]: value === '' ? '' : value } : d
      ),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.sport_id || !form.starts_at) {
      setError('Name, sport, and start date are required.')
      return
    }
    const divisions = form.divisions.filter((d) => d.name.trim())
    if (divisions.length === 0) {
      setError('Add at least one division (e.g. Open).')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          sport_id: form.sport_id,
          starts_at: new Date(form.starts_at).toISOString(),
          bracket_type: form.bracket_type,
          team_size: form.team_size,
          groups_count: form.bracket_type === 'group_knockout' ? form.groups_count : undefined,
          location: form.location.trim() || undefined,
          divisions: divisions.map((d) => ({
            name: d.name.trim(),
            skill_level_min: d.skill_level_min ? parseInt(String(d.skill_level_min), 10) : undefined,
            skill_level_max: d.skill_level_max ? parseInt(String(d.skill_level_max), 10) : undefined,
            max_participants: d.max_participants ? parseInt(String(d.max_participants), 10) : undefined,
          })),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message ?? data.error ?? 'Failed to create tournament')
      }
      const tournament = await res.json()
      router.push(`/tournaments/${tournament.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message ?? 'Failed to create tournament')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-stone hover:text-terracotta transition-colors text-sm font-medium mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to tournaments
          </Link>

          <h1 className="text-2xl md:text-3xl font-display text-ink mb-8">Create tournament</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-ink mb-2">Tournament name</label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta focus:border-terracotta text-ink bg-white"
                placeholder="e.g. Spring Open 2025"
                required
              />
            </div>
            <div>
              <label htmlFor="sport" className="block text-sm font-bold text-ink mb-2">Sport</label>
              <select
                id="sport"
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
              <label htmlFor="starts_at" className="block text-sm font-bold text-ink mb-2">Start date & time</label>
              <input
                id="starts_at"
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta text-ink bg-white"
                required
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-bold text-ink mb-2">Location (optional)</label>
              <input
                id="location"
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta text-ink bg-white"
                placeholder="e.g. Central Tennis Club"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-bold text-ink mb-2">Description (optional)</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta text-ink bg-white resize-none"
                rows={3}
                placeholder="Rules, format, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-ink mb-2">Format</label>
              <div className="flex gap-3">
                {([
                  { value: 'single_elimination', label: 'Single Elimination', desc: 'Lose once, you\'re out' },
                  { value: 'group_knockout', label: 'Group Stage + Knockout', desc: 'Round-robin groups → bracket' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, bracket_type: opt.value }))}
                    className={`flex-1 p-4 rounded-2xl border-2 text-left transition-all ${
                      form.bracket_type === opt.value
                        ? 'border-terracotta bg-terracotta/5'
                        : 'border-stone-soft bg-white hover:border-terracotta/40'
                    }`}
                  >
                    <p className={`font-semibold text-sm ${form.bracket_type === opt.value ? 'text-terracotta' : 'text-ink'}`}>{opt.label}</p>
                    <p className="text-xs text-stone mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-ink mb-2">Team size</label>
              <div className="flex gap-3">
                {([
                  { value: 1, label: 'Singles', desc: '1 player per entry' },
                  { value: 2, label: 'Doubles', desc: '2 players per entry' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, team_size: opt.value }))}
                    className={`flex-1 p-4 rounded-2xl border-2 text-left transition-all ${
                      form.team_size === opt.value
                        ? 'border-terracotta bg-terracotta/5'
                        : 'border-stone-soft bg-white hover:border-terracotta/40'
                    }`}
                  >
                    <p className={`font-semibold text-sm ${form.team_size === opt.value ? 'text-terracotta' : 'text-ink'}`}>{opt.label}</p>
                    <p className="text-xs text-stone mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {form.bracket_type === 'group_knockout' && (
              <div>
                <label htmlFor="groups_count" className="block text-sm font-bold text-ink mb-2">Groups per division</label>
                <input
                  id="groups_count"
                  type="number"
                  min={2}
                  max={8}
                  value={form.groups_count}
                  onChange={(e) => setForm((f) => ({ ...f, groups_count: Math.max(2, Math.min(8, parseInt(e.target.value, 10) || 2)) }))}
                  className="w-32 px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta focus:border-terracotta text-ink bg-white"
                />
                <p className="text-xs text-stone mt-1">Teams are split evenly across groups. Min 2, max 8.</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-ink">Divisions</label>
                <button
                  type="button"
                  onClick={addDivision}
                  className="inline-flex items-center gap-1 text-terracotta hover:underline text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add division
                </button>
              </div>
              <p className="text-stone text-sm mb-3">Add at least one division (e.g. Open, 3.0–3.5).</p>
              <div className="space-y-3">
                {form.divisions.map((d, i) => (
                  <div key={i} className="p-4 bg-white border border-stone-soft rounded-xl flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-xs font-medium text-stone mb-1">Name</label>
                      <input
                        type="text"
                        value={d.name}
                        onChange={(e) => updateDivision(i, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-stone-soft rounded-lg text-ink text-sm"
                        placeholder="e.g. Open"
                      />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs font-medium text-stone mb-1">Min level</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={d.skill_level_min}
                        onChange={(e) => updateDivision(i, 'skill_level_min', e.target.value)}
                        className="w-full px-3 py-2 border border-stone-soft rounded-lg text-ink text-sm"
                        placeholder="—"
                      />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs font-medium text-stone mb-1">Max level</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={d.skill_level_max}
                        onChange={(e) => updateDivision(i, 'skill_level_max', e.target.value)}
                        className="w-full px-3 py-2 border border-stone-soft rounded-lg text-ink text-sm"
                        placeholder="—"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-medium text-stone mb-1">Max size</label>
                      <input
                        type="number"
                        min={2}
                        value={d.max_participants}
                        onChange={(e) => updateDivision(i, 'max_participants', e.target.value)}
                        className="w-full px-3 py-2 border border-stone-soft rounded-lg text-ink text-sm"
                        placeholder="—"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDivision(i)}
                      disabled={form.divisions.length <= 1}
                      className="p-2 text-stone hover:text-red-600 disabled:opacity-40"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                href="/tournaments"
                className="flex-1 px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige text-sm font-medium text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-70"
              >
                {saving ? 'Creating…' : 'Create tournament'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  )
}
