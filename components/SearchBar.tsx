'use client'

import { Search } from '@/components/Icons'
import { useState, useEffect, useRef } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  /** Fires on Enter after search updates; use for scroll-to-results without jumping while typing. */
  onCommit?: () => void
}

export default function SearchBar({ onSearch, onCommit }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const onSearchRef = useRef(onSearch)

  // Keep the ref updated with the latest onSearch function
  useEffect(() => {
    onSearchRef.current = onSearch
  }, [onSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Clear any pending debounce
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    // Immediately trigger search on Enter
    onSearchRef.current(query)
    if (query.trim() !== '') {
      onCommit?.()
    }
  }

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Don't search if query is empty
    if (query.trim() === '') {
      onSearchRef.current('')
      return
    }

    // Set new timer to call onSearch after 300ms of no typing
    debounceTimer.current = setTimeout(() => {
      onSearchRef.current(query)
    }, 300)

    // Cleanup on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [query]) // Remove onSearch from dependencies

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-terracotta w-5 h-5 z-10 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by court name or location..."
          className="w-full pl-14 pr-5 py-4 bg-white/95 backdrop-blur-sm border border-white/30 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 text-ink placeholder-stone transition-all text-base"
        />
      </div>
    </form>
  )
}

