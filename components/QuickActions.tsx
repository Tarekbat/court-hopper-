'use client'

import Link from 'next/link'
import { Calendar, Map, Clock, Star } from '@/components/Icons'

interface QuickActionsProps {
  onMapViewClick?: () => void
  onAvailableNowClick?: () => void
  onTopRatedClick?: () => void
}

export default function QuickActions({ 
  onMapViewClick, 
  onAvailableNowClick, 
  onTopRatedClick 
}: QuickActionsProps) {
  const actions = [
    {
      title: 'My Bookings',
      description: 'View and manage your reservations',
      href: '/bookings',
      icon: Calendar,
      gradient: 'from-clay-terracotta to-clay-orange',
    },
    {
      title: 'Map View',
      description: 'Find courts on a map',
      href: '#',
      icon: Map,
      gradient: 'from-clay-rust to-clay-rust-dark',
      onClick: onMapViewClick,
    },
    {
      title: 'Available Now',
      description: 'Courts available today',
      href: '#',
      icon: Clock,
      gradient: 'from-clay-terracotta to-clay-orange',
      onClick: onAvailableNowClick,
    },
    {
      title: 'Top Rated',
      description: 'Highest rated courts',
      href: '#',
      icon: Star,
      gradient: 'from-clay-rust to-clay-rust-dark',
      onClick: onTopRatedClick,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {actions.map((action) => {
        const Icon = action.icon
        const content = (
          <div className="glass-dark rounded-3xl p-8 shadow-luxury hover:shadow-luxury-clay transition-all duration-500 cursor-pointer group border border-clay-terracotta/40 h-full card-hover relative overflow-hidden">
            <div className="absolute inset-0 bg-clay-rust-dark/80 rounded-3xl"></div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity" style={{
              backgroundImage: `linear-gradient(90deg, ${action.gradient.includes('terracotta') ? '#C4621A, #CC5500' : '#B87333, #8B4513'})`
            }}></div>
            <div className="relative z-10">
              <div className={`bg-gradient-to-br ${action.gradient} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-luxury`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-2 group-hover:text-clay-cream transition-colors" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{action.title}</h3>
              <p className="text-sm text-white leading-relaxed font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>{action.description}</p>
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
  )
}

