'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'

export default function AccountSettingsPage() {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [profileIsPublic, setProfileIsPublic] = useState(true)
  const [savingPrivacy, setSavingPrivacy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/profile', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setProfileIsPublic(data?.profile_is_public !== false)
      } catch {
        /* no-op */
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const savePrivacy = async () => {
    setSavingPrivacy(true)
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ profile_is_public: profileIsPublic }),
      })
    } finally {
      setSavingPrivacy(false)
    }
  }

  const deleteAccount = async () => {
    if (!confirm('Delete your account and personal data? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      if (res.ok) router.push('/')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />
        <main className="max-w-xl mx-auto px-4 pt-24 pb-12 md:pt-28">
          <h1 className="text-2xl font-display text-ink mb-3">Account</h1>
          <div className="bg-white border border-stone-soft rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-ink mb-1">Profile visibility</p>
            <p className="text-sm text-stone mb-3">By default your account is public so other players can find you.</p>
            <label className="flex items-center justify-between text-sm mb-3">
              <span className="text-ink">Public profile</span>
              <input
                type="checkbox"
                checked={profileIsPublic}
                onChange={(e) => setProfileIsPublic(e.target.checked)}
              />
            </label>
            <button
              type="button"
              onClick={savePrivacy}
              disabled={savingPrivacy}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-terracotta text-white font-semibold disabled:opacity-70"
            >
              {savingPrivacy ? 'Saving...' : 'Save visibility'}
            </button>
          </div>
          <div className="bg-white border border-red-200 rounded-xl p-4">
            <p className="text-sm text-ink mb-3">Delete account and remove your personal data.</p>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-70"
            >
              {deleting ? 'Deleting...' : 'Delete account'}
            </button>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
