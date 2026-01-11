'use client'

import { useState } from 'react'
import { CourtSurface } from '@/types'
import { Filter } from '@/components/Icons'

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
    maxDistance: 20,
    amenities: [],
  })

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const toggleAmenity = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity]
    updateFilter('amenities', newAmenities)
  }

  const resetFilters = () => {
    const resetFilters: FilterState = {
      surface: 'All',
      maxPrice: 100,
      minRating: 0,
      maxDistance: 20,
      amenities: [],
    }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  return (
    <div className="glass rounded-3xl shadow-luxury p-8 mb-10 border border-clay-terracotta/20">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 text-clay-rust-dark hover:text-clay-terracotta transition-colors font-bold text-xl"
        >
          <Filter className="w-6 h-6" />
          <span className="font-display">Filters</span>
        </button>
        {isOpen && (
          <button
            onClick={resetFilters}
            className="text-sm text-clay-terracotta hover:text-clay-orange font-bold px-4 py-2 rounded-xl hover:bg-clay-terracotta/10 transition-all border border-clay-terracotta/30"
          >
            Reset All
          </button>
        )}
      </div>

      {isOpen && (
        <div className="space-y-8 pt-6 border-t-2 border-clay-terracotta/30">
          {/* Surface Type */}
          <div>
            <label className="block text-sm font-bold text-clay-rust-dark mb-4 font-display">
              Court Surface
            </label>
            <div className="flex flex-wrap gap-3">
              {surfaces.map((surface) => (
                <button
                  key={surface}
                  onClick={() => updateFilter('surface', surface)}
                  className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                    filters.surface === surface
                      ? 'bg-gradient-clay text-white shadow-luxury-clay'
                      : 'bg-clay-cream text-clay-rust-dark hover:bg-clay-cream-dark border-2 border-clay-terracotta/20 hover:border-clay-terracotta/40'
                  }`}
                >
                  {surface}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-bold text-clay-rust-dark mb-4 font-display">
              Max Price: <span className="text-clay-terracotta">${filters.maxPrice}/hr</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.maxPrice}
              onChange={(e) => updateFilter('maxPrice', parseInt(e.target.value))}
              className="w-full h-3 bg-clay-cream rounded-lg appearance-none cursor-pointer accent-clay-terracotta"
              style={{
                background: `linear-gradient(to right, #C4621A 0%, #C4621A ${filters.maxPrice}%, #FFF8DC ${filters.maxPrice}%, #FFF8DC 100%)`
              }}
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-bold text-clay-rust-dark mb-4 font-display">
              Min Rating: <span className="text-clay-terracotta">{filters.minRating.toFixed(1)} ⭐</span>
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={filters.minRating}
              onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
              className="w-full h-3 bg-clay-cream rounded-lg appearance-none cursor-pointer accent-clay-terracotta"
              style={{
                background: `linear-gradient(to right, #C4621A 0%, #C4621A ${(filters.minRating / 5) * 100}%, #FFF8DC ${(filters.minRating / 5) * 100}%, #FFF8DC 100%)`
              }}
            />
          </div>

          {/* Distance */}
          <div>
            <label className="block text-sm font-bold text-clay-rust-dark mb-4 font-display">
              Max Distance: <span className="text-clay-terracotta">{filters.maxDistance} mi</span>
            </label>
            <input
              type="range"
              min="0"
              max="30"
              value={filters.maxDistance}
              onChange={(e) => updateFilter('maxDistance', parseInt(e.target.value))}
              className="w-full h-3 bg-clay-cream rounded-lg appearance-none cursor-pointer accent-clay-terracotta"
              style={{
                background: `linear-gradient(to right, #C4621A 0%, #C4621A ${(filters.maxDistance / 30) * 100}%, #FFF8DC ${(filters.maxDistance / 30) * 100}%, #FFF8DC 100%)`
              }}
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-bold text-clay-rust-dark mb-4 font-display">
              Amenities
            </label>
            <div className="flex flex-wrap gap-3">
              {amenitiesList.map((amenity) => (
                <button
                  key={amenity}
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                    filters.amenities.includes(amenity)
                      ? 'bg-gradient-clay text-white shadow-luxury-clay'
                      : 'bg-clay-cream text-clay-rust-dark hover:bg-clay-cream-dark border-2 border-clay-terracotta/20 hover:border-clay-terracotta/40'
                  }`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

