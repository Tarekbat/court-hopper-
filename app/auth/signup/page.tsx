'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from '@/components/Icons'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'An error occurred. Please try again.')
        return
      }

      // After successful signup, redirect to sign in
      router.push('/auth/signin?registered=true')
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7z' fill='%23d4af37' fill-opacity='0.4'/%3E%3C/svg%3E")`
      }}></div>
      <div className="max-w-md w-full animate-fade-in relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/80 hover:text-clay-cream mb-8 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold">Back to home</span>
        </Link>

        <div className="glass rounded-3xl shadow-luxury p-10 border border-clay-terracotta/30">
          <div className="text-center mb-10">
            <div className="bg-gradient-clay p-5 rounded-3xl inline-flex items-center justify-center w-24 h-24 mb-6 shadow-luxury-clay">
              <span className="text-white text-5xl font-bold">🎾</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-clay-rust-dark mb-3">Create Account</h1>
            <p className="text-clay-rust-dark/70 text-lg font-medium">Join our exclusive community</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl animate-scale-in">
              <p className="text-sm font-semibold text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-clay-rust-dark mb-3">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-5 py-4 border-2 border-clay-terracotta/30 rounded-2xl focus:ring-2 focus:ring-clay-terracotta focus:border-clay-terracotta text-clay-rust-dark bg-tropical-cream transition-all hover:border-tropical-sage/50"
                placeholder="John Doe"
              />
            </div>

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
                className="w-full px-5 py-4 border-2 border-clay-terracotta/30 rounded-2xl focus:ring-2 focus:ring-clay-terracotta focus:border-clay-terracotta text-clay-rust-dark bg-tropical-cream transition-all hover:border-tropical-sage/50"
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
                minLength={6}
                className="w-full px-5 py-4 border-2 border-clay-terracotta/30 rounded-2xl focus:ring-2 focus:ring-clay-terracotta focus:border-clay-terracotta text-clay-rust-dark bg-tropical-cream transition-all hover:border-tropical-sage/50"
                placeholder="••••••••"
              />
              <p className="mt-2 text-xs text-clay-rust-dark/70 font-semibold">Must be at least 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-clay-gradient text-white py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none mt-8"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Creating account...
                </span>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-clay-rust-dark/70">
              Already have an account?{' '}
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

