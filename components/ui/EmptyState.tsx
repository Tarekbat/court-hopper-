'use client'

import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-stone-soft shadow-sm p-12 text-center ${className}`}
      data-state="empty"
    >
      {icon && <div className="flex justify-center mb-5 text-stone [&>svg]:w-14 [&>svg]:h-14">{icon}</div>}
      <h2 className="text-xl font-display text-ink mb-2">{title}</h2>
      {description && <p className="text-stone mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
