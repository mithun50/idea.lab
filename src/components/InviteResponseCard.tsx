"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { canAddMember, getBranchDistribution } from "@/lib/teamConstraints";
import { Invite, Team } from "@/lib/types";
import { updateSessionTeam } from "@/lib/session";
import { CheckCircle2, XCircle } from "lucide-react";

interface InviteResponseCardProps {
  invite: Invite;
  team: Team | null;
  sessionUSN: string;
  onResponse: () => void;
}

export default function InviteResponseCard({ invite, team, sessionUSN, onResponse }: InviteResponseCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [responded, setResponded] = useState(false);
  const [responseType, setResponseType] = useState<"approved" | "rejected" | null>(null);

  const handleAccept = async () => {
    if (!team) return;
    setIsProcessing(true);
    setError("");

    try {
      // Find my pending entry
      const myEntry = team.members.find(m => m.usn === sessionUSN);
      if (!myEntry) throw new Error("You are not found in this team's invite list.");

      // Final constraint check
      const check = canAddMember(
        team.members.filter(m => m.usn !== sessionUSN),
        myEntry.branch,
      );
      if (!check.valid) throw new Error(check.errors[0]);

      // Update invite
      await updateDoc(doc(db, "invites", invite.inviteId), {
        status: "approved",
        respondedAt: serverTimestamp(),
      });

      // Update team member status
      const updatedMembers = team.members.map(m =>
        m.usn === sessionUSN
          ? { ...m, status: "approved" as const, joinedAt: new Date() }
          : m
      );
      const approvedCount = updatedMembers.filter(m => m.status === "approved").length;
      const newStatus = approvedCount >= 6 ? "full" : "forming";

      await updateDoc(doc(db, "teams", team.teamId), {
        members: updatedMembers,
        memberCount: approvedCount,
        status: newStatus,
        branchDistribution: getBranchDistribution(updatedMembers.filter(m => m.status === "approved")),
        updatedAt: serverTimestamp(),
      });

      // Update my registration
      await updateDoc(doc(db, "registrations", sessionUSN), {
        teamId: team.teamId,
        teamRole: "member",
      });

      // Update session
      updateSessionTeam(team.teamId, "member");

      setResponded(true);
      setResponseType("approved");
      onResponse();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    setError("");

    try {
      await updateDoc(doc(db, "invites", invite.inviteId), {
        status: "rejected",
        respondedAt: serverTimestamp(),
      });

      // Remove from team members
      if (team) {
        const updatedMembers = team.members.filter(m => m.usn !== sessionUSN);
        await updateDoc(doc(db, "teams", team.teamId), {
          members: updatedMembers,
          updatedAt: serverTimestamp(),
        });
      }

      setResponded(true);
      setResponseType("rejected");
      onResponse();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject invite.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (responded) {
    return (
      <div className="glass-card" style={{ padding: "32px", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, margin: "0 auto 16px", display: "grid", placeItems: "center" }}>
          {responseType === "approved" ? (
            <CheckCircle2 style={{ width: 40, height: 40, color: "#10b981" }} />
          ) : (
            <XCircle style={{ width: 40, height: 40, color: "var(--muted)" }} />
          )}
        </div>
        <p style={{ fontFamily: "var(--bebas)", fontSize: "24px", color: "var(--ink)" }}>
          {responseType === "approved" ? "Invite Accepted!" : "Invite Declined"}
        </p>
        {responseType === "approved" && (
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "8px" }}>
            You&apos;ve joined {team?.name || team?.teamId}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: "4px" }}>
          Team Invite
        </p>
        <p style={{ fontFamily: "var(--bebas)", fontSize: "28px", color: "var(--ink)", lineHeight: 1 }}>
          {team?.name || invite.teamName || invite.teamId}
        </p>
      </div>

      <div style={{ padding: "14px", border: "1px solid var(--line)", background: "var(--paper2)", marginBottom: "16px", fontSize: "13px" }}>
        <span style={{ color: "var(--muted)" }}>Invited by </span>
        <span style={{ fontWeight: 600, color: "var(--ink)" }}>{invite.fromName}</span>
        <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted)", marginLeft: "6px" }}>({invite.fromUSN})</span>
      </div>

      {/* Team members preview */}
      {team && (
        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: "8px" }}>
            Current Members ({team.members.filter(m => m.status === "approved").length}/6)
          </p>
          {team.members.filter(m => m.status === "approved").map(m => (
            <div key={m.usn} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: "13px" }}>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>{m.name}</span>
              <span style={{ marginLeft: "8px", color: "var(--muted)", fontSize: "11px" }}>{m.branch}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", fontSize: "12px", fontWeight: 600, background: "rgba(232, 52, 26, 0.08)", color: "var(--red)", border: "1.5px solid var(--red)", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={handleAccept} disabled={isProcessing} className="btn-primary" style={{ flex: 1, padding: "14px" }}>
          {isProcessing ? <div className="spinner" /> : "Accept & Join"}
        </button>
        <button onClick={handleReject} disabled={isProcessing} className="btn-secondary" style={{ flex: 1, padding: "14px" }}>
          Decline
        </button>
      </div>
    </div>
  );
}
