'use client'

import Link from 'next/link'
import { MapPin, UserPlus } from '@/components/Icons'

type Sport = { id: string; slug: string; name: string; icon: string | null }

export type DiscoveryCardProfile = {
  id: string
  user_id: string
  sport_id: string | null
  sport: Sport | null
  name: string | null
  image: string | null
  notes: string | null
  city?: string | null
  display_ntrp?: number | null
  match_score_pct?: number | null
  available_now?: boolean
  connection_status?: 'none' | 'pending_sent' | 'pending_received' | 'connected'
  mutual_connections?: number
  played_together?: boolean
}

function formatNtrp(n: number) {
  const rounded = Math.round(n * 2) / 2
  return rounded % 1 === 0 ? `${rounded.toFixed(1)}` : `${rounded}`
}

export default function PlayerDiscoveryCard({
  profile,
  onRequest,
  onConnect,
  connecting,
  requesting,
}: {
  profile: DiscoveryCardProfile
  onRequest: (userId: string, sportId: string | null) => void
  onConnect?: (userId: string, status?: string) => void
  connecting?: boolean
  requesting: boolean
}) {
  const initial = (profile.name || '?').charAt(0).toUpperCase()

  return (
    <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-5 sm:p-6 flex flex-col gap-4">
      <Link
        href={`/players/${encodeURIComponent(profile.user_id)}`}
        className="rounded-2xl -m-2 p-2 hover:bg-beige/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
        aria-label={`View profile of ${profile.name || 'player'}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {profile.image ? (
              <img
                src={profile.image}
                alt=""
                className="w-14 h-14 rounded-full object-cover border border-stone-soft shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-terracotta flex items-center justify-center text-white text-xl font-semibold shrink-0">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display text-lg text-ink truncate">{profile.name || 'Player'}</p>
              <p className="text-stone text-sm flex flex-wrap items-center gap-2 mt-0.5">
                {profile.sport ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span>{profile.sport?.icon}</span>
                    <span className="font-medium text-ink">{profile.sport?.name}</span>
                  </span>
                ) : (
                  <span className="font-medium text-ink">Player profile</span>
                )}
                {profile.display_ntrp != null && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-terracotta/10 text-terracotta border-terracotta/25">
                    {formatNtrp(profile.display_ntrp)} NTRP
                  </span>
                )}
              </p>
              {(profile.city || profile.available_now) && (
                <p className="text-stone text-xs mt-1 flex flex-wrap items-center gap-2">
                  {profile.city && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {profile.city}
                    </span>
                  )}
                  {profile.available_now && (
                    <span className="inline-flex items-center gap-1.5 text-accent-green font-semibold">
                      <span className="w-2 h-2 rounded-full bg-accent-green" />
                      Available now
                    </span>
                  )}
                </p>
              )}
              <p className="text-xs text-stone mt-1">
                {profile.mutual_connections ?? 0} mutual
                {(profile.mutual_connections ?? 0) === 1 ? '' : 's'}
                {profile.played_together ? ' · Played together' : ''}
              </p>
            </div>
          </div>

          {profile.match_score_pct != null && (
            <div className="shrink-0 text-right">
              <div className="text-xs font-semibold text-stone">Match</div>
              <div className="text-ink font-display text-xl leading-none">
                {Math.round(profile.match_score_pct)}%
              </div>
            </div>
          )}
        </div>

        {profile.notes && (
          <p className="text-stone text-sm mt-3 line-clamp-3">{profile.notes}</p>
        )}

        <span className="text-terracotta text-xs font-semibold mt-3 inline-block">View profile →</span>
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onRequest(profile.user_id, profile.sport_id)}
          disabled={requesting || !profile.sport_id}
          className="btn-premium w-full px-5 py-2.5 text-white rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-70"
        >
          <UserPlus className="w-4 h-4" />
          {requesting ? 'Sending…' : profile.sport_id ? "Let's Play" : 'No sport yet'}
        </button>
        <button
          type="button"
          onClick={() => onConnect?.(profile.user_id, profile.connection_status)}
          disabled={
            !onConnect ||
            connecting ||
            profile.connection_status === 'connected' ||
            profile.connection_status === 'pending_sent'
          }
          className="w-full px-5 py-2.5 bg-white border border-stone-soft rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <UserPlus className="w-4 h-4" />
          {connecting
            ? 'Please wait…'
            : profile.connection_status === 'connected'
            ? 'Connected'
            : profile.connection_status === 'pending_sent'
            ? 'Request sent'
            : profile.connection_status === 'pending_received'
            ? 'Accept'
            : 'Connect'}
        </button>
      </div>
    </div>
  )
}

