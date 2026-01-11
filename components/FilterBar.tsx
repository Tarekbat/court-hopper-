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
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition-colors"
        >
          <Filter className="w-5 h-5" />
          <span className="font-semibold">Filters</span>
        </button>
        {isOpen && (
          <button
            onClick={resetFilters}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Reset
          </button>
        )}
      </div>

      {isOpen && (
        <div className="space-y-4 pt-4 border-t">
          {/* Surface Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Court Surface
            </label>
            <div className="flex flex-wrap gap-2">
              {surfaces.map((surface) => (
                <button
                  key={surface}
                  onClick={() => updateFilter('surface', surface)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.surface === surface
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {surface}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Price: ${filters.maxPrice}/hr
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.maxPrice}
              onChange={(e) => updateFilter('maxPrice', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Rating: {filters.minRating.toFixed(1)} ⭐
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={filters.minRating}
              onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Distance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Distance: {filters.maxDistance} mi
            </label>
            <input
              type="range"
              min="0"
              max="30"
              value={filters.maxDistance}
              onChange={(e) => updateFilter('maxDistance', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amenities
            </label>
            <div className="flex flex-wrap gap-2">
              {amenitiesList.map((amenity) => (
                <button
                  key={amenity}
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filters.amenities.includes(amenity)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

