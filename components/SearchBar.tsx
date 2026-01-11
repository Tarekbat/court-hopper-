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
        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-miami-turquoise w-5 h-5 z-10" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onSearch(e.target.value)
          }}
          placeholder="Search premium courts by name or location..."
          className="w-full pl-14 pr-5 py-4 rounded-2xl border-2 border-miami-turquoise/40 bg-white focus:border-miami-pink focus:outline-none focus:ring-4 focus:ring-miami-pink/20 focus:bg-white text-gray-900 placeholder-gray-400 shadow-xl transition-all text-base font-medium"
        />
      </div>
    </form>
  )
}

