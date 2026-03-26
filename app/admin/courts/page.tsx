'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'

type CourtAdminListItem = {
  id: string
  name: string
  city: string
  state: string
  surface: string
  cost_type?: string
  total_courts: number
  peak_price: number
  off_peak_price: number
  rating: number
  review_count: number
  status: string
  created_at: string
  primary_image: string | null
  images_preview: string[]
  available_days: string[]
}

type CourtAdminDetail = CourtAdminListItem & {
  // Raw columns needed for editing
  address: string
  zip_code: string
  latitude: number
  longitude: number
  distance: number | null
  description: string
  amenities: string[]
  images: string[]
  available_days: string[]

  cost_notes: string | null

  phone_number: string | null
  website_url: string | null
  reservation_required: boolean
  reservation_link: string | null
  special_instructions: string | null

  hours_24_7: boolean
  hours_by_day: Record<string, { open: string; close: string }>
  surfaces: string[]
}

const AMENITIES = [
  'Lights',
  'Parking',
  'Pro Shop',
  'Restrooms',
  'Water Fountains',
  'Hitting Wall',
  'Lockers',
  'Cafe',
  'Seating Area',
] as const

const AVAILABLE_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

const SURFACE_MULTI = ['Hard', 'Clay', 'Grass', 'Indoor'] as const

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

function mapPrimarySurface(selected: string[]) {
  // Existing app compatibility: Indoor maps to Carpet.
  if (selected.includes('Indoor')) return 'Carpet'
  return (selected[0] || 'Hard') as string
}

function toggleInArray<T>(arr: T[], value: T) {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]
}

