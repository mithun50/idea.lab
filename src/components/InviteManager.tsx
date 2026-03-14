"use client";

import { useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { validateUSN, getBranchName, getSection } from "@/lib/usnValidator";
import { generateInviteId } from "@/lib/idGenerator";
import { canAddMember } from "@/lib/teamConstraints";
import { createNotification } from "@/lib/notifications";
import { getSession } from "@/lib/session";
import { Team, Invite } from "@/lib/types";
import { Send, X, Loader2, Link2, Check, Share2 } from "lucide-react";

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
  const [lastInviteId, setLastInviteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyInviteLink = async (inviteId: string) => {
    const url = `${window.location.origin}/invite/${inviteId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: team.name || "Idea Lab Team Invite",
          text: `You've been invited to join ${team.name || team.teamId} on Idea Lab!`,
          url,
        });
        return;
      } catch { /* user cancelled or share failed, fall through to clipboard */ }
    }
    await navigator.clipboard.writeText(url);
    setCopiedId(inviteId);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedId(null), 2000);
  };

  const shareTeamLink = async () => {
    const pendingInvite = pendingInvites.find(inv => inv.type === "invite" && inv.status === "pending");
    const url = pendingInvite
      ? `${window.location.origin}/invite/${pendingInvite.inviteId}`
      : `${window.location.origin}/team/${team.teamId}`;
    const text = pendingInvite
      ? `You're invited to join ${team.name || team.teamId} on Idea Lab — DBIT, Bangalore!`
      : `Check out ${team.name || team.teamId} on Idea Lab — DBIT, Bangalore!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: team.name || "Join our team on Idea Lab", text, url });
        return;
      } catch { /* user cancelled or share failed, fall through to clipboard */ }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setLinkCopied(true);
    if (linkTimer.current) clearTimeout(linkTimer.current);
    linkTimer.current = setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLastInviteId(null);
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

      // Notify the invited student
      const session = getSession();
      createNotification({
        userId: upperUSN,
        type: "invite_received",
        title: "Team Invite",
        message: `${session?.name || team.leadUSN} invited you to join ${team.name || team.teamId}`,
        teamId: team.teamId,
        teamName: team.name ?? null,
        fromUSN: team.leadUSN,
        fromName: session?.name || team.members.find(m => m.usn === team.leadUSN)?.name || "",
        linkUrl: `/invite/${inviteId}`,
      });

      setSuccess(`Invite sent to ${toName}`);
      setLastInviteId(inviteId);
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
      {/* Share Invite Link */}
      <div style={{
        padding: "14px 16px",
        border: "1.5px dashed var(--line)",
        background: "var(--paper2)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
              Share Invite Link
            </p>
            <p style={{ fontSize: "11px", color: "var(--muted)", margin: "3px 0 0", lineHeight: 1.4 }}>
              Anyone with this link can request to join
            </p>
          </div>
          <button
            type="button"
            onClick={shareTeamLink}
            className="btn-primary"
            style={{
              padding: "10px 18px",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: 700,
              transition: "all 0.2s",
              ...(linkCopied ? { background: "#059669", borderColor: "#059669" } : {}),
            }}
          >
            {linkCopied ? (
              <><Check style={{ width: 14, height: 14 }} /> Copied!</>
            ) : (
              <><Share2 style={{ width: 14, height: 14 }} /> Share</>
            )}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ flex: 1, height: "1px", background: "var(--line)" }} />
        <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>or invite by USN</span>
        <div style={{ flex: 1, height: "1px", background: "var(--line)" }} />
      </div>

      {/* Send Invite Form */}
      <form onSubmit={handleSendInvite} style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={inviteUSN}
          onChange={(e) => { setInviteUSN(e.target.value.toUpperCase()); setError(""); setSuccess(""); setLastInviteId(null); }}
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
          <p>{success}</p>
          {lastInviteId && (
            <button
              type="button"
              onClick={() => copyInviteLink(lastInviteId)}
              style={{
                marginTop: "8px", background: "none", border: "1px solid #059669", borderRadius: "3px",
                padding: "6px 12px", fontSize: "11px", fontWeight: 700, color: "#059669",
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px",
              }}
            >
              {copiedId === lastInviteId ? (
                <><Check style={{ width: 12, height: 12 }} /> Link Copied!</>
              ) : (
                <><Link2 style={{ width: 12, height: 12 }} /> Share Invite Link</>
              )}
            </button>
          )}
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
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button
                    onClick={() => copyInviteLink(inv.inviteId)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: copiedId === inv.inviteId ? "#059669" : "var(--muted)", padding: "4px", transition: "color 0.2s" }}
                    title="Copy invite link"
                  >
                    {copiedId === inv.inviteId ? <Check style={{ width: 14, height: 14 }} /> : <Link2 style={{ width: 14, height: 14 }} />}
                  </button>
                  <button
                    onClick={() => handleCancelInvite(inv)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", padding: "4px" }}
                    title="Cancel invite"
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
