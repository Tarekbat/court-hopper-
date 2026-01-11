'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Court } from '@/types'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icons in Next.js - only run on client
if (typeof window !== 'undefined') {
  const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png'
  const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png'
  const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'

  const DefaultIcon = L.icon({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
  })

  L.Marker.prototype.options.icon = DefaultIcon
}

interface MapViewProps {
  courts: Court[]
  onCourtClick?: (court: Court) => void
}

export default function MapView({ courts, onCourtClick }: MapViewProps) {
  // Filter courts with valid coordinates
  const validCourts = courts.filter(
    (court) => {
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
    }
  )
  
  // Debug: Log if we have courts but no valid coordinates
  if (courts.length > 0 && validCourts.length === 0) {
    console.warn('MapView: Courts provided but none have valid coordinates', {
      totalCourts: courts.length,
      sampleCourt: courts[0],
    })
  }

  // Calculate center point from all courts
  const centerLat = validCourts.length > 0
    ? validCourts.reduce((sum, court) => sum + court.location.coordinates.lat, 0) / validCourts.length
    : 25.7617 // Default to Miami
  const centerLng = validCourts.length > 0
    ? validCourts.reduce((sum, court) => sum + court.location.coordinates.lng, 0) / validCourts.length
    : -80.1918 // Default to Miami

  if (validCourts.length === 0) {
    // If we have courts but no valid coordinates, show a helpful message
    if (courts.length > 0) {
      return (
        <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg border-2 border-miami-turquoise/30 flex items-center justify-center bg-gradient-to-br from-miami-sand-light to-white">
          <div className="text-center px-6">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-gray-900 text-xl font-bold mb-2">No valid locations found</p>
            <p className="text-gray-700 text-sm">Some courts may be missing location data. Try the list view instead.</p>
          </div>
        </div>
      )
    }
    // If no courts at all
    return (
      <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg border-2 border-miami-turquoise/30 flex items-center justify-center bg-gradient-to-br from-miami-sand-light to-white">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">🎾</div>
          <p className="text-gray-900 text-xl font-bold mb-2">No courts found</p>
          <p className="text-gray-700 text-sm">Try adjusting your filters or search query.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg border border-gray-200">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={validCourts.length === 1 ? 13 : 10}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validCourts.map((court) => (
          <Marker
            key={court.id}
            position={[court.location.coordinates.lat, court.location.coordinates.lng]}
            eventHandlers={{
              click: () => {
                if (onCourtClick) {
                  onCourtClick(court)
                }
              },
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg mb-1">{court.name}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {court.location.address}, {court.location.city}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-yellow-500">★</span>
                  <span className="font-semibold">{court.rating}</span>
                  <span className="text-gray-500">({court.reviewCount})</span>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-gray-600">${court.price.offPeak}-${court.price.peak}/hr</span>
                </div>
                <div className="mt-2">
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {court.surface}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

