'use client'

import { useEffect, useState } from 'react'

type ReportRow = {
  id: string
  target_kind: string
  target_id: string
  reason: string
  details: string | null
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  created_at: string
}

export default function AdminReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/reports')
    if (res.ok) {
      const j = await res.json()
      setRows(j.reports ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const setStatus = async (id: string, status: ReportRow['status']) => {
    const res = await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: id, status }),
    })
    if (res.ok) load()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-display text-ink mb-2">Flagged Content Queue</h1>
      <p className="text-sm text-stone mb-6">User reports for profiles, messages, and group content.</p>
      {loading ? (
        <p className="text-stone">Loading...</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-white border border-stone-soft rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink capitalize">{r.target_kind.replace('_', ' ')}</p>
                <span className="text-xs rounded-full px-2 py-1 bg-beige text-stone">{r.status}</span>
              </div>
              <p className="text-sm text-ink mt-2"><strong>Reason:</strong> {r.reason}</p>
              {r.details && <p className="text-sm text-stone mt-1">{r.details}</p>}
              <p className="text-xs text-stone mt-2 break-all">Target ID: {r.target_id}</p>
              <div className="flex gap-2 mt-3">
                <button className="px-3 py-2 text-xs rounded-lg border" onClick={() => setStatus(r.id, 'reviewing')}>Reviewing</button>
                <button className="px-3 py-2 text-xs rounded-lg border" onClick={() => setStatus(r.id, 'resolved')}>Resolved</button>
                <button className="px-3 py-2 text-xs rounded-lg border" onClick={() => setStatus(r.id, 'dismissed')}>Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
