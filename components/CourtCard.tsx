'use client'

import { Court } from '@/types'
import { MapPin, Star, DollarSign } from '@/components/Icons'
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

  return (
    <Link href={`/court/${court.id}`}>
      <div className="bg-white rounded-3xl shadow-luxury hover:shadow-luxury-clay transition-all duration-500 overflow-hidden group cursor-pointer card-hover border border-clay-terracotta/20 relative">
        {/* Clay accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-clay opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
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
            <div className="flex items-center gap-2 bg-clay-cream/30 backdrop-blur-xl px-5 py-2.5 rounded-xl border border-clay-cream/40 shadow-luxury">
              <MapPin className="w-4 h-4 text-clay-rust-dark" />
              <span className="text-sm font-bold text-clay-rust-dark">{court.distance} mi</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-7">
          <h3 className="text-2xl font-display font-bold text-clay-rust-dark mb-4 group-hover:text-clay-terracotta transition-colors line-clamp-1">
            {court.name}
          </h3>
          
          <div className="flex items-center gap-5 mb-5">
            <div className="flex items-center gap-2 bg-clay-cream px-4 py-2 rounded-xl border border-clay-terracotta/20">
              <Star className="w-5 h-5 fill-clay-terracotta text-clay-terracotta" />
              <span className="font-bold text-clay-rust-dark text-lg">{court.rating}</span>
              <span className="text-sm text-clay-rust-dark/60">({court.reviewCount})</span>
            </div>
            <div className="flex items-center gap-2 text-clay-rust-dark bg-clay-cream px-4 py-2 rounded-xl border border-clay-terracotta/20">
              <DollarSign className="w-5 h-5 text-clay-terracotta" />
              <span className="text-sm font-bold">
                ${court.price.offPeak}-${court.price.peak}/hr
              </span>
            </div>
          </div>

          <p className="text-sm text-clay-rust-dark/70 mb-5 line-clamp-2 font-medium">
            {court.location.address}, {court.location.city}, {court.location.state}
          </p>

          {/* Amenities */}
          <div className="flex flex-wrap gap-2">
            {court.amenities.slice(0, 3).map((amenity, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-clay-cream text-clay-rust-dark text-xs rounded-lg font-semibold border border-clay-terracotta/20"
              >
                {amenity}
              </span>
            ))}
            {court.amenities.length > 3 && (
              <span className="px-3 py-1.5 bg-clay-terracotta/20 text-clay-terracotta text-xs rounded-lg font-semibold border border-clay-terracotta/30">
                +{court.amenities.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

