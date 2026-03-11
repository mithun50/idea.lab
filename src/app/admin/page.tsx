"use client";

import { useState, useEffect, useCallback } from "react";
import { db, auth } from "@/lib/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    orderBy,
} from "firebase/firestore";
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
} from "firebase/auth";
import { generateTeams, StudentPair } from "@/lib/matchingAlgorithm";
import AdminStats from "@/components/AdminStats";
import StudentTable from "@/components/StudentTable";

/**
 * Admin Dashboard
 * 
 * Protected by Firebase Authentication (email/password).
 * Provides:
 * - Overview statistics
 * - Branch-wise breakdown chart
 * - Full student table with search & CSV export
 * - "Run Matching" button to generate teams
 */

interface Student {
    name: string;
    usn: string;
    phone: string;
    branch: string;
    section: string;
    partnerUSN: string;
    pairStatus: string;
    teamId: string | null;
}

export default function AdminPage() {
    // Auth state
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);

    // Data state
    const [students, setStudents] = useState<Student[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [matchingInProgress, setMatchingInProgress] = useState(false);
    const [matchingResult, setMatchingResult] = useState<string | null>(null);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Fetch students when authenticated
    const fetchStudents = useCallback(async () => {
        setDataLoading(true);
        try {
            const q = query(
                collection(db, "registrations"),
                orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(q);
            const data: Student[] = [];
            snapshot.forEach((docSnap) => {
                const d = docSnap.data();
                data.push({
                    name: d.name,
                    usn: d.usn,
                    phone: d.phone,
                    branch: d.branch,
                    section: d.section,
                    partnerUSN: d.partnerUSN,
                    pairStatus: d.pairStatus,
                    teamId: d.teamId || null,
                });
            });
            setStudents(data);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) fetchStudents();
    }, [user, fetchStudents]);

    // Login handler
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch {
            setLoginError("Invalid email or password. Please try again.");
        } finally {
            setLoginLoading(false);
        }
    };

    // Logout handler
    const handleLogout = async () => {
        await signOut(auth);
        setStudents([]);
    };

    /**
     * Run Matching Algorithm
     * 
     * 1. Collect all confirmed pairs
     * 2. Run the matching algorithm
     * 3. Write teamId to each student's Firestore document
     * 4. Refresh data
     */
    const runMatching = async () => {
        if (
            !confirm(
                "Are you sure you want to run the team matching algorithm? This will assign teams to all confirmed pairs."
            )
        ) {
            return;
        }

        setMatchingInProgress(true);
        setMatchingResult(null);

        try {
            // Collect confirmed pairs (only process each pair once)
            const confirmedStudents = students.filter(
                (s) => s.pairStatus === "confirmed"
            );
            const processedUSNs = new Set<string>();
            const pairs: StudentPair[] = [];

            for (const student of confirmedStudents) {
                if (
                    !processedUSNs.has(student.usn) &&
                    !processedUSNs.has(student.partnerUSN)
                ) {
                    pairs.push({
                        usn1: student.usn,
                        usn2: student.partnerUSN,
                        branch: student.branch,
                    });
                    processedUSNs.add(student.usn);
                    processedUSNs.add(student.partnerUSN);
                }
            }

            if (pairs.length === 0) {
                setMatchingResult("No confirmed pairs found to match.");
                return;
            }

            // Generate teams
            const teams = generateTeams(pairs);

            // Write teamId back to Firestore for each member
            const updatePromises: Promise<void>[] = [];
            for (const team of teams) {
                for (const memberUSN of team.members) {
                    updatePromises.push(
                        updateDoc(doc(db, "registrations", memberUSN), {
                            teamId: team.teamId,
                        })
                    );
                }
            }
            await Promise.all(updatePromises);

            setMatchingResult(
                `✅ Successfully formed ${teams.length} teams from ${pairs.length} pairs!`
            );

            // Refresh data
            await fetchStudents();
        } catch (error) {
            console.error("Matching error:", error);
            setMatchingResult("❌ Error running matching algorithm. Check console.");
        } finally {
            setMatchingInProgress(false);
        }
    };

    // Compute statistics
    const totalRegistrations = students.length;
    const confirmedPairs = Math.floor(
        students.filter((s) => s.pairStatus === "confirmed").length / 2
    );
    const pendingRegistrations = students.filter(
        (s) => s.pairStatus === "pending"
    ).length;
    const teamsFormed = new Set(
        students.filter((s) => s.teamId).map((s) => s.teamId)
    ).size;

    // Branch-wise statistics
    const branchStats: Record<string, number> = {};
    students.forEach((s) => {
        branchStats[s.branch] = (branchStats[s.branch] || 0) + 1;
    });
    const maxBranchCount = Math.max(...Object.values(branchStats), 1);

    const branchColors: Record<string, string> = {
        CSE: "#7c3aed",
        IOT: "#06b6d4",
        "AI&ML": "#f59e0b",
        "AI&DS": "#10b981",
        ISE: "#ef4444",
        ECE: "#8b5cf6",
        EEE: "#ec4899",
    };

    // --- Login Screen ---
    if (authLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </main>
        );
    }

    if (!user) {
        return (
            <main className="min-h-screen flex items-center justify-center px-4">
                <div className="w-full max-w-sm fade-in-up">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center mx-auto mb-4 text-2xl">
                            🔒
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Admin Login</h1>
                        <p className="text-slate-400 text-sm">
                            Sign in to access the Idea Lab dashboard
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="glass-card p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@dbit.in"
                                className="input-field"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input-field"
                                required
                            />
                        </div>
                        {loginError && (
                            <p className="text-red-400 text-sm">{loginError}</p>
                        )}
                        <button
                            type="submit"
                            disabled={loginLoading}
                            className="btn-primary w-full"
                        >
                            {loginLoading ? (
                                <div className="spinner" />
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>
                </div>
            </main>
        );
    }

    // --- Dashboard ---
    return (
        <main className="min-h-screen">
            {/* Top Bar */}
            <nav className="border-b border-white/10 bg-white/[0.02] backdrop-blur-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-lg">
                            💡
                        </div>
                        <div>
                            <span className="font-bold text-lg tracking-tight">
                                Idea Lab Admin
                            </span>
                            <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn-secondary text-sm !py-2">
                        Sign Out
                    </button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* Loading */}
                {dataLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div
                                className="spinner mx-auto mb-4"
                                style={{ width: 40, height: 40 }}
                            />
                            <p className="text-slate-400">Loading registrations...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Stats */}
                        <AdminStats
                            totalRegistrations={totalRegistrations}
                            confirmedPairs={confirmedPairs}
                            pendingRegistrations={pendingRegistrations}
                            teamsFormed={teamsFormed}
                        />

                        {/* Branch Distribution + Actions */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Branch Distribution */}
                            <div className="glass-card p-6 lg:col-span-2">
                                <h2 className="font-bold text-lg mb-4">
                                    Branch-wise Distribution
                                </h2>
                                <div className="space-y-3">
                                    {Object.entries(branchStats)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([branch, count]) => (
                                            <div key={branch} className="flex items-center gap-4">
                                                <span className="text-sm font-medium w-16 text-slate-300">
                                                    {branch}
                                                </span>
                                                <div className="flex-1 h-8 rounded-lg overflow-hidden bg-white/5">
                                                    <div
                                                        className="h-full rounded-lg transition-all duration-700 flex items-center pl-3"
                                                        style={{
                                                            width: `${(count / maxBranchCount) * 100}%`,
                                                            backgroundColor:
                                                                branchColors[branch] || "#7c3aed",
                                                            minWidth: "40px",
                                                        }}
                                                    >
                                                        <span className="text-xs font-bold text-white/90">
                                                            {count}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Run Matching Action */}
                            <div className="glass-card p-6 flex flex-col justify-between">
                                <div>
                                    <h2 className="font-bold text-lg mb-2">Team Matching</h2>
                                    <p className="text-slate-400 text-sm mb-4">
                                        Run the matching algorithm to form cross-branch teams of 6
                                        from confirmed pairs.
                                    </p>
                                    <div className="text-sm space-y-2 mb-6">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Ready pairs</span>
                                            <span className="font-medium text-emerald-400">
                                                {confirmedPairs}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Estimated teams</span>
                                            <span className="font-medium text-cyan-400">
                                                ~{Math.floor(confirmedPairs / 3)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={runMatching}
                                        disabled={matchingInProgress || confirmedPairs < 3}
                                        className="btn-primary w-full"
                                    >
                                        {matchingInProgress ? (
                                            <>
                                                <div className="spinner" />
                                                Running...
                                            </>
                                        ) : (
                                            <>
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                    />
                                                </svg>
                                                Run Matching
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={fetchStudents}
                                        className="btn-secondary w-full text-sm"
                                    >
                                        ↻ Refresh Data
                                    </button>

                                    {matchingResult && (
                                        <p
                                            className={`text-sm p-3 rounded-lg ${matchingResult.startsWith("✅")
                                                    ? "bg-emerald-500/15 text-emerald-300"
                                                    : matchingResult.startsWith("❌")
                                                        ? "bg-red-500/15 text-red-300"
                                                        : "bg-amber-500/15 text-amber-300"
                                                }`}
                                        >
                                            {matchingResult}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Student Table */}
                        <div className="glass-card p-6">
                            <h2 className="font-bold text-lg mb-4">All Registrations</h2>
                            <StudentTable students={students} />
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
