import Link from "next/link";
import StatusLookup from "@/components/StatusLookup";

export default function StatusPage() {
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
                    <Link href="/" className="nav-link">Home</Link>
                    <Link href="/register" className="nav-btn">
                        Register
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </nav>

            {/* Lookup Section */}
            <section className="flex-1 flex items-start justify-center px-4 py-8" style={{ marginTop: 60 }}>
                <div className="w-full max-w-lg fade-in-up">
                    <div className="text-center mb-8">
                        <h1 style={{ fontFamily: "var(--bebas)", fontSize: "42px", letterSpacing: "0.02em", lineHeight: 1, marginBottom: "8px" }}>Check Your Status</h1>
                        <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: 1.6 }}>
                            Enter your USN to view your registration status, pair confirmation,
                            and team assignment.
                        </p>
                    </div>

                    <div className="glass-card p-6 md:p-8">
                        <StatusLookup />
                    </div>
                </div>
            </section>
        </main>
    );
}
