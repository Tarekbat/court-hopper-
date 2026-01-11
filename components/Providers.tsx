'use client'

import { ReactNode } from 'react'

// Supabase doesn't require a provider like NextAuth
// This component is kept for consistency and potential future providers
export default function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>
}
