'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter, X } from '@/components/Icons'

type Sport = { id: string; slug: string; name: string; icon: string | null }

export type DiscoveryFilters = {
  sport_id: string
  ntrp_min: string
  ntrp_max: string
  sort: 'recent' | 'match' | 'rating'
}

const ntrpOptions = ['1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0']

export default function DiscoveryFiltersSheet({
  sports,
  value,
  onChange,
  canUseNearYou,
  nearYouEnabled,
  onToggleNearYou,
  nearYouLabel,
}: {
  sports: Sport[]
  value: DiscoveryFilters
  onChange: (next: DiscoveryFilters) => void
  canUseNearYou: boolean
  nearYouEnabled: boolean
  onToggleNearYou: () => void
  nearYouLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DiscoveryFilters>(value)

  useEffect(() => {
    if (!open) setDraft(value)
  }, [open, value])

  const activeCount = useMemo(() => {
    let c = 0
    if (value.sport_id) c += 1
    if (value.ntrp_min) c += 1
    if (value.ntrp_max) c += 1
    if (value.sort !== 'recent') c += 1
    if (nearYouEnabled) c += 1
    return c
  }, [value, nearYouEnabled])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-soft bg-white text-ink text-sm font-medium hover:bg-beige"
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeCount > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-terracotta/10 text-terracotta border border-terracotta/25">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-t-3xl border border-stone-soft shadow-2xl">
            <div className="p-5 flex items-center justify-between border-b border-stone-soft">
              <h2 className="text-lg font-display text-ink">Filters</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-stone-soft bg-white text-ink w-11 h-11 hover:bg-beige"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-ink mb-2">Sport</label>
                <select
                  value={draft.sport_id}
                  onChange={(e) => setDraft((d) => ({ ...d, sport_id: e.target.value }))}
                  className="w-full px-5 py-4 border-2 border-terracotta/30 rounded-2xl focus:ring-2 focus:ring-terracotta text-ink bg-white"
                >
                  <option value="">All sports</option>
                  {sports.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {canUseNearYou && (
                <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-stone-soft bg-beige/40">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">Near you</p>
                    <p className="text-xs text-stone truncate">{nearYouLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleNearYou}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      nearYouEnabled
                        ? 'bg-terracotta/10 border-terracotta/30 text-terracotta'
                        : 'border-stone-soft bg-white text-stone hover:bg-beige'
                    }`}
                  >
                    {nearYouEnabled ? 'On' : 'Off'}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-ink mb-2">NTRP range</label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={draft.ntrp_min}
                    onChange={(e) => setDraft((d) => ({ ...d, ntrp_min: e.target.value }))}
                    className="w-full px-4 py-3 border border-stone-soft rounded-xl bg-white text-ink text-sm font-medium focus:ring-2 focus:ring-terracotta"
                  >
                    <option value="">Min</option>
                    {ntrpOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draft.ntrp_max}
                    onChange={(e) => setDraft((d) => ({ ...d, ntrp_max: e.target.value }))}
                    className="w-full px-4 py-3 border border-stone-soft rounded-xl bg-white text-ink text-sm font-medium focus:ring-2 focus:ring-terracotta"
                  >
                    <option value="">Max</option>
                    {ntrpOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-stone mt-2">Players without NTRP set won’t match the range filter.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-ink mb-2">Sort</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'recent', label: 'Recent' },
                    { id: 'match', label: 'Match %' },
                    { id: 'rating', label: 'Rating' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, sort: opt.id }))}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-semibold ${
                        draft.sort === opt.id
                          ? 'bg-ink text-white border-ink'
                          : 'bg-white text-ink border-stone-soft hover:bg-beige'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-stone-soft flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraft({ sport_id: '', ntrp_min: '', ntrp_max: '', sort: 'recent' })
                }}
                className="flex-1 px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige text-sm font-medium"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(draft)
                  setOpen(false)
                }}
                className="flex-1 btn-premium px-5 py-2.5 text-white rounded-xl font-semibold text-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

