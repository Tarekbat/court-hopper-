'use client'

const ITEMS = ['TENNIS', 'PICKLEBALL', 'PADEL', 'BASKETBALL', 'YOGA', 'CLIMBING', 'BOXING', 'SWIMMING']

export default function MarqueeStrip() {
  return (
    <div
      className="overflow-hidden"
      style={{
        background: '#C41E2A',
        padding: '14px 0',
      }}
    >
      <div
        className="marquee-strip-inner"
        style={{
          display: 'flex',
          gap: '60px',
          whiteSpace: 'nowrap',
          width: 'fit-content',
        }}
      >
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-[60px]"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.2em',
            }}
          >
            {item}
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>♦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
