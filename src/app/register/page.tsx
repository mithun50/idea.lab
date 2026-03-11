import Link from "next/link";
import RegistrationForm from "@/components/RegistrationForm";

/**
 * Registration Page
 * 
 * Students register as pairs from the same section.
 * Wraps the RegistrationForm component with page-level layout.
 */
export default function RegisterPage() {
    return (
        <main className="min-h-screen flex flex-col">
            {/* Navigation */}
            <nav className="w-full px-4 py-4 flex justify-between items-center max-w-5xl mx-auto">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-lg">
                        💡
                    </div>
                    <span className="font-bold text-lg tracking-tight">Idea Lab</span>
                </Link>
                <Link href="/status" className="btn-secondary text-sm !py-2 !px-4">
                    Check Status
                </Link>
            </nav>

            {/* Form Section */}
            <section className="flex-1 flex items-start justify-center px-4 py-8">
                <div className="w-full max-w-md fade-in-up">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2">Register Your Pair</h1>
                        <p className="text-slate-400">
                            Enter your details and your partner&apos;s USN. Both partners must
                            be from the <span className="text-violet-400 font-medium">same section</span>.
                        </p>
                    </div>

                    {/* Info Card */}
                    <div className="glass-card p-4 mb-6 flex items-start gap-3">
                        <div className="text-cyan-400 mt-0.5 shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="text-sm text-slate-300">
                            <p className="font-medium text-cyan-300 mb-1">How pairing works</p>
                            <p className="text-slate-400">
                                Both you and your partner must register and enter each other&apos;s USN.
                                Your pair will be confirmed automatically once both registrations are complete.
                            </p>
                        </div>
                    </div>

                    {/* Registration Form */}
                    <div className="glass-card p-6 md:p-8">
                        <RegistrationForm />
                    </div>
                </div>
            </section>
        </main>
    );
}
