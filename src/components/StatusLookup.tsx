"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { validateUSN } from "@/lib/usnValidator";

/**
 * StatusLookup Component
 * 
 * Students enter their USN to check:
 * - Registration status
 * - Pair confirmation status
 * - Team assignment (if teams have been generated)
 * - Team member details (names, sections, phone numbers)
 */

interface TeamMember {
    name: string;
    usn: string;
    branch: string;
    section: string;
    phone: string;
}

export default function StatusLookup() {
    const [usn, setUSN] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [studentData, setStudentData] = useState<{
        name: string;
        usn: string;
        branch: string;
        section: string;
        partnerUSN: string;
        pairStatus: string;
        teamId: string | null;
    } | null>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setStudentData(null);
        setTeamMembers([]);

        const upperUSN = usn.toUpperCase();

        // Validate USN format
        const result = validateUSN(upperUSN);
        if (!result.valid) {
            setError(result.error || "Invalid USN");
            return;
        }

        setIsLoading(true);

        try {
            // Fetch student registration
            const studentDoc = await getDoc(doc(db, "registrations", upperUSN));

            if (!studentDoc.exists()) {
                setError("No registration found for this USN. Please register first.");
                return;
            }

            const data = studentDoc.data();
            setStudentData({
                name: data.name,
                usn: data.usn,
                branch: data.branch,
                section: data.section,
                partnerUSN: data.partnerUSN,
                pairStatus: data.pairStatus,
                teamId: data.teamId || null,
            });

            // If team has been assigned, fetch team members
            if (data.teamId) {
                const teamQuery = query(
                    collection(db, "registrations"),
                    where("teamId", "==", data.teamId)
                );
                const teamSnapshot = await getDocs(teamQuery);
                const members: TeamMember[] = [];
                teamSnapshot.forEach((memberDoc) => {
                    const memberData = memberDoc.data();
                    if (memberData.usn !== upperUSN) {
                        members.push({
                            name: memberData.name,
                            usn: memberData.usn,
                            branch: memberData.branch,
                            section: memberData.section,
                            phone: memberData.phone,
                        });
                    }
                });
                setTeamMembers(members);
            }
        } catch (err) {
            console.error("Lookup error:", err);
            setError("Failed to fetch data. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Form */}
            <form onSubmit={handleLookup} className="flex gap-3">
                <input
                    type="text"
                    value={usn}
                    onChange={(e) => {
                        setUSN(e.target.value.toUpperCase());
                        setError("");
                    }}
                    placeholder="Enter your USN (e.g. 1DB25CS001)"
                    className="input-field flex-1"
                    maxLength={10}
                />
                <button
                    type="submit"
                    disabled={isLoading || !usn}
                    className="btn-primary shrink-0"
                >
                    {isLoading ? <div className="spinner" /> : "Look Up"}
                </button>
            </form>

            {/* Error Message */}
            {error && (
                <div className="p-4 rounded-xl bg-red-500/15 text-red-300 border border-red-500/30 text-sm">
                    {error}
                </div>
            )}

            {/* Student Info */}
            {studentData && (
                <div className="space-y-6 fade-in-up">
                    {/* Registration Card */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg">Your Registration</h3>
                            <span
                                className={`badge ${studentData.pairStatus === "confirmed"
                                        ? "badge-success"
                                        : "badge-warning"
                                    }`}
                            >
                                <span
                                    className={`w-2 h-2 rounded-full ${studentData.pairStatus === "confirmed"
                                            ? "bg-emerald-400"
                                            : "bg-amber-400 animate-pulse"
                                        }`}
                                />
                                {studentData.pairStatus === "confirmed"
                                    ? "Pair Confirmed"
                                    : "Waiting for partner"}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500">Name</span>
                                <p className="font-medium">{studentData.name}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">USN</span>
                                <p className="font-medium font-mono">{studentData.usn}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Branch</span>
                                <p className="font-medium">{studentData.branch}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Section</span>
                                <p className="font-medium">{studentData.section}</p>
                            </div>
                            <div className="col-span-2">
                                <span className="text-slate-500">Partner USN</span>
                                <p className="font-medium font-mono">
                                    {studentData.partnerUSN}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Team Status */}
                    {studentData.teamId ? (
                        <div className="glass-card p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-lg">
                                    🏆
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">
                                        {studentData.teamId}
                                    </h3>
                                    <p className="text-slate-400 text-sm">
                                        Your team has been assigned!
                                    </p>
                                </div>
                            </div>

                            {/* Team Members */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                    Team Members
                                </h4>
                                {teamMembers.map((member, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">{member.name}</p>
                                            <p className="text-xs text-slate-400">
                                                {member.branch} — Section {member.section}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono text-xs text-slate-400">
                                                {member.usn}
                                            </p>
                                            <p className="text-xs text-cyan-400">{member.phone}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card p-8 text-center">
                            <div className="text-4xl mb-4 float-animation">⏳</div>
                            <h3 className="font-bold text-lg mb-2">
                                Teams will be announced soon
                            </h3>
                            <p className="text-slate-400 text-sm">
                                The admin will run the team matching algorithm once all
                                registrations are complete. Check back later!
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
