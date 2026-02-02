import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Tennis Court Scheduler',
  description: 'Find and book tennis courts near you',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans antialiased text-ink bg-beige min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

