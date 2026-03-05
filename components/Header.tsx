'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Session } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-client'
import { List, X } from '@/components/Icons'

const navLinkClass = 'block w-full min-w-0 px-4 py-3 text-left text-ink font-medium rounded-xl hover:bg-beige hover:border-stone border border-transparent transition-all overflow-hidden text-ellipsis'
const navLinkClassPrimary = 'block w-full min-w-0 px-4 py-3 text-left text-white font-semibold rounded-xl bg-terracotta hover:bg-terracotta-dark border border-transparent transition-all overflow-hidden text-ellipsis'

export default function Header() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const supabase = createBrowserClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const closeMobile = () => setMobileOpen(false)

  const handleSignOut = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
    closeMobile()
  }

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

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="px-4 py-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-terracotta border-t-transparent"></div>
              </div>
            ) : session ? (
              <>
                <Link href="/bookings" className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige transition-all text-sm font-medium">
                  My bookings
                </Link>
                <Link href="/groups" className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige transition-all text-sm font-medium">
                  Groups
                </Link>
                <Link href="/find-players" className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige transition-all text-sm font-medium">
                  Find players
                </Link>
                <Link href="/tournaments" className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige transition-all text-sm font-medium">
                  Tournaments
                </Link>
                <div className="flex items-center gap-3 pl-3 border-l border-stone-soft">
                  <Link href="/profile" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity group">
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
                    <span className="text-sm font-medium text-ink group-hover:text-terracotta transition-colors">
                      {session.user.user_metadata?.name || session.user.email}
                    </span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige transition-all text-sm font-medium"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/signin" className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige transition-all text-sm font-medium">
                  Sign in
                </Link>
                <Link href="/auth/signup" className="px-5 py-2.5 bg-terracotta text-white rounded-xl hover:bg-terracotta-dark transition-all text-sm font-semibold btn-premium">
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {loading ? (
              <div className="p-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-terracotta border-t-transparent"></div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="p-2.5 rounded-xl text-ink hover:bg-beige border border-stone-soft transition-all"
                aria-label="Open menu"
              >
                <List className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile slide-out menu: portaled to body so it's never clipped by header or hero */}
      {mounted && mobileOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/50 md:hidden"
            aria-hidden
            onClick={closeMobile}
          />
          <div
            className="fixed top-0 right-0 z-[101] h-full max-h-[100dvh] w-full max-w-sm max-w-[100vw] min-w-0 overflow-x-hidden bg-white shadow-xl md:hidden flex flex-col pb-[env(safe-area-inset-bottom)]"
            style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
            role="dialog"
            aria-label="Navigation menu"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 p-4 border-b border-stone-soft min-w-0">
              <span className="text-lg font-display font-semibold text-ink truncate">Menu</span>
              <button
                type="button"
                onClick={closeMobile}
                className="p-2 rounded-lg text-ink hover:bg-beige transition-colors"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 space-y-2">
              {session ? (
                <>
                  <Link href="/bookings" className={navLinkClass} onClick={closeMobile}>My bookings</Link>
                  <Link href="/groups" className={navLinkClass} onClick={closeMobile}>Groups</Link>
                  <Link href="/find-players" className={navLinkClass} onClick={closeMobile}>Find players</Link>
                  <Link href="/tournaments" className={navLinkClass} onClick={closeMobile}>Tournaments</Link>
                  <Link href="/profile" className={navLinkClass} onClick={closeMobile}>
                    <span className="flex items-center gap-3 min-w-0">
                      {session.user.user_metadata?.avatar_url || session.user.user_metadata?.image ? (
                        <img
                          src={session.user.user_metadata?.avatar_url || session.user.user_metadata?.image}
                          alt=""
                          className="w-9 h-9 shrink-0 rounded-full object-cover border border-stone-soft"
                        />
                      ) : (
                        <span className="w-9 h-9 shrink-0 rounded-full bg-terracotta flex items-center justify-center text-white text-sm font-semibold">
                          {(session.user.user_metadata?.name || session.user.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="truncate">{session.user.user_metadata?.name || session.user.email || 'Profile'}</span>
                    </span>
                  </Link>
                  <button type="button" onClick={handleSignOut} className={navLinkClass + ' w-full text-left'}>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/signin" className={navLinkClass} onClick={closeMobile}>Sign in</Link>
                  <Link href="/auth/signup" className={navLinkClassPrimary} onClick={closeMobile}>Sign up</Link>
                </>
              )}
            </nav>
          </div>
        </>,
        document.body
      )}
    </header>
  )
}

