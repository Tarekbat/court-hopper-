'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from '@/components/Icons'
import { createBrowserClient } from '@/lib/supabase-client'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccess('Account created successfully! Please sign in.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createBrowserClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Invalid email or password')
      } else if (data.session) {
        router.push('/')
        router.refresh()
      } else {
        setError('An error occurred. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
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
          href="/"
          className="inline-flex items-center gap-2 text-white/90 hover:text-miami-turquoise-light mb-8 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold">Back to home</span>
        </Link>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border-2 border-miami-turquoise/30">
          <div className="text-center mb-10">
            <div className="bg-gradient-to-br from-miami-turquoise via-miami-pink to-miami-coral p-5 rounded-3xl inline-flex items-center justify-center w-24 h-24 mb-6 shadow-lg">
              <span className="text-white text-5xl font-bold">🎾</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-clay-rust-dark mb-3">Welcome Back</h1>
            <p className="text-clay-rust-dark/70 text-lg font-medium">Sign in to access your premium account</p>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-miami-turquoise/20 border-2 border-miami-turquoise/40 rounded-xl animate-scale-in">
              <p className="text-sm font-semibold text-miami-turquoise-dark">{success}</p>
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl animate-scale-in">
              <p className="text-sm font-semibold text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-clay-rust-dark mb-3">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-4 border-2 border-miami-turquoise/30 rounded-2xl focus:ring-2 focus:ring-miami-turquoise focus:border-miami-turquoise text-clay-rust-dark bg-miami-sand-light transition-all hover:border-miami-pink/50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-clay-rust-dark mb-3">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-5 py-4 border-2 border-miami-turquoise/30 rounded-2xl focus:ring-2 focus:ring-miami-turquoise focus:border-miami-turquoise text-clay-rust-dark bg-miami-sand-light transition-all hover:border-miami-pink/50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-miami-turquoise to-miami-ocean text-white py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none mt-8"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-clay-rust-dark/70">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-miami-turquoise hover:text-miami-ocean font-bold transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20"></div>
        <div className="absolute inset-0 art-deco-pattern opacity-15"></div>
        <div className="max-w-md w-full animate-fade-in relative z-10">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border-2 border-miami-turquoise/30">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-miami-turquoise border-t-transparent mx-auto"></div>
              <p className="mt-4 text-clay-rust-dark font-semibold">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}

