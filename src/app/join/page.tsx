"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

function JoinPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get("code");

    // If there's an invite code, try to redirect to the invite page
    useEffect(() => {
        if (code) {
            // Old pair code format — show migration message
        }
    }, [code]);

    return (
        <main className="min-h-screen flex flex-col" style={{ background: "var(--paper)", color: "var(--ink)" }}>
            <Navbar />

            <section className="flex-1 flex items-start justify-center px-4 py-8" style={{ marginTop: 60 }}>
                <div className="w-full max-w-md fade-in-up">
                    <div className="text-center mb-8">
                        <h1 style={{ fontFamily: "var(--bebas)", fontSize: "42px", letterSpacing: "0.02em", lineHeight: 1, marginBottom: "8px" }}>
                            Team System Updated
                        </h1>
                        <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: 1.6 }}>
                            We&apos;ve upgraded to a new self-organized team system!
                        </p>
                    </div>

                    <div className="glass-card p-8 text-center space-y-6">
                        <div style={{ width: 64, height: 64, border: "1.5px solid var(--ink)", display: "grid", placeItems: "center", margin: "0 auto" }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                                <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                            </svg>
                        </div>

                        <div>
                            <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: 1.7, maxWidth: "340px", margin: "0 auto" }}>
                                The old pair-code system has been replaced. Now you can <strong style={{ color: "var(--ink)" }}>create your own team</strong> or <strong style={{ color: "var(--ink)" }}>browse open teams</strong> to join.
                            </p>
                        </div>

                        {code && (
                            <div style={{ padding: "12px 16px", background: "var(--paper2)", border: "1px solid var(--line)", fontSize: "12px", color: "var(--muted)" }}>
                                Your old pair code <strong style={{ fontFamily: "monospace", color: "var(--ink)" }}>{code}</strong> is no longer valid in the new system.
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                            <Link href="/register" className="btn-primary" style={{ padding: "14px 28px" }}>
                                Register
                            </Link>
                            <Link href="/team/browse" className="btn-secondary" style={{ padding: "14px 28px" }}>
                                Browse Teams
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default function JoinPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div>}>
            <JoinPageContent />
        </Suspense>
    );
}
