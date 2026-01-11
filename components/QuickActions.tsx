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
      color: 'bg-blue-500',
    },
    {
      title: 'Map View',
      description: 'Find courts on a map',
      href: '#',
      icon: Map,
      color: 'bg-green-500',
      onClick: onMapViewClick,
    },
    {
      title: 'Available Now',
      description: 'Courts available today',
      href: '#',
      icon: Clock,
      color: 'bg-orange-500',
      onClick: onAvailableNowClick,
    },
    {
      title: 'Top Rated',
      description: 'Highest rated courts',
      href: '#',
      icon: Star,
      color: 'bg-purple-500',
      onClick: onTopRatedClick,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action) => {
        const Icon = action.icon
        const content = (
          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer group border border-gray-100 h-full">
            <div className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{action.title}</h3>
            <p className="text-sm text-gray-600">{action.description}</p>
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