export default function AdminCourtsPage() {
  const [items, setItems] = useState<CourtAdminListItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detail, setDetail] = useState<CourtAdminDetail | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchList = async (opts?: { cursor?: string | null; append?: boolean }) => {
    try {
      setError(null)
      const cursor = opts?.cursor ?? null
      const append = Boolean(opts?.append)

      const url = new URL('/api/admin/courts', window.location.origin)
      if (q.trim().length >= 2) url.searchParams.set('q', q.trim())
      if (cursor) url.searchParams.set('cursor', cursor)
      url.searchParams.set('limit', '20')

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load courts')
      const data = await res.json()

      setItems((prev) => (append ? [...prev, ...(data.items ?? [])] : data.items ?? []))
      setNextCursor(data.nextCursor ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load courts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList({ cursor: null, append: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const statusBadge = (status: string) => {
    if (status === 'active') return 'bg-green-600/10 text-green-800 border-green-600/20'
    if (status === 'temporarily_closed') return 'bg-amber-600/10 text-amber-800 border-amber-600/20'
    return 'bg-red-600/10 text-red-800 border-red-600/20'
  }

  const openCreate = () => {
    setEditorMode('create')
    setEditingId(null)
    setDetail({
      id: '',
      name: '',
      city: '',
      state: '',
      surface: 'Hard',
      total_courts: 1,
      peak_price: 0,
      off_peak_price: 0,
      rating: 0,
      review_count: 0,
      status: 'active',
      cost_type: 'pay_per_hour',
      cost_notes: null,
      created_at: new Date().toISOString(),
      primary_image: null,
      images_preview: [],
      available_days: [...AVAILABLE_DAYS],

      address: '',
      zip_code: '',
      latitude: 0,
      longitude: 0,
      distance: null,
      description: '',
      amenities: [],
      images: [],

      phone_number: null,
      website_url: null,
      reservation_required: false,
      reservation_link: null,
      special_instructions: null,

      hours_24_7: false,
      hours_by_day: {},
      surfaces: ['Hard'],
    })
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = async (id: string) => {
    setFormError(null)
    setEditorMode('edit')
    setEditingId(id)
    setDetail(null)
    setEditorOpen(true)
    const res = await fetch(`/api/admin/courts/${id}`)
    if (!res.ok) {
      setFormError((await res.json()).error ?? 'Failed to load court')
      return
    }
    const data = await res.json()
    setDetail(data.court as CourtAdminDetail)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setDetail(null)
    setEditingId(null)
  }

  const primarySurface = useMemo(() => {
    if (!detail) return 'Hard'
    return mapPrimarySurface(detail.surfaces ?? [detail.surface])
  }, [detail])

  const saveCourt = async (payloadOverrides?: Partial<CourtAdminDetail>) => {
    if (!detail) return
    setSaving(true)
    setFormError(null)
    try {
      const primary = primarySurface
      const costType = detail.cost_type ?? 'pay_per_hour'
      const normalizedPeak = costType === 'pay_per_hour' ? Number(detail.peak_price) : 0
      const normalizedOffPeak = costType === 'pay_per_hour' ? Number(detail.off_peak_price) : 0
      const body: any = {
        name: detail.name,
        address: detail.address,
        city: detail.city,
        state: detail.state,
        zip_code: detail.zip_code,
        latitude: Number(detail.latitude),
        longitude: Number(detail.longitude),
        distance: detail.distance ?? null,

        total_courts: Number(detail.total_courts),
        surface: primary,
        peak_price: normalizedPeak,
        off_peak_price: normalizedOffPeak,

        description: detail.description ?? '',
        amenities: detail.amenities ?? [],
        available_days: detail.available_days ?? [],
        images: detail.images ?? [],

        status: detail.status,
        cost_type: costType,
        cost_notes: detail.cost_notes ?? null,
        phone_number: detail.phone_number ?? null,
        website_url: detail.website_url ?? null,
        reservation_required: Boolean(detail.reservation_required),
        reservation_link: detail.reservation_link ?? null,
        special_instructions: detail.special_instructions ?? null,

        hours_24_7: Boolean(detail.hours_24_7),
        hours_by_day: detail.hours_24_7 ? {} : detail.hours_by_day ?? {},
        surfaces: detail.surfaces ?? [],
      }

      if (editorMode === 'create') {
        const res = await fetch('/api/admin/courts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create court')
        const data = await res.json()
        const created = data.court as CourtAdminDetail
        setDetail(created)
        setEditingId(created.id)
        setEditorMode('edit')
        // Keep the editor open so the admin can immediately upload photos and set primary.
        fetchList({ cursor: null, append: false })
      } else {
        const id = editingId
        if (!id) throw new Error('Missing court id')
        const res = await fetch(`/api/admin/courts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to update court')
        const data = await res.json()
        setDetail(data.court as CourtAdminDetail)
      }

      if (editorMode === 'edit') {
        closeEditor()
        fetchList({ cursor: null, append: false })
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save court')
    } finally {
      setSaving(false)
    }
  }

  const uploadImages = async (files: FileList | null) => {
    if (!detail) return
    if (!detail.id) throw new Error('Create the court before uploading images.')
    if (!files || files.length === 0) return

    setUploading(true)
    setFormError(null)
    try {
      const formData = new FormData()
      Array.from(files).forEach((f) => formData.append('files', f))

      const res = await fetch(`/api/courts/${detail.id}/images`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Image upload failed')

      // Refresh detail (captures merged images)
      const refreshed = await fetch(`/api/admin/courts/${detail.id}`)
      if (!refreshed.ok) throw new Error((await refreshed.json()).error ?? 'Failed to refresh court')
      const data = await refreshed.json()
      setDetail(data.court as CourtAdminDetail)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const setPrimary = async (url: string) => {
    if (!detail?.id) return
    setFormError(null)
    const res = await fetch(
      `/api/courts/${detail.id}/images?url=${encodeURIComponent(url)}`,
      { method: 'PUT' }
    )
    if (!res.ok) {
      setFormError((await res.json()).error ?? 'Failed to set primary')
      return
    }
    const refreshed = await fetch(`/api/admin/courts/${detail.id}`)
    if (refreshed.ok) {
      const data = await refreshed.json()
      setDetail(data.court as CourtAdminDetail)
    }
  }

  const deleteImage = async (url: string) => {
    if (!detail?.id) return
    const ok = confirm('Delete this image?')
    if (!ok) return

    setFormError(null)
    const res = await fetch(
      `/api/courts/${detail.id}/images?url=${encodeURIComponent(url)}`,
      { method: 'DELETE' }
    )
    if (!res.ok) {
      setFormError((await res.json()).error ?? 'Failed to delete image')
      return
    }
    const refreshed = await fetch(`/api/admin/courts/${detail.id}`)
    if (refreshed.ok) {
      const data = await refreshed.json()
      setDetail(data.court as CourtAdminDetail)
    }
  }

  const deleteCourt = async (id: string) => {
    const ok = confirm('Delete this court? (This marks it permanently closed)')
    if (!ok) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/courts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to delete court')
      await fetchList({ cursor: null, append: false })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete court')
    } finally {
      setLoading(false)
    }
  }

  const canEdit = Boolean(detail)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#1A1A1A]">Court Management</h1>
          <p className="text-sm text-[#8A8279] mt-1">Add, edit, and close courts from your phone.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#C41E2A] text-white font-semibold"
        >
          + Add Court
        </button>
      </div>

      <div className="bg-white border border-stone-soft rounded-2xl p-4 mb-4">
        <label className="block text-sm font-semibold text-ink mb-2">Search</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
          placeholder="Search by name or city"
        />
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-stone-soft/50 border border-stone-soft font-semibold"
            onClick={() => fetchList({ cursor: null, append: false })}
          >
            Apply
          </button>
          <button
            type="button"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-transparent border border-stone-soft font-semibold"
            onClick={() => {
              setQ('')
              fetchList({ cursor: null, append: false })
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-soft p-6 text-center">Loading…</div>
      ) : null}

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 mb-4">{error}</div>
      ) : null}

      <div className="grid gap-3">
        {items.map((c) => (
          <div
            key={c.id}
            className="bg-white border border-stone-soft rounded-2xl p-4 flex gap-3"
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-soft/50 flex-shrink-0 border border-stone-soft">
              {c.primary_image ? (
                <img src={c.primary_image} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display font-bold text-[#1A1A1A] truncate">{c.name}</div>
                  <div className="text-sm text-[#8A8279] mt-1 truncate">
                    {c.city}, {c.state} · {c.surface}
                  </div>
                </div>
                <div
                  className={classNames(
                    'px-3 py-1 rounded-xl text-xs font-semibold border',
                    statusBadge(c.status)
                  )}
                >
                  {c.status.replace('_', ' ')}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-3">
                <div className="text-sm font-semibold text-[#1A1A1A]">
                  ${c.off_peak_price}–${c.peak_price}/hr
                </div>
                <div className="text-sm text-[#8A8279]">
                  {c.total_courts} courts
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-stone-soft/50 border border-stone-soft font-semibold text-sm"
                  onClick={() => openEdit(c.id)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-red-600/10 border border-red-600/20 text-red-700 font-semibold text-sm"
                  onClick={() => deleteCourt(c.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {nextCursor ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className="min-h-[44px] px-5 py-3 rounded-xl bg-stone-soft/50 border border-stone-soft font-semibold"
            onClick={() => fetchList({ cursor: nextCursor, append: true })}
          >
            Load more
          </button>
        </div>
      ) : null}

      {/* Editor modal */}
      {editorOpen && detail ? (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-soft overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-4 py-3 border-b border-stone-soft flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-[#1A1A1A]">
                  {editorMode === 'create' ? 'Add Court' : 'Edit Court'}
                </div>
                <div className="text-sm text-[#8A8279] mt-1">All fields saved securely (admin only).</div>
              </div>
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] rounded-xl border border-stone-soft flex items-center justify-center"
                onClick={closeEditor}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              {formError ? (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl p-3 text-sm">
                  {formError}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1">Court name</label>
                    <input
                      className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                      value={detail.name}
                      onChange={(e) => setDetail({ ...detail, name: e.target.value })}
                      placeholder="e.g., Crandon Park Tennis Center"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1">Status</label>
                    <select
                      className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                      value={detail.status}
                      onChange={(e) => setDetail({ ...detail, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="temporarily_closed">Temporarily Closed</option>
                      <option value="permanently_closed">Permanently Closed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-1">Address</label>
                  <input
                    className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                    value={detail.address}
                    onChange={(e) => setDetail({ ...detail, address: e.target.value })}
                    placeholder="Full address"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1">City</label>
                    <input
                      className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                      value={detail.city}
                      onChange={(e) => setDetail({ ...detail, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1">State</label>
                    <input
                      className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                      value={detail.state}
                      onChange={(e) => setDetail({ ...detail, state: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1">ZIP</label>
                    <input
                      className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                      value={detail.zip_code}
                      onChange={(e) => setDetail({ ...detail, zip_code: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                      value={detail.latitude}
                      onChange={(e) => setDetail({ ...detail, latitude: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                      value={detail.longitude}
                      onChange={(e) => setDetail({ ...detail, longitude: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-semibold text-ink mb-1">Courts</label>
                    <input
                      type="number"
                      className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                      value={detail.total_courts}
                      onChange={(e) => setDetail({ ...detail, total_courts: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1">Peak</label>
                    <input
                      type="number"
                      className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                      value={detail.peak_price}
                      onChange={(e) => setDetail({ ...detail, peak_price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1">Off-peak</label>
                    <input
                      type="number"
                      className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                      value={detail.off_peak_price}
                      onChange={(e) => setDetail({ ...detail, off_peak_price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-semibold text-ink mb-1">Primary surface</label>
                    <div className="text-sm text-[#8A8279] mt-2 min-h-[44px] flex items-center">
                      {primarySurface}
                    </div>
                  </div>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1">Cost type</label>
                  <select
                    className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                    value={detail.cost_type ?? 'pay_per_hour'}
                    onChange={(e) => {
                      const next = e.target.value
                      // Keep pricing consistent with the cost type.
                      setDetail({
                        ...detail,
                        cost_type: next,
                        peak_price: next === 'pay_per_hour' ? detail.peak_price : 0,
                        off_peak_price: next === 'pay_per_hour' ? detail.off_peak_price : 0,
                      })
                    }}
                  >
                    <option value="pay_per_hour">Pay-per-hour</option>
                    <option value="free">Free</option>
                    <option value="membership_required">Membership required</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1">Cost notes</label>
                  <input
                    className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                    value={detail.cost_notes ?? ''}
                    onChange={(e) => setDetail({ ...detail, cost_notes: e.target.value || null })}
                    placeholder="Optional"
                  />
                </div>
              </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Surface types (multi-select)</label>
                  <div className="flex flex-wrap gap-2">
                    {SURFACE_MULTI.map((s) => {
                      const selected = (detail.surfaces ?? []).includes(s)
                      return (
                        <button
                          key={s}
                          type="button"
                          className={classNames(
                            'min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold border',
                            selected ? 'bg-[#C41E2A] text-white border-[#C41E2A]' : 'bg-stone-soft/50 text-ink border-stone-soft'
                          )}
                          onClick={() =>
                            setDetail({
                              ...detail,
                              surfaces: toggleInArray(detail.surfaces ?? [], s),
                            })
                          }
                        >
                          {s}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Amenities (multi-select)</label>
                  <div className="flex flex-wrap gap-2">
                    {AMENITIES.map((a) => {
                      const selected = (detail.amenities ?? []).includes(a)
                      return (
                        <button
                          key={a}
                          type="button"
                          className={classNames(
                            'min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold border',
                            selected ? 'bg-[#C41E2A] text-white border-[#C41E2A]' : 'bg-stone-soft/50 text-ink border-stone-soft'
                          )}
                          onClick={() =>
                            setDetail({
                              ...detail,
                              amenities: toggleInArray(detail.amenities ?? [], a),
                            })
                          }
                        >
                          {a}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Available days</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_DAYS.map((d) => {
                      const selected = (detail.available_days ?? []).includes(d)
                      return (
                        <button
                          key={d}
                          type="button"
                          className={classNames(
                            'min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold border',
                            selected ? 'bg-[#C41E2A] text-white border-[#C41E2A]' : 'bg-stone-soft/50 text-ink border-stone-soft'
                          )}
                          onClick={() =>
                            setDetail({
                              ...detail,
                              available_days: toggleInArray(detail.available_days ?? [], d),
                            })
                          }
                        >
                          {d}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="border border-stone-soft rounded-2xl p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-ink">24/7 hours</div>
                      <div className="text-xs text-[#8A8279] mt-1">Maps to the app scheduling window (7:00–21:00).</div>
                    </div>
                    <button
                      type="button"
                      className={classNames(
                        'min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold border',
                        detail.hours_24_7 ? 'bg-[#C41E2A] text-white border-[#C41E2A]' : 'bg-stone-soft/50 text-ink border-stone-soft'
                      )}
                      onClick={() => setDetail({ ...detail, hours_24_7: !detail.hours_24_7 })}
                    >
                      {detail.hours_24_7 ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>

                {!detail.hours_24_7 ? (
                  <div className="border border-stone-soft rounded-2xl p-3">
                    <div className="text-sm font-semibold text-ink mb-3">Hours by day</div>
                    <div className="grid gap-3">
                      {(detail.available_days ?? []).map((d) => {
                        const existing = detail.hours_by_day?.[d]
                        return (
                          <div key={d} className="flex items-center gap-2">
                            <div className="w-32 text-sm font-semibold text-ink">{d}</div>
                            <input
                              type="time"
                              className="min-h-[44px] px-3 border border-stone-soft rounded-xl flex-1"
                              value={existing?.open ?? '07:00'}
                              onChange={(e) => {
                                const open = e.target.value
                                setDetail({
                                  ...detail,
                                  hours_by_day: {
                                    ...(detail.hours_by_day ?? {}),
                                    [d]: {
                                      open,
                                      close: detail.hours_by_day?.[d]?.close ?? '21:00',
                                    },
                                  },
                                })
                              }}
                            />
                            <input
                              type="time"
                              className="min-h-[44px] px-3 border border-stone-soft rounded-xl flex-1"
                              value={existing?.close ?? '21:00'}
                              onChange={(e) => {
                                const close = e.target.value
                                setDetail({
                                  ...detail,
                                  hours_by_day: {
                                    ...(detail.hours_by_day ?? {}),
                                    [d]: {
                                      open: detail.hours_by_day?.[d]?.open ?? '07:00',
                                      close,
                                    },
                                  },
                                })
                              }}
                            />
                          </div>
                        )
                      })}
                      {(detail.available_days ?? []).length === 0 ? (
                        <div className="text-sm text-[#8A8279]">Select at least one available day.</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1">Phone number</label>
                    <input
                      className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                      value={detail.phone_number ?? ''}
                      onChange={(e) => setDetail({ ...detail, phone_number: e.target.value || null })}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1">Website URL</label>
                    <input
                      className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                      value={detail.website_url ?? ''}
                      onChange={(e) => setDetail({ ...detail, website_url: e.target.value || null })}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div className="border border-stone-soft rounded-2xl p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-ink">Reservation required</div>
                      <div className="text-xs text-[#8A8279] mt-1">Show if users must book before playing.</div>
                    </div>
                    <button
                      type="button"
                      className={classNames(
                        'min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold border',
                        detail.reservation_required ? 'bg-[#C41E2A] text-white border-[#C41E2A]' : 'bg-stone-soft/50 text-ink border-stone-soft'
                      )}
                      onClick={() =>
                        setDetail({ ...detail, reservation_required: !detail.reservation_required })
                      }
                    >
                      {detail.reservation_required ? 'Yes' : 'No'}
                    </button>
                  </div>
                  {detail.reservation_required ? (
                    <div className="mt-3">
                      <label className="block text-sm font-semibold text-ink mb-1">Reservation link</label>
                      <input
                        className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
                        value={detail.reservation_link ?? ''}
                        onChange={(e) =>
                          setDetail({ ...detail, reservation_link: e.target.value || null })
                        }
                        placeholder="https://..."
                      />
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-1">Special instructions</label>
                  <textarea
                    className="w-full min-h-[96px] px-4 py-3 border border-stone-soft rounded-xl"
                    value={detail.special_instructions ?? ''}
                    onChange={(e) => setDetail({ ...detail, special_instructions: e.target.value || null })}
                    placeholder="e.g., Enter through the park gate on Oak St"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink mb-1">Description</label>
                  <textarea
                    className="w-full min-h-[96px] px-4 py-3 border border-stone-soft rounded-xl"
                    value={detail.description ?? ''}
                    onChange={(e) => setDetail({ ...detail, description: e.target.value })}
                    placeholder="What makes this court facility special?"
                  />
                </div>

                <div className="border border-stone-soft rounded-2xl p-3">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-semibold text-ink">Photos</div>
                      <div className="text-xs text-[#8A8279] mt-1">Upload multiple, set primary, delete.</div>
                    </div>
                    <div className="text-xs text-[#8A8279]">{(detail.images?.length ?? 0)} total</div>
                  </div>

                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    disabled={uploading || !detail.id}
                    onChange={(e) => uploadImages(e.target.files)}
                    className="min-h-[44px] w-full"
                  />

                  {detail.images?.length ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {detail.images.slice(0, 8).map((img) => (
                        <div key={img} className="rounded-xl border border-stone-soft overflow-hidden bg-stone-soft/50">
                          <div className="relative">
                            <img src={img} alt="" className="w-full h-24 object-cover" />
                            <div className="absolute top-2 left-2">
                              {detail.images[0] === img ? (
                                <span className="px-2 py-1 rounded-xl bg-[#C41E2A] text-white text-[11px] font-semibold">
                                  Primary
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="p-2 flex gap-2">
                            {detail.images[0] !== img ? (
                              <button
                                type="button"
                                className="flex-1 min-h-[44px] px-2 py-2 rounded-xl bg-stone-soft/50 border border-stone-soft text-xs font-semibold"
                                onClick={() => setPrimary(img)}
                              >
                                Set Primary
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="min-h-[44px] px-2 py-2 rounded-xl bg-red-600/10 border border-red-600/20 text-red-700 text-xs font-semibold"
                              onClick={() => deleteImage(img)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-[#8A8279] mt-2">No images yet.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-stone-soft">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-transparent border border-stone-soft font-semibold"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveCourt()}
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-[#C41E2A] text-white font-semibold disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : editorMode === 'create' ? 'Create Court' : 'Save Changes'}
                </button>
              </div>
              {editorMode === 'create' ? (
                <div className="text-xs text-[#8A8279] mt-2">
                  After creating, upload photos and set a primary image here.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

