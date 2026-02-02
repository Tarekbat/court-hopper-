'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Court } from '@/types'
import L from 'leaflet'

// Import CSS
import 'leaflet/dist/leaflet.css'

// Create custom icon with CDN URLs - must be done before any L.Marker is created
const createCustomIcon = () => {
  if (typeof window === 'undefined') return undefined
  
  // Delete the default icon path that Next.js breaks
  delete (L.Icon.Default.prototype as any)._getIconUrl
  
  return new L.Icon({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
  })
}

// Set default icon globally
if (typeof window !== 'undefined') {
  const defaultIcon = createCustomIcon()
  if (defaultIcon) {
    L.Marker.prototype.options.icon = defaultIcon
  }
}

interface MapViewProps {
  courts: Court[]
  onCourtClick?: (court: Court) => void
}

// Component to fit bounds after markers are added
function FitBounds({ courts }: { courts: Court[] }) {
  const map = useMap()
  const [hasFitted, setHasFitted] = useState(false)

  useEffect(() => {
    if (hasFitted || courts.length === 0) return

    // Wait for map to be ready and markers to render
    const timer = setTimeout(() => {
      try {
        const validCourts = courts.filter((court) => {
          const lat = court.location?.coordinates?.lat
          const lng = court.location?.coordinates?.lng
          return (
            lat != null &&
            lng != null &&
            !isNaN(Number(lat)) &&
            !isNaN(Number(lng)) &&
            Number(lat) !== 0 &&
            Number(lng) !== 0
          )
        })

        if (validCourts.length > 0) {
          // Create proper LatLngBounds
          const bounds = L.latLngBounds(
            validCourts.map(c => [c.location.coordinates.lat, c.location.coordinates.lng] as [number, number])
          )
          
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
          setHasFitted(true)
          console.log('MapView: Fitted bounds to show all markers', bounds)
        }
      } catch (e) {
        console.error('MapView: Error fitting bounds', e)
      }
    }, 500) // Increased delay to ensure markers are rendered

    return () => clearTimeout(timer)
  }, [map, courts, hasFitted])

  return null
}

// Recalculate map size when container gets or changes size (fixes map not showing until filter change)
function MapResizeFix() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const ro = new ResizeObserver(() => {
      map.invalidateSize()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [map])
  return null
}

export default function MapView({ courts, onCourtClick }: MapViewProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Only render on client
    setIsClient(true)
    
    // Debug logging
    console.log('MapView: Component mounted')
    console.log('MapView: Received courts:', courts.length)
    if (courts.length > 0) {
      console.log('MapView: Sample court:', courts[0])
      console.log('MapView: Sample court location:', courts[0].location)
      console.log('MapView: Sample court coordinates:', courts[0].location?.coordinates)
    }
  }, [courts])

  // Filter courts with valid coordinates
  const validCourts = courts.filter((court) => {
    const lat = court.location?.coordinates?.lat
    const lng = court.location?.coordinates?.lng
    const isValid = (
      lat != null &&
      lng != null &&
      !isNaN(Number(lat)) &&
      !isNaN(Number(lng)) &&
      Number(lat) !== 0 &&
      Number(lng) !== 0
    )
    
    if (!isValid && court.location) {
      console.warn('MapView: Invalid coordinates for court:', {
        id: court.id,
        name: court.name,
        lat,
        lng,
        location: court.location
      })
    }
    
    return isValid
  })

  console.log('MapView: Valid courts:', validCourts.length, 'out of', courts.length)

  // Calculate center point - ensure we have valid coordinates
  const centerLat = validCourts.length > 0
    ? validCourts.reduce((sum, court) => {
        const lat = court.location.coordinates.lat
        return sum + (isNaN(Number(lat)) ? 0 : Number(lat))
      }, 0) / validCourts.length
    : 25.7617 // Default to Miami
  const centerLng = validCourts.length > 0
    ? validCourts.reduce((sum, court) => {
        const lng = court.location.coordinates.lng
        return sum + (isNaN(Number(lng)) ? 0 : Number(lng))
      }, 0) / validCourts.length
    : -80.1918 // Default to Miami

  console.log('MapView: Center coordinates:', centerLat, centerLng)
  console.log('MapView: Court coordinates:', validCourts.map(c => ({
    name: c.name,
    lat: c.location.coordinates.lat,
    lng: c.location.coordinates.lng
  })))

  // Show loading state
  if (!isClient) {
    return (
      <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg border border-gray-200 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clay-terracotta mx-auto mb-4"></div>
          <p className="text-gray-500">Loading map...</p>
        </div>
      </div>
    )
  }

  // Show message if no valid courts
  if (validCourts.length === 0) {
    console.warn('MapView: No valid courts to display')
    return (
      <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg border-2 border-clay-terracotta/30 flex items-center justify-center bg-gradient-to-br from-tropical-cream to-white">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-gray-900 text-xl font-bold mb-2">
            {courts.length > 0 ? 'No valid locations found' : 'No courts found'}
          </p>
          <p className="text-gray-700 text-sm mb-4">
            {courts.length > 0 
              ? 'Some courts may be missing location data. Try the list view instead.'
              : 'Try adjusting your filters or search query.'}
          </p>
          {courts.length > 0 && (
            <div className="text-xs text-gray-500 mt-4 p-4 bg-gray-100 rounded max-w-md mx-auto text-left">
              <p className="font-semibold mb-2">Debug Info:</p>
              <p>Received {courts.length} courts</p>
              <p className="mt-2">Sample court location data:</p>
              <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto">
                {JSON.stringify(courts[0]?.location, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  console.log('MapView: Rendering map with', validCourts.length, 'courts')

  return (
    <div 
      className="w-full rounded-lg overflow-hidden shadow-lg border border-gray-200 relative"
      style={{ height: '600px', minHeight: '600px' }}
    >
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={validCourts.length === 1 ? 13 : 11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        className="z-0"
      >
        <FitBounds courts={validCourts} />
        <MapResizeFix />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validCourts.map((court) => {
          // Create icon instance for each marker to ensure it uses CDN URLs
          const markerIcon = typeof window !== 'undefined' ? createCustomIcon() : undefined
          
          console.log('MapView: Adding marker for', court.name, 'at', court.location.coordinates.lat, court.location.coordinates.lng)
          
          return (
            <Marker
              key={court.id}
              position={[court.location.coordinates.lat, court.location.coordinates.lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => {
                  console.log('MapView: Marker clicked for', court.name)
                  if (onCourtClick) {
                    onCourtClick(court)
                  }
                },
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-lg mb-1">{court.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {court.location.address}, {court.location.city}
                  </p>
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold">{court.rating}</span>
                    <span className="text-gray-500">({court.reviewCount})</span>
                  </div>
                  <div className="text-sm mb-2">
                    <span className="text-gray-600">${court.price.offPeak}-${court.price.peak}/hr</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {court.surface}
                    </span>
                  </div>
                  {onCourtClick && (
                    <button
                      onClick={() => onCourtClick(court)}
                      className="mt-2 w-full px-3 py-1.5 bg-terracotta text-white text-sm font-semibold rounded hover:bg-terracotta-dark transition-colors"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
