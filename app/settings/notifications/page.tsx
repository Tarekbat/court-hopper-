'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'

type Prefs = {
  email_welcome: boolean
  email_match_requests: boolean
  email_group_invites: boolean
  email_play_day_reminders: boolean
  email_weekly_digest: boolean
  email_digest_frequency: 'instant' | 'daily' | 'weekly' | 'off'
}

const defaultPrefs: Prefs = {
  email_welcome: true,
  email_match_requests: true,
  email_group_invites: true,
  email_play_day_reminders: true,
  email_weekly_digest: true,
  email_digest_frequency: 'weekly',
}

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/email-preferences')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setPrefs({ ...defaultPrefs, ...j }))
      .catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/email-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    })
    setSaving(false)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />
        <main className="max-w-xl mx-auto px-4 pt-24 pb-12 md:pt-28">
          <h1 className="text-2xl font-display text-ink mb-2">Email Preferences</h1>
          <p className="text-sm text-stone mb-6">Choose instant alerts, digests, or turn off email updates.</p>
          <div className="bg-white border border-stone-soft rounded-xl p-4 space-y-3">
            {[
              ['email_welcome', 'Welcome emails'],
              ['email_match_requests', 'Match requests'],
              ['email_group_invites', 'Group invites'],
              ['email_play_day_reminders', 'Play day reminders (24h)'],
              ['email_weekly_digest', 'Weekly digest'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean((prefs as any)[key])}
                  onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked } as Prefs))}
                />
              </label>
            ))}
            <div>
              <label className="block text-sm mb-1">Digest frequency</label>
              <select
                className="w-full border rounded-lg p-2 text-sm"
                value={prefs.email_digest_frequency}
                onChange={(e) => setPrefs((p) => ({ ...p, email_digest_frequency: e.target.value as Prefs['email_digest_frequency'] }))}
              >
                <option value="instant">Instant</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="off">Off</option>
              </select>
            </div>
            <button type="button" onClick={save} disabled={saving} className="min-h-[44px] px-4 py-2 rounded-xl bg-terracotta text-white font-semibold">
              {saving ? 'Saving...' : 'Save preferences'}
            </button>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
