'use client'

import { createBrowserClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface User {
  id: string
  email?: string
  name?: string
  image?: string
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        // Get user data from public.users table
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, email, image')
          .eq('id', session.user.id)
          .single()

        setUser({
          id: session.user.id,
          email: userData?.email || session.user.email || undefined,
          name: userData?.name || session.user.user_metadata?.name || undefined,
          image: userData?.image || session.user.user_metadata?.avatar_url || undefined,
        })
      }
      setIsLoading(false)
    }

    loadUser()

    // Listen for auth changes
    const supabase = createBrowserClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, email, image')
          .eq('id', session.user.id)
          .single()

        setUser({
          id: session.user.id,
          email: userData?.email || session.user.email || undefined,
          name: userData?.name || session.user.user_metadata?.name || undefined,
          image: userData?.image || session.user.user_metadata?.avatar_url || undefined,
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="glass sticky top-0 z-50 border-b border-luxury/10 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="relative">
              <div className="bg-gradient-to-br from-clay-rust-dark to-clay-terracotta p-3 rounded-2xl flex items-center justify-center w-14 h-14 shadow-luxury group-hover:shadow-luxury-clay transition-all duration-500 group-hover:scale-110">
                <span className="text-clay-cream text-3xl font-bold">🎾</span>
              </div>
              <div className="absolute -inset-1 bg-gradient-clay rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-clay-rust-dark group-hover:text-clay-terracotta transition-colors">
                Elite Court
              </h1>
              <p className="text-xs font-medium text-clay-rust-dark/60 tracking-wider uppercase">Premium Tennis Reservations</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="px-4 py-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-luxury-gold border-t-transparent"></div>
              </div>
            ) : user ? (
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
                      {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-clay-rust-dark hidden sm:block">
                      {user?.name || user?.email}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
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
