'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from '@/components/Icons'
import { createBrowserClient } from '@/lib/supabase-client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const supabase = createBrowserClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
      })

      if (resetError) {
        setError(resetError.message || 'Something went wrong. Try again.')
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
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
            <h1 className="text-4xl md:text-5xl font-display font-bold text-clay-rust-dark mb-3">Reset password</h1>
            <p className="text-clay-rust-dark/70 text-lg font-medium">
              Enter your email and we&apos;ll send you a link to set a new password.
            </p>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className="p-4 bg-tropical-sage/20 border-2 border-tropical-sage/40 rounded-xl">
                <p className="text-sm font-semibold text-tropical-palm">
                  Check your inbox. We sent a password reset link to <strong>{email}</strong>. Click the link to set a new password.
                </p>
              </div>
              <Link
                href="/auth/signin"
                className="block w-full text-center py-4 border-2 border-clay-terracotta/30 rounded-2xl font-bold text-clay-rust-dark hover:bg-clay-terracotta/10 transition-colors"
              >
                Back to sign in
              </Link>
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
                  <label htmlFor="email" className="block text-sm font-bold text-clay-rust-dark mb-3">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-5 py-4 border-2 border-clay-terracotta/30 rounded-2xl focus:ring-2 focus:ring-clay-terracotta focus:border-clay-terracotta text-clay-rust-dark bg-tropical-cream transition-all"
                    placeholder="you@example.com"
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
                      Sending...
                    </span>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-clay-rust-dark/70">
              Remember your password?{' '}
              <Link href="/auth/signin" className="text-clay-terracotta hover:text-clay-rust font-bold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
