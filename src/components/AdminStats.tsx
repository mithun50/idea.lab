"use client";

/**
 * AdminStats Component
 * 
 * Displays summary statistics cards for the admin dashboard:
 * - Total registrations
 * - Confirmed pairs
 * - Pending registrations
 * - Teams formed
 */

interface StatsProps {
    totalRegistrations: number;
    confirmedPairs: number;
    pendingRegistrations: number;
    teamsFormed: number;
}

import { Users, UserCheck, Hourglass, Trophy } from "lucide-react";

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
            gradient: "from-violet-600 to-violet-400",
            bgGlow: "rgba(124, 58, 237, 0.15)",
        },
        {
            label: "Confirmed Pairs",
            value: confirmedPairs,
            icon: <UserCheck className="w-6 h-6" />,
            gradient: "from-emerald-600 to-emerald-400",
            bgGlow: "rgba(16, 185, 129, 0.15)",
        },
        {
            label: "Pending",
            value: pendingRegistrations,
            icon: <Hourglass className="w-6 h-6" />,
            gradient: "from-amber-600 to-amber-400",
            bgGlow: "rgba(245, 158, 11, 0.15)",
        },
        {
            label: "Teams Formed",
            value: teamsFormed,
            icon: <Trophy className="w-6 h-6" />,
            gradient: "from-cyan-600 to-cyan-400",
            bgGlow: "rgba(6, 182, 212, 0.15)",
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
                <div
                    key={i}
                    className="glass-card p-5 relative overflow-hidden"
                    style={{ animationDelay: `${i * 0.1}s` }}
                >
                    {/* Background glow */}
                    <div
                        className="absolute inset-0 opacity-30"
                        style={{
                            background: `radial-gradient(circle at top right, ${stat.bgGlow}, transparent 70%)`,
                        }}
                    />
                    <div className="relative">
                        <div className="mb-2 text-white">{stat.icon}</div>
                        <p className="text-3xl font-black mb-1">{stat.value}</p>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                            {stat.label}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
