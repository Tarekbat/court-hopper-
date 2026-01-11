import type { Metadata } from 'next'
import './globals.css'
import 'leaflet/dist/leaflet.css'
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
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

