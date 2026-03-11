"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import JoinForm from "@/components/JoinForm";
import { Lightbulb, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Suspense } from "react";

function JoinPageContent() {
    const searchParams = useSearchParams();
    const codeFromUrl = searchParams.get("code");
    
    // We just need to give the user context that they are joining from an invite, 
    // JoinForm expects user to type code if not provided, but we are just using the standard JoinForm
    // For simplicity, we can let user see the code from the URL and copy it, 
    // or if you want it injected, we'd need to modify JoinForm. 
    // Since we created JoinForm already as a standalone module, we will just display the code 
    // and they can paste it in, or we can instruct them to "Enter your code below"

    return (
        <main className="min-h-screen flex flex-col">
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

            <section className="flex-1 flex items-start justify-center px-4 py-8">
                <div className="w-full max-w-md fade-in-up">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2 brand-font">Idea Lab Team Invitation</h1>
                        {codeFromUrl ? (
                            <p className="text-slate-400 text-sm">You've been invited! Enter the code below to join.</p>
                        ) : (
                            <p className="text-slate-400 text-sm">Join your friend's team using their invite code.</p>
                        )}
                    </div>

                    {codeFromUrl && (
                        <div className="glass-card p-4 mb-6 flex items-start gap-3 fade-in-up border-cyan-500/30">
                            <Info className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
                            <div className="text-sm text-slate-300 w-full text-center">
                                <p className="font-medium text-cyan-300 mb-1">Your Invite Code</p>
                                <div className="text-2xl font-mono font-bold tracking-widest text-white bg-black/30 py-2 rounded-lg mt-2">
                                    {codeFromUrl}
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Copy and paste this into the box below</p>
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
