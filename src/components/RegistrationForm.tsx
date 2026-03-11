"use client";

import { useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { validateUSN, areSameSection, getBranchName, getSection } from "@/lib/usnValidator";
import { CheckCircle2, Copy, Share2, PencilLine } from "lucide-react";

interface FormData {
    name: string;
    usn: string;
    phone: string;
    partnerUSN: string;
}

interface ValidationState {
    usn: { valid: boolean | null; message: string; branch?: string; section?: string };
    partnerUSN: { valid: boolean | null; message: string; branch?: string; section?: string };
}

export default function RegistrationForm() {
    const [formData, setFormData] = useState<FormData>({ name: "", usn: "", phone: "", partnerUSN: "" });
    const [validation, setValidation] = useState<ValidationState>({
        usn: { valid: null, message: "" },
        partnerUSN: { valid: null, message: "" },
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<{
        success: boolean;
        message: string;
        pairStatus?: string;
        pairCode?: string;
    } | null>(null);

    const validateField = useCallback((field: "usn" | "partnerUSN", value: string) => {
        const upperValue = value.toUpperCase();
        if (!upperValue) {
            setValidation((prev) => ({ ...prev, [field]: { valid: null, message: "" } }));
            return;
        }

        const result = validateUSN(upperValue);
        setValidation((prev) => ({
            ...prev,
            [field]: {
                valid: result.valid,
                message: result.valid ? `✓ ${result.branch} — Section ${result.section}` : result.error || "Invalid USN",
                branch: result.branch,
                section: result.section,
            },
        }));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newValue = name === "usn" || name === "partnerUSN" ? value.toUpperCase() : value;
        setFormData((prev) => ({ ...prev, [name]: newValue }));

        if (name === "usn" || name === "partnerUSN") {
            validateField(name, newValue);
        }
        if (submitResult) setSubmitResult(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitResult(null);

        const usn = formData.usn.toUpperCase();
        const partnerUSN = formData.partnerUSN.toUpperCase();

        try {
            if (!formData.name.trim()) throw new Error("Name is required");
            if (!formData.phone.trim() || !/^\d{10}$/.test(formData.phone)) throw new Error("Please enter a valid 10-digit phone number");

            const usnResult = validateUSN(usn);
            if (!usnResult.valid) throw new Error(`Your USN: ${usnResult.error}`);

            const partnerResult = validateUSN(partnerUSN);
            if (!partnerResult.valid) throw new Error(`Partner USN: ${partnerResult.error}`);

            if (usn === partnerUSN) throw new Error("You cannot be your own partner. Please enter a friend's USN.");
            if (!areSameSection(usn, partnerUSN)) throw new Error("Both partners must be from the same section. Your sections don't match.");

            const existingDoc = await getDoc(doc(db, "registrations", usn));
            if (existingDoc.exists()) throw new Error("This USN is already registered. If this is an error, contact the admin.");

            const partnerDoc = await getDoc(doc(db, "registrations", partnerUSN));
            if (partnerDoc.exists() && partnerDoc.data().partnerUSN !== usn) {
                throw new Error(`${partnerUSN} has already registered with a different partner.`);
            }

            const branch = getBranchName(usn);
            const section = getSection(usn);
            let pairStatus = "pending";
            let generatedCode = Math.random().toString(36).substring(2, 7).toUpperCase();

            // If partner already registered, we use their code and confirm both
            if (partnerDoc.exists() && partnerDoc.data().partnerUSN === usn) {
                pairStatus = "confirmed";
                generatedCode = partnerDoc.data().pairCode || generatedCode;
                await updateDoc(doc(db, "registrations", partnerUSN), { pairStatus: "confirmed" });
            }

            await setDoc(doc(db, "registrations", usn), {
                name: formData.name.trim(),
                usn,
                phone: formData.phone.trim(),
                branch,
                section,
                partnerUSN,
                pairCode: generatedCode,
                pairStatus,
                teamId: null,
                createdAt: serverTimestamp(),
            });

            setSubmitResult({
                success: true,
                message: pairStatus === "confirmed" ? "🎉 Registration successful! Your pair is confirmed!" : "Registration successful! You've created a pair code.",
                pairStatus,
                pairCode: generatedCode,
            });

        } catch (error) {
            setSubmitResult({
                success: false,
                message: error instanceof Error ? error.message : "Something went wrong",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitResult?.success) {
        return (
            <div className="text-center p-2 space-y-6 fade-in-up">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
                <h3 className="text-2xl font-bold">{submitResult.message}</h3>

                {submitResult.pairStatus === "pending" && (
                    <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4 shadow-xl">
                        <p className="text-slate-300">Invite your partner <span className="font-bold text-white">{formData.partnerUSN}</span> using this Pair Code:</p>
                        
                        <div className="text-4xl font-mono font-bold tracking-widest text-cyan-400 bg-black/30 py-4 rounded-lg">
                            {submitResult.pairCode}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button type="button" onClick={() => {
                                const text = `Hi, I've registered us for Idea Lab! Join my team using this code: ${submitResult.pairCode}\n\nLink: https://idealav-seven.vercel.app/join?code=${submitResult.pairCode}`;
                                navigator.clipboard.writeText(text);
                                alert("Copied to clipboard!");
                            }} className="btn-secondary w-full text-sm">
                                <Copy className="w-4 h-4 flex-shrink-0" /> Copy Link
                            </button>
                            <a href={`https://wa.me/?text=${encodeURIComponent(`Hi, I've registered us for Idea Lab! Join my team using this code: ${submitResult.pairCode}\n\nJoin Link: https://idealav-seven.vercel.app/join?code=${submitResult.pairCode}`)}`} 
                               target="_blank" rel="noopener noreferrer" 
                               className="w-full text-sm py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2"
                               style={{ backgroundColor: '#25D366', color: 'white' }}>
                                <Share2 className="w-4 h-4 flex-shrink-0" /> WhatsApp
                            </a>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 fade-in-up">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="input-field"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Your USN</label>
                <input
                    type="text"
                    name="usn"
                    value={formData.usn}
                    onChange={handleChange}
                    placeholder="1DB25CS001"
                    className={`input-field ${validation.usn.valid === true ? "success" : validation.usn.valid === false ? "error" : ""}`}
                    maxLength={10}
                    required
                />
                {validation.usn.message && <p className={`mt-2 text-sm ${validation.usn.valid ? "text-emerald-400" : "text-red-400"}`}>{validation.usn.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="10-digit phone number"
                    className="input-field"
                    maxLength={10}
                    pattern="\d{10}"
                    required
                />
                {formData.phone && !/^\d{10}$/.test(formData.phone) && <p className="mt-2 text-sm text-amber-400">Enter a valid 10-digit phone number</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Partner's USN <span className="text-slate-500 font-normal ml-2">(must be same section)</span></label>
                <input
                    type="text"
                    name="partnerUSN"
                    value={formData.partnerUSN}
                    onChange={handleChange}
                    placeholder="1DB25CS002"
                    className={`input-field ${validation.partnerUSN.valid === true ? "success" : validation.partnerUSN.valid === false ? "error" : ""}`}
                    maxLength={10}
                    required
                />
                {validation.partnerUSN.message && <p className={`mt-2 text-sm ${validation.partnerUSN.valid ? "text-emerald-400" : "text-red-400"}`}>{validation.partnerUSN.message}</p>}
                
                {validation.usn.valid && validation.partnerUSN.valid && formData.usn && formData.partnerUSN && !areSameSection(formData.usn, formData.partnerUSN) && (
                    <p className="mt-2 text-sm text-red-400">⚠ Partners must be from the same section</p>
                )}
            </div>

            {submitResult && !submitResult.success && (
                <div className="p-4 rounded-xl text-sm font-medium bg-red-500/15 text-red-300 border border-red-500/30">
                    {submitResult.message}
                </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full !py-4 text-lg">
                {isSubmitting ? <><div className="spinner" /> Registering...</> : <><PencilLine className="w-5 h-5"/> Register & Create Pair</>}
            </button>
        </form>
    );
}
