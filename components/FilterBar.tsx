'use client'

import { useState } from 'react'
import { CourtSurface } from '@/types'
import { Filter, Lightbulb, Car, Restroom, Droplet, ShoppingBag, Wifi, Shield, Home } from '@/components/Icons'

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  surface: CourtSurface | 'All'
  maxPrice: number
  minRating: number
  maxDistance: number
  amenities: string[]
}

const surfaces: (CourtSurface | 'All')[] = ['All', 'Hard', 'Clay', 'Grass', 'Artificial Grass', 'Carpet']
const amenitiesList = ['Lights', 'Parking', 'Pro Shop', 'Restrooms', 'Indoor', 'Lockers']

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    surface: 'All',
    maxPrice: 100,
    minRating: 0,
    maxDistance: 50, // Increased default to show more courts
    amenities: [],
  })

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const toggleAmenity = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter((a: string) => a !== amenity)
      : [...filters.amenities, amenity]
    updateFilter('amenities', newAmenities)
  }

  const resetFilters = () => {
    const resetFilters: FilterState = {
      surface: 'All',
      maxPrice: 100,
      minRating: 0,
      maxDistance: 50, // Increased default to show more courts
      amenities: [],
    }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  return (
    <div className="bg-white border border-stone-soft rounded-2xl p-6 md:p-8 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 text-ink hover:text-terracotta transition-colors font-display text-lg"
        >
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </button>
        {isOpen && (
          <button
            onClick={resetFilters}
            className="text-sm text-terracotta hover:text-terracotta-dark font-medium px-4 py-2 hover:bg-terracotta/10 transition-all rounded-xl border border-terracotta/25"
          >
            Reset all
          </button>
        )}
      </div>

      {isOpen && (
        <div className="space-y-8 pt-6 border-t border-stone-soft">
          <div>
            <label className="block text-sm font-medium text-ink mb-3">
              Court surface
            </label>
            <div className="flex flex-wrap gap-2">
              {surfaces.map((surface) => (
                <button
                  key={surface}
                  onClick={() => updateFilter('surface', surface)}
                  className={`px-4 py-2.5 text-sm font-medium transition-all rounded-xl ${
                    filters.surface === surface
                      ? 'bg-terracotta text-white'
                      : 'bg-stone-soft/50 text-ink border border-stone-soft hover:border-terracotta/40 hover:bg-terracotta/5'
                  }`}
                >
                  {surface}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-3">
              Max price <span className="text-terracotta">${filters.maxPrice}/hr</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.maxPrice}
              onChange={(e) => updateFilter('maxPrice', parseInt(e.target.value))}
              className="w-full h-2 bg-stone-soft/80 rounded-full appearance-none cursor-pointer accent-terracotta"
              style={{
                background: `linear-gradient(to right, #A0522D 0%, #A0522D ${filters.maxPrice}%, #E7E5E4 ${filters.maxPrice}%, #E7E5E4 100%)`
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-3">
              Min rating <span className="text-terracotta">{filters.minRating.toFixed(1)} ★</span>
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={filters.minRating}
              onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
              className="w-full h-2 bg-stone-soft/80 rounded-full appearance-none cursor-pointer accent-terracotta"
              style={{
                background: `linear-gradient(to right, #A0522D 0%, #A0522D ${(filters.minRating / 5) * 100}%, #E7E5E4 ${(filters.minRating / 5) * 100}%, #E7E5E4 100%)`
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-3">
              Max distance <span className="text-terracotta">{filters.maxDistance} mi</span>
            </label>
            <input
              type="range"
              min="0"
              max="30"
              value={filters.maxDistance}
              onChange={(e) => updateFilter('maxDistance', parseInt(e.target.value))}
              className="w-full h-2 bg-stone-soft/80 rounded-full appearance-none cursor-pointer accent-terracotta"
              style={{
                background: `linear-gradient(to right, #A0522D 0%, #A0522D ${(filters.maxDistance / 30) * 100}%, #E7E5E4 ${(filters.maxDistance / 30) * 100}%, #E7E5E4 100%)`
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-3">
              Amenities
            </label>
            <div className="flex flex-wrap gap-2">
              {amenitiesList.map((amenity) => {
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
                  'Indoor': Home,
                  'Lockers': Shield,
                }
                const getIcon = (name: string) => {
                  const iconKey = Object.keys(amenityIcons).find((key: string) => 
                    name.toLowerCase().includes(key.toLowerCase()) || 
                    key.toLowerCase().includes(name.toLowerCase())
                  )
                  return iconKey ? amenityIcons[iconKey] : null
                }
                const IconComponent = getIcon(amenity)
                return (
                  <button
                    key={amenity}
                    onClick={() => toggleAmenity(amenity)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-xl ${
                      filters.amenities.includes(amenity)
                        ? 'bg-terracotta text-white'
                        : 'bg-stone-soft/50 text-ink border border-stone-soft hover:border-terracotta/40 hover:bg-terracotta/5'
                    }`}
                  >
                    {IconComponent && <IconComponent className={`w-4 h-4 ${filters.amenities.includes(amenity) ? 'text-white' : 'text-terracotta'}`} />}
                    {amenity}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

