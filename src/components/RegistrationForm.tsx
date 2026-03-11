"use client";

import { useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import { validateUSN, areSameSection, getBranchName, getSection } from "@/lib/usnValidator";

/**
 * RegistrationForm Component
 * 
 * Handles student pair registration with real-time validation.
 * 
 * Pair Confirmation Logic:
 * 1. Student A registers with partnerUSN = Student B's USN
 * 2. System saves Student A's doc with pairStatus = "pending"
 * 3. If Student B has already registered with partnerUSN = Student A's USN,
 *    both records are updated to pairStatus = "confirmed"
 * 4. If not, Student A sees "Waiting for partner confirmation"
 */

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
    const [formData, setFormData] = useState<FormData>({
        name: "",
        usn: "",
        phone: "",
        partnerUSN: "",
    });

    const [validation, setValidation] = useState<ValidationState>({
        usn: { valid: null, message: "" },
        partnerUSN: { valid: null, message: "" },
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<{
        success: boolean;
        message: string;
        pairStatus?: string;
    } | null>(null);

    /**
     * Validates a USN field and updates the validation state.
     */
    const validateField = useCallback(
        (field: "usn" | "partnerUSN", value: string) => {
            const upperValue = value.toUpperCase();
            if (!upperValue) {
                setValidation((prev) => ({
                    ...prev,
                    [field]: { valid: null, message: "" },
                }));
                return;
            }

            const result = validateUSN(upperValue);
            setValidation((prev) => ({
                ...prev,
                [field]: {
                    valid: result.valid,
                    message: result.valid
                        ? `✓ ${result.branch} — Section ${result.section}`
                        : result.error || "Invalid USN",
                    branch: result.branch,
                    section: result.section,
                },
            }));
        },
        []
    );

    /**
     * Handles input changes with auto-uppercase for USN fields.
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newValue =
            name === "usn" || name === "partnerUSN" ? value.toUpperCase() : value;

        setFormData((prev) => ({ ...prev, [name]: newValue }));

        // Validate USN fields on change
        if (name === "usn" || name === "partnerUSN") {
            validateField(name, newValue);
        }

        // Clear submit result when user edits form
        if (submitResult) setSubmitResult(null);
    };

    /**
     * Handles form submission.
     * 
     * Steps:
     * 1. Validate all fields
     * 2. Check if USN is already registered
     * 3. Check if partner USN is already claimed by someone else
     * 4. Save registration document
     * 5. Check for cross-match (pair confirmation)
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitResult(null);

        const usn = formData.usn.toUpperCase();
        const partnerUSN = formData.partnerUSN.toUpperCase();

        try {
            // --- Validation checks ---
            if (!formData.name.trim()) {
                throw new Error("Name is required");
            }

            if (!formData.phone.trim() || !/^\d{10}$/.test(formData.phone)) {
                throw new Error("Please enter a valid 10-digit phone number");
            }

            const usnResult = validateUSN(usn);
            if (!usnResult.valid) {
                throw new Error(`Your USN: ${usnResult.error}`);
            }

            const partnerResult = validateUSN(partnerUSN);
            if (!partnerResult.valid) {
                throw new Error(`Partner USN: ${partnerResult.error}`);
            }

            if (usn === partnerUSN) {
                throw new Error("You cannot be your own partner");
            }

            // Check same section requirement
            if (!areSameSection(usn, partnerUSN)) {
                throw new Error(
                    "Both partners must be from the same section. Your sections don't match."
                );
            }

            // --- Firestore checks ---

            // Check if this USN is already registered
            const existingDoc = await getDoc(doc(db, "registrations", usn));
            if (existingDoc.exists()) {
                throw new Error(
                    "This USN is already registered. If this is an error, contact the admin."
                );
            }

            // Check if partner USN is already claimed by a different student
            // (i.e., someone else listed this partner USN and it's not the current user)
            const partnerDoc = await getDoc(doc(db, "registrations", partnerUSN));
            if (partnerDoc.exists()) {
                const partnerData = partnerDoc.data();
                // Partner exists and has a different partnerUSN (not pointing back to us)
                if (partnerData.partnerUSN !== usn) {
                    throw new Error(
                        `${partnerUSN} has already registered with a different partner.`
                    );
                }
            }

            // --- Save registration ---
            const branch = getBranchName(usn);
            const section = getSection(usn);

            // Determine initial pair status
            // If partner has already registered with our USN, both become confirmed
            let pairStatus = "pending";
            if (partnerDoc.exists() && partnerDoc.data().partnerUSN === usn) {
                pairStatus = "confirmed";
                // Update partner's status to confirmed too
                await updateDoc(doc(db, "registrations", partnerUSN), {
                    pairStatus: "confirmed",
                });
            }

            // Save the current student's registration
            await setDoc(doc(db, "registrations", usn), {
                name: formData.name.trim(),
                usn,
                phone: formData.phone.trim(),
                branch,
                section,
                partnerUSN,
                pairStatus,
                teamId: null,
                createdAt: serverTimestamp(),
            });

            setSubmitResult({
                success: true,
                message:
                    pairStatus === "confirmed"
                        ? "🎉 Registration successful! Your pair is confirmed!"
                        : "✅ Registration successful! Waiting for partner to register.",
                pairStatus,
            });

            // Reset form
            setFormData({ name: "", usn: "", phone: "", partnerUSN: "" });
            setValidation({
                usn: { valid: null, message: "" },
                partnerUSN: { valid: null, message: "" },
            });
        } catch (error) {
            setSubmitResult({
                success: false,
                message:
                    error instanceof Error ? error.message : "Something went wrong",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Full Name
                </label>
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

            {/* USN Field */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Your USN
                </label>
                <input
                    type="text"
                    name="usn"
                    value={formData.usn}
                    onChange={handleChange}
                    placeholder="1DB25CS001"
                    className={`input-field ${validation.usn.valid === true
                            ? "success"
                            : validation.usn.valid === false
                                ? "error"
                                : ""
                        }`}
                    maxLength={10}
                    required
                />
                {validation.usn.message && (
                    <p
                        className={`mt-2 text-sm ${validation.usn.valid ? "text-emerald-400" : "text-red-400"
                            }`}
                    >
                        {validation.usn.message}
                    </p>
                )}
            </div>

            {/* Phone Field */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone Number
                </label>
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
                {formData.phone && !/^\d{10}$/.test(formData.phone) && (
                    <p className="mt-2 text-sm text-amber-400">
                        Enter a valid 10-digit phone number
                    </p>
                )}
            </div>

            {/* Partner USN Field */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Partner&apos;s USN
                    <span className="text-slate-500 font-normal ml-2">
                        (must be same section)
                    </span>
                </label>
                <input
                    type="text"
                    name="partnerUSN"
                    value={formData.partnerUSN}
                    onChange={handleChange}
                    placeholder="1DB25CS002"
                    className={`input-field ${validation.partnerUSN.valid === true
                            ? "success"
                            : validation.partnerUSN.valid === false
                                ? "error"
                                : ""
                        }`}
                    maxLength={10}
                    required
                />
                {validation.partnerUSN.message && (
                    <p
                        className={`mt-2 text-sm ${validation.partnerUSN.valid
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                    >
                        {validation.partnerUSN.message}
                    </p>
                )}
                {/* Section mismatch warning */}
                {validation.usn.valid &&
                    validation.partnerUSN.valid &&
                    formData.usn &&
                    formData.partnerUSN &&
                    !areSameSection(formData.usn, formData.partnerUSN) && (
                        <p className="mt-2 text-sm text-red-400">
                            ⚠ Partners must be from the same section
                        </p>
                    )}
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full !py-4 text-lg"
            >
                {isSubmitting ? (
                    <>
                        <div className="spinner" />
                        Registering...
                    </>
                ) : (
                    <>
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Register Pair
                    </>
                )}
            </button>

            {/* Submit Result */}
            {submitResult && (
                <div
                    className={`p-4 rounded-xl text-sm font-medium ${submitResult.success
                            ? submitResult.pairStatus === "confirmed"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-red-500/15 text-red-300 border border-red-500/30"
                        }`}
                >
                    {submitResult.message}
                </div>
            )}
        </form>
    );
}
