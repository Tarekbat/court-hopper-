import { useState, useEffect, useRef } from "react";

const BRAND = {
  red: "#C41E2A",
  redDark: "#9B1620",
  redLight: "#E8434E",
  cream: "#F5F0EB",
  creamDark: "#E8E0D8",
  charcoal: "#1A1A1A",
  warmGray: "#8A8279",
  white: "#FFFFFF",
};

// Inline keyframes via style tag
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(40px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(60px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes lineGrow {
      from { width: 0; }
      to { width: 60px; }
    }
    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(196, 30, 42, 0.2); }
      50% { box-shadow: 0 0 0 12px rgba(196, 30, 42, 0); }
    }

    .anim-fade-up { animation: fadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards; opacity: 0; }
    .anim-fade-in { animation: fadeIn 0.8s ease forwards; opacity: 0; }
    .anim-slide-right { animation: slideInRight 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; opacity: 0; }
    .anim-scale-in { animation: scaleIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; opacity: 0; }

    .delay-1 { animation-delay: 0.1s; }
    .delay-2 { animation-delay: 0.25s; }
    .delay-3 { animation-delay: 0.4s; }
    .delay-4 { animation-delay: 0.55s; }
    .delay-5 { animation-delay: 0.7s; }
    .delay-6 { animation-delay: 0.85s; }
    .delay-7 { animation-delay: 1.0s; }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: ${BRAND.cream}; }
    ::-webkit-scrollbar-thumb { background: ${BRAND.creamDark}; border-radius: 3px; }

    /* Selection */
    ::selection { background: ${BRAND.red}; color: ${BRAND.white}; }
  `}</style>
);

// ─── NAV ────────────────────────────────────────────
const Nav = ({ scrolled }) => (
  <nav style={{
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    padding: scrolled ? "14px 40px" : "22px 40px",
    background: scrolled ? "rgba(245,240,235,0.92)" : "transparent",
    backdropFilter: scrolled ? "blur(20px)" : "none",
    borderBottom: scrolled ? `1px solid ${BRAND.creamDark}` : "1px solid transparent",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
  }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
      <span style={{
        fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600,
        color: BRAND.red, letterSpacing: "-0.02em",
      }}>SETRA</span>
      <span style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 400,
        color: BRAND.warmGray, letterSpacing: "0.2em", textTransform: "uppercase",
      }}>Access, Curated</span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
      {["Discover", "Courts", "Community", "For Business"].map((item) => (
        <span key={item} style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 400,
          color: BRAND.charcoal, letterSpacing: "0.04em", cursor: "pointer",
          transition: "color 0.2s",
        }}
          onMouseEnter={e => e.target.style.color = BRAND.red}
          onMouseLeave={e => e.target.style.color = BRAND.charcoal}
        >{item}</span>
      ))}
      <div style={{
        width: 1, height: 20, background: BRAND.creamDark, margin: "0 4px",
      }} />
      <span style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
        color: BRAND.charcoal, cursor: "pointer",
      }}>Sign In</span>
      <button style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
        color: BRAND.white, background: BRAND.red, border: "none",
        padding: "10px 24px", borderRadius: 100, cursor: "pointer",
        letterSpacing: "0.06em", textTransform: "uppercase",
        transition: "all 0.3s ease",
      }}
        onMouseEnter={e => { e.target.style.background = BRAND.redDark; e.target.style.transform = "scale(1.03)"; }}
        onMouseLeave={e => { e.target.style.background = BRAND.red; e.target.style.transform = "scale(1)"; }}
      >Get Started</button>
    </div>
  </nav>
);

// ─── HERO ───────────────────────────────────────────
const Hero = () => (
  <section style={{
    minHeight: "100vh", background: BRAND.cream, position: "relative",
    display: "flex", flexDirection: "column", justifyContent: "center",
    padding: "120px 60px 80px",
    overflow: "hidden",
  }}>
    {/* Subtle grid pattern */}
    <div style={{
      position: "absolute", inset: 0, opacity: 0.03,
      backgroundImage: `linear-gradient(${BRAND.charcoal} 1px, transparent 1px), linear-gradient(90deg, ${BRAND.charcoal} 1px, transparent 1px)`,
      backgroundSize: "80px 80px",
    }} />

    {/* Large decorative letter */}
    <div className="anim-fade-in delay-1" style={{
      position: "absolute", right: -40, top: "50%", transform: "translateY(-50%)",
      fontFamily: "'Playfair Display', serif", fontSize: "min(50vw, 600px)",
      fontWeight: 700, fontStyle: "italic", color: BRAND.red, opacity: 0.04,
      lineHeight: 0.8, pointerEvents: "none", userSelect: "none",
    }}>S</div>

    <div style={{ position: "relative", zIndex: 2, maxWidth: 900 }}>
      <div className="anim-fade-up delay-1" style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        background: "rgba(196,30,42,0.06)", borderRadius: 100,
        padding: "8px 18px 8px 12px", marginBottom: 40,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", background: BRAND.red,
          animation: "pulseGlow 2s ease infinite",
        }} />
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
          color: BRAND.red, letterSpacing: "0.1em", textTransform: "uppercase",
        }}>Now Live in Seattle</span>
      </div>

      <h1 className="anim-fade-up delay-2" style={{
        fontFamily: "'Playfair Display', serif", fontSize: "clamp(48px, 7vw, 88px)",
        fontWeight: 500, color: BRAND.charcoal, lineHeight: 1.05,
        letterSpacing: "-0.03em", marginBottom: 28,
      }}>
        Your city's best<br />
        courts, <span style={{ color: BRAND.red, fontStyle: "italic" }}>one tap</span><br />
        away
      </h1>

      <p className="anim-fade-up delay-3" style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 300,
        color: BRAND.warmGray, lineHeight: 1.7, maxWidth: 480, marginBottom: 48,
      }}>
        Discover premium tennis courts. Book instantly. Connect with players
        who match your level. The game starts here.
      </p>

      <div className="anim-fade-up delay-4" style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <button style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
          color: BRAND.white, background: BRAND.red, border: "none",
          padding: "16px 40px", borderRadius: 100, cursor: "pointer",
          letterSpacing: "0.08em", textTransform: "uppercase",
          transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
          position: "relative", overflow: "hidden",
        }}
          onMouseEnter={e => { e.target.style.background = BRAND.redDark; e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 30px rgba(196,30,42,0.3)"; }}
          onMouseLeave={e => { e.target.style.background = BRAND.red; e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "none"; }}
        >Find a Court</button>

        <button style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
          color: BRAND.charcoal, background: "transparent",
          border: `1.5px solid ${BRAND.creamDark}`,
          padding: "15px 36px", borderRadius: 100, cursor: "pointer",
          letterSpacing: "0.08em", textTransform: "uppercase",
          transition: "all 0.3s ease",
        }}
          onMouseEnter={e => { e.target.style.borderColor = BRAND.red; e.target.style.color = BRAND.red; }}
          onMouseLeave={e => { e.target.style.borderColor = BRAND.creamDark; e.target.style.color = BRAND.charcoal; }}
        >How It Works</button>
      </div>

      {/* Social proof */}
      <div className="anim-fade-up delay-5" style={{
        marginTop: 64, display: "flex", alignItems: "center", gap: 20,
      }}>
        <div style={{ display: "flex" }}>
          {["#E8434E", "#C41E2A", "#9B1620", "#6B3A3E"].map((c, i) => (
            <div key={i} style={{
              width: 36, height: 36, borderRadius: "50%", background: c,
              border: `2.5px solid ${BRAND.cream}`, marginLeft: i ? -10 : 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
              color: BRAND.white,
            }}>
              {["A", "M", "J", "K"][i]}
            </div>
          ))}
        </div>
        <div>
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
            color: BRAND.charcoal,
          }}>2,400+ players</span>
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
            color: BRAND.warmGray, marginLeft: 6,
          }}>already on SETRA</span>
        </div>
      </div>
    </div>
  </section>
);

// ─── MARQUEE STRIP ──────────────────────────────────
const MarqueeStrip = () => {
  const items = ["TENNIS", "PICKLEBALL", "PADEL", "BASKETBALL", "YOGA", "CLIMBING", "BOXING", "SWIMMING"];
  return (
    <div style={{
      background: BRAND.red, padding: "14px 0", overflow: "hidden",
      position: "relative",
    }}>
      <div style={{
        display: "flex", gap: 60, animation: "marquee 20s linear infinite",
        whiteSpace: "nowrap", width: "fit-content",
      }}>
        {[...items, ...items].map((item, i) => (
          <span key={i} style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
            color: "rgba(255,255,255,0.9)", letterSpacing: "0.2em",
            display: "flex", alignItems: "center", gap: 60,
          }}>
            {item}
            <span style={{ color: "rgba(255,255,255,0.3)" }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── COURT CARD ─────────────────────────────────────
const CourtCard = ({ name, location, rating, slots, image, delay }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`anim-fade-up delay-${delay}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "1 1 300px", maxWidth: 400, cursor: "pointer",
        transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        transform: hovered ? "translateY(-8px)" : "translateY(0)",
      }}
    >
      {/* Image */}
      <div style={{
        height: 280, borderRadius: 16, overflow: "hidden", position: "relative",
        marginBottom: 18,
      }}>
        <div style={{
          width: "100%", height: "100%",
          background: `linear-gradient(135deg, ${image[0]}, ${image[1]})`,
          transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          transform: hovered ? "scale(1.06)" : "scale(1)",
        }}>
          {/* Simulated court pattern */}
          <div style={{
            position: "absolute", inset: "15%",
            border: "2px solid rgba(255,255,255,0.15)",
            borderRadius: 4,
          }}>
            <div style={{
              position: "absolute", left: "50%", top: 0, bottom: 0,
              width: 2, background: "rgba(255,255,255,0.1)",
            }} />
            <div style={{
              position: "absolute", top: "50%", left: 0, right: 0,
              height: 2, background: "rgba(255,255,255,0.1)",
            }} />
          </div>
        </div>
        {/* Badge */}
        <div style={{
          position: "absolute", top: 16, left: 16,
          background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)",
          borderRadius: 100, padding: "6px 14px",
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
          color: BRAND.charcoal, display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ color: "#F5A623" }}>★</span> {rating}
        </div>
        {/* Available slots */}
        <div style={{
          position: "absolute", bottom: 16, right: 16,
          background: "rgba(26,26,26,0.8)", backdropFilter: "blur(10px)",
          borderRadius: 100, padding: "6px 14px",
          fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
          color: BRAND.white, letterSpacing: "0.04em",
        }}>
          {slots} slots today
        </div>
      </div>
      {/* Info */}
      <h3 style={{
        fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 500,
        color: BRAND.charcoal, marginBottom: 4,
      }}>{name}</h3>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 400,
        color: BRAND.warmGray, letterSpacing: "0.02em",
      }}>{location}</p>
    </div>
  );
};

