'use client'

import { useEffect, useState } from 'react'

type AdminAnalytics = {
  totalUsers: number
  activeUsers7d: number
  totalCourts: number
  activeCourts: number
  totalGroups: number
  matchesCompleted: number
  upcomingBookings: number
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/admin/analytics')
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load analytics')
        const json = await res.json()
        setData(json as AdminAnalytics)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-display font-bold text-2xl text-[#1A1A1A] mb-2">Platform Analytics</h1>
      <p className="text-sm text-[#8A8279] mb-4">Quick health metrics for the beta.</p>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 mb-4">{error}</div>
      ) : null}

      {loading || !data ? (
        <div className="bg-white border border-stone-soft rounded-2xl p-6 text-center">Loading…</div>
      ) : null}

      {data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MetricCard title="Total users" value={data.totalUsers} />
          <MetricCard title="Active users (7d)" value={data.activeUsers7d} />
          <MetricCard title="Total courts" value={data.totalCourts} />
          <MetricCard title="Active courts" value={data.activeCourts} />
          <MetricCard title="Total groups" value={data.totalGroups} />
          <MetricCard title="Matches completed" value={data.matchesCompleted} />
          <MetricCard title="Upcoming bookings" value={data.upcomingBookings} />
          <div className="bg-white border border-stone-soft rounded-2xl p-4">
            <div className="text-xs font-semibold text-[#8A8279] uppercase tracking-wider">Next</div>
            <div className="mt-2 text-sm text-[#1A1A1A]">
              Add error-rate, latency, and top courts once the beta logging pipeline is in place.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white border border-stone-soft rounded-2xl p-4">
      <div className="text-xs font-semibold text-[#8A8279] uppercase tracking-wider">{title}</div>
      <div className="mt-2 text-3xl font-display font-bold text-[#1A1A1A]">{value}</div>
    </div>
  )
}

