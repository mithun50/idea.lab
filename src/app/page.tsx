"use client";

import Link from "next/link";
import { useState } from "react";
import { Lightbulb, Code, Users, Rocket, PencilLine, CheckCircle2, ChevronDown } from "lucide-react";

/**
 * Landing Page — Idea Lab
 * 
 * Hero section with branding, info about how pairing works,
 * and navigation links to register or check team status.
 */
export default function HomePage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const faqs = [
    {
      q: "How does pair registration work?",
      a: "You register with a partner from your same section. Both of you enter each other's USN. Once both registrations are complete, your pair is confirmed automatically.",
    },
    {
      q: "How are teams formed?",
      a: "Teams of 6 are formed by the admin. Each team combines 3 pairs from different branches to encourage cross-disciplinary collaboration.",
    },
    {
      q: "When will I see my team?",
      a: "Once the admin runs the matching algorithm, you can check your team using the Status page by entering your USN.",
    },
    {
      q: "What if my partner hasn't registered yet?",
      a: "Your status will show 'Waiting for partner confirmation.' Once your partner registers with your USN, both statuses update to 'Confirmed.'",
    },
    {
      q: "Can I change my partner after registering?",
      a: "Please contact the admin if you need to change your registration. The system prevents duplicate registrations.",
    },
  ];

  return (
    <main className="min-h-screen flex flex-col">
      {/* Floating background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className="absolute rounded-full blur-3xl opacity-20"
          style={{
            width: 400,
            height: 400,
            background: "radial-gradient(circle, #7c3aed, transparent)",
            top: "-10%",
            right: "-10%",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-15"
          style={{
            width: 500,
            height: 500,
            background: "radial-gradient(circle, #06b6d4, transparent)",
            bottom: "-15%",
            left: "-10%",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-10"
          style={{
            width: 300,
            height: 300,
            background: "radial-gradient(circle, #a78bfa, transparent)",
            top: "40%",
            left: "50%",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-5"
          style={{
            width: 600,
            height: 600,
            background: "radial-gradient(circle, #7c3aed, transparent)",
            top: "20%",
            left: "-10%",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="w-full px-4 py-4 flex justify-between items-center max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-violet-500/20">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight brand-font">Idea Lab</span>
        </div>
        <div className="flex gap-2">
          <Link href="/status" className="btn-secondary text-sm !py-2 !px-4">
            Check Status
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="fade-in-up max-w-2xl">
          {/* DBIT Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Don Bosco Institute of Technology
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
            <span className="gradient-text">Idea Lab</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-4 font-medium">
            Register. Pair Up. Innovate Together.
          </p>
          <p className="text-slate-400 mb-10 max-w-lg mx-auto leading-relaxed">
            Join 825+ first-year students in cross-branch teams of 6. Register
            with your partner, and let the system match you with students from
            other branches for an exciting collaborative experience.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/register"
              className="btn-primary text-lg !py-4 !px-8 pulse-glow"
            >
              <PencilLine className="w-5 h-5" />
              Register Now
            </Link>
            <Link href="/status" className="btn-secondary text-lg !py-4 !px-8">
              <Users className="w-5 h-5" />
              Check Team Status
            </Link>
          </div>

          {/* How It Works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: <PencilLine className="w-8 h-8 text-cyan-400" />,
                title: "1. Register",
                desc: "Enter your details and your partner's USN. Both must be from the same section.",
              },
              {
                icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />,
                title: "2. Pair Confirmed",
                desc: "When both partners register with each other's USN, the pair is automatically confirmed.",
              },
              {
                icon: <Rocket className="w-8 h-8 text-violet-400" />,
                title: "3. Team Formed",
                desc: "Admin matches confirmed pairs into cross-branch teams of 6 for maximum diversity.",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="glass-card p-6 text-left"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="text-3xl mb-3">{step.icon}</div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="w-full max-w-2xl fade-in-up" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-2xl font-bold mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="glass-card overflow-hidden">
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full text-left p-4 flex justify-between items-center gap-4 hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium text-sm">{faq.q}</span>
                  <ChevronDown
                    className={`shrink-0 transition-transform ${faqOpen === i ? "rotate-180 text-violet-400" : "text-slate-400"
                      }`}
                    size={20}
                  />
                </button>
                {faqOpen === i && (
                  <div className="px-4 pb-4 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 px-4 text-slate-500 text-sm border-t border-white/5">
        <p>© 2026 Idea Lab — Don Bosco Institute of Technology</p>
      </footer>
    </main>
  );
}
