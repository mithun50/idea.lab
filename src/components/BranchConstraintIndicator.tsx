"use client";

import { getBranchDistribution } from "@/lib/teamConstraints";
import { TeamMember } from "@/lib/types";

interface BranchConstraintIndicatorProps {
  members: Pick<TeamMember, "branch" | "status">[];
  maxTeamSize?: number;
  maxSameBranch?: number;
}

const BRANCH_COLORS: Record<string, string> = {
  CSE: "#7c3aed",
  IOT: "#06b6d4",
  "AI&ML": "#f59e0b",
  "AI&DS": "#10b981",
  ISE: "#ef4444",
  ECE: "#8b5cf6",
  EEE: "#ec4899",
};

export default function BranchConstraintIndicator({
  members,
  maxTeamSize = 6,
  maxSameBranch = 4,
}: BranchConstraintIndicatorProps) {
  const approved = members.filter(m => m.status === "approved");
  const dist = getBranchDistribution(approved);
  const hasEEEorECE = (dist["EEE"] || 0) > 0 || (dist["ECE"] || 0) > 0;
  const slotsUsed = approved.length;
  const slotsOpen = maxTeamSize - slotsUsed;

  return (
    <div className="branch-constraint-indicator">
      {/* Slot bar */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
        {Array.from({ length: maxTeamSize }).map((_, i) => {
          const member = approved[i];
          const color = member ? (BRANCH_COLORS[member.branch] || "var(--ink)") : "var(--line)";
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: "8px",
                background: color,
                transition: "background 0.3s",
              }}
            />
          );
        })}
      </div>

      {/* Branch pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
        {Object.entries(dist)
          .sort(([, a], [, b]) => b - a)
          .map(([branch, count]) => (
            <span
              key={branch}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                border: `1.5px solid ${BRANCH_COLORS[branch] || "var(--ink)"}`,
                color: BRANCH_COLORS[branch] || "var(--ink)",
                background: count > maxSameBranch ? "rgba(232,52,26,0.1)" : "transparent",
              }}
            >
              {branch}: {count}/{maxSameBranch}
            </span>
          ))}
      </div>

      {/* Info line */}
      <div style={{ display: "flex", gap: "12px", fontSize: "10px", fontWeight: 600, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        <span>{slotsUsed}/{maxTeamSize} members</span>
        <span>{slotsOpen} open</span>
        <span style={{ color: hasEEEorECE ? "#059669" : (slotsUsed >= 4 ? "var(--red)" : "var(--muted)") }}>
          EEE/ECE: {hasEEEorECE ? "Yes" : "Needed"}
        </span>
      </div>
    </div>
  );
}
