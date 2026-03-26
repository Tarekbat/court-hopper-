import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from '@/components/Providers'
import RuntimeGuard from '@/components/RuntimeGuard'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Tennis Court Scheduler',
  description: 'Find and book tennis courts near you',
  manifest: '/manifest.webmanifest',
  icons: {
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon-precomposed.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans antialiased text-ink bg-beige min-h-screen">
        <Providers>
          <RuntimeGuard />
          {children}
        </Providers>
      </body>
    </html>
  )
}

