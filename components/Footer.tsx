'use client'

import Link from 'next/link'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Browse courts', href: '/#results-section' },
      { label: 'My bookings', href: '/bookings' },
      { label: 'Community', href: '/groups' },
      { label: 'Pricing', href: '#' },
      { label: 'Mobile App', href: '#' },
    ],
  },
  {
    title: 'Business',
    links: [
      { label: 'Partner', href: '/partner' },
      { label: 'Revenue Model', href: '#' },
      { label: 'Dashboard', href: '#' },
      { label: 'API', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
]

export default function Footer() {
  return (
    <footer
      className="relative"
      style={{
        background: '#1A1A1A',
        padding: '60px 60px 40px',
      }}
    >
      <div
        className="footer-top flex flex-wrap justify-between items-start gap-10"
        style={{ marginBottom: '60px' }}
      >
        <div className="footer-brand">
          <div
            className="font-semibold text-[#C41E2A] mb-2"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '28px',
            }}
          >
            SETRA
          </div>
          <div
            className="uppercase tracking-[0.15em]"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            Access, Curated
          </div>
        </div>

        <div className="footer-columns flex gap-16" style={{ gap: '64px' }}>
          {COLUMNS.map((col) => (
            <div key={col.title} className="footer-column">
              <div
                className="footer-column-title uppercase font-medium mb-4"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.15em',
                  marginBottom: '18px',
                }}
              >
                {col.title}
              </div>
              {col.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="footer-column-link block font-light mb-3 transition-colors hover:text-white"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: 300,
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: '12px',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        className="footer-bottom flex flex-wrap justify-between items-center gap-4 pt-7"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '28px',
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '12px',
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          © 2026 SETRA. All rights reserved.
        </span>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '12px',
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          Miami, FL
        </span>
      </div>
    </footer>
  )
}
