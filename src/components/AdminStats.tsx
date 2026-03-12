"use client";

import { Users, UserCheck, Hourglass, Trophy } from "lucide-react";

interface StatsProps {
    totalRegistrations: number;
    confirmedPairs: number;
    pendingRegistrations: number;
    teamsFormed: number;
}

export default function AdminStats({
    totalRegistrations,
    confirmedPairs,
    pendingRegistrations,
    teamsFormed,
}: StatsProps) {
    const stats = [
        {
            label: "Total Registrations",
            value: totalRegistrations,
            icon: <Users className="w-6 h-6" />,
        },
        {
            label: "Confirmed Pairs",
            value: confirmedPairs,
            icon: <UserCheck className="w-6 h-6" />,
        },
        {
            label: "Pending",
            value: pendingRegistrations,
            icon: <Hourglass className="w-6 h-6" />,
        },
        {
            label: "Teams Formed",
            value: teamsFormed,
            icon: <Trophy className="w-6 h-6" />,
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
                <div
                    key={i}
                    className="glass-card flex flex-col justify-between"
                    style={{ padding: "24px", animationDelay: `${i * 0.1}s` }}
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
