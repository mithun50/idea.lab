"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  // Scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // FAQ toggle
  function toggleFaq(e: React.MouseEvent<HTMLButtonElement>) {
    const item = (e.currentTarget as HTMLElement).closest(".faq-item");
    if (!item) return;
    const isOpen = item.classList.contains("open");
    document.querySelectorAll(".faq-item.open").forEach((el) => el.classList.remove("open"));
    if (!isOpen) item.classList.add("open");
  }

  return (
    <>
      {/* NAV */}
      <nav>
        <Link href="/" className="nav-logo">
          <div className="logo-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F2EFE9" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
            </svg>
          </div>
          Idea Lab
        </Link>
        <div className="nav-right">
          <Link href="/status" className="nav-link">Check Status</Link>
          <Link href="/register" className="nav-btn">
            Register
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </nav>

      {/* TICKER */}
      <div className="ticker">
        <div className="ticker-inner">
          {[...Array(2)].map((_, i) => (
            <span key={i} style={{ display: "contents" }}>
              {["Registration Open", "825+ Students Enrolled", "Cross-Branch Teams of 6", "Don Bosco Institute of Technology", "2026 Cohort", "Register with Your Partner"].map((text) => (
                <span key={text + i} className="ticker-item">
                  <span className="ticker-dot" />
                  {text}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--red)" stroke="none"><circle cx="12" cy="12" r="5" /></svg>
            Open Now — 2026 Cohort
            <div className="eyebrow-line" />
          </div>

          <h1 className="hero-h1">
            <span>Register.</span>
            <span className="stroke-text">Pair Up.</span>
            <span>Innovate.</span>
          </h1>

          <div className="hero-bottom">
            <p className="hero-desc">
              Join <strong>825+ first-year students</strong> in cross-branch teams of 6.
              Register with your partner — the system matches you with students from other branches.
            </p>
            <div className="hero-cta-group">
              <Link href="/register" className="btn-large">
                Register Now
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link href="/status" className="btn-outline">
                Check Status
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="stat-block">
            <div className="stat-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Students
            </div>
            <div className="stat-number">825<span style={{ color: "var(--red)" }}>+</span></div>
            <div className="stat-sub">First-year students across all branches registered</div>
          </div>

          <div className="stat-block">
            <div className="stat-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              Team Size
            </div>
            <div className="stat-number accent">6</div>
            <div className="stat-sub">Students per team across different branches</div>
          </div>

          <div className="stat-block">
            <div className="stat-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Steps to Join
            </div>
            <div className="stat-number">3</div>
            <div className="stat-sub">Simple steps from registration to team formation</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="steps-section reveal">
        <div className="steps-header">
          <div className="steps-header-label">
            <div className="section-tag">Process</div>
            <div className="section-num">01</div>
          </div>
          <div className="steps-header-title">How It Works</div>
        </div>

        <div className="steps-grid">
          <div className="step">
            <div className="step-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div className="step-index">— 01</div>
            <div className="step-name">Register</div>
            <div className="step-desc">Fill out your details and enter your partner&apos;s USN. Both of you must be from the same section. The form takes under two minutes.</div>
            <div className="step-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              &lt; 2 min
            </div>
          </div>

          <div className="step">
            <div className="step-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="step-index">— 02</div>
            <div className="step-name">Pair Confirmed</div>
            <div className="step-desc">When both partners register with each other&apos;s USN, the pair is automatically confirmed — no admin approval or extra steps required.</div>
            <div className="step-tag" style={{ borderColor: "rgba(232,52,26,0.3)", color: "var(--red)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Automatic
            </div>
          </div>

          <div className="step">
            <div className="step-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="step-index">— 03</div>
            <div className="step-name">Team Formed</div>
            <div className="step-desc">Admin matches confirmed pairs into cross-branch teams of 6, ensuring maximum diversity and a rich collaborative experience.</div>
            <div className="step-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Admin matched
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section reveal">
        <div className="faq-layout">
          <div className="faq-sidebar">
            <div className="section-tag">FAQs</div>
            <div className="faq-sidebar-title">Common Questions</div>
            <div className="section-num">02</div>
          </div>
          <div className="faq-list">
            {[
              { q: "How does pair registration work?", a: "You and your partner both register individually, entering each other's USN. Once both registrations are complete with matching USNs, your pair is automatically confirmed — no manual step needed from either of you." },
              { q: "How are teams formed?", a: "Once enough pairs are confirmed, the admin matches three confirmed pairs from different branches into one team of 6. The goal is cross-branch diversity to encourage creative, multi-disciplinary collaboration." },
              { q: "When will I see my team?", a: "Team assignments happen after the registration window closes and all pairs are confirmed. Check the Status page at any time using your USN to see your current pairing and team status." },
              { q: "What if my partner hasn't registered yet?", a: "Go ahead and register with their USN. Your status will show 'pending' until your partner completes their own registration. As soon as they do and reference your USN, the pair is instantly confirmed." },
              { q: "Can I change my partner after registering?", a: "Partner changes depend on whether your pair has already been confirmed and whether a team has been assigned. Reach out to your coordinator through the admin portal for assistance." },
            ].map(({ q, a }) => (
              <div className="faq-item" key={q}>
                <button className="faq-q" onClick={toggleFaq}>
                  {q}
                  <div className="faq-icon-wrap">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                </button>
                <div className="faq-a">
                  <div className="faq-a-inner">{a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section reveal">
        <div className="cta-left">
          <div className="cta-overline">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--red)"><circle cx="12" cy="12" r="10" /></svg>
            Limited Spots Available
          </div>
          <h2 className="cta-title">Ready to build<br />something great?</h2>
          <p className="cta-sub">Registration takes under 2 minutes. Join 825+ students already signed up.</p>
        </div>
        <div className="cta-right">
          <Link href="/register" className="btn-large">
            Register Now
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/status" className="btn-outline">
            Check Status
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <span className="footer-brand">© 2026 Idea Lab — Don Bosco Institute of Technology</span>
        <div className="footer-links">
          <Link href="/register">Register</Link>
          <Link href="/status">Status</Link>
        </div>
      </footer>
    </>
  );
}
