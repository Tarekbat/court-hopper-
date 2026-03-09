'use client'

import Link from 'next/link'

const STATS = [
  { value: '85%', label: 'Revenue to you' },
  { value: '3x', label: 'More bookings' },
  { value: '0', label: 'Hidden fees' },
]

export default function ForBusinessSection() {
  return (
    <section
      className="for-business-section text-center"
      style={{
        background: '#FFFFFF',
        padding: '100px 60px',
        borderTop: '1px solid #E8E0D8',
      }}
    >
      <div className="for-business-inner mx-auto" style={{ maxWidth: 700 }}>
        <span
          className="block uppercase font-medium mb-3.5"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '11px',
            color: '#C41E2A',
            letterSpacing: '0.2em',
          }}
        >
          For Business
        </span>
        <h2
          className="for-business-heading font-medium text-[#1A1A1A] leading-[1.15] mb-5"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(32px, 4vw, 48px)',
          }}
        >
          A partnership that <span className="italic text-[#C41E2A]">actually works</span>
        </h2>
        <p
          className="for-business-subtitle mx-auto mb-12 font-light leading-[1.8] text-[#8A8279]"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '16px',
            fontWeight: 300,
            maxWidth: 520,
          }}
        >
          Fair revenue sharing designed for long-term relationships. Fill empty courts, grow your community, keep more of what you earn.
        </p>

        <div
          className="for-business-stats grid grid-cols-3 gap-8 mb-12 text-center"
          style={{ gap: '32px', marginBottom: '48px' }}
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="for-business-stat">
              <div
                className="for-business-stat-value font-semibold text-[#C41E2A] mb-2"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '44px',
                }}
              >
                {stat.value}
              </div>
              <div
                className="for-business-stat-label font-normal text-[#8A8279] tracking-[0.04em]"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/partner"
          className="for-business-btn inline-flex items-center justify-center font-medium uppercase tracking-[0.08em] border-[1.5px] border-[#C41E2A] text-[#C41E2A] rounded-[100px] py-3.5 px-9 transition-colors duration-300 hover:bg-[#C41E2A] hover:text-white"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '13px',
          }}
        >
          Partner With Us
        </Link>
      </div>
    </section>
  )
}
