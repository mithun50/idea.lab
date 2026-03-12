"use client";

import { Users, Trophy, Database, UsersRound } from "lucide-react";

interface StatsProps {
    totalRegistrations: number;
    confirmedPairs: number;
    pendingRegistrations: number;
    teamsFormed: number;
    csvStudentCount?: number;
    teamsForming?: number;
    teamsFull?: number;
}

export default function AdminStats({
    totalRegistrations,
    confirmedPairs,
    pendingRegistrations,
    teamsFormed,
    csvStudentCount,
    teamsForming,
    teamsFull,
}: StatsProps) {
    const stats = [
        {
            label: "Total Registrations",
            value: totalRegistrations,
            icon: <Users style={{ width: 24, height: 24 }} />,
        },
        {
            label: "CSV Students",
            value: csvStudentCount ?? "—",
            icon: <Database style={{ width: 24, height: 24 }} />,
        },
        {
            label: "Teams Forming",
            value: teamsForming ?? confirmedPairs,
            icon: <UsersRound style={{ width: 24, height: 24 }} />,
        },
        {
            label: "Teams Full",
            value: teamsFull ?? teamsFormed,
            icon: <Trophy style={{ width: 24, height: 24 }} />,
        },
    ];

    return (
        <div className="admin-stats-grid">
            {stats.map((stat, i) => (
                <div
                    key={i}
                    className="glass-card"
                    style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between", animationDelay: `${i * 0.1}s` }}
                >
                    <div style={{ color: "var(--muted)", marginBottom: "16px" }}>{stat.icon}</div>
                    <div>
                        <p className="brand-font" style={{ fontSize: "48px", fontWeight: 900, lineHeight: 1, marginBottom: "4px", color: "var(--ink)" }}>{stat.value}</p>
                        <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)" }}>
                            {stat.label}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
