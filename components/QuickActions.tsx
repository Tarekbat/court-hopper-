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
      gradient: 'from-miami-pink to-miami-coral',
    },
    {
      title: 'Map View',
      description: 'Find courts on a map',
      href: '#',
      icon: Map,
      gradient: 'from-miami-turquoise to-miami-ocean',
      onClick: onMapViewClick,
    },
    {
      title: 'Available Now',
      description: 'Courts available today',
      href: '#',
      icon: Clock,
      gradient: 'from-miami-coral to-miami-pink',
      onClick: onAvailableNowClick,
    },
    {
      title: 'Top Rated',
      description: 'Highest rated courts',
      href: '#',
      icon: Star,
      gradient: 'from-miami-turquoise to-miami-mint',
      onClick: onTopRatedClick,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {actions.map((action) => {
        const Icon = action.icon
        const content = (
          <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer group border-2 border-miami-turquoise/30 h-full card-hover relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity" style={{
              backgroundImage: `linear-gradient(90deg, ${action.gradient})`
            }}></div>
            <div className="relative z-10">
              <div className={`bg-gradient-to-br ${action.gradient} w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-md text-white`}>
                {action.icon === Calendar && (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {action.icon === Map && (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                )}
                {action.icon === Clock && (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {action.icon === Star && (
                  <svg className="w-7 h-7" fill="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="white" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                )}
              </div>
              <h3 className="text-lg font-display font-bold text-gray-900 mb-2 group-hover:text-miami-turquoise transition-colors">{action.title}</h3>
              <p className="text-sm text-gray-700 leading-relaxed font-medium">{action.description}</p>
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

