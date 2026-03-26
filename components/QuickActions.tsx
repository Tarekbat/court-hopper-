'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users } from '@/components/Icons'
import { createBrowserClient } from '@/lib/supabase-client'
import WaveModal from '@/components/social/WaveModal'

interface QuickActionsProps {
  onMapViewClick?: () => void
  onAvailableNowClick?: () => void
  onTopRatedClick?: () => void
}

type Action =
  | {
      title: string
      description: string
      href: string
      icon: 'calendar' | 'map' | 'clock' | 'star' | 'wave' | 'users'
      onClick?: () => void
    }

export default function QuickActions({
  onMapViewClick,
  onAvailableNowClick,
  onTopRatedClick,
}: QuickActionsProps) {
  const [authed, setAuthed] = useState(false)
  const [waveOpen, setWaveOpen] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getSession().then(({ data: { session } }) => setAuthed(!!session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session))
    return () => subscription.unsubscribe()
  }, [])

  const base: Action[] = [
    {
      title: 'My Bookings',
      description: 'View and manage your reservations',
      href: '/bookings',
      icon: 'calendar',
    },
    {
      title: 'Map View',
      description: 'Find courts on a map',
      href: '#',
      icon: 'map',
      onClick: onMapViewClick,
    },
    {
      title: 'Available Now',
      description: 'Courts available today',
      href: '#',
      icon: 'clock',
      onClick: onAvailableNowClick,
    },
    {
      title: 'Top Rated',
      description: 'Highest rated courts',
      href: '#',
      icon: 'star',
      onClick: onTopRatedClick,
    },
  ]

  const social: Action[] = authed
    ? [
        {
          title: "Let's play",
          description: 'Find partners and send requests',
          href: '/find-players',
          icon: 'users',
        },
        {
          title: 'Wave',
          description: 'Quick hello — opens chat',
          href: '#',
          icon: 'wave',
          onClick: () => setWaveOpen(true),
        },
      ]
    : []

  const actions = [...social, ...base]

  const renderIcon = (icon: Action['icon']) => {
    const cls = 'text-ink group-hover:text-white transition-colors'
    switch (icon) {
      case 'calendar':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" className={cls} />
          </svg>
        )
      case 'map':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" className={cls} />
          </svg>
        )
      case 'clock':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" className={cls} />
          </svg>
        )
      case 'star':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" className={cls} />
          </svg>
        )
      case 'users':
        return <Users className="w-6 h-6 text-ink group-hover:text-white transition-colors" />
      case 'wave':
        return <span className="text-2xl leading-none" aria-hidden>👋</span>
      default:
        return null
    }
  }

  const gridClass =
    actions.length > 4
      ? 'grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5'

  return (
    <>
      <WaveModal open={waveOpen} onClose={() => setWaveOpen(false)} />
      <div className={gridClass}>
        {actions.map((action) => {
          const content = (
            <div className="card-premium p-5 cursor-pointer group h-full relative overflow-hidden rounded-2xl">
              <div className="relative z-10">
                <div className="bg-beige-light border border-stone-soft w-12 h-12 flex items-center justify-center mb-4 rounded-xl group-hover:bg-terracotta group-hover:border-terracotta transition-all duration-300">
                  {renderIcon(action.icon)}
                </div>
                <h3 className="text-base font-display text-ink mb-1 group-hover:text-terracotta transition-colors">{action.title}</h3>
                <p className="text-sm text-stone leading-snug">{action.description}</p>
              </div>
            </div>
          )

          if (action.onClick) {
            return (
              <button
                key={action.title}
                onClick={action.onClick}
                className="text-left w-full"
                type="button"
              >
                {content}
              </button>
            )
          }

          return action.href === '#' ? (
            <div key={action.title} className="opacity-50 cursor-not-allowed">
              {content}
            </div>
          ) : (
            <Link key={action.title} href={action.href} className="block h-full">
              {content}
            </Link>
          )
        })}
      </div>
    </>
  )
}
