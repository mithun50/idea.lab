"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { validateUSN } from "@/lib/usnValidator";
import { Search, Trophy, Hourglass, Users, UserCircle } from "lucide-react";

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

        const result = validateUSN(upperUSN);
        if (!result.valid) {
            setError(result.error || "Invalid USN");
            return;
        }

        setIsLoading(true);

        try {
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
                    {isLoading ? <div className="spinner" /> : <><Search className="w-4 h-4"/> Look Up</>}
                </button>
            </form>

            {/* Error Message */}
            {error && (
                <div style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, background: "rgba(232, 52, 26, 0.08)", color: "var(--red)", border: "1.5px solid var(--red)" }}>
                    {error}
                </div>
            )}

            {/* Student Info */}
            {studentData && (
                <div className="space-y-6 fade-in-up">
                    {/* Registration Card */}
                    <div className="glass-card p-6" style={{ borderLeft: "4px solid var(--ink)" }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 style={{ fontFamily: "var(--bebas)", fontSize: "20px", letterSpacing: "0.04em", color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                                <UserCircle style={{ width: 20, height: 20, color: "var(--muted)" }} /> Your Registration
                            </h3>
                            <span
                                className={`badge ${studentData.pairStatus === "confirmed" ? "badge-success" : "badge-warning"}`}
                            >
                                {studentData.pairStatus === "confirmed" ? "Pair Confirmed" : "Waiting for partner"}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4" style={{ fontSize: "14px" }}>
                            <div>
                                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Name</span>
                                <p style={{ fontWeight: 600, color: "var(--ink)", marginTop: "2px" }}>{studentData.name}</p>
                            </div>
                            <div>
                                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>USN</span>
                                <p style={{ fontWeight: 600, color: "var(--ink)", fontFamily: "monospace", marginTop: "2px" }}>{studentData.usn}</p>
                            </div>
                            <div>
                                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Branch</span>
                                <p style={{ fontWeight: 600, color: "var(--ink)", marginTop: "2px" }}>{studentData.branch}</p>
                            </div>
                            <div>
                                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Section</span>
                                <p style={{ fontWeight: 600, color: "var(--ink)", marginTop: "2px" }}>{studentData.section}</p>
                            </div>
                            <div className="col-span-2">
                                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Partner USN</span>
                                <p style={{ fontWeight: 600, color: "var(--ink)", fontFamily: "monospace", marginTop: "2px" }}>{studentData.partnerUSN}</p>
                            </div>
                        </div>
                    </div>

                    {/* Team Status */}
                    {studentData.teamId ? (
                        <div className="glass-card p-6" style={{ borderLeft: "4px solid var(--red)" }}>
                            <div className="flex items-center gap-3 mb-6">
                                <div style={{ width: 48, height: 48, border: "1.5px solid var(--ink)", display: "grid", placeItems: "center" }}>
                                    <Trophy style={{ width: 24, height: 24, color: "var(--red)" }} />
                                </div>
                                <div>
                                    <h3 style={{ fontFamily: "var(--bebas)", fontSize: "22px", letterSpacing: "0.04em", color: "var(--ink)" }}>
                                        {studentData.teamId}
                                    </h3>
                                    <p style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 600 }}>
                                        Your team has been assigned!
                                    </p>
                                </div>
                            </div>

                            {/* Team Members */}
                            <div className="space-y-3">
                                <h4 style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)" }}>
                                    Team Members
                                </h4>
                                {teamMembers.map((member, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between"
                                        style={{ padding: "12px 16px", background: i % 2 === 0 ? "var(--paper2)" : "var(--paper)", border: "1px solid var(--line)" }}
                                    >
                                        <div>
                                            <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)" }}>{member.name}</p>
                                            <p style={{ fontSize: "11px", color: "var(--muted)" }}>
                                                {member.branch} — Section {member.section}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <p style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted)" }}>
                                                {member.usn}
                                            </p>
                                            <p style={{ fontSize: "12px", color: "var(--ink)", fontWeight: 600 }}>{member.phone}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card p-8 text-center">
                            <div className="flex justify-center mb-4">
                                <Hourglass style={{ width: 40, height: 40, color: "var(--muted)" }} />
                            </div>
                            <h3 style={{ fontFamily: "var(--bebas)", fontSize: "22px", color: "var(--ink)", marginBottom: "8px" }}>
                                Teams will be announced soon
                            </h3>
                            <p style={{ color: "var(--muted)", fontSize: "13px", lineHeight: 1.7 }}>
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