// ─── FEATURED COURTS SECTION ────────────────────────
const FeaturedCourts = () => (
  <section style={{
    padding: "100px 60px", background: BRAND.white,
  }}>
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-end",
      marginBottom: 56,
    }}>
      <div>
        <span className="anim-fade-up" style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
          color: BRAND.red, letterSpacing: "0.2em", textTransform: "uppercase",
          display: "block", marginBottom: 14,
        }}>Featured</span>
        <h2 className="anim-fade-up delay-1" style={{
          fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4vw, 48px)",
          fontWeight: 500, color: BRAND.charcoal, lineHeight: 1.1,
        }}>
          Curated for <span style={{ fontStyle: "italic", color: BRAND.red }}>you</span>
        </h2>
      </div>
      <span className="anim-fade-up delay-2" style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
        color: BRAND.red, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
        letterSpacing: "0.06em", textTransform: "uppercase",
        transition: "gap 0.3s ease",
      }}
        onMouseEnter={e => e.target.style.gap = "14px"}
        onMouseLeave={e => e.target.style.gap = "8px"}
      >
        View all courts →
      </span>
    </div>

    <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
      <CourtCard name="Riverside Tennis Club" location="Capitol Hill, Seattle" rating="4.9" slots="12" image={["#2D5016", "#4A7A28"]} delay={3} />
      <CourtCard name="Green Lake Courts" location="Green Lake, Seattle" rating="4.7" slots="8" image={["#1A3A4A", "#2A6070"]} delay={4} />
      <CourtCard name="Volunteer Park" location="First Hill, Seattle" rating="4.8" slots="5" image={["#4A3520", "#7A5A38"]} delay={5} />
    </div>
  </section>
);

