"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection, query, where, getDocs, doc, getDoc,
  updateDoc, arrayUnion, addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Team, Invite, SessionData, Registration } from "@/lib/types";
import { getSession, updateSessionTeam } from "@/lib/session";
import { generateInviteId } from "@/lib/idGenerator";
import { canAddMember } from "@/lib/teamConstraints";
import Navbar from "@/components/Navbar";
import SessionGuard from "@/components/SessionGuard";
import TeamStatusBadge from "@/components/TeamStatusBadge";
import BranchConstraintIndicator from "@/components/BranchConstraintIndicator";
import Link from "next/link";
import { Users, Plus, Search, Mail, ArrowRight, Lightbulb } from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────
const MAX_DIRECT_INVITES = 3;
const TEAM_SIZE = 6;

// ─── Helpers ────────────────────────────────────────────────────────────────
function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Dashboard Content ─────────────────────────────────────────────────────
function DashboardContent({ session }: { session: SessionData }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit-mode state (leader only)
  const [editing, setEditing] = useState(false);
  const [inviteInputs, setInviteInputs] = useState<string[]>(["", "", ""]);
  const [inviteErrors, setInviteErrors] = useState<string[]>(["", "", ""]);
  const [inviteLoading, setInviteLoading] = useState<boolean[]>([false, false, false]);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // ── Fetch data with session sync ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      // Session sync — re-fetch from registration to fix stale teamId/teamRole
      const regDoc = await getDoc(doc(db, "registrations", session.usn));
      if (regDoc.exists()) {
        const regData = regDoc.data();
        const currentTeamId = regData.teamId || null;
        const currentRole = regData.teamRole || null;

        if (currentTeamId !== session.teamId || currentRole !== session.teamRole) {
          updateSessionTeam(currentTeamId, currentRole);
          session.teamId = currentTeamId;
          session.teamRole = currentRole;
        }
      }

      // Fetch team with proper type conversion
      if (session.teamId) {
        const teamDoc = await getDoc(doc(db, "teams", session.teamId));
        if (teamDoc.exists()) {
          const data = teamDoc.data();
          setTeam({
            teamId: data.teamId,
            name: data.name || null,
            leadUSN: data.leadUSN,
            members: data.members || [],
            memberCount: data.memberCount || 0,
            status: data.status,
            branchDistribution: data.branchDistribution || {},
            isPublic: data.isPublic ?? true,
            createdAt: data.createdAt?.toDate() || null,
            updatedAt: data.updatedAt?.toDate() || null,
          });
        }
      }

      // Fetch pending invites with full Invite type
      const inviteQuery = query(
        collection(db, "invites"),
        where("toUSN", "==", session.usn),
        where("status", "==", "pending"),
        where("type", "==", "invite")
      );
      const inviteSnap = await getDocs(inviteQuery);
      const invites: Invite[] = [];
      inviteSnap.forEach((d) => {
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
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Toast ─────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ── USN Lookup — registrations first, then students fallback ──────────
  const lookupUSN = async (usn: string): Promise<Registration | null> => {
    const clean = usn.trim().toUpperCase();
    try {
      const regSnap = await getDoc(doc(db, "registrations", clean));
      if (regSnap.exists()) return regSnap.data() as Registration;
      const stuSnap = await getDoc(doc(db, "students", clean));
      if (stuSnap.exists()) {
        const d = stuSnap.data();
        return {
          usn: d.usn, name: d.name, email: d.email || "", phone: d.phone || "",
          branch: d.branch, section: d.section, teamId: null, teamRole: null, registeredAt: null,
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  // ── Send invite with branch constraint check ─────────────────────────
  const sendInvite = async (slotIndex: number) => {
    if (!session || !team) return;
    const usn = inviteInputs[slotIndex].trim().toUpperCase();

    if (!usn) {
      setInviteErrors((prev) => { const e = [...prev]; e[slotIndex] = "Please enter a USN"; return e; });
      return;
    }
    if (usn === session.usn) {
      setInviteErrors((prev) => { const e = [...prev]; e[slotIndex] = "That's your own USN"; return e; });
      return;
    }
    if (team.members.some((m) => m.usn === usn)) {
      setInviteErrors((prev) => { const e = [...prev]; e[slotIndex] = "Already in your team"; return e; });
      return;
    }
    if (team.memberCount >= TEAM_SIZE) {
      setInviteErrors((prev) => { const e = [...prev]; e[slotIndex] = "Team is already full"; return e; });
      return;
    }

    setInviteLoading((prev) => { const l = [...prev]; l[slotIndex] = true; return l; });
    setInviteErrors((prev) => { const e = [...prev]; e[slotIndex] = ""; return e; });

    const student = await lookupUSN(usn);
    if (!student) {
      setInviteErrors((prev) => { const e = [...prev]; e[slotIndex] = "USN not found in database"; return e; });
      setInviteLoading((prev) => { const l = [...prev]; l[slotIndex] = false; return l; });
      return;
    }
    if (student.teamId) {
      setInviteErrors((prev) => { const e = [...prev]; e[slotIndex] = "Student already on a team"; return e; });
      setInviteLoading((prev) => { const l = [...prev]; l[slotIndex] = false; return l; });
      return;
    }

    // Branch constraint validation
    const constraint = canAddMember(team.members, student.branch);
    if (!constraint.valid) {
      setInviteErrors((prev) => { const e = [...prev]; e[slotIndex] = constraint.errors[0]; return e; });
      setInviteLoading((prev) => { const l = [...prev]; l[slotIndex] = false; return l; });
      return;
    }

    try {
      const inviteId = generateInviteId();
      const newMember = {
        usn: student.usn,
        name: student.name,
        branch: student.branch,
        section: student.section,
        status: "pending_invite" as const,
      };

      await addDoc(collection(db, "invites"), {
        inviteId,
        type: "invite",
        teamId: team.teamId,
        teamName: team.name ?? null,
        fromUSN: session.usn,
        fromName: session.name,
        toUSN: student.usn,
        toName: student.name,
        status: "pending",
        createdAt: serverTimestamp(),
        respondedAt: null,
      });

      await updateDoc(doc(db, "teams", team.teamId), {
        members: arrayUnion(newMember),
        memberCount: team.memberCount + 1,
        updatedAt: serverTimestamp(),
      });

      // Refresh team
      const teamSnap = await getDoc(doc(db, "teams", team.teamId));
      if (teamSnap.exists()) {
        const data = teamSnap.data();
        setTeam({
          teamId: data.teamId,
          name: data.name || null,
          leadUSN: data.leadUSN,
          members: data.members || [],
          memberCount: data.memberCount || 0,
          status: data.status,
          branchDistribution: data.branchDistribution || {},
          isPublic: data.isPublic ?? true,
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null,
        });
      }

      setInviteInputs((prev) => { const n = [...prev]; n[slotIndex] = ""; return n; });

      if (constraint.warnings.length > 0) {
        showToast(`Invite sent to ${student.name}! Note: ${constraint.warnings[0]}`);
      } else {
        showToast(`Invite sent to ${student.name}!`);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to send invite. Try again.", "err");
    }

    setInviteLoading((prev) => { const l = [...prev]; l[slotIndex] = false; return l; });
  };

  // ── Remove invited member (only pending_invite) ───────────────────────
  // Bug fix: use updatedMembers.length (leader IS in the array)
  const removeMember = async (memberUSN: string) => {
    if (!team || !session) return;
    const updatedMembers = team.members.filter((m) => m.usn !== memberUSN);
    try {
      await updateDoc(doc(db, "teams", team.teamId), {
        members: updatedMembers,
        memberCount: updatedMembers.length,
        updatedAt: serverTimestamp(),
      });
      setTeam({ ...team, members: updatedMembers, memberCount: updatedMembers.length });
      showToast("Removed from team");
    } catch {
      showToast("Failed to remove member", "err");
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  const isLead = session.teamRole === "lead";

  // Leader stats
  const directInvites = team?.members.filter((m) => m.status !== "pending_request" && m.usn !== session.usn) ?? [];
  const approvedCount = (team?.members.filter((m) => m.status === "approved").length ?? 0);
  const waitingCount = directInvites.filter((m) => m.status === "pending_invite").length;
  const totalSlotsUsed = team?.memberCount ?? 1;
  const openSlots = TEAM_SIZE - totalSlotsUsed;
  const usedDirectSlots = directInvites.length;
  const remainingDirectSlots = MAX_DIRECT_INVITES - usedDirectSlots;

  return (
    <div className="fade-in-up space-y-8">
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          background: toast.type === "ok" ? "var(--ink)" : "#E8341A",
          color: "var(--paper)", fontFamily: "var(--font-body)", fontSize: "13px",
          padding: "10px 22px", borderRadius: "4px", zIndex: 9999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Welcome Header */}
      <div>
        <h1 style={{ fontFamily: "var(--bebas)", fontSize: "48px", lineHeight: 1, color: "var(--ink)" }}>
          Welcome, {session.name.split(" ")[0]}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "8px" }}>
          {session.branch} — Section {session.section} · <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{session.usn}</span>
        </p>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="glass-card" style={{ padding: "20px", borderColor: "var(--red)", borderLeftWidth: "4px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--red)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Mail style={{ width: 14, height: 14 }} />
            Pending Invites ({pendingInvites.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pendingInvites.map((inv) => (
              <div
                key={inv.inviteId}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", border: "1px solid var(--line)", background: "var(--paper2)",
                }}
              >
                <div>
                  <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)" }}>
                    {inv.teamName || inv.teamId}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--muted)" }}>
                    From {inv.fromName}
                  </p>
                </div>
                <Link
                  href={`/invite/${inv.inviteId}`}
                  className="btn-primary"
                  style={{ padding: "8px 16px", fontSize: "10px" }}
                >
                  Respond <ArrowRight style={{ width: 12, height: 12 }} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Leader Panel ──────────────────────────────────────────── */}
      {session.teamId && team && isLead && (
        <>
          {/* Team name heading */}
          <div>
            <p style={{ fontFamily: "var(--bebas)", fontSize: "28px", color: "var(--ink)", lineHeight: 1 }}>
              {team.name || team.teamId}
            </p>
            {team.name && (
              <p style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{team.teamId}</p>
            )}
          </div>

          {/* Leader card */}
          <div className="glass-card" style={{
            padding: "18px 20px",
            borderLeftWidth: "3px", borderLeftColor: "#E8341A",
            display: "flex", alignItems: "center", gap: "14px",
          }}>
            <div style={{
              width: "46px", height: "46px", borderRadius: "50%",
              background: "var(--ink)", color: "var(--paper)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)", fontSize: "18px", flexShrink: 0,
            }}>
              {initials(session.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#E8341A", fontWeight: 500, marginBottom: "3px" }}>
                Team Leader
              </p>
              <p style={{ fontSize: "16px", fontWeight: 500, color: "var(--ink)" }}>{session.name}</p>
              <p style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace", marginTop: "1px" }}>
                {session.usn} · {session.branch} Sec {session.section}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <TeamStatusBadge status={team.status} />
              <div style={{
                fontSize: "11px", padding: "4px 10px", borderRadius: "20px",
                background: "var(--paper2)", color: "var(--ink)", border: "1px solid var(--line)",
                fontWeight: 500, whiteSpace: "nowrap",
              }}>
                {team.teamId}
              </div>
            </div>
          </div>

          {/* Branch Constraint Indicator */}
          <div className="glass-card" style={{ padding: "16px 20px" }}>
            <BranchConstraintIndicator members={team.members} />
          </div>

          {/* Team members header + edit toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 500 }}>
              Team Members
            </p>
            <button
              onClick={() => setEditing(!editing)}
              style={{
                fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 500,
                background: editing ? "var(--ink)" : "transparent",
                color: editing ? "var(--paper)" : "var(--ink)",
                border: "1px solid var(--line)", borderRadius: "3px",
                padding: "5px 12px", cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {editing ? "Done" : "Edit Team"}
            </button>
          </div>

          {/* Member slots */}
          {directInvites.map((member) => {
            const joined = member.status === "approved";
            return (
              <div key={member.usn} className="glass-card" style={{
                padding: "14px 18px",
                borderLeftWidth: "3px", borderLeftColor: joined ? "#1a7a45" : "#E8341A",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                    background: joined ? "#e8f5ee" : "#fce8e5",
                    color: joined ? "#1a7a45" : "#a8200f",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 600,
                  }}>
                    {initials(member.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>{member.name}</p>
                    <p style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace", marginTop: "1px" }}>
                      {member.usn} · {member.branch} Sec {member.section}
                    </p>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "5px", flexShrink: 0,
                    fontSize: "11px", fontWeight: 500, padding: "3px 10px", borderRadius: "20px",
                    background: joined ? "#e8f5ee" : "#fce8e5",
                    color: joined ? "#1a7a45" : "#a8200f",
                  }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: joined ? "#1a7a45" : "#a8200f", display: "inline-block" }} />
                    {joined ? "Joined" : "Waiting"}
                  </div>
                </div>

                {/* Edit row — only for pending_invite */}
                {editing && member.status === "pending_invite" && (
                  <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      onClick={() => removeMember(member.usn)}
                      style={{
                        fontFamily: "var(--font-body)", fontSize: "11px",
                        background: "none", color: "#E8341A",
                        border: "1px solid rgba(232,52,26,0.3)", borderRadius: "3px",
                        padding: "6px 12px", cursor: "pointer",
                      }}
                    >
                      Remove Invite
                    </button>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>Invite pending their response</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Direct invite input slots (edit mode, up to MAX_DIRECT_INVITES) */}
          {editing && directInvites.length < MAX_DIRECT_INVITES && (
            Array.from({ length: Math.min(remainingDirectSlots, MAX_DIRECT_INVITES) }).map((_, i) => {
              const slotIdx = directInvites.length + i;
              if (i > 0 && !inviteInputs[directInvites.length + i - 1]) return null;
              return (
                <div key={`slot-${slotIdx}`} style={{
                  border: "1.5px dashed var(--line)", borderRadius: "6px",
                  padding: "14px 18px", background: "transparent",
                }}>
                  <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>
                    Invite friend {slotIdx + 1} of {MAX_DIRECT_INVITES}
                  </p>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="Enter USN e.g. 1DB25CS042"
                      value={inviteInputs[slotIdx] ?? ""}
                      onChange={(e) => {
                        const n = [...inviteInputs];
                        n[slotIdx] = e.target.value.toUpperCase();
                        setInviteInputs(n);
                        if (inviteErrors[slotIdx]) {
                          const err = [...inviteErrors];
                          err[slotIdx] = "";
                          setInviteErrors(err);
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") sendInvite(slotIdx); }}
                      style={{
                        flex: 1, border: inviteErrors[slotIdx] ? "1px solid #E8341A" : "1px solid var(--line)",
                        background: "var(--paper2)", padding: "8px 10px",
                        fontSize: "13px", fontFamily: "monospace", borderRadius: "3px",
                        color: "var(--ink)", outline: "none",
                      }}
                    />
                    <button
                      onClick={() => sendInvite(slotIdx)}
                      disabled={inviteLoading[slotIdx]}
                      className="btn-primary"
                      style={{
                        padding: "8px 14px", fontSize: "12px",
                        cursor: inviteLoading[slotIdx] ? "not-allowed" : "pointer",
                        opacity: inviteLoading[slotIdx] ? 0.6 : 1,
                      }}
                    >
                      {inviteLoading[slotIdx] ? "..." : "Send Invite"}
                    </button>
                  </div>
                  {inviteErrors[slotIdx] && (
                    <p style={{ fontSize: "11px", color: "#E8341A", marginTop: "5px" }}>
                      {inviteErrors[slotIdx]}
                    </p>
                  )}
                </div>
              );
            })
          )}

          {/* Open slot indicators */}
          {openSlots > 0 && Array.from({ length: openSlots }).map((_, i) => (
            <div key={`open-${i}`} style={{
              border: "1px dashed var(--line)", borderRadius: "6px",
              padding: "13px 18px",
              display: "flex", alignItems: "center", gap: "12px",
              background: "transparent",
            }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: "var(--paper2)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "13px", color: "var(--muted)", flexShrink: 0,
              }}>
                {totalSlotsUsed + i + 1}
              </div>
              <div>
                <p style={{ fontSize: "13px", color: "var(--muted)" }}>Open slot</p>
                <p style={{ fontSize: "11px", color: "#bbb", marginTop: "1px" }}>
                  Anyone can request to join via Browse Teams
                </p>
              </div>
            </div>
          ))}

          {/* Progress bar */}
          <div className="glass-card" style={{ padding: "18px 20px" }}>
            <p style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 500, marginBottom: "12px" }}>
              Team Completion
            </p>
            <div style={{ background: "var(--paper2)", borderRadius: "3px", height: "10px", overflow: "hidden", marginBottom: "8px" }}>
              <div style={{
                height: "10px", borderRadius: "3px", background: "#1a7a45",
                width: `${Math.round((approvedCount / TEAM_SIZE) * 100)}%`,
                transition: "width 0.4s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "#1a7a45", fontWeight: 500 }}>{approvedCount} joined</span>
              <span style={{ color: "#a8200f", fontWeight: 500 }}>{waitingCount} waiting</span>
              <span style={{ color: "var(--muted)" }}>of {TEAM_SIZE} total</span>
            </div>
          </div>

          {/* Team ID sharing note */}
          <p style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
            Share your team ID{" "}
            <span style={{ fontFamily: "monospace", background: "var(--paper2)", padding: "1px 6px", borderRadius: "2px", fontSize: "11px" }}>
              {team.teamId}
            </span>{" "}
            so others can request to join via Browse Teams.
          </p>

          {/* View full team page */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Link
              href={`/team/${team.teamId}`}
              className="btn-secondary"
              style={{ padding: "10px 22px", fontSize: "13px" }}
            >
              View Full Team Page <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </>
      )}

      {/* ── Member Panel (non-lead, on a team) ────────────────────── */}
      {session.teamId && team && !isLead && (
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: "4px" }}>
                Your Team
              </p>
              <p style={{ fontFamily: "var(--bebas)", fontSize: "28px", color: "var(--ink)", lineHeight: 1 }}>
                {team.name || team.teamId}
              </p>
              {team.name && (
                <p style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{team.teamId}</p>
              )}
              <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                {team.memberCount}/{TEAM_SIZE} members
              </p>
            </div>
            <TeamStatusBadge status={team.status} />
          </div>

          <BranchConstraintIndicator members={team.members} />

          <div style={{ marginTop: "16px" }}>
            <Link
              href={`/team/${team.teamId}`}
              className="btn-primary"
              style={{ display: "inline-flex", padding: "12px 24px" }}
            >
              View Team <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </div>
      )}

      {/* ── No Team Card ──────────────────────────────────────────── */}
      {!session.teamId && (
        <div className="glass-card" style={{ padding: "32px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, background: "var(--paper2)", border: "1.5px solid var(--line)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <Lightbulb style={{ width: 28, height: 28, color: "var(--muted)" }} />
          </div>
          <p style={{ fontFamily: "var(--bebas)", fontSize: "24px", color: "var(--ink)", marginBottom: "8px" }}>
            You&apos;re not on a team yet
          </p>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "20px", maxWidth: "360px", margin: "0 auto 20px" }}>
            Create your own team or browse open teams to join. Teams need 6 members from at least 2 different branches.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/team/create" className="btn-primary" style={{ padding: "14px 28px" }}>
              <Plus style={{ width: 16, height: 16 }} /> Create Team
            </Link>
            <Link href="/team/browse" className="btn-secondary" style={{ padding: "14px 28px" }}>
              <Search style={{ width: 16, height: 16 }} /> Browse Teams
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        {!team && (
          <Link href="/team/create" className="glass-card" style={{ padding: "20px", textDecoration: "none", display: "flex", alignItems: "center", gap: "12px" }}>
            <Plus style={{ width: 20, height: 20, color: "var(--red)" }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink)" }}>Create Team</p>
              <p style={{ fontSize: "11px", color: "var(--muted)" }}>Start your own team</p>
            </div>
          </Link>
        )}
        <Link href="/team/browse" className="glass-card" style={{ padding: "20px", textDecoration: "none", display: "flex", alignItems: "center", gap: "12px" }}>
          <Users style={{ width: 20, height: 20, color: "var(--red)" }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink)" }}>Browse Teams</p>
            <p style={{ fontSize: "11px", color: "var(--muted)" }}>Find open teams</p>
          </div>
        </Link>
        <Link href="/status" className="glass-card" style={{ padding: "20px", textDecoration: "none", display: "flex", alignItems: "center", gap: "12px" }}>
          <Search style={{ width: 20, height: 20, color: "var(--red)" }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink)" }}>Check Status</p>
            <p style={{ fontSize: "11px", color: "var(--muted)" }}>View registration info</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ─── Page wrapper with SessionGuard ─────────────────────────────────────────
export default function DashboardPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <Navbar />
      <section style={{ marginTop: 60, maxWidth: "720px", margin: "80px auto 40px", padding: "0 20px" }}>
        <SessionGuard>
          {(session) => <DashboardContent session={session} />}
        </SessionGuard>
      </section>
    </main>
  );
}
