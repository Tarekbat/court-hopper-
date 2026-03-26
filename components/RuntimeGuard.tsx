'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type RuntimeConfig = {
  maintenance_mode: boolean
  maintenance_message: string | null
  app_version: string
  feature_flags: Record<string, unknown>
}

export default function RuntimeGuard() {
  const pathname = usePathname()
  const [config, setConfig] = useState<RuntimeConfig | null>(null)
  const [showRefresh, setShowRefresh] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/runtime-config', { cache: 'no-store' })
        if (!res.ok) return
        const c = await res.json()
        if (!mounted) return
        setConfig(c)

        const key = 'app_version_seen'
        const seen = window.localStorage.getItem(key)
        if (seen && seen !== c.app_version) {
          setShowRefresh(true)
        }
        window.localStorage.setItem(key, c.app_version)
      } catch (err) {
        console.error('Failed runtime config fetch', err)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const maintenance = useMemo(
    () => Boolean(config?.maintenance_mode),
    [config?.maintenance_mode]
  )

  if (maintenance && !pathname.startsWith('/admin')) {
    return (
      <div className="fixed inset-0 z-[1000] bg-beige flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white border border-stone-soft p-6 text-center shadow-sm">
          <h1 className="text-2xl font-display text-ink mb-2">We&apos;ll be right back</h1>
          <p className="text-sm text-stone mb-4">
            {config?.maintenance_message || 'We are doing a quick update for everyone.'}
          </p>
          <button
            type="button"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-terracotta text-white font-semibold"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
          <p className="text-xs text-stone mt-3">
            Admins can still access the dashboard at <Link href="/admin" className="underline">/admin</Link>.
          </p>
        </div>
      </div>
    )
  }

  if (!showRefresh) return null

  return (
    <>
      {typeof config?.feature_flags?.announcement_text === 'string' &&
        String(config.feature_flags.announcement_text).trim().length > 0 && (
          <div className="fixed top-[68px] left-3 right-3 md:left-4 md:right-4 z-[998]">
            <div className="rounded-xl bg-white border border-stone-soft shadow-md p-3">
              <p className="text-sm text-ink">{String(config.feature_flags.announcement_text)}</p>
            </div>
          </div>
        )}
      <div className="fixed bottom-3 left-3 right-3 md:left-auto md:right-4 md:bottom-4 md:w-[380px] z-[999]">
        <div className="rounded-xl bg-white border border-terracotta/35 shadow-lg p-3 flex items-center gap-3">
          <p className="text-sm text-ink flex-1">New update available. Tap to refresh.</p>
          <button
            type="button"
            className="min-h-[40px] px-3 rounded-lg bg-terracotta text-white text-sm font-semibold"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      </div>
    </>
  )
}
