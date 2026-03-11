"use client";

import { useState, useCallback, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp, limit } from "firebase/firestore";
import { validateUSN, getBranchName, getSection } from "@/lib/usnValidator";
import { CheckCircle2, UserPlus, Lock } from "lucide-react";

export default function JoinForm() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [pairCode, setPairCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Registration data found from pair code
    const [partnerData, setPartnerData] = useState<{
        name: string;
        usn: string;
        partnerUSN: string;
    } | null>(null);

    // Form data for step 2
    const [formData, setFormData] = useState({
        name: "",
        usn: "",
        phone: ""
    });

    const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const q = query(collection(db, "config"), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    setRegistrationOpen(snap.docs[0].data().registrationsOpen ?? true);
                } else {
                    setRegistrationOpen(true);
                }
            } catch (error) {
                console.error("Config fetch error:", error);
                setRegistrationOpen(true);
            }
        };
        checkStatus();
    }, []);

    const verifyPairCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const q = query(collection(db, "registrations"), where("pairCode", "==", pairCode.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("Invalid Pair Code. Please check and try again.");
            }

            const partnerDoc = querySnapshot.docs[0];
            const data = partnerDoc.data();

            if (data.pairStatus === "confirmed") {
                throw new Error("This pair is already confirmed and full.");
            }

            setPartnerData({
                name: data.name,
                usn: data.usn,
                partnerUSN: data.partnerUSN
            });

            // Automatically prefill user's USN since it's expected to be partnerUSN
            setFormData(prev => ({ ...prev, usn: data.partnerUSN }));

            setStep(2);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error verifying code.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            if (!formData.name.trim()) throw new Error("Name is required");
            if (!/^\d{10}$/.test(formData.phone.trim())) throw new Error("Enter a valid 10-digit phone number");

            const usn = formData.usn.toUpperCase();

            // Strict Validation
            if (usn !== partnerData?.partnerUSN) {
                throw new Error(`Your USN must be ${partnerData?.partnerUSN} as specified by your partner.`);
            }

            const usnResult = validateUSN(usn);
            if (!usnResult.valid) {
                throw new Error(usnResult.error || "Invalid USN");
            }

            const branch = getBranchName(usn);
            const section = getSection(usn);

            // Save new registration
            await setDoc(doc(db, "registrations", usn), {
                name: formData.name.trim(),
                usn,
                phone: formData.phone.trim(),
                branch,
                section,
                partnerUSN: partnerData.usn, // cross link
                pairCode: pairCode.toUpperCase(),
                pairStatus: "confirmed",
                teamId: null,
                createdAt: serverTimestamp(),
            });

            // Update partner's status to confirmed
            await updateDoc(doc(db, "registrations", partnerData.usn), {
                pairStatus: "confirmed"
            });

            setStep(3);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error joining pair.");
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 3) {
        return (
            <div className="text-center space-y-4 py-8 fade-in-up">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-emerald-400">Successfully Joined!</h3>
                <p className="text-slate-300">You are now paired with <span className="font-bold text-white">{partnerData?.name}</span>.</p>
                <div className="pt-6">
                    <p className="text-sm text-slate-400 mb-4">You can now check your team status.</p>
                    <a href="/status" className="btn-secondary w-full">Check Status</a>
                </div>
            </div>
        );
    }

    if (step === 2 && partnerData) {
        return (
            <form onSubmit={handleJoin} className="space-y-6 fade-in-up">
                <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 mb-6">
                    <p className="text-sm text-slate-300">Joining pair with:</p>
                    <p className="font-bold text-lg text-violet-300">{partnerData.name} <span className="text-sm font-normal text-slate-400">({partnerData.usn})</span></p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                        className="input-field"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Your USN</label>
                    <input
                        type="text"
                        value={formData.usn}
                        disabled
                        className="input-field opacity-60 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500 mt-2">Locked to the USN specified by your partner.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="10-digit phone number"
                        className="input-field"
                        maxLength={10}
                        pattern="\d{10}"
                        required
                    />
                </div>

                {error && <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>}

                <button type="submit" disabled={isLoading} className="btn-primary w-full !py-4 text-lg">
                    {isLoading ? <div className="spinner" /> : <><UserPlus className="w-5 h-5"/> Confirm & Join</>}
                </button>
            </form>
        );
    }

    if (registrationOpen === false) {
        return (
            <div className="text-center p-8 space-y-6 fade-in-up glass-card border-amber-500/20">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-2xl font-bold brand-font">Registrations Closed</h3>
                <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
                    The registration window for <span className="text-white font-bold">Idea Lab</span> is currently closed. 
                    You cannot join a pair at this time.
                </p>
                <div className="pt-4">
                   <a href="/" className="btn-secondary w-full">Back to Home</a>
                </div>
            </div>
        );
    }

    if (registrationOpen === null) {
        return <div className="text-center p-12"><div className="spinner mx-auto" /></div>;
    }

    return (
        <form onSubmit={verifyPairCode} className="space-y-6 fade-in-up">
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">Have an invite code?</h3>
                <p className="text-slate-400 text-sm">Enter the 5-character pair code shared by your friend.</p>
            </div>
            
            <div>
                <input
                    type="text"
                    value={pairCode}
                    onChange={(e) => setPairCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PC42F"
                    className="input-field text-center text-2xl tracking-widest uppercase font-mono py-4"
                    maxLength={5}
                    required
                />
            </div>

            {error && <p className="text-sm text-red-400 text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>}

            <button type="submit" disabled={isLoading || pairCode.length < 5} className="btn-primary w-full !py-4 text-lg">
                {isLoading ? <div className="spinner" /> : "Verify Code"}
            </button>
        </form>
    );
}
