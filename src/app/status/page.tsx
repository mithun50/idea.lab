import Link from "next/link";
import StatusLookup from "@/components/StatusLookup";

/**
 * Status Page
 * 
 * Students can check their registration status and team assignment
 * by entering their USN.
 */
export default function StatusPage() {
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
                <Link href="/register" className="btn-primary text-sm !py-2 !px-4">
                    Register
                </Link>
            </nav>

            {/* Lookup Section */}
            <section className="flex-1 flex items-start justify-center px-4 py-8">
                <div className="w-full max-w-lg fade-in-up">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2">Check Your Status</h1>
                        <p className="text-slate-400">
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
