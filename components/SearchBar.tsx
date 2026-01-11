'use client'

import { Search } from '@/components/Icons'
import { useState } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onSearch(e.target.value)
          }}
          placeholder="Search courts by name or location..."
          className="w-full pl-12 pr-4 py-4 rounded-lg border-2 border-white/20 bg-white/95 backdrop-blur-sm focus:border-white focus:outline-none focus:bg-white text-gray-900 placeholder-gray-500 shadow-lg"
        />
      </div>
    </form>
  )
}

