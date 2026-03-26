'use client'

import { useEffect, useState } from 'react'

type AppSettings = {
  hero_image_url: string | null
  feature_flags: Record<string, unknown>
  maintenance_mode: boolean
  maintenance_message: string | null
  app_version: string
}

export default function AdminRuntimeSettingsPage() {
  const [s, setS] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/settings')
      if (res.ok) setS(await res.json())
    })()
  }, [])

  if (!s) return <p className="text-stone">Loading...</p>

  const save = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    })
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-display text-ink mb-6">Runtime Controls</h1>
      <div className="bg-white border border-stone-soft rounded-xl p-4 space-y-4">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium">Maintenance mode</span>
          <input
            type="checkbox"
            checked={s.maintenance_mode}
            onChange={(e) => setS({ ...s, maintenance_mode: e.target.checked })}
          />
        </label>
        <textarea
          className="w-full border rounded-lg p-2 text-sm"
          placeholder="Maintenance message"
          value={s.maintenance_message ?? ''}
          onChange={(e) => setS({ ...s, maintenance_message: e.target.value })}
        />
        <input
          className="w-full border rounded-lg p-2 text-sm"
          placeholder="App version hash"
          value={s.app_version ?? 'v1'}
          onChange={(e) => setS({ ...s, app_version: e.target.value })}
        />
        <textarea
          className="w-full border rounded-lg p-2 text-sm"
          placeholder="Platform-wide announcement (optional)"
          value={String(s.feature_flags?.announcement_text || '')}
          onChange={(e) =>
            setS({
              ...s,
              feature_flags: { ...(s.feature_flags || {}), announcement_text: e.target.value },
            })
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {['chat', 'groups', 'matches', 'connections', 'activity_feed'].map((k) => (
            <label key={k} className="flex items-center justify-between rounded-lg border p-2 text-sm">
              <span>{k}</span>
              <input
                type="checkbox"
                checked={Boolean(s.feature_flags?.[k])}
                onChange={(e) =>
                  setS({
                    ...s,
                    feature_flags: { ...(s.feature_flags || {}), [k]: e.target.checked },
                  })
                }
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          className="min-h-[44px] px-4 py-2 rounded-xl bg-terracotta text-white font-semibold"
          disabled={saving}
          onClick={save}
        >
          {saving ? 'Saving...' : 'Save runtime settings'}
        </button>
      </div>
    </div>
  )
}