// ─── HOW IT WORKS ───────────────────────────────────
const HowItWorks = () => {
  const steps = [
    { num: "01", title: "Discover", desc: "Browse courts by location, availability, and rating. See real-time slot openings across the city." },
    { num: "02", title: "Book", desc: "Reserve your court in seconds. No calls, no waiting. Instant confirmation." },
    { num: "03", title: "Connect", desc: "Find players at your level. Create groups. Plan sessions together." },
    { num: "04", title: "Play", desc: "Show up and play. Rate your experience. Build your player profile." },
  ];

  return (
    <section style={{
      padding: "100px 60px", background: BRAND.cream, position: "relative",
    }}>
      {/* Decorative line */}
      <div style={{
        position: "absolute", top: 0, left: 60, right: 60,
        height: 1, background: BRAND.creamDark,
      }} />

      <div style={{ marginBottom: 64 }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
          color: BRAND.red, letterSpacing: "0.2em", textTransform: "uppercase",
          display: "block", marginBottom: 14,
        }}>The Experience</span>
        <h2 style={{
          fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4vw, 48px)",
          fontWeight: 500, color: BRAND.charcoal, lineHeight: 1.1,
        }}>
          Effortless by <span style={{ fontStyle: "italic", color: BRAND.red }}>design</span>
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 40 }}>
        {steps.map((step, i) => (
          <div key={i} style={{
            padding: "36px 0", borderTop: `1px solid ${BRAND.creamDark}`,
            position: "relative",
          }}>
            <span style={{
              fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 400,
              color: BRAND.red, opacity: 0.15, position: "absolute", top: 24, right: 0,
            }}>{step.num}</span>
            <h3 style={{
              fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 500,
              color: BRAND.charcoal, marginBottom: 12,
            }}>{step.title}</h3>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
              color: BRAND.warmGray, lineHeight: 1.7,
            }}>{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

// ─── COMMUNITY / SOCIAL SECTION ─────────────────────
const CommunitySection = () => (
  <section style={{
    padding: "100px 60px", background: BRAND.charcoal, position: "relative",
    overflow: "hidden",
  }}>
    {/* Red glow */}
    <div style={{
      position: "absolute", top: "-30%", right: "-10%",
      width: 500, height: 500, borderRadius: "50%",
      background: `radial-gradient(circle, rgba(196,30,42,0.15), transparent 70%)`,
      pointerEvents: "none",
    }} />

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
      <div>
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
          color: BRAND.red, letterSpacing: "0.2em", textTransform: "uppercase",
          display: "block", marginBottom: 14,
        }}>Community</span>
        <h2 style={{
          fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4vw, 48px)",
          fontWeight: 500, color: BRAND.white, lineHeight: 1.1, marginBottom: 24,
        }}>
          Your next doubles<br />
          partner is <span style={{ fontStyle: "italic", color: BRAND.red }}>already here</span>
        </h2>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 300,
          color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: 40,
          maxWidth: 420,
        }}>
          Build your player profile. Discover others at your level nearby.
          Create groups, plan sessions, and never play alone again.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            { label: "Player Discovery", desc: "Matched by skill, location & schedule" },
            { label: "Group Sessions", desc: "Plan together, book together, play together" },
            { label: "Activity Feed", desc: "See who's playing where, right now" },
          ].map((feat, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 16,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                border: `1.5px solid ${BRAND.red}`, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                color: BRAND.red, marginTop: 2,
              }}>{i + 1}</div>
              <div>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
                  color: BRAND.white, display: "block", marginBottom: 2,
                }}>{feat.label}</span>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                  color: "rgba(255,255,255,0.4)",
                }}>{feat.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phone mockup */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{
          width: 280, height: 560, borderRadius: 40,
          background: `linear-gradient(180deg, #222 0%, #1A1A1A 100%)`,
          border: "3px solid #333", position: "relative",
          boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
          overflow: "hidden",
        }}>
          {/* Notch */}
          <div style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: 120, height: 28, background: "#000", borderRadius: "0 0 20px 20px",
            zIndex: 2,
          }} />
          {/* Screen content */}
          <div style={{ padding: "50px 20px 20px" }}>
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 500,
              color: BRAND.white, marginBottom: 4,
            }}>Good evening</div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 12,
              color: "rgba(255,255,255,0.4)", marginBottom: 24,
            }}>3 friends are playing today</div>

            {/* Mini player cards */}
            {[
              { name: "Alex M.", level: "4.0 NTRP", time: "6pm · Green Lake", active: true },
              { name: "Jordan K.", level: "3.5 NTRP", time: "7pm · Volunteer Park", active: true },
              { name: "Sam R.", level: "4.5 NTRP", time: "Tomorrow · Riverside", active: false },
            ].map((player, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 16px", marginBottom: 8,
                background: player.active ? "rgba(196,30,42,0.08)" : "rgba(255,255,255,0.03)",
                borderRadius: 14, border: `1px solid ${player.active ? "rgba(196,30,42,0.2)" : "rgba(255,255,255,0.06)"}`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${BRAND.red}, ${BRAND.redDark})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                  color: BRAND.white, position: "relative",
                }}>
                  {player.name[0]}
                  {player.active && <div style={{
                    position: "absolute", bottom: -1, right: -1,
                    width: 10, height: 10, borderRadius: "50%",
                    background: "#34C759", border: "2px solid #222",
                  }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                    color: BRAND.white,
                  }}>{player.name}</div>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                    color: "rgba(255,255,255,0.35)",
                  }}>{player.level}</div>
                </div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500,
                  color: player.active ? BRAND.red : "rgba(255,255,255,0.3)",
                  letterSpacing: "0.02em",
                }}>{player.time}</div>
              </div>
            ))}

            {/* Quick action */}
            <button style={{
              width: "100%", marginTop: 16, padding: "14px",
              background: BRAND.red, border: "none", borderRadius: 14,
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
              color: BRAND.white, letterSpacing: "0.06em", textTransform: "uppercase",
              cursor: "pointer",
            }}>Find Players Near You</button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ─── FOR BUSINESS TEASER ────────────────────────────
