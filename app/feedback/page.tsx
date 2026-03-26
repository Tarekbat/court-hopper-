'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'

export default function FeedbackPage() {
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!message.trim()) return
    setSaving(true)
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    setSaving(false)
    if (res.ok) {
      setDone(true)
      setMessage('')
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />
        <main className="max-w-xl mx-auto px-4 pt-24 pb-12 md:pt-28">
          <h1 className="text-2xl font-display text-ink mb-2">Feedback</h1>
          <p className="text-sm text-stone mb-4">Report a bug or share product feedback.</p>
          <div className="bg-white border border-stone-soft rounded-xl p-4">
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded-lg p-3 text-sm"
              placeholder="What happened? What should we improve?"
            />
            <button
              type="button"
              className="mt-3 min-h-[44px] px-4 py-2 rounded-xl bg-terracotta text-white font-semibold disabled:opacity-70"
              disabled={saving || !message.trim()}
              onClick={submit}
            >
              {saving ? 'Sending...' : 'Send feedback'}
            </button>
            {done && <p className="text-sm text-green-700 mt-2">Thanks. Feedback received.</p>}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
