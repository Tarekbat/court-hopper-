'use client'

const STEPS = [
  {
    num: '01',
    title: 'Discover',
    desc: 'Browse courts by location, availability, and rating. See real-time slot openings across the city.',
  },
  {
    num: '02',
    title: 'Book',
    desc: 'Reserve your court in seconds. No calls, no waiting. Instant confirmation.',
  },
  {
    num: '03',
    title: 'Connect',
    desc: 'Find players at your level. Create groups. Plan sessions together.',
  },
  {
    num: '04',
    title: 'Play',
    desc: 'Show up and play. Rate your experience. Build your player profile.',
  },
]

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative"
      style={{
        background: '#F5F0EB',
        padding: '100px 60px',
      }}
    >
      {/* Top divider */}
      <div
        className="absolute left-[60px] right-[60px] top-0 h-px"
        style={{ background: '#E8E0D8' }}
        aria-hidden
      />

      <span
        className="block uppercase font-medium mb-3.5"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '11px',
          color: '#C41E2A',
          letterSpacing: '0.2em',
        }}
      >
        The Experience
      </span>
      <h2
        className="font-medium leading-tight mb-16"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(32px, 4vw, 48px)',
          color: '#1A1A1A',
        }}
      >
        Effortless by <span className="italic text-[#C41E2A]">design</span>
      </h2>

      <div
        className="grid gap-10"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '40px',
        }}
      >
        {STEPS.map((step) => (
          <div
            key={step.num}
            className="relative"
            style={{
              borderTop: '1px solid #E8E0D8',
              padding: '36px 0',
            }}
          >
            <span
              className="absolute right-0 font-normal text-[#C41E2A]"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '48px',
                top: '24px',
                opacity: 0.15,
              }}
            >
              {step.num}
            </span>
            <h3
              className="font-medium text-[#1A1A1A] mb-3"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '24px',
              }}
            >
              {step.title}
            </h3>
            <p
              className="font-light text-[#8A8279] leading-[1.7]"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
                fontWeight: 300,
              }}
            >
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
