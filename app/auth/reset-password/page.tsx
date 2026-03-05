'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from '@/components/Icons'
import { createBrowserClient } from '@/lib/supabase-client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(true)
      if (!session) setInvalidLink(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setInvalidLink(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(true)
      setTimeout(() => {
        router.push('/auth/signin?reset=success')
        router.refresh()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20"></div>
        <div className="absolute inset-0 art-deco-pattern opacity-15"></div>
        <div className="max-w-md w-full relative z-10">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border-2 border-clay-terracotta/30 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-clay-terracotta border-t-transparent mx-auto"></div>
            <p className="mt-4 text-clay-rust-dark font-semibold">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (invalidLink) {
    return (
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20"></div>
        <div className="absolute inset-0 art-deco-pattern opacity-15"></div>
        <div className="max-w-md w-full animate-fade-in relative z-10">
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 text-white/90 hover:text-tropical-sage-light mb-8 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold">Back to sign in</span>
          </Link>
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border-2 border-clay-terracotta/30">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-display font-bold text-clay-rust-dark mb-2">Invalid or expired link</h1>
              <p className="text-clay-rust-dark/70 text-sm">
                This password reset link is invalid or has expired. Request a new one below.
              </p>
            </div>
            <Link
              href="/auth/forgot-password"
              className="block w-full text-center py-4 bg-clay-gradient text-white rounded-2xl font-bold hover:shadow-lg transition-all"
            >
              Send new reset link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20"></div>
      <div className="absolute inset-0 art-deco-pattern opacity-15"></div>
      <div className="max-w-md w-full animate-fade-in relative z-10">
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-2 text-white/90 hover:text-tropical-sage-light mb-8 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold">Back to sign in</span>
        </Link>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border-2 border-clay-terracotta/30">
          <div className="text-center mb-10">
            <div className="bg-clay-gradient p-5 rounded-3xl inline-flex items-center justify-center w-24 h-24 mb-6 shadow-lg">
              <span className="text-white text-5xl font-bold">🎾</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-clay-rust-dark mb-3">Set new password</h1>
            <p className="text-clay-rust-dark/70 text-lg font-medium">Choose a new password for your account.</p>
          </div>

          {success ? (
            <div className="p-4 bg-tropical-sage/20 border-2 border-tropical-sage/40 rounded-xl text-center">
              <p className="text-sm font-semibold text-tropical-palm">Password updated. Redirecting to sign in...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-sm font-semibold text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-clay-rust-dark mb-3">
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-5 py-4 border-2 border-clay-terracotta/30 rounded-2xl focus:ring-2 focus:ring-clay-terracotta focus:border-clay-terracotta text-clay-rust-dark bg-tropical-cream transition-all"
                    placeholder="At least 6 characters"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="confirm" className="block text-sm font-bold text-clay-rust-dark mb-3">
                    Confirm new password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-5 py-4 border-2 border-clay-terracotta/30 rounded-2xl focus:ring-2 focus:ring-clay-terracotta focus:border-clay-terracotta text-clay-rust-dark bg-tropical-cream transition-all"
                    placeholder="Re-enter new password"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-clay-gradient text-white py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Updating...
                    </span>
                  ) : (
                    'Update password'
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-clay-rust-dark/70">
              <Link href="/auth/signin" className="text-clay-terracotta hover:text-clay-rust font-bold transition-colors">
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
