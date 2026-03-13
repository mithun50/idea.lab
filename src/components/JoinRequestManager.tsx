"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { canAddMember, getBranchDistribution } from "@/lib/teamConstraints";
import { Team, Invite } from "@/lib/types";
import { Check, X } from "lucide-react";

interface JoinRequestManagerProps {
  team: Team;
  pendingRequests: Invite[];
  onRefresh: () => void;
}

export default function JoinRequestManager({ team, pendingRequests, onRefresh }: JoinRequestManagerProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleApprove = async (request: Invite) => {
    setProcessing(request.inviteId);
    setError("");

    try {
      // Find the pending member entry
      const pendingMember = team.members.find(m => m.usn === request.fromUSN);
      if (!pendingMember) throw new Error("Requester not found in team members.");

      // Re-check constraints
      const check = canAddMember(
        team.members.filter(m => m.usn !== request.fromUSN),
        pendingMember.branch,
      );
      if (!check.valid) throw new Error(check.errors[0]);

      // Update invite status
      await updateDoc(doc(db, "invites", request.inviteId), {
        status: "approved",
        respondedAt: serverTimestamp(),
      });

      // Update member status in team
      const updatedMembers = team.members.map(m =>
        m.usn === request.fromUSN
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

      // Update requester's registration
      await updateDoc(doc(db, "registrations", request.fromUSN), {
        teamId: team.teamId,
        teamRole: "member",
      });

      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request.");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (request: Invite) => {
    setProcessing(request.inviteId);
    setError("");

    try {
      await updateDoc(doc(db, "invites", request.inviteId), {
        status: "rejected",
        respondedAt: serverTimestamp(),
      });

      // Remove pending member from team
      const updatedMembers = team.members.filter(m => m.usn !== request.fromUSN);
      await updateDoc(doc(db, "teams", team.teamId), {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });

      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request.");
    } finally {
      setProcessing(null);
    }
  };

  const incomingRequests = pendingRequests.filter(r => r.type === "request" && r.status === "pending");

  if (incomingRequests.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", border: "1.5px dashed var(--line)" }}>
        <p style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>No pending join requests</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {error && (
        <div style={{ padding: "10px 14px", fontSize: "12px", fontWeight: 600, background: "rgba(232, 52, 26, 0.08)", color: "var(--red)", border: "1.5px solid var(--red)" }}>
          {error}
        </div>
      )}

      {incomingRequests.map(req => (
        <div
          key={req.inviteId}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", border: "1.5px solid var(--line)", background: "var(--paper2)",
          }}
        >
          <div>
            <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)" }}>{req.fromName}</p>
            <p style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }}>{req.fromUSN}</p>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => handleApprove(req)}
              disabled={processing === req.inviteId}
              style={{
                padding: "8px 12px", background: "#10b981", color: "#fff", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}
            >
              <Check style={{ width: 14, height: 14 }} /> Approve
            </button>
            <button
              onClick={() => handleReject(req)}
              disabled={processing === req.inviteId}
              style={{
                padding: "8px 12px", background: "transparent", color: "var(--red)", border: "1.5px solid var(--red)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}
            >
              <X style={{ width: 14, height: 14 }} /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
