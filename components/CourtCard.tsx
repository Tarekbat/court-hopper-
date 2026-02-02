'use client'

import { Court } from '@/types'
import { MapPin, Star, DollarSign, Lightbulb, Car, Restroom, Droplet, ShoppingBag, Wifi, Shield, Parking } from '@/components/Icons'
import Link from 'next/link'
import { useMemo } from 'react'

interface CourtCardProps {
  court: Court
}

export default function CourtCard({ court }: CourtCardProps) {
  // Ensure images is always an array and validate URLs
  const images = useMemo(() => {
    let imgArray: string[] = []
    
    if (Array.isArray(court.images)) {
      imgArray = court.images
    } else if (typeof court.images === 'string') {
      try {
        imgArray = JSON.parse(court.images)
      } catch (e) {
        imgArray = []
      }
    }
    
    // Filter out invalid URLs client-side as safety net
    return imgArray.filter((img: string) => {
      if (typeof img !== 'string') return false
      const trimmed = img.trim()
      // Reject photo IDs without full URLs
      if (/^photo-\d+-\w+$/.test(trimmed) && !trimmed.includes('http')) return false
      // Only allow full URLs or relative paths
      return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')
    })
  }, [court.images])
  
  const surfaceColors: Record<string, string> = {
    Hard: 'bg-stone-soft/80 text-ink border-stone-soft',
    Clay: 'bg-terracotta/15 text-terracotta border-terracotta/30',
    Grass: 'bg-stone-soft/80 text-ink border-stone-soft',
    'Artificial Grass': 'bg-stone-soft/80 text-ink border-stone-soft',
    Carpet: 'bg-stone-soft/80 text-ink border-stone-soft',
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
    const iconKey = Object.keys(amenityIcons).find((key: string) => 
      amenity.toLowerCase().includes(key.toLowerCase()) || 
      key.toLowerCase().includes(amenity.toLowerCase())
    )
    return iconKey ? amenityIcons[iconKey] : null
  }

  return (
    <Link href={`/court/${court.id}`}>
      <div className="card-premium rounded-2xl overflow-hidden group cursor-pointer">
        <div className="h-56 relative overflow-hidden">
          {images && images.length > 0 && images[0] ? (
            <>
              <img
                src={images[0]}
                alt={court.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement
                  if (fallback) fallback.style.display = 'block'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
            </>
          ) : (
            <div className="h-full bg-gradient-to-br from-stone-soft/50 via-beige to-stone-soft/50 pattern-overlay">
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
            </div>
          )}
          <div className="absolute top-4 right-4">
            <span className={`px-3.5 py-1.5 text-[11px] font-semibold tracking-wide rounded-lg bg-white/90 backdrop-blur-sm border border-white/50 ${surfaceColors[court.surface] || 'text-ink'}`}>
              {court.surface}
            </span>
          </div>
          <div className="absolute bottom-4 left-4">
            <div className="px-4 py-2 rounded-lg bg-white/90 backdrop-blur-sm border border-white/50">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-terracotta" />
                <span className="text-sm font-medium text-ink">{court.distance} mi</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white">
          <h3 className="text-xl font-display text-ink mb-3 group-hover:text-terracotta transition-colors line-clamp-1">
            {court.name}
          </h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 bg-stone-soft/50 px-3 py-1.5 rounded-lg border border-stone-soft/80">
              <Star className="w-4 h-4 fill-terracotta text-terracotta" />
              <span className="font-semibold text-ink">{court.rating}</span>
              <span className="text-xs text-stone">({court.reviewCount})</span>
            </div>
            <div className="flex items-center gap-2 bg-stone-soft/50 px-3 py-1.5 rounded-lg border border-stone-soft/80">
              <DollarSign className="w-4 h-4 text-terracotta" />
              <span className="text-sm font-medium text-ink">
                ${court.price.offPeak}–${court.price.peak}/hr
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2 mb-4">
            <MapPin className="w-4 h-4 text-stone mt-0.5 flex-shrink-0" />
            <p className="text-sm text-stone line-clamp-2">
              {court.location.address}, {court.location.city}, {court.location.state}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {court.amenities.slice(0, 3).map((amenity, idx) => {
              const IconComponent = getAmenityIcon(amenity)
              return (
                <span
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-soft/50 text-ink text-xs font-medium rounded-lg border border-stone-soft/80"
                >
                  {IconComponent && <IconComponent className="w-3.5 h-3.5 text-terracotta" />}
                  {amenity}
                </span>
              )
            })}
            {court.amenities.length > 3 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-terracotta/10 text-terracotta text-xs font-medium rounded-lg border border-terracotta/20">
                +{court.amenities.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

