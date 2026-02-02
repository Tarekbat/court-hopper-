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
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-soft/80 shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="relative">
              <div className="bg-gradient-to-br from-terracotta-dark to-terracotta p-[10px] flex items-center justify-center w-12 h-12 rounded-xl group-hover:scale-[1.02] transition-transform duration-300 shadow-sm">
                <span className="text-white text-2xl leading-none">🎾</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-display text-ink group-hover:text-terracotta transition-colors tracking-tight">
                Tennis Scheduler
              </h1>
              <p className="text-[11px] font-medium text-stone tracking-[0.12em]">Book courts, play more</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="px-4 py-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-terracotta border-t-transparent"></div>
              </div>
            ) : session ? (
              <>
                <Link
                  href="/bookings"
                  className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige transition-all text-sm font-medium"
                >
                  My bookings
                </Link>
                <div className="flex items-center gap-3 pl-3 border-l border-stone-soft">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 hover:opacity-90 transition-opacity group"
                  >
                    {session.user.user_metadata?.avatar_url || session.user.user_metadata?.image ? (
                      <img
                        src={session.user.user_metadata?.avatar_url || session.user.user_metadata?.image}
                        alt="Profile"
                        className="w-9 h-9 rounded-full object-cover border border-stone-soft group-hover:border-terracotta/40 transition-colors"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={`w-9 h-9 rounded-full bg-terracotta flex items-center justify-center text-white text-sm font-semibold ${session.user.user_metadata?.avatar_url || session.user.user_metadata?.image ? 'hidden' : ''}`}>
                      {(session.user.user_metadata?.name || session.user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-ink hidden sm:block group-hover:text-terracotta transition-colors">
                      {session.user.user_metadata?.name || session.user.email}
                    </span>
                  </Link>
                  <button
                    onClick={async () => {
                      const supabase = createBrowserClient()
                      await supabase.auth.signOut()
                      router.push('/')
                      router.refresh()
                    }}
                    className="px-4 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige transition-all text-sm font-medium"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin"
                  className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige transition-all text-sm font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-5 py-2.5 bg-terracotta text-white rounded-xl hover:bg-terracotta-dark transition-all text-sm font-semibold btn-premium"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

