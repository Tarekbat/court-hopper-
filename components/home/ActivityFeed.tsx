'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase-client'
import { format, parseISO } from 'date-fns'
import { ArrowRight } from '@/components/Icons'

type Item = {
  id: string
  category: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

export default function ActivityFeed() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/activity?limit=15', { credentials: 'include' })
      if (!res.ok) {
        setItems([])
        return
      }
      const j = await res.json()
      setItems(j.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    const supabase = createBrowserClient()
    let ch: ReturnType<typeof supabase.channel> | null = null
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled || !session) return
      ch = supabase
        .channel(`activity_feed:${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`,
          },
          () => load()
        )
        .subscribe()
    })()
    return () => {
      cancelled = true
      if (ch) supabase.removeChannel(ch)
    }
  }, [load])

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids: [id] }),
    })
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)))
  }

  const onOpen = (it: Item) => {
    if (!it.read) markRead(it.id)
  }

  if (loading) {
    return (
      <div className="bg-white border border-stone-soft rounded-2xl p-6 shadow-sm mb-6 animate-pulse space-y-3">
        <div className="h-6 bg-stone-soft/70 rounded w-40" />
        <div className="h-14 bg-stone-soft/50 rounded-xl" />
        <div className="h-14 bg-stone-soft/50 rounded-xl" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border border-stone-soft rounded-2xl p-6 md:p-7 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-display text-ink">Activity</h2>
            <p className="text-sm text-stone mt-1">
              Waves, play requests, and group updates will show up here.
            </p>
          </div>
          <Link
            href="/find-players"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl btn-premium text-white text-sm font-semibold shrink-0"
          >
            Find players
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-soft rounded-2xl p-6 md:p-7 shadow-sm mb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-display text-ink">Activity</h2>
        <Link href="/notifications" className="text-sm font-medium text-terracotta hover:underline min-h-[44px] inline-flex items-center">
          View all
        </Link>
      </div>
      <ul className="divide-y divide-stone-soft border border-stone-soft rounded-xl overflow-hidden">
        {items.slice(0, 8).map((it) => {
          const inner = (
            <>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-ink ${!it.read ? 'text-ink' : 'text-stone'}`}>
                  {!it.read && (
                    <span className="inline-block w-2 h-2 rounded-full bg-terracotta mr-2 align-middle" aria-hidden />
                  )}
                  {it.title}
                </p>
                {it.body && <p className="text-sm text-stone line-clamp-2 mt-0.5">{it.body}</p>}
                <p className="text-xs text-stone mt-1">
                  {format(parseISO(it.created_at), 'MMM d · h:mm a')}
                  <span className="mx-1.5">·</span>
                  <span className="capitalize">{it.category}</span>
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-stone shrink-0 mt-1" />
            </>
          )

          if (it.link) {
            return (
              <li key={it.id}>
                <Link
                  href={it.link}
                  onClick={() => onOpen(it)}
                  className="flex items-start gap-3 px-4 py-3.5 hover:bg-beige/60 transition-colors min-h-[56px]"
                >
                  {inner}
                </Link>
              </li>
            )
          }

          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onOpen(it)}
                className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-beige/60 transition-colors text-left min-h-[56px]"
              >
                {inner}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
