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
  // Calculate center point from all courts
  const centerLat = courts.length > 0
    ? courts.reduce((sum, court) => sum + court.location.coordinates.lat, 0) / courts.length
    : 25.7617 // Default to Miami
  const centerLng = courts.length > 0
    ? courts.reduce((sum, court) => sum + court.location.coordinates.lng, 0) / courts.length
    : -80.1918 // Default to Miami

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg border border-gray-200">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {courts.map((court) => (
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

