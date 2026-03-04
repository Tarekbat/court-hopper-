'use client'

import { ReactNode } from 'react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  backLink?: ReactNode
  className?: string
}

export default function ErrorState({
  message = 'Something went wrong.',
  onRetry,
  backLink,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`bg-red-50 border border-red-200 rounded-2xl p-6 text-center ${className}`}
      data-state="error"
    >
      <p className="text-red-800 font-medium">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-xl font-medium text-sm transition-colors"
          >
            Try again
          </button>
        )}
        {backLink && <div>{backLink}</div>}
      </div>
    </div>
  )
}
