"use client";

import { TeamMember } from "@/lib/types";

const BRANCH_COLORS: Record<string, string> = {
  CSE: "#7c3aed", IOT: "#06b6d4", "AI&ML": "#f59e0b",
  "AI&DS": "#10b981", ISE: "#ef4444", ECE: "#8b5cf6", EEE: "#ec4899",
};

interface TeamMemberListProps {
  members: TeamMember[];
  leadUSN: string;
}

export default function TeamMemberList({ members, leadUSN }: TeamMemberListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {members.map((member, i) => (
        <div
          key={member.usn}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: i % 2 === 0 ? "var(--paper2)" : "var(--paper)",
            border: "1px solid var(--line)",
          }}
        >
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
                {member.usn === leadUSN && (
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
            {member.status === "approved" && (
              <span className="badge badge-success" style={{ fontSize: "8px" }}>Joined</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
