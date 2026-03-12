"use client";

import { useState } from "react";
import Link from "next/link";
import RegistrationForm from "@/components/RegistrationForm";
import JoinForm from "@/components/JoinForm";

export default function RegisterPage() {
    const [activeTab, setActiveTab] = useState<"new" | "join">("new");

    return (
        <main className="min-h-screen flex flex-col" style={{ background: "var(--paper)", color: "var(--ink)" }}>
            {/* Navigation */}
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
                    <Link href="/" className="nav-link">Home</Link>
                </div>
            </nav>

            {/* Form Section */}
            <section className="flex-1 flex items-start justify-center px-4 py-8" style={{ marginTop: 60 }}>
                <div className="w-full max-w-md fade-in-up">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2 brand-font" style={{ fontFamily: "var(--bebas)", fontSize: "42px", letterSpacing: "0.02em" }}>Team Up</h1>
                        <p style={{ color: "var(--muted)", fontSize: "14px" }}>Create a new pair or join your friend using their invite code.</p>
                    </div>

                    {/* Tab Toggle */}
                    <div className="flex mb-6" style={{ border: "1.5px solid var(--ink)" }}>
                        <button
                            className="flex-1 py-3 text-sm font-bold transition-all"
                            style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                background: activeTab === "new" ? "var(--ink)" : "transparent",
                                color: activeTab === "new" ? "var(--paper)" : "var(--muted)",
                                cursor: "pointer",
                                border: "none",
                                borderRight: "1px solid var(--ink)",
                            }}
                            onClick={() => setActiveTab("new")}
                        >
                            New Registration
                        </button>
                        <button
                            className="flex-1 py-3 text-sm font-bold transition-all"
                            style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                background: activeTab === "join" ? "var(--ink)" : "transparent",
                                color: activeTab === "join" ? "var(--paper)" : "var(--muted)",
                                cursor: "pointer",
                                border: "none",
                            }}
                            onClick={() => setActiveTab("join")}
                        >
                            Join a Team
                        </button>
                    </div>

                    {/* Info Card */}
                    {activeTab === "new" && (
                        <div className="glass-card p-4 mb-6 flex items-start gap-3 fade-in-up">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <div style={{ fontSize: "13px" }}>
                                <p style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>How pairing works</p>
                                <p style={{ color: "var(--muted)" }}>
                                    Registering will generate a Pair Code. Share this code with your partner from the <strong style={{ color: "var(--ink)" }}>same section</strong>, and they can use it to join you.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Form Component Container */}
                    <div className="glass-card p-6 md:p-8">
                        {activeTab === "new" ? <RegistrationForm /> : <JoinForm />}
                    </div>

                </div>
            </section>
        </main>
    );
}
