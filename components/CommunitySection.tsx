'use client'

const FEATURES = [
  { label: 'Player Discovery', desc: 'Matched by skill, location & schedule' },
  { label: 'Group Sessions', desc: 'Plan together, book together, play together' },
  { label: 'Activity Feed', desc: "See who's playing where, right now" },
]

const PLAYERS = [
  { name: 'Alex M.', level: '4.0 NTRP', time: '6pm · Green Lake', active: true },
  { name: 'Jordan K.', level: '3.5 NTRP', time: '7pm · Volunteer Park', active: true },
  { name: 'Sam R.', level: '4.5 NTRP', time: 'Tomorrow · Riverside', active: false },
]

export default function CommunitySection() {
  return (
    <section
      className="community-section relative overflow-hidden"
      style={{
        background: '#1A1A1A',
        padding: '100px 60px',
      }}
    >
      {/* Decorative red radial glow */}
      <div
        className="community-glow absolute pointer-events-none"
        style={{
          top: '-30%',
          right: '-10%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(196,30,42,0.15), transparent 70%)',
        }}
        aria-hidden
      />

      <div
        className="community-grid relative grid items-center max-md:grid-cols-1 md:grid-cols-2"
        style={{ gap: '80px' }}
      >
        {/* Left column */}
        <div className="community-content">
          <span
            className="block uppercase font-medium mb-3.5"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '11px',
              color: '#C41E2A',
              letterSpacing: '0.2em',
            }}
          >
            Community
          </span>
          <h2
            className="community-heading font-medium text-white leading-tight mb-6"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(32px, 4vw, 48px)',
            }}
          >
            <span className="community-heading-full">
              Your next doubles
              <br />
              partner is <span className="italic text-[#C41E2A]">already here</span>
            </span>
            <span className="community-heading-short">
              Your next partner is <span className="italic text-[#C41E2A]">already here</span>.
            </span>
          </h2>
          <p
            className="font-light leading-[1.8] mb-10 max-w-[420px]"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 300,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            Build your player profile. Discover others at your level nearby. Create groups, plan sessions, and never play alone again.
          </p>
          <div className="community-features flex flex-col gap-5" style={{ gap: '20px' }}>
            {FEATURES.map((feat, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className="community-feature-circle shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[#C41E2A]"
                  style={{
                    border: '1.5px solid #C41E2A',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <span
                    className="block font-medium text-white mb-0.5"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '14px',
                    }}
                  >
                    {feat.label}
                  </span>
                  <span
                    className="font-light"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '13px',
                      fontWeight: 300,
                      color: 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {feat.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — phone mockup */}
        <div className="community-mockup flex justify-center">
          <div
            className="community-phone relative overflow-hidden"
            style={{
              width: 280,
              height: 560,
              borderRadius: 40,
              background: 'linear-gradient(180deg, #222 0%, #1A1A1A 100%)',
              border: '3px solid #333',
              boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            {/* Notch */}
            <div
              className="community-phone-notch absolute left-1/2 -translate-x-1/2 top-0 w-[120px] h-7 bg-black z-[2]"
              style={{ borderRadius: '0 0 20px 20px' }}
              aria-hidden
            />
            {/* Screen content */}
            <div className="community-phone-screen pt-[50px] px-5 pb-5">
              <div
                className="community-phone-greeting font-medium text-white mb-1"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '16px',
                }}
              >
                Good evening
              </div>
              <div
                className="community-phone-subtitle mb-6"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                3 friends are playing today
              </div>
              {PLAYERS.map((player, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-3.5 px-4 mb-2 rounded-[14px]"
                  style={{
                    background: player.active ? 'rgba(196,30,42,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${player.active ? 'rgba(196,30,42,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <div className="relative shrink-0">
                    <div
                      className="community-phone-avatar w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{
                        background: 'linear-gradient(135deg, #C41E2A, #9B1620)',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '13px',
                      }}
                    >
                      {player.name[0]}
                    </div>
                    {player.active && (
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#222]"
                        style={{ background: '#34C759' }}
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="community-phone-name font-medium text-white truncate"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '13px',
                      }}
                    >
                      {player.name}
                    </div>
                    <div
                      className="community-phone-meta text-[11px] truncate"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        color: 'rgba(255,255,255,0.35)',
                      }}
                    >
                      {player.level}
                    </div>
                  </div>
                  <div
                    className="community-phone-time shrink-0 text-right font-medium text-[10px] tracking-[0.02em]"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      color: player.active ? '#C41E2A' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {player.time}
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="community-phone-btn w-full mt-4 py-3.5 px-4 rounded-[14px] font-medium text-white uppercase tracking-[0.06em] cursor-default"
                style={{
                  background: '#C41E2A',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                }}
              >
                Find Players Near You
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
