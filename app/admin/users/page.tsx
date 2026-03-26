'use client'

import { useEffect, useState } from 'react'

type AdminUserRow = {
  id: string
  name: string | null
  email: string
  image: string | null
  is_admin: boolean
  created_at: string
  city: string | null
  phone_number: string | null
}

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUserRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [suspendingId, setSuspendingId] = useState<string | null>(null)

  const fetchList = async (opts?: { cursor?: string | null; append?: boolean }) => {
    const cursor = opts?.cursor ?? null
    const append = Boolean(opts?.append)
    try {
      setError(null)
      const url = new URL('/api/admin/users', window.location.origin)
      url.searchParams.set('limit', '20')
      if (q.trim().length >= 2) url.searchParams.set('q', q.trim())
      if (cursor) url.searchParams.set('cursor', cursor)

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load users')
      const data = await res.json()

      setItems((prev) => (append ? [...prev, ...(data.items ?? [])] : data.items ?? []))
      setNextCursor(data.nextCursor ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList({ cursor: null, append: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleAdmin = async (user: AdminUserRow) => {
    setTogglingId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: !user.is_admin }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to update role')
      await fetchList({ cursor: null, append: false })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update role')
    } finally {
      setTogglingId(null)
    }
  }

  const sendReset = async (user: AdminUserRow) => {
    const ok = confirm(`Send password reset email to ${user.email}?`)
    if (!ok) return

    setResettingId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_password: true }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to send reset email')
      await fetchList({ cursor: null, append: false })
      alert('Reset email request sent (check Supabase email logs).')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send reset email')
    } finally {
      setResettingId(null)
    }
  }

  const suspendUser = async (user: AdminUserRow) => {
    const ok = confirm(`Suspend ${user.email}? They will not be able to sign in.`)
    if (!ok) return
    setSuspendingId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend_account: true }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to suspend user')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to suspend user')
    } finally {
      setSuspendingId(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#1A1A1A]">User Management</h1>
          <p className="text-sm text-[#8A8279] mt-1">Assign admin role and send password reset emails.</p>
        </div>
      </div>

      <div className="bg-white border border-stone-soft rounded-2xl p-4 mb-4">
        <label className="block text-sm font-semibold text-ink mb-2">Search</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full min-h-[44px] px-4 border border-stone-soft rounded-xl"
          placeholder="Search by name, email, or city"
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

      <div className="bg-white border border-stone-soft rounded-2xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1.4fr,1.5fr,0.8fr,0.6fr,0.7fr] px-4 py-3 border-b border-stone-soft text-xs font-semibold text-[#8A8279]">
          <div>User</div>
          <div>Contact</div>
          <div>Role</div>
          <div>City</div>
          <div>Actions</div>
        </div>

        <div className="divide-y divide-stone-soft">
          {items.map((u) => (
            <div key={u.id} className="px-4 py-3 sm:grid grid-cols-[1.4fr,1.5fr,0.8fr,0.6fr,0.7fr] items-center gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-[#1A1A1A] truncate">{u.name || '—'}</div>
                <div className="text-xs text-[#8A8279] truncate">{u.id}</div>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{u.email}</div>
                <div className="text-xs text-[#8A8279] truncate">{u.phone_number ?? '—'}</div>
              </div>
              <div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold border ${
                    u.is_admin
                      ? 'bg-green-600/10 text-green-800 border-green-600/20'
                      : 'bg-stone-soft/50 text-ink border-stone-soft'
                  }`}
                >
                  {u.is_admin ? 'Admin' : 'User'}
                </span>
              </div>
              <div className="text-sm text-[#8A8279]">{u.city ?? '—'}</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-stone-soft/50 border border-stone-soft font-semibold text-sm disabled:opacity-60"
                  onClick={() => toggleAdmin(u)}
                  disabled={togglingId === u.id}
                >
                  {togglingId === u.id ? 'Updating…' : u.is_admin ? 'Revoke' : 'Make Admin'}
                </button>
                <button
                  type="button"
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-transparent border border-stone-soft font-semibold text-sm disabled:opacity-60"
                  onClick={() => sendReset(u)}
                  disabled={resettingId === u.id}
                >
                  {resettingId === u.id ? 'Sending…' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold text-sm disabled:opacity-60"
                  onClick={() => suspendUser(u)}
                  disabled={suspendingId === u.id}
                >
                  {suspendingId === u.id ? 'Suspending…' : 'Suspend'}
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center text-[#8A8279]">No users found.</div>
          ) : null}
        </div>
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
    </div>
  )
}

