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

  // Get all unique time slots from all days
  const allTimeSlots = new Set<string>()
  daysOfWeek.forEach((day) => {
    const daySlots = court.timeSlots[day] || []
    daySlots.forEach((slot) => {
      allTimeSlots.add(slot.time)
    })
  })
  
  // Convert to sorted array (sort by time)
  const timeSlots = Array.from(allTimeSlots).sort((a, b) => {
    // Convert 12h format to 24h for comparison
    const convertToMinutes = (time12h: string): number => {
      const [time, period] = time12h.split(' ')
      const [hours, minutes] = time.split(':')
      let hour24 = parseInt(hours)
      
      if (period === 'PM' && hour24 !== 12) {
        hour24 += 12
      } else if (period === 'AM' && hour24 === 12) {
        hour24 = 0
      }
      
      return hour24 * 60 + parseInt(minutes || '0')
    }
    
    return convertToMinutes(a) - convertToMinutes(b)
  })
  
  // If no time slots found, use default
  const displayTimeSlots = timeSlots.length > 0 ? timeSlots : ['7:00 AM', '9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM', '6:00 PM', '8:00 PM']

  const getAvailabilityColor = (availableCount: number, totalCount: number) => {
    const percentage = (availableCount / totalCount) * 100
    if (percentage === 0) return 'bg-red-100 text-red-800'
    if (percentage < 30) return 'bg-orange-100 text-orange-800'
    if (percentage < 70) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Weekly Availability
      </h3>
      
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="inline-block min-w-full">
          {/* Sticky time column + scrollable days */}
          <div className="flex gap-2">
            {/* Time column - sticky */}
            <div className="flex-shrink-0 w-20">
              <div className="h-8"></div> {/* Spacer for header */}
              <div className="space-y-1">
                {displayTimeSlots.map((time) => (
                  <div key={time} className="h-10 flex items-center justify-end pr-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">{time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Days - scrollable */}
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {daysOfWeek.map((day) => (
                  <div key={day} className="w-24 flex-shrink-0">
                    {/* Day header */}
                    <div className="h-8 flex items-center justify-center mb-1">
                      <div className="font-semibold text-gray-900 text-sm">{day.slice(0, 3)}</div>
                    </div>
                    
                    {/* Time slots for this day */}
                    <div className="space-y-1">
                      {displayTimeSlots.map((time) => {
                        const dayData = weeklyData.find((d: WeeklyAvailability) => d.day === day)
                        const timeSlot = dayData?.timeSlots.find((ts) => ts.time === time)
                        
                        if (!timeSlot) {
                          return (
                            <div key={`${day}-${time}`} className="h-10 bg-gray-50 rounded flex items-center justify-center">
                              <span className="text-xs text-gray-400">-</span>
                            </div>
                          )
                        }
                        
                        const availableCount = timeSlot.availableCourts.filter((c) => c.isAvailable).length
                        const totalCount = timeSlot.availableCourts.length
                        
                        return (
                          <div
                            key={`${day}-${time}`}
                            className={`h-10 rounded flex flex-col items-center justify-center ${getAvailabilityColor(availableCount, totalCount)}`}
                            title={`${availableCount} of ${totalCount} courts available`}
                          >
                            <div className="text-xs font-semibold leading-tight">{availableCount}</div>
                            <div className="text-[10px] opacity-75 leading-tight">/{totalCount}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-100 rounded"></div>
          <span>70-100%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-yellow-100 rounded"></div>
          <span>30-69%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-orange-100 rounded"></div>
          <span>1-29%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-100 rounded"></div>
          <span>0%</span>
        </div>
      </div>
    </div>
  )
}



