'use client'

import { Court } from '@/types'
import { MapPin, Star, DollarSign, Lightbulb, Car, Restroom, Droplet, ShoppingBag, Wifi, Shield, Parking } from '@/components/Icons'
import Link from 'next/link'

interface CourtCardProps {
  court: Court
}

export default function CourtCard({ court }: CourtCardProps) {
  const surfaceColors: Record<string, string> = {
    Hard: 'bg-clay-sand/30 text-clay-rust-dark border-clay-terracotta/40',
    Clay: 'bg-clay-terracotta/30 text-clay-rust-dark border-clay-terracotta/50',
    Grass: 'bg-green-100/50 text-green-800 border-green-200',
    'Artificial Grass': 'bg-emerald-100/50 text-emerald-800 border-emerald-200',
    Carpet: 'bg-purple-100/50 text-purple-800 border-purple-200',
  }

  const amenityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    'Lights': Lightbulb,
    'Lighting': Lightbulb,
    'Parking': Car,
    'Restrooms': Restroom,
    'Restroom': Restroom,
    'Water Fountains': Droplet,
    'Water': Droplet,
    'Pro Shop': ShoppingBag,
    'Shop': ShoppingBag,
    'WiFi': Wifi,
    'Wifi': Wifi,
    'Security': Shield,
  }

  const getAmenityIcon = (amenity: string) => {
    const iconKey = Object.keys(amenityIcons).find(key => 
      amenity.toLowerCase().includes(key.toLowerCase()) || 
      key.toLowerCase().includes(amenity.toLowerCase())
    )
    return iconKey ? amenityIcons[iconKey] : null
  }

  return (
    <Link href={`/court/${court.id}`}>
      <div className="bg-white rounded-3xl shadow-luxury hover:shadow-luxury-clay transition-all duration-500 overflow-hidden group cursor-pointer card-hover border-2 border-miami-turquoise/20 relative">
        {/* Miami accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-miami-turquoise via-miami-pink to-miami-coral opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        {/* Image placeholder */}
        <div className="h-64 bg-gradient-to-br from-clay-rust-dark via-clay-terracotta to-clay-rust-dark relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-clay-rust-dark/80 via-transparent to-transparent group-hover:from-clay-rust-dark/60 transition-all duration-500" />
          <div className="absolute inset-0 luxury-shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute top-6 right-6">
            <span className={`px-4 py-2 rounded-xl text-xs font-bold shadow-luxury backdrop-blur-md border ${surfaceColors[court.surface] || 'bg-white/90 text-clay-rust-dark border-clay-terracotta/30'}`}>
              {court.surface}
            </span>
          </div>
          <div className="absolute bottom-6 left-6">
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xl px-5 py-2.5 rounded-xl border border-white/50 shadow-lg">
              <MapPin className="w-4 h-4 text-miami-turquoise" />
              <span className="text-sm font-bold text-gray-900">{court.distance} mi</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-7">
          <h3 className="text-2xl font-display font-bold text-gray-900 mb-4 group-hover:text-miami-turquoise transition-colors line-clamp-1">
            {court.name}
          </h3>
          
          <div className="flex items-center gap-5 mb-5">
            <div className="flex items-center gap-2 bg-miami-turquoise/10 px-4 py-2 rounded-xl border border-miami-turquoise/30">
              <Star className="w-5 h-5 fill-miami-turquoise text-miami-turquoise" />
              <span className="font-bold text-gray-900 text-lg">{court.rating}</span>
              <span className="text-sm text-gray-600">({court.reviewCount})</span>
            </div>
            <div className="flex items-center gap-2 text-gray-900 bg-miami-pink/10 px-4 py-2 rounded-xl border border-miami-pink/30">
              <DollarSign className="w-5 h-5 text-miami-pink" />
              <span className="text-sm font-bold">
                ${court.price.offPeak}-${court.price.peak}/hr
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 mb-5">
            <MapPin className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700 line-clamp-2 font-medium">
              {court.location.address}, {court.location.city}, {court.location.state}
            </p>
          </div>

          {/* Amenities */}
          <div className="flex flex-wrap gap-2">
            {court.amenities.slice(0, 3).map((amenity, idx) => {
              const IconComponent = getAmenityIcon(amenity)
              return (
                <span
                  key={idx}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-miami-turquoise/10 text-gray-800 text-xs rounded-lg font-semibold border border-miami-turquoise/30"
                >
                  {IconComponent && <IconComponent className="w-3.5 h-3.5 text-miami-turquoise" />}
                  {amenity}
                </span>
              )
            })}
            {court.amenities.length > 3 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-miami-pink/20 text-miami-pink-dark text-xs rounded-lg font-semibold border border-miami-pink/30">
                +{court.amenities.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

