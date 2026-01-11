'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Header() {
  const { data: session, status } = useSession()
  const router = useRouter()

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-primary-600 p-2 rounded-lg flex items-center justify-center w-10 h-10">
              <span className="text-white text-xl">🎾</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tennis Court Scheduler</h1>
              <p className="text-sm text-gray-600">Find and book courts near you</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {status === 'loading' ? (
              <div className="px-4 py-2 text-gray-500">Loading...</div>
            ) : session ? (
              <>
                <Link
                  href="/bookings"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  My Bookings
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700">{session.user?.name || session.user?.email}</span>
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: '/' })
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

