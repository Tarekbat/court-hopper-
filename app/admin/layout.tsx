import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCurrentUserIsAdmin } from '@/lib/auth'
import type { ReactNode } from 'react'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const isAdmin = await getCurrentUserIsAdmin()
  if (!isAdmin) return notFound()

  return (
    <div className="min-h-screen" style={{ background: '#F5F0EB' }}>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-stone-soft">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link
            href="/admin"
            className="font-display font-bold text-[#1A1A1A]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Admin
          </Link>
          <nav className="flex items-center gap-2 overflow-x-auto">
            <Link
              href="/admin/courts"
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-stone-soft/50 border border-stone-soft"
            >
              Courts
            </Link>
            <Link
              href="/admin/users"
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-stone-soft/50 border border-stone-soft"
            >
              Users
            </Link>
            <Link
              href="/admin/analytics"
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-stone-soft/50 border border-stone-soft"
            >
              Analytics
            </Link>
            <Link
              href="/admin/reports"
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-stone-soft/50 border border-stone-soft"
            >
              Reports
            </Link>
            <Link
              href="/admin/settings"
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-stone-soft/50 border border-stone-soft"
            >
              Runtime
            </Link>
          </nav>
        </div>
      </header>
      <main className="px-4 py-4">{children}</main>
    </div>
  )
}