const BusinessTeaser = () => (
  <section style={{
    padding: "100px 60px", background: BRAND.white,
    borderTop: `1px solid ${BRAND.creamDark}`,
  }}>
    <div style={{
      maxWidth: 700, margin: "0 auto", textAlign: "center",
    }}>
      <span style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
        color: BRAND.red, letterSpacing: "0.2em", textTransform: "uppercase",
        display: "block", marginBottom: 14,
      }}>For Business</span>
      <h2 style={{
        fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4vw, 48px)",
        fontWeight: 500, color: BRAND.charcoal, lineHeight: 1.15, marginBottom: 20,
      }}>
        A partnership that <span style={{ fontStyle: "italic", color: BRAND.red }}>actually works</span>
      </h2>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 300,
        color: BRAND.warmGray, lineHeight: 1.8, marginBottom: 48,
        maxWidth: 520, margin: "0 auto 48px",
      }}>
        Fair revenue sharing designed for long-term relationships.
        Fill empty courts, grow your community, keep more of what you earn.
      </p>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32,
        marginBottom: 48,
      }}>
        {[
          { metric: "85%", label: "Revenue to you" },
          { metric: "3x", label: "More bookings" },
          { metric: "0", label: "Hidden fees" },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 600,
              color: BRAND.red, marginBottom: 8,
            }}>{stat.metric}</div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 400,
              color: BRAND.warmGray, letterSpacing: "0.04em",
            }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <button style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
        color: BRAND.red, background: "transparent",
        border: `1.5px solid ${BRAND.red}`,
        padding: "14px 36px", borderRadius: 100, cursor: "pointer",
        letterSpacing: "0.08em", textTransform: "uppercase",
        transition: "all 0.3s ease",
      }}
        onMouseEnter={e => { e.target.style.background = BRAND.red; e.target.style.color = BRAND.white; }}
        onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = BRAND.red; }}
      >Partner With Us</button>
    </div>
  </section>
);

