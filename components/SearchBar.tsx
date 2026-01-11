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
        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-clay-terracotta w-6 h-6 z-10" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onSearch(e.target.value)
          }}
          placeholder="Search premium courts by name or location..."
          className="w-full pl-16 pr-6 py-5 rounded-2xl border-2 border-clay-terracotta bg-white focus:border-clay-terracotta focus:outline-none focus:ring-4 focus:ring-clay-terracotta/20 focus:bg-white text-clay-rust-dark placeholder-clay-rust-dark/60 shadow-luxury transition-all text-lg font-semibold"
        />
      </div>
    </form>
  )
}

