'use client'

import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-client'

export default function Header() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <header className="glass sticky top-0 z-50 border-b border-luxury/10 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="relative">
              <div className="bg-gradient-to-br from-miami-turquoise via-miami-pink to-miami-coral p-3 rounded-2xl flex items-center justify-center w-14 h-14 shadow-luxury group-hover:shadow-luxury-clay transition-all duration-500 group-hover:scale-110">
                <span className="text-white text-3xl font-bold">🎾</span>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-miami-pink to-miami-turquoise rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-clay-rust-dark group-hover:text-miami-turquoise transition-colors">
                Elite Court
              </h1>
              <p className="text-xs font-medium text-clay-rust-dark/60 tracking-wider uppercase">Premium Tennis Reservations</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="px-4 py-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-luxury-gold border-t-transparent"></div>
              </div>
            ) : session ? (
              <>
                <Link
                  href="/bookings"
                  className="px-6 py-2.5 bg-clay-cream text-clay-rust-dark rounded-xl hover:bg-clay-cream-dark transition-all text-sm font-semibold border border-clay-terracotta/20 hover:border-clay-terracotta/40 hover:shadow-soft"
                >
                  My Bookings
                </Link>
                <div className="flex items-center gap-4 pl-4 border-l border-clay-terracotta/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-clay flex items-center justify-center text-white text-sm font-bold shadow-md">
                      {(session.user.user_metadata?.name || session.user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-clay-rust-dark hidden sm:block">
                      {session.user.user_metadata?.name || session.user.email}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      const supabase = createBrowserClient()
                      await supabase.auth.signOut()
                      router.push('/')
                      router.refresh()
                    }}
                    className="px-5 py-2.5 bg-clay-cream text-clay-rust-dark rounded-xl hover:bg-clay-cream-dark transition-all text-sm font-semibold border border-clay-terracotta/20 hover:border-clay-terracotta/40"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/signin"
                  className="px-6 py-2.5 bg-clay-cream text-clay-rust-dark rounded-xl hover:bg-clay-cream-dark transition-all text-sm font-semibold border border-clay-terracotta/20 hover:border-clay-terracotta/40"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-6 py-2.5 bg-gradient-clay text-white rounded-xl hover:shadow-luxury-clay transition-all text-sm font-bold shadow-md"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

