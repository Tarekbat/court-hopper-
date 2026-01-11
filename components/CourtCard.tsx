'use client'

import { Court } from '@/types'
import { MapPin, Star, DollarSign } from '@/components/Icons'
import Link from 'next/link'

interface CourtCardProps {
  court: Court
}

export default function CourtCard({ court }: CourtCardProps) {
  const surfaceColors: Record<string, string> = {
    Hard: 'bg-blue-100 text-blue-800',
    Clay: 'bg-orange-100 text-orange-800',
    Grass: 'bg-green-100 text-green-800',
    'Artificial Grass': 'bg-emerald-100 text-emerald-800',
    Carpet: 'bg-purple-100 text-purple-800',
  }

  return (
    <Link href={`/court/${court.id}`}>
      <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer">
        {/* Image placeholder */}
        <div className="h-48 bg-gradient-to-br from-primary-400 to-primary-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
          <div className="absolute top-4 right-4">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${surfaceColors[court.surface] || 'bg-gray-100 text-gray-800'}`}>
              {court.surface}
            </span>
          </div>
          <div className="absolute bottom-4 left-4 text-white">
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">{court.distance} mi</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
            {court.name}
          </h3>
          
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-gray-900">{court.rating}</span>
              <span className="text-sm text-gray-500">({court.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">
                ${court.price.offPeak}-${court.price.peak}/hr
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {court.location.address}, {court.location.city}, {court.location.state}
          </p>

          {/* Amenities */}
          <div className="flex flex-wrap gap-2">
            {court.amenities.slice(0, 3).map((amenity, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
              >
                {amenity}
              </span>
            ))}
            {court.amenities.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                +{court.amenities.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

