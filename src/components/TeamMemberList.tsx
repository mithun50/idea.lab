"use client";

import { useState } from "react";
import { TeamMember } from "@/lib/types";
import { UserMinus } from "lucide-react";

const BRANCH_COLORS: Record<string, string> = {
  CSE: "#7c3aed", IOT: "#06b6d4", "AI&ML": "#f59e0b",
  "AI&DS": "#10b981", ISE: "#ef4444", ECE: "#8b5cf6", EEE: "#ec4899",
};

interface TeamMemberListProps {
  members: TeamMember[];
  leadUSN: string;
  isLead?: boolean;
  memberDetails?: Record<string, { email: string; phone: string }>;
  onRemove?: (usn: string, wasApproved: boolean) => void;
  teamStatus?: "forming" | "full" | "locked";
}

export default function TeamMemberList({
  members,
  leadUSN,
  isLead,
  memberDetails,
  onRemove,
  teamStatus,
}: TeamMemberListProps) {
  const [confirmUSN, setConfirmUSN] = useState<string | null>(null);

  const handleRemove = (usn: string, wasApproved: boolean) => {
    if (!onRemove) return;
    if (wasApproved) {
      // Show confirmation for approved members
      setConfirmUSN(usn);
    } else {
      // Remove pending members immediately
      onRemove(usn, false);
    }
  };

  const confirmKick = (usn: string) => {
    if (!onRemove) return;
    onRemove(usn, true);
    setConfirmUSN(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {members.map((member, i) => {
        const isThisLead = member.usn === leadUSN;
        const isApproved = member.status === "approved";
        const showActions = isLead && !isThisLead && onRemove && teamStatus === "forming";
        const details = isLead && memberDetails && !isThisLead ? memberDetails[member.usn] : null;

        return (
          <div
            key={member.usn}
            style={{
              padding: "12px 16px",
              background: i % 2 === 0 ? "var(--paper2)" : "var(--paper)",
              border: "1px solid var(--line)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {/* Branch color dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: BRANCH_COLORS[member.branch] || "var(--ink)",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                    {member.name}
                    {isThisLead && (
                      <span style={{
                        fontSize: "8px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
                        background: "var(--ink)", color: "var(--paper)", padding: "1px 5px",
                      }}>
                        Lead
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {member.branch} — Section {member.section}
                  </p>
                  {details && (details.email || details.phone) && (
                    <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                      {details.email}{details.phone ? ` · ${details.phone}` : ""}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted)" }}>{member.usn}</span>
                {member.status === "pending_invite" && (
                  <span className="badge badge-warning" style={{ fontSize: "8px" }}>Invited</span>
                )}
                {member.status === "pending_request" && (
                  <span className="badge badge-warning" style={{ fontSize: "8px" }}>Requested</span>
                )}
                {isApproved && (
                  <span className="badge badge-success" style={{ fontSize: "8px" }}>Joined</span>
                )}
              </div>
            </div>

            {/* Kick / Remove actions for lead */}
            {showActions && (
              <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                {confirmUSN === member.usn ? (
                  <>
                    <span style={{ fontSize: "11px", color: "#E8341A", fontWeight: 600 }}>
                      Kick {member.name}?
                    </span>
                    <button
                      onClick={() => confirmKick(member.usn)}
                      style={{
                        fontFamily: "var(--font-body)", fontSize: "11px",
                        background: "#E8341A", color: "#fff",
                        border: "none", borderRadius: "3px",
                        padding: "4px 12px", cursor: "pointer",
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmUSN(null)}
                      style={{
                        fontFamily: "var(--font-body)", fontSize: "11px",
                        background: "none", color: "var(--muted)",
                        border: "1px solid var(--line)", borderRadius: "3px",
                        padding: "4px 12px", cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleRemove(member.usn, isApproved)}
                    style={{
                      fontFamily: "var(--font-body)", fontSize: "11px",
                      background: "none", color: "#E8341A",
                      border: "1px solid rgba(232,52,26,0.3)", borderRadius: "3px",
                      padding: "4px 12px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "4px",
                    }}
                  >
                    <UserMinus style={{ width: 12, height: 12 }} />
                    {isApproved ? "Kick" : "Remove Invite"}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
