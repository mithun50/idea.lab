"use client";

import { Team } from "@/lib/types";
import TeamStatusBadge from "./TeamStatusBadge";
import { Users } from "lucide-react";

const BRANCH_COLORS: Record<string, string> = {
  CSE: "#7c3aed", IOT: "#06b6d4", "AI&ML": "#f59e0b",
  "AI&DS": "#10b981", ISE: "#ef4444", ECE: "#8b5cf6", EEE: "#ec4899",
};

interface TeamCardProps {
  team: Team;
  onRequestJoin?: (teamId: string) => void;
  isRequesting?: boolean;
  currentUSN?: string;
  isRejected?: boolean;
}

export default function TeamCard({ team, onRequestJoin, isRequesting, currentUSN, isRejected }: TeamCardProps) {
  const approvedMembers = team.members.filter(m => m.status === "approved");
  const openSlots = 6 - approvedMembers.length;
  const isMember = currentUSN ? team.members.some(m => m.usn === currentUSN) : false;
  const leadMember = approvedMembers.find(m => m.usn === team.leadUSN);

  return (
    <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontFamily: "var(--bebas)", fontSize: "22px", letterSpacing: "0.04em", color: "var(--ink)", lineHeight: 1 }}>
            {team.name || team.teamId}
          </p>
          {team.name && (
            <p style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--muted)", marginTop: "4px" }}>{team.teamId}</p>
          )}
        </div>
        <TeamStatusBadge status={team.status} />
      </div>

      {/* Lead */}
      {leadMember && (
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
          <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "10px" }}>Lead: </span>
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>{leadMember.name}</span>
          <span style={{ marginLeft: "6px", fontFamily: "monospace", fontSize: "11px" }}>({leadMember.branch})</span>
        </div>
      )}

      {/* Branch bar */}
      <div style={{ display: "flex", gap: "3px", height: "6px" }}>
        {Array.from({ length: 6 }).map((_, i) => {
          const member = approvedMembers[i];
          const color = member ? (BRANCH_COLORS[member.branch] || "var(--ink)") : "var(--line)";
          return <div key={i} style={{ flex: 1, background: color, transition: "background 0.3s" }} />;
        })}
      </div>

      {/* Branch pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        {Object.entries(team.branchDistribution || {}).map(([branch, count]) => (
          <span
            key={branch}
            style={{
              fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "2px 6px", border: `1px solid ${BRANCH_COLORS[branch] || "var(--ink)"}`,
              color: BRANCH_COLORS[branch] || "var(--ink)",
            }}
          >
            {branch} {count}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
          <Users style={{ width: 14, height: 14 }} />
          {approvedMembers.length}/6 members · {openSlots} open
        </span>

        {isRejected && !isMember && (
          <span style={{
            fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
            padding: "4px 10px", borderRadius: "20px",
            background: "rgba(232,52,26,0.08)", color: "var(--red)",
          }}>
            Request Rejected
          </span>
        )}

        {onRequestJoin && !isMember && !isRejected && team.status === "forming" && (
          <button
            onClick={() => onRequestJoin(team.teamId)}
            disabled={isRequesting}
            className="btn-primary"
            style={{ padding: "8px 16px", fontSize: "10px" }}
          >
            {isRequesting ? <div className="spinner" style={{ width: 14, height: 14 }} /> : "Request to Join"}
          </button>
        )}

        {isMember && (
          <span className="badge badge-success">Member</span>
        )}
      </div>
    </div>
  );
}
