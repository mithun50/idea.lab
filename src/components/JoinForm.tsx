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

    const [partnerData, setPartnerData] = useState<{
        name: string;
        usn: string;
        partnerUSN: string;
    } | null>(null);

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

            if (usn !== partnerData?.partnerUSN) {
                throw new Error(`Your USN must be ${partnerData?.partnerUSN} as specified by your partner.`);
            }

            const usnResult = validateUSN(usn);
            if (!usnResult.valid) {
                throw new Error(usnResult.error || "Invalid USN");
            }

            const branch = getBranchName(usn);
            const section = getSection(usn);

            await setDoc(doc(db, "registrations", usn), {
                name: formData.name.trim(),
                usn,
                phone: formData.phone.trim(),
                branch,
                section,
                partnerUSN: partnerData.usn,
                pairCode: pairCode.toUpperCase(),
                pairStatus: "confirmed",
                teamId: null,
                createdAt: serverTimestamp(),
            });

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
                <div style={{ width: 64, height: 64, border: "1.5px solid #10b981", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                    <CheckCircle2 style={{ width: 32, height: 32, color: "#10b981" }} />
                </div>
                <h3 style={{ fontFamily: "var(--bebas)", fontSize: "28px", color: "#10b981", letterSpacing: "0.02em" }}>Successfully Joined!</h3>
                <p style={{ color: "var(--muted)", fontSize: "14px" }}>You are now paired with <strong style={{ color: "var(--ink)" }}>{partnerData?.name}</strong>.</p>
                <div className="pt-6">
                    <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>You can now check your team status.</p>
                    <a href="/status" className="btn-primary w-full" style={{ display: "flex", justifyContent: "center" }}>Check Status</a>
                </div>
            </div>
        );
    }

    if (step === 2 && partnerData) {
        return (
            <form onSubmit={handleJoin} className="space-y-6 fade-in-up">
                <div style={{ padding: "16px", border: "1.5px solid var(--ink)", background: "var(--paper2)", marginBottom: "24px" }}>
                    <p style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Joining pair with:</p>
                    <p style={{ fontFamily: "var(--bebas)", fontSize: "22px", color: "var(--ink)", marginTop: "4px" }}>
                        {partnerData.name} <span style={{ fontSize: "14px", color: "var(--muted)", fontFamily: "monospace" }}>({partnerData.usn})</span>
                    </p>
                </div>

                <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "8px" }}>Full Name</label>
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
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "8px" }}>Your USN</label>
                    <input
                        type="text"
                        value={formData.usn}
                        disabled
                        className="input-field"
                        style={{ opacity: 0.6, cursor: "not-allowed" }}
                    />
                    <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>Locked to the USN specified by your partner.</p>
                </div>
                <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "8px" }}>Phone Number</label>
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

                {error && (
                    <div style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, background: "rgba(232, 52, 26, 0.08)", color: "var(--red)", border: "1.5px solid var(--red)" }}>
                        {error}
                    </div>
                )}

                <button type="submit" disabled={isLoading} className="btn-primary w-full" style={{ padding: "16px" }}>
                    {isLoading ? <div className="spinner" /> : <><UserPlus className="w-5 h-5"/> Confirm & Join</>}
                </button>
            </form>
        );
    }

    if (registrationOpen === false) {
        return (
            <div className="text-center p-8 space-y-6 fade-in-up">
                <div style={{ width: 64, height: 64, border: "1.5px solid var(--ink)", display: "grid", placeItems: "center", margin: "0 auto" }}>
                    <Lock style={{ width: 28, height: 28, color: "var(--muted)" }} />
                </div>
                <h3 style={{ fontFamily: "var(--bebas)", fontSize: "28px", color: "var(--ink)" }}>Registrations Closed</h3>
                <p style={{ color: "var(--muted)", fontSize: "14px", maxWidth: "320px", margin: "0 auto", lineHeight: 1.7 }}>
                    The registration window for <strong style={{ color: "var(--ink)" }}>Idea Lab</strong> is currently closed.
                    You cannot join a pair at this time.
                </p>
                <div className="pt-4">
                    <a href="/" className="btn-secondary w-full" style={{ display: "flex", justifyContent: "center" }}>Back to Home</a>
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
                <h3 style={{ fontFamily: "var(--bebas)", fontSize: "24px", color: "var(--ink)", marginBottom: "8px" }}>Have an invite code?</h3>
                <p style={{ color: "var(--muted)", fontSize: "13px" }}>Enter the 5-character pair code shared by your friend.</p>
            </div>

            <div>
                <input
                    type="text"
                    value={pairCode}
                    onChange={(e) => setPairCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PC42F"
                    className="input-field"
                    style={{ textAlign: "center", fontSize: "24px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "monospace", padding: "16px" }}
                    maxLength={5}
                    required
                />
            </div>

            {error && (
                <div style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, background: "rgba(232, 52, 26, 0.08)", color: "var(--red)", border: "1.5px solid var(--red)", textAlign: "center" }}>
                    {error}
                </div>
            )}

            <button type="submit" disabled={isLoading || pairCode.length < 5} className="btn-primary w-full" style={{ padding: "16px" }}>
                {isLoading ? <div className="spinner" /> : "Verify Code"}
            </button>
        </form>
    );
}
