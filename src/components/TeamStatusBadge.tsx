"use client";

interface TeamStatusBadgeProps {
  status: "forming" | "full" | "locked";
}

const styles: Record<string, { bg: string; color: string; border: string }> = {
  forming: { bg: "rgba(245, 158, 11, 0.12)", color: "#d97706", border: "#d97706" },
  full: { bg: "rgba(16, 185, 129, 0.12)", color: "#059669", border: "#059669" },
  locked: { bg: "rgba(13, 13, 13, 0.08)", color: "var(--ink)", border: "var(--ink)" },
};

export default function TeamStatusBadge({ status }: TeamStatusBadgeProps) {
  const s = styles[status] || styles.forming;
  return (
    <span
      className="badge"
      style={{
        background: s.bg,
        color: s.color,
        borderColor: s.border,
      }}
    >
      {status}
    </span>
  );
}
