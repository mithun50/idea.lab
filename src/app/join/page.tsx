"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import JoinForm from "@/components/JoinForm";
import { Suspense } from "react";

function JoinPageContent() {
    const searchParams = useSearchParams();
    const codeFromUrl = searchParams.get("code");

    return (
        <main className="min-h-screen flex flex-col" style={{ background: "var(--paper)", color: "var(--ink)" }}>
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

            <section className="flex-1 flex items-start justify-center px-4 py-8" style={{ marginTop: 60 }}>
                <div className="w-full max-w-md fade-in-up">
                    <div className="text-center mb-8">
                        <h1 style={{ fontFamily: "var(--bebas)", fontSize: "42px", letterSpacing: "0.02em", lineHeight: 1, marginBottom: "8px" }}>Team Invitation</h1>
                        {codeFromUrl ? (
                            <p style={{ color: "var(--muted)", fontSize: "14px" }}>You&apos;ve been invited! Enter the code below to join.</p>
                        ) : (
                            <p style={{ color: "var(--muted)", fontSize: "14px" }}>Join your friend&apos;s team using their invite code.</p>
                        )}
                    </div>

                    {codeFromUrl && (
                        <div className="glass-card p-4 mb-6 flex items-start gap-3 fade-in-up">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <div style={{ fontSize: "13px", width: "100%", textAlign: "center" }}>
                                <p style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>Your Invite Code</p>
                                <div style={{
                                    fontFamily: "monospace",
                                    fontSize: "28px",
                                    fontWeight: 800,
                                    letterSpacing: "0.2em",
                                    color: "var(--ink)",
                                    background: "var(--paper2)",
                                    border: "1.5px solid var(--ink)",
                                    padding: "12px",
                                    marginTop: "8px",
                                }}>
                                    {codeFromUrl}
                                </div>
                                <p style={{ color: "var(--muted)", fontSize: "11px", marginTop: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Copy and paste this into the box below</p>
                            </div>
                        </div>
                    )}

                    <div className="glass-card p-6 md:p-8">
                        <JoinForm />
                    </div>
                </div>
            </section>
        </main>
    );
}

export default function JoinPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner"></div></div>}>
            <JoinPageContent />
        </Suspense>
    );
}
