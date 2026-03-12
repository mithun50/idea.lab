"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { validateUSN } from "@/lib/usnValidator";
import { Team, Invite } from "@/lib/types";
import TeamStatusBadge from "./TeamStatusBadge";
import { Search, Trophy, Hourglass, Users, UserCircle, Mail } from "lucide-react";

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
        email: string;
        teamId: string | null;
        teamRole: string | null;
        // Legacy
        partnerUSN?: string;
        pairStatus?: string;
    } | null>(null);
    const [team, setTeam] = useState<Team | null>(null);
    const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setStudentData(null);
        setTeam(null);
        setPendingInvites([]);

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
                email: data.email || "",
                teamId: data.teamId || null,
                teamRole: data.teamRole || null,
                partnerUSN: data.partnerUSN,
                pairStatus: data.pairStatus,
            });

            // Fetch team if exists
            if (data.teamId) {
                const teamDoc = await getDoc(doc(db, "teams", data.teamId));
                if (teamDoc.exists()) {
                    const td = teamDoc.data();
                    setTeam({
                        teamId: td.teamId,
                        name: td.name || null,
                        leadUSN: td.leadUSN,
                        members: td.members || [],
                        memberCount: td.memberCount || 0,
                        status: td.status || "forming",
                        branchDistribution: td.branchDistribution || {},
                        isPublic: td.isPublic ?? true,
                        createdAt: td.createdAt?.toDate() || null,
                        updatedAt: td.updatedAt?.toDate() || null,
                    });
                }
            }

            // Fetch pending invites
            const inviteQuery = query(
                collection(db, "invites"),
                where("toUSN", "==", upperUSN),
                where("status", "==", "pending")
            );
            const inviteSnap = await getDocs(inviteQuery);
            const invites: Invite[] = [];
            inviteSnap.forEach(d => {
                const inv = d.data();
                invites.push({
                    inviteId: inv.inviteId,
                    type: inv.type,
                    teamId: inv.teamId,
                    teamName: inv.teamName,
                    fromUSN: inv.fromUSN,
                    fromName: inv.fromName,
                    toUSN: inv.toUSN,
                    toName: inv.toName,
                    status: inv.status,
                    createdAt: inv.createdAt?.toDate() || null,
                    respondedAt: inv.respondedAt?.toDate() || null,
                });
            });
            setPendingInvites(invites);
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
                    {isLoading ? <div className="spinner" /> : <><Search style={{ width: 16, height: 16 }} /> Look Up</>}
                </button>
            </form>

            {/* Error */}
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
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                            <h3 style={{ fontFamily: "var(--bebas)", fontSize: "20px", letterSpacing: "0.04em", color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                                <UserCircle style={{ width: 20, height: 20, color: "var(--muted)" }} /> Your Registration
                            </h3>
                            {studentData.teamRole && (
                                <span className={`badge ${studentData.teamRole === "lead" ? "badge-danger" : "badge-success"}`}>
                                    Team {studentData.teamRole}
                                </span>
                            )}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "14px" }}>
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
                            {studentData.partnerUSN && (
                                <div style={{ gridColumn: "span 2" }}>
                                    <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Partner USN (Legacy)</span>
                                    <p style={{ fontWeight: 600, color: "var(--ink)", fontFamily: "monospace", marginTop: "2px" }}>{studentData.partnerUSN}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pending Invites */}
                    {pendingInvites.length > 0 && (
                        <div className="glass-card p-6" style={{ borderLeft: "4px solid var(--red)" }}>
                            <h3 style={{ fontFamily: "var(--bebas)", fontSize: "20px", letterSpacing: "0.04em", color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                <Mail style={{ width: 20, height: 20, color: "var(--red)" }} /> Pending Invites ({pendingInvites.length})
                            </h3>
                            {pendingInvites.map(inv => (
                                <div key={inv.inviteId} style={{ padding: "12px", border: "1px solid var(--line)", background: "var(--paper2)", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)" }}>{inv.teamName || inv.teamId}</p>
                                        <p style={{ fontSize: "11px", color: "var(--muted)" }}>From {inv.fromName}</p>
                                    </div>
                                    <a href={`/invite/${inv.inviteId}`} className="btn-primary" style={{ padding: "8px 14px", fontSize: "10px", textDecoration: "none" }}>
                                        Respond
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Team Status */}
                    {team ? (
                        <div className="glass-card p-6" style={{ borderLeft: "4px solid var(--red)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div style={{ width: 48, height: 48, border: "1.5px solid var(--ink)", display: "grid", placeItems: "center" }}>
                                        <Trophy style={{ width: 24, height: 24, color: "var(--red)" }} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontFamily: "var(--bebas)", fontSize: "22px", letterSpacing: "0.04em", color: "var(--ink)", lineHeight: 1 }}>
                                            {team.name || team.teamId}
                                        </h3>
                                        {team.name && (
                                            <p style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted)" }}>{team.teamId}</p>
                                        )}
                                    </div>
                                </div>
                                <TeamStatusBadge status={team.status} />
                            </div>

                            {/* Team Members */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <h4 style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)" }}>
                                    Team Members ({team.members.filter(m => m.status === "approved").length}/6)
                                </h4>
                                {team.members.filter(m => m.status === "approved").map((member, i) => (
                                    <div
                                        key={member.usn}
                                        style={{
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                            padding: "12px 16px", background: i % 2 === 0 ? "var(--paper2)" : "var(--paper)",
                                            border: "1px solid var(--line)",
                                        }}
                                    >
                                        <div>
                                            <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                                                {member.name}
                                                {member.usn === team.leadUSN && (
                                                    <span style={{ fontSize: "8px", fontWeight: 800, textTransform: "uppercase", background: "var(--ink)", color: "var(--paper)", padding: "1px 5px", letterSpacing: "0.1em" }}>Lead</span>
                                                )}
                                            </p>
                                            <p style={{ fontSize: "11px", color: "var(--muted)" }}>
                                                {member.branch} — Section {member.section}
                                            </p>
                                        </div>
                                        <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted)" }}>{member.usn}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : studentData.teamId ? (
                        /* Has teamId but team doc not found (legacy) */
                        <div className="glass-card p-6" style={{ borderLeft: "4px solid var(--red)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                                <Trophy style={{ width: 24, height: 24, color: "var(--red)" }} />
                                <h3 style={{ fontFamily: "var(--bebas)", fontSize: "22px", color: "var(--ink)" }}>
                                    {studentData.teamId}
                                </h3>
                            </div>
                            <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                                Team assigned (legacy format). Contact admin for details.
                            </p>
                        </div>
                    ) : (
                        <div className="glass-card p-8 text-center">
                            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                                <Hourglass style={{ width: 40, height: 40, color: "var(--muted)" }} />
                            </div>
                            <h3 style={{ fontFamily: "var(--bebas)", fontSize: "22px", color: "var(--ink)", marginBottom: "8px" }}>
                                No team yet
                            </h3>
                            <p style={{ color: "var(--muted)", fontSize: "13px", lineHeight: 1.7 }}>
                                You haven&apos;t joined a team yet. Create your own or browse open teams!
                            </p>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "16px" }}>
                                <a href="/team/create" className="btn-primary" style={{ padding: "10px 20px", fontSize: "11px", textDecoration: "none" }}>Create Team</a>
                                <a href="/team/browse" className="btn-secondary" style={{ padding: "10px 20px", fontSize: "11px", textDecoration: "none" }}>Browse Teams</a>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
