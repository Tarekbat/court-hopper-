'use client'

import { useCallback, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-client'

type Counts = { going: number; maybe: number; no: number; confirmed: number; waitlist: number }
type Face = { user_id: string; name: string | null; image: string | null; waitlist_position?: number | null }

type Summary = {
  max_capacity: number | null
  counts: Counts
  my: {
    status: 'going' | 'maybe' | 'no'
    waitlist_position: number | null
    is_confirmed: boolean
    is_waitlisted: boolean
  } | null
  going_faces: Face[]
  waitlist_faces: Face[]
}

export default function GroupEventRsvp({
  groupId,
  eventId,
  isMember,
}: {
  groupId: string
  eventId: string
  isMember: boolean
}) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    if (!isMember) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/groups/${groupId}/events/${eventId}/rsvp`, { credentials: 'include' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to load RSVP')
      }
      const data = (await res.json()) as Summary
      setSummary(data)
      setErr('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [groupId, eventId, isMember])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  useEffect(() => {
    if (!isMember) return
    const supabase = createBrowserClient()
    const channel = supabase
      .channel(`group_event_rsvp:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_event_rsvps',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          load()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, isMember, load])

  const setStatus = async (status: 'going' | 'maybe' | 'no') => {
    setSaving(true)
    setErr('')
    try {
      const res = await fetch(`/api/groups/${groupId}/events/${eventId}/rsvp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Could not update RSVP')
      if (j.counts && j.my !== undefined) {
        setSummary((prev) =>
          prev
            ? {
                ...prev,
                counts: j.counts,
                my: j.my,
                max_capacity: j.max_capacity ?? prev.max_capacity,
              }
            : null
        )
      } else {
        await load()
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (!isMember) {
    return <p className="text-xs text-stone mt-2">Join the group to RSVP.</p>
  }

  if (loading && !summary) {
    return <div className="mt-3 h-16 rounded-xl bg-stone-soft/50 animate-pulse" aria-hidden />
  }

  if (err && !summary) {
    return <p className="text-xs text-red-700 mt-2">{err}</p>
  }

  if (!summary) return null

  const { counts, my, max_capacity, going_faces, waitlist_faces } = summary
  const capLabel =
    max_capacity != null ? `${counts.confirmed} / ${max_capacity} spots` : `${counts.confirmed} confirmed`

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone">
        <span className="font-semibold text-accent-green">{counts.going} in</span>
        <span>·</span>
        <span>{counts.maybe} maybe</span>
        <span>·</span>
        <span>{counts.no} can&apos;t</span>
        {max_capacity != null && (
          <>
            <span>·</span>
            <span className="text-ink font-medium">{capLabel}</span>
          </>
        )}
        {counts.waitlist > 0 && (
          <>
            <span>·</span>
            <span className="text-terracotta font-medium">{counts.waitlist} waitlist</span>
          </>
        )}
      </div>

      {(going_faces.length > 0 || waitlist_faces.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {going_faces.map((f) => (
            <div
              key={f.user_id}
              className="w-9 h-9 rounded-full border-2 border-accent-green/40 overflow-hidden bg-beige shrink-0"
              title={f.name || 'Player'}
            >
              {f.image ? (
                <img src={f.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-terracotta">
                  {(f.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ))}
          {waitlist_faces.slice(0, 6).map((f) => (
            <div
              key={f.user_id}
              className="w-9 h-9 rounded-full border-2 border-dashed border-stone-soft overflow-hidden bg-white shrink-0 relative"
              title={`Waitlist #${f.waitlist_position ?? ''} · ${f.name || 'Player'}`}
            >
              {f.image ? (
                <img src={f.image} alt="" className="w-full h-full object-cover opacity-80" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-stone">
                  {(f.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {my?.is_waitlisted && (
        <p className="text-xs font-medium text-terracotta bg-terracotta/10 border border-terracotta/25 rounded-xl px-3 py-2">
          You&apos;re #{my.waitlist_position} on the waitlist — we&apos;ll move you up if a spot opens.
        </p>
      )}

      {err && <p className="text-xs text-red-700">{err}</p>}

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => setStatus('going')}
          className={`min-h-[44px] px-2 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            my?.status === 'going' && my.is_confirmed
              ? 'bg-accent-green/20 border-accent-green text-ink'
              : my?.status === 'going' && my.is_waitlisted
                ? 'bg-terracotta/10 border-terracotta/30 text-terracotta'
                : 'bg-white border-stone-soft text-stone hover:bg-beige'
          }`}
        >
          I&apos;m in
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => setStatus('maybe')}
          className={`min-h-[44px] px-2 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            my?.status === 'maybe'
              ? 'bg-ink text-white border-ink'
              : 'bg-white border-stone-soft text-stone hover:bg-beige'
          }`}
        >
          Maybe
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => setStatus('no')}
          className={`min-h-[44px] px-2 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            my?.status === 'no'
              ? 'bg-stone-soft text-ink border-stone'
              : 'bg-white border-stone-soft text-stone hover:bg-beige'
          }`}
        >
          Can&apos;t
        </button>
      </div>
    </div>
  )
}