// ─── FOOTER ─────────────────────────────────────────
const Footer = () => (
  <footer style={{
    padding: "60px 60px 40px", background: BRAND.charcoal,
  }}>
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      marginBottom: 60,
    }}>
      <div>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 600,
          color: BRAND.red, marginBottom: 8,
        }}>SETRA</div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 12,
          color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase",
        }}>Access, Curated</div>
      </div>

      <div style={{ display: "flex", gap: 64 }}>
        {[
          { title: "Product", links: ["Courts", "Community", "Pricing", "Mobile App"] },
          { title: "Business", links: ["Partner", "Revenue Model", "Dashboard", "API"] },
          { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
        ].map((col) => (
          <div key={col.title}>
            <div style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
              color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em",
              textTransform: "uppercase", marginBottom: 18,
            }}>{col.title}</div>
            {col.links.map((link) => (
              <div key={link} style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
                color: "rgba(255,255,255,0.6)", marginBottom: 12,
                cursor: "pointer", transition: "color 0.2s",
              }}
                onMouseEnter={e => e.target.style.color = BRAND.white}
                onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.6)"}
              >{link}</div>
            ))}
          </div>
        ))}
      </div>
    </div>

    <div style={{
      borderTop: "1px solid rgba(255,255,255,0.08)",
      paddingTop: 28, display: "flex", justifyContent: "space-between",
    }}>
      <span style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12,
        color: "rgba(255,255,255,0.25)",
      }}>© 2026 SETRA. All rights reserved.</span>
      <span style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12,
        color: "rgba(255,255,255,0.25)",
      }}>Seattle, WA</span>
    </div>
  </footer>
);

// ─── MAIN APP ───────────────────────────────────────
export default function SetraLanding() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: BRAND.cream }}>
      <GlobalStyles />
      <Nav scrolled={scrolled} />
      <Hero />
      <MarqueeStrip />
      <FeaturedCourts />
      <HowItWorks />
      <CommunitySection />
      <BusinessTeaser />
      <Footer />
    </div>
  );
}
