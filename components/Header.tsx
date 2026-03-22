'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Session } from '@supabase/supabase-js'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-client'
import { X } from '@/components/Icons'

/* Mobile menu: nav links SETRA brand — Playfair 32px, 28px gap, 44px min tap height */
const mobileNavLinkClass =
  'flex items-center min-h-[44px] w-full text-left font-medium text-[#1A1A1A] transition-colors hover:text-[#C41E2A]'
const mobileNavLinkStyle = { fontFamily: "'Playfair Display', serif", fontSize: '32px' }

export default function Header() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  /** Smooth scroll to courts on home; full navigation when coming from another route. */
  const handleBrowseCourtsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/') {
      e.preventDefault()
      window.history.replaceState(null, '', '#results-section')
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY >= 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
    <header
      className="fixed top-0 left-0 right-0 z-[100] transition-[padding,background-color,border-color] duration-[0.4s]"
      style={{
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        padding: scrolled ? '14px 40px' : '22px 40px',
        background: scrolled ? 'rgba(245, 240, 235, 0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid #E8E0D8' : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-3 group">
            <span
              className="font-display text-[22px] md:text-[26px] font-semibold text-[#C41E2A] tracking-[-0.02em] group-hover:opacity-90 transition-opacity"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              SETRA
            </span>
            <span
              className="hidden md:inline text-[9px] font-normal text-[#8A8279] uppercase tracking-[0.2em]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Access, Curated
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {loading ? (
              <div className="px-4 py-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#C41E2A] border-t-transparent" />
              </div>
            ) : session ? (
              <>
                <Link
                  href="/#results-section"
                  onClick={handleBrowseCourtsClick}
                  className="text-[13px] font-normal text-[#1A1A1A] tracking-[0.04em] hover:text-[#C41E2A] transition-colors"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Browse courts
                </Link>
                <Link href="/find-players" className="text-[13px] font-normal text-[#1A1A1A] tracking-[0.04em] hover:text-[#C41E2A] transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Find players
                </Link>
                <Link href="/bookings" className="text-[13px] font-normal text-[#1A1A1A] tracking-[0.04em] hover:text-[#C41E2A] transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  My bookings
                </Link>
                <Link href="/groups" className="text-[13px] font-normal text-[#1A1A1A] tracking-[0.04em] hover:text-[#C41E2A] transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Community
                </Link>
                <Link href="/tournaments" className="text-[13px] font-normal text-[#1A1A1A] tracking-[0.04em] hover:text-[#C41E2A] transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Tournaments
                </Link>
                <div className="w-px h-5 bg-[#E8E0D8] shrink-0" style={{ height: '20px' }} aria-hidden />
                <div className="flex items-center gap-3 shrink-0" style={{ gap: '12px' }}>
                  <Link href="/profile" className="shrink-0 hover:opacity-90 transition-opacity" aria-label="Profile">
                    {session.user.user_metadata?.avatar_url || session.user.user_metadata?.image ? (
                      <img
                        src={session.user.user_metadata?.avatar_url || session.user.user_metadata?.image}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover border border-[#E8E0D8]"
                        style={{ width: 32, height: 32 }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div
                      className={`rounded-full bg-[#C41E2A] flex items-center justify-center text-white font-semibold ${session.user.user_metadata?.avatar_url || session.user.user_metadata?.image ? 'hidden' : ''}`}
                      style={{
                        width: 32,
                        height: 32,
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '13px',
                      }}
                    >
                      {(session.user.user_metadata?.name || session.user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  </Link>
                  <Link
                    href="/profile"
                    className="text-[13px] font-medium text-[#1A1A1A] hover:text-[#C41E2A] transition-colors truncate max-w-[120px]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {(() => {
                      const raw = session.user.user_metadata?.name || session.user.email || ''
                      if (typeof raw === 'string' && raw.includes(' ')) return raw.split(/\s+/)[0]
                      if (typeof raw === 'string' && raw.includes('@')) return raw.split('@')[0]
                      return raw || 'Account'
                    })()}
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-[13px] font-normal text-[#8A8279] hover:text-[#C41E2A] transition-colors bg-transparent border-none cursor-pointer py-0 shrink-0"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/auth/signin" className="text-[13px] font-medium text-[#1A1A1A] hover:text-[#C41E2A] transition-colors bg-transparent py-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center text-[12px] font-medium text-white bg-[#C41E2A] hover:bg-[#9B1620] rounded-[100px] px-6 py-2.5 uppercase tracking-[0.06em] transition-all duration-300"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: hamburger (24px wide, 2px stroke, 44x44 tap target) — animates to X when open */}
          <div className="flex md:hidden items-center">
            {loading ? (
              <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#C41E2A] border-t-transparent" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#1A1A1A] hover:bg-[#F5F0EB] rounded-lg transition-colors"
                aria-label="Open menu"
                aria-expanded={mobileOpen}
              >
                <span className="relative w-6 h-5 flex flex-col justify-center items-center" aria-hidden>
                  <span
                    className="absolute left-0 w-6 rounded-full bg-[#1A1A1A] origin-center transition-all duration-300 ease-[ease]"
                    style={{
                      height: 2,
                      top: mobileOpen ? '50%' : 0,
                      marginTop: mobileOpen ? -1 : 0,
                      transform: mobileOpen ? 'rotate(45deg)' : 'none',
                    }}
                  />
                  <span
                    className="absolute left-0 w-6 rounded-full bg-[#1A1A1A] transition-opacity duration-300 ease-[ease]"
                    style={{
                      height: 2,
                      top: '50%',
                      marginTop: -1,
                      opacity: mobileOpen ? 0 : 1,
                    }}
                  />
                  <span
                    className="absolute left-0 w-6 rounded-full bg-[#1A1A1A] origin-center transition-all duration-300 ease-[ease]"
                    style={{
                      height: 2,
                      bottom: mobileOpen ? '50%' : 0,
                      marginBottom: mobileOpen ? -1 : 0,
                      transform: mobileOpen ? 'rotate(-45deg)' : 'none',
                    }}
                  />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu: full-screen overlay + panel sliding from right, z-200, SETRA brand */}
      {mounted && createPortal(
        <>
          {/* Backdrop — only when open */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-[200] bg-black/40 md:hidden"
              aria-hidden
              onClick={closeMobile}
            />
          )}
          {/* Panel: slide from right, 0.4s cubic-bezier(0.22, 1, 0.36, 1); when closed, off-screen and no pointer events */}
          <div
            className="fixed inset-y-0 right-0 z-[201] w-full max-w-[100vw] md:w-[min(400px,100vw)] md:max-w-none md:hidden flex flex-col bg-[#F5F0EB] shadow-2xl transition-transform duration-[0.4s]"
            style={{
              transform: mobileOpen ? 'translateX(0)' : 'translateX(100%)',
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              pointerEvents: mobileOpen ? 'auto' : 'none',
              height: '100dvh',
              maxHeight: '100dvh',
              paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
              paddingRight: 'env(safe-area-inset-right, 0px)',
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
              paddingLeft: 'env(safe-area-inset-left, 0px)',
            }}
            role="dialog"
            aria-label="Navigation menu"
            aria-hidden={!mobileOpen}
          >
            <div className="flex shrink-0 items-center justify-end min-h-[44px]">
              <button
                type="button"
                onClick={closeMobile}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#1A1A1A] hover:bg-[#E8E0D8] rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 flex flex-col justify-center min-h-0 overflow-y-auto py-6">
              <div className="flex flex-col" style={{ gap: '28px' }}>
                <Link
                  href="/#results-section"
                  className={mobileNavLinkClass}
                  style={mobileNavLinkStyle}
                  onClick={(e) => {
                    handleBrowseCourtsClick(e)
                    closeMobile()
                  }}
                >
                  Browse courts
                </Link>
                <Link href="/find-players" className={mobileNavLinkClass} style={mobileNavLinkStyle} onClick={closeMobile}>
                  Find players
                </Link>
                <Link href="/bookings" className={mobileNavLinkClass} style={mobileNavLinkStyle} onClick={closeMobile}>
                  My bookings
                </Link>
                <Link href="/groups" className={mobileNavLinkClass} style={mobileNavLinkStyle} onClick={closeMobile}>
                  Community
                </Link>
                <Link href="/tournaments" className={mobileNavLinkClass} style={mobileNavLinkStyle} onClick={closeMobile}>
                  Tournaments
                </Link>
              </div>
              <div className="my-6 h-px bg-[#E8E0D8]" aria-hidden />
              <div className="flex flex-col gap-3">
                {session ? (
                  <>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 min-h-[44px] w-full text-left font-medium text-[#1A1A1A] hover:text-[#C41E2A] transition-colors"
                      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }}
                      onClick={closeMobile}
                    >
                      {session.user.user_metadata?.avatar_url || session.user.user_metadata?.image ? (
                        <img
                          src={session.user.user_metadata?.avatar_url || session.user.user_metadata?.image}
                          alt=""
                          className="w-9 h-9 shrink-0 rounded-full object-cover border border-[#E8E0D8]"
                        />
                      ) : (
                        <span className="w-9 h-9 shrink-0 rounded-full bg-[#C41E2A] flex items-center justify-center text-white text-sm font-semibold">
                          {(session.user.user_metadata?.name || session.user.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="truncate">{session.user.user_metadata?.name || session.user.email || 'Profile'}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center min-h-[44px] w-full text-left font-medium text-[#1A1A1A] hover:text-[#C41E2A] transition-colors bg-transparent border-none cursor-pointer"
                      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }}
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/signin"
                      className="flex items-center min-h-[44px] w-full font-medium text-[#1A1A1A] hover:text-[#C41E2A] transition-colors"
                      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }}
                      onClick={closeMobile}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="flex items-center justify-center min-h-[44px] w-full font-medium text-white bg-[#C41E2A] hover:bg-[#9B1620] rounded-[100px] uppercase tracking-[0.08em] transition-colors"
                      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px' }}
                      onClick={closeMobile}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </>,
        document.body
      )}
    </header>
  )
}

