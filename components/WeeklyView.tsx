'use client'

import { Court, WeeklyAvailability } from '@/types'
import { Clock } from './Icons'

interface WeeklyViewProps {
  court: Court
}

export default function WeeklyView({ court }: WeeklyViewProps) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  
  const weeklyData: WeeklyAvailability[] = daysOfWeek.map((day) => ({
    day,
    timeSlots: court.timeSlots[day] || [],
  }))

  const getAvailabilityColor = (availableCount: number, totalCount: number) => {
    const percentage = (availableCount / totalCount) * 100
    if (percentage === 0) return 'bg-red-100 text-red-800'
    if (percentage < 30) return 'bg-orange-100 text-orange-800'
    if (percentage < 70) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Weekly Availability
      </h3>
      
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {daysOfWeek.map((day) => (
              <div key={day} className="text-center">
                <div className="font-semibold text-gray-900 text-sm">{day.slice(0, 3)}</div>
              </div>
            ))}
          </div>

          {/* Time slots grid */}
          <div className="space-y-2">
            {['7:00 AM', '9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM', '6:00 PM', '8:00 PM'].map((time) => (
              <div key={time} className="grid grid-cols-7 gap-2">
                <div className="text-xs text-gray-500 py-2 pr-2 text-right">{time}</div>
                {weeklyData.map((dayData) => {
                  const timeSlot = dayData.timeSlots.find((ts) => ts.time === time)
                  if (!timeSlot) {
                    return (
                      <div key={`${dayData.day}-${time}`} className="bg-gray-50 rounded p-2 text-center">
                        <span className="text-xs text-gray-400">-</span>
                      </div>
                    )
                  }
                  
                  const availableCount = timeSlot.availableCourts.filter((c) => c.isAvailable).length
                  const totalCount = timeSlot.availableCourts.length
                  
                  return (
                    <div
                      key={`${dayData.day}-${time}`}
                      className={`rounded p-2 text-center ${getAvailabilityColor(availableCount, totalCount)}`}
                      title={`${availableCount} of ${totalCount} courts available`}
                    >
                      <div className="text-xs font-semibold">{availableCount}</div>
                      <div className="text-[10px] opacity-75">/{totalCount}</div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span>70-100% Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 rounded"></div>
              <span>30-69% Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 rounded"></div>
              <span>1-29% Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 rounded"></div>
              <span>Fully Booked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



