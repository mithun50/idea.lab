"use client";

import { useState } from "react";
import Link from "next/link";
import RegistrationForm from "@/components/RegistrationForm";
import JoinForm from "@/components/JoinForm";
import { Lightbulb, Info } from "lucide-react";

export default function RegisterPage() {
    const [activeTab, setActiveTab] = useState<"new" | "join">("new");

    return (
        <main className="min-h-screen flex flex-col">
            {/* Navigation */}
            <nav className="w-full px-4 py-4 flex justify-between items-center max-w-5xl mx-auto">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-violet-500/20">
                        <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight brand-font">Idea Lab</span>
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
                        <h1 className="text-3xl font-bold mb-2 brand-font">Team Up</h1>
                        <p className="text-slate-400 text-sm">Create a new pair or join your friend using their invite code.</p>
                    </div>

                    {/* Tab Toggle */}
                    <div className="flex bg-white/5 p-1 rounded-xl mb-6">
                        <button 
                            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === "new" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-slate-400 hover:text-white"}`}
                            onClick={() => setActiveTab("new")}
                        >
                            New Registration
                        </button>
                        <button 
                            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === "join" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-slate-400 hover:text-white"}`}
                            onClick={() => setActiveTab("join")}
                        >
                            Join a Team
                        </button>
                    </div>

                    {/* Info Card */}
                    {activeTab === "new" && (
                        <div className="glass-card p-4 mb-6 flex items-start gap-3 fade-in-up">
                            <Info className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
                            <div className="text-sm text-slate-300">
                                <p className="font-medium text-cyan-300 mb-1">How pairing works</p>
                                <p className="text-slate-400">
                                    Registering will generate a Pair Code. Share this code with your partner from the <strong className="text-violet-300 font-semibold">same section</strong>, and they can use it to join you.
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
