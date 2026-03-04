'use client'

import { ReactNode } from 'react'

interface LoadingSkeletonProps {
  /** Number of skeleton cards/rows to show */
  count?: number
  /** Optional class for the container */
  className?: string
  /** 'card' | 'row' - card shows rounded card shape, row shows list row */
  variant?: 'card' | 'row'
}

export default function LoadingSkeleton({ count = 3, className = '', variant = 'card' }: LoadingSkeletonProps) {
  if (variant === 'row') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-soft animate-pulse">
            <div className="w-12 h-12 rounded-full bg-stone-soft/80 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-stone-soft/80 rounded w-1/3" />
              <div className="h-4 bg-stone-soft/80 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6 animate-pulse">
          <div className="h-6 bg-stone-soft/80 rounded w-1/3 mb-3" />
          <div className="h-4 bg-stone-soft/80 rounded w-2/3 mb-4" />
          <div className="h-10 bg-stone-soft/80 rounded-xl w-28" />
        </div>
      ))}
    </div>
  )
}
