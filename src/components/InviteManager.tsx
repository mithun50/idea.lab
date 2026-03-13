"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { validateUSN, getBranchName, getSection } from "@/lib/usnValidator";
import { generateInviteId } from "@/lib/idGenerator";
import { canAddMember } from "@/lib/teamConstraints";
import { Team, Invite } from "@/lib/types";
import { Send, X, Loader2 } from "lucide-react";

interface InviteManagerProps {
  team: Team;
  pendingInvites: Invite[];
  onRefresh: () => void;
}

export default function InviteManager({ team, pendingInvites, onRefresh }: InviteManagerProps) {
  const [inviteUSN, setInviteUSN] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSending(true);

    const upperUSN = inviteUSN.toUpperCase().trim();

    try {
      // Validate USN format
      const result = validateUSN(upperUSN);
      if (!result.valid) throw new Error(result.error || "Invalid USN");

      // Check if already a member
      if (team.members.some(m => m.usn === upperUSN)) {
        throw new Error("This student is already on the team.");
      }

      // Check if already has a pending invite
      const existingInvite = pendingInvites.find(inv => inv.toUSN === upperUSN && inv.status === "pending");
      if (existingInvite) throw new Error("An invite is already pending for this student.");

      // Check branch constraints
      const candidateBranch = result.branch || getBranchName(upperUSN);
      const check = canAddMember(team.members, candidateBranch);
      if (!check.valid) throw new Error(check.errors[0]);

      // Check if student is registered
      const regDoc = await getDoc(doc(db, "registrations", upperUSN));
      let toName = upperUSN;
      if (regDoc.exists()) {
        const regData = regDoc.data();
        if (regData.teamId) throw new Error("This student is already on another team.");
        toName = regData.name || upperUSN;
      }

      // Look up student master data for name
      if (toName === upperUSN) {
        const studentDoc = await getDoc(doc(db, "students", upperUSN));
        if (studentDoc.exists()) {
          toName = studentDoc.data().name || upperUSN;
        }
      }

      // Create invite
      const inviteId = generateInviteId();
      await setDoc(doc(db, "invites", inviteId), {
        inviteId,
        type: "invite",
        teamId: team.teamId,
        teamName: team.name || null,
        fromUSN: team.leadUSN,
        fromName: team.members.find(m => m.usn === team.leadUSN)?.name || "",
        toUSN: upperUSN,
        toName,
        status: "pending",
        createdAt: serverTimestamp(),
        respondedAt: null,
      });

      // Add as pending member in team
      const teamRef = doc(db, "teams", team.teamId);
      const newMember = {
        usn: upperUSN,
        name: toName,
        branch: candidateBranch,
        section: result.section || getSection(upperUSN),
        status: "pending_invite",
        joinedAt: null,
      };
      await updateDoc(teamRef, {
        members: [...team.members, newMember],
        updatedAt: serverTimestamp(),
      });

      setSuccess(`Invite sent to ${toName}`);
      setInviteUSN("");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelInvite = async (invite: Invite) => {
    try {
      await updateDoc(doc(db, "invites", invite.inviteId), {
        status: "expired",
        respondedAt: serverTimestamp(),
      });

      // Remove pending member from team
      const teamRef = doc(db, "teams", team.teamId);
      const updatedMembers = team.members.filter(m => m.usn !== invite.toUSN);
      await updateDoc(teamRef, {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });

      onRefresh();
    } catch {
      setError("Failed to cancel invite.");
    }
  };

  const outgoingPending = pendingInvites.filter(inv => inv.type === "invite" && inv.status === "pending");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Send Invite Form */}
      <form onSubmit={handleSendInvite} style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={inviteUSN}
          onChange={(e) => { setInviteUSN(e.target.value.toUpperCase()); setError(""); setSuccess(""); }}
          placeholder="Enter USN to invite"
          className="input-field"
          style={{ flex: 1, fontFamily: "monospace" }}
          maxLength={10}
        />
        <button type="submit" disabled={isSending || !inviteUSN.trim()} className="btn-primary" style={{ padding: "12px 20px", whiteSpace: "nowrap" }}>
          {isSending ? <Loader2 style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }} /> : <><Send style={{ width: 14, height: 14 }} /> Invite</>}
        </button>
      </form>

      {error && (
        <div style={{ padding: "10px 14px", fontSize: "12px", fontWeight: 600, background: "rgba(232, 52, 26, 0.08)", color: "var(--red)", border: "1.5px solid var(--red)" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: "10px 14px", fontSize: "12px", fontWeight: 600, background: "rgba(16, 185, 129, 0.08)", color: "#059669", border: "1.5px solid #059669" }}>
          {success}
        </div>
      )}

      {/* Pending Invites */}
      {outgoingPending.length > 0 && (
        <div>
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: "8px" }}>
            Pending Invites
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {outgoingPending.map(inv => (
              <div
                key={inv.inviteId}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", border: "1px solid var(--line)", background: "var(--paper2)",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)" }}>{inv.toName}</span>
                  <span style={{ marginLeft: "8px", fontFamily: "monospace", fontSize: "11px", color: "var(--muted)" }}>{inv.toUSN}</span>
                </div>
                <button
                  onClick={() => handleCancelInvite(inv)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", padding: "4px" }}
                  title="Cancel invite"
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
