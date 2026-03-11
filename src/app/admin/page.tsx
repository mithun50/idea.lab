"use client";

import { useState, useEffect, useCallback } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { generateTeams, StudentPair } from "@/lib/matchingAlgorithm";
import AdminStats from "@/components/AdminStats";
import StudentTable from "@/components/StudentTable";
import { LayoutDashboard, Users, UsersRound, Trophy, Settings, LogOut, Lightbulb, UserPlus, Play } from "lucide-react";

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

type TabType = "dashboard" | "registrations" | "pairs" | "teams" | "admins" | "settings";

export default function AdminPage() {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    
    const [activeTab, setActiveTab] = useState<TabType>("dashboard");
    const [students, setStudents] = useState<Student[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [matchingInProgress, setMatchingInProgress] = useState(false);
    const [matchingResult, setMatchingResult] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const fetchStudents = useCallback(async () => {
        setDataLoading(true);
        try {
            const q = query(collection(db, "registrations"), orderBy("createdAt", "desc"));
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

    const handleLogout = async () => {
        await signOut(auth);
        setStudents([]);
    };

    const runMatching = async () => {
        if (!confirm("Are you sure you want to run the team matching algorithm? This will assign teams to all confirmed pairs.")) return;
        setMatchingInProgress(true);
        setMatchingResult(null);

        try {
            const confirmedStudents = students.filter((s) => s.pairStatus === "confirmed");
            const processedUSNs = new Set<string>();
            const pairs: StudentPair[] = [];

            for (const student of confirmedStudents) {
                if (!processedUSNs.has(student.usn) && !processedUSNs.has(student.partnerUSN)) {
                    pairs.push({ usn1: student.usn, usn2: student.partnerUSN, branch: student.branch });
                    processedUSNs.add(student.usn);
                    processedUSNs.add(student.partnerUSN);
                }
            }

            if (pairs.length === 0) {
                setMatchingResult("No confirmed pairs found to match.");
                return;
            }

            const teams = generateTeams(pairs);
            const updatePromises: Promise<void>[] = [];
            
            for (const team of teams) {
                for (const memberUSN of team.members) {
                    updatePromises.push(updateDoc(doc(db, "registrations", memberUSN), { teamId: team.teamId }));
                }
            }
            await Promise.all(updatePromises);

            setMatchingResult(`✅ Successfully formed ${teams.length} teams from ${pairs.length} pairs!`);
            await fetchStudents();
        } catch (error) {
            console.error("Matching error:", error);
            setMatchingResult("❌ Error running matching algorithm. Check console.");
        } finally {
            setMatchingInProgress(false);
        }
    };

    const totalRegistrations = students.length;
    const confirmedPairs = Math.floor(students.filter((s) => s.pairStatus === "confirmed").length / 2);
    const pendingRegistrations = students.filter((s) => s.pairStatus === "pending").length;
    const teamsFormed = new Set(students.filter((s) => s.teamId).map((s) => s.teamId)).size;

    const branchStats: Record<string, number> = {};
    students.forEach((s) => { branchStats[s.branch] = (branchStats[s.branch] || 0) + 1; });
    const maxBranchCount = Math.max(...Object.values(branchStats), 1);

    const branchColors: Record<string, string> = {
        CSE: "#7c3aed", IOT: "#06b6d4", "AI&ML": "#f59e0b",
        "AI&DS": "#10b981", ISE: "#ef4444", ECE: "#8b5cf6", EEE: "#ec4899",
    };

    if (authLoading) {
        return <main className="min-h-screen flex items-center justify-center"><div className="spinner" style={{ width: 40, height: 40 }} /></main>;
    }

    if (!user) {
        return (
            <main className="min-h-screen flex items-center justify-center px-4">
                <div className="w-full max-w-md fade-in-up">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-xl shadow-violet-500/20 flex items-center justify-center mx-auto mb-4 text-white">
                            <Lightbulb className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2 brand-font">Admin Panel</h1>
                        <p className="text-slate-400 text-sm">Sign in securely to access the Idea Lab dashboard</p>
                    </div>

                    <form onSubmit={handleLogin} className="glass-card p-6 md:p-8 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@dbit.in" className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field" required />
                        </div>
                        {loginError && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{loginError}</p>}
                        
                        <button type="submit" disabled={loginLoading} className="btn-primary w-full !py-4">
                            {loginLoading ? <div className="spinner" /> : "Sign In to Dashboard"}
                        </button>
                    </form>
                </div>
            </main>
        );
    }

    const navigationItems = [
        { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: "registrations", label: "Registrations", icon: <Users className="w-5 h-5" /> },
        { id: "pairs", label: "Pairs", icon: <UsersRound className="w-5 h-5" /> },
        { id: "teams", label: "Teams", icon: <Trophy className="w-5 h-5" /> },
        { id: "admins", label: "Admins", icon: <UserPlus className="w-5 h-5" /> },
        { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> }
    ];

    return (
        <main className="min-h-screen flex bg-zinc-950 text-white">
            
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-white/[0.02] flex flex-col hidden md:flex sticky top-0 h-screen">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-violet-500/20">
                            <Lightbulb className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg tracking-tight brand-font">Idea Lab Admin</span>
                    </div>

                    <nav className="space-y-2">
                        {navigationItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as TabType)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium
                                    ${activeTab === item.id ? 'bg-violet-600/10 text-violet-300 border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}
                                `}
                            >
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6 mt-auto border-t border-white/10">
                    <p className="text-xs text-slate-500 break-all mb-4">{user.email}</p>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
                        <LogOut className="w-5 h-5" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Topbar */}
            <div className="md:hidden fixed top-0 w-full z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                        <Lightbulb className="w-4 h-4 text-white" />
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                   {navigationItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as TabType)}
                            className={`px-3 py-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors
                                ${activeTab === item.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}
                            `}
                        >
                            {item.label}
                        </button>
                    ))}
                    <button onClick={handleLogout} className="px-3 py-1.5 whitespace-nowrap rounded-md text-xs font-medium text-red-400 hover:text-red-300">
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full max-w-[100vw] overflow-x-hidden">
                
                {dataLoading ? (
                    <div className="flex items-center justify-center h-[60vh]">
                        <div className="text-center">
                            <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40 }} />
                            <p className="text-slate-400">Loading dashboard data...</p>
                        </div>
                    </div>
                ) : (
                    <div className="fade-in-up space-y-8 max-w-6xl mx-auto">
                        
                        {activeTab === "dashboard" && (
                            <>
                                <div>
                                    <h1 className="text-3xl font-bold mb-2 brand-font">Overview</h1>
                                    <p className="text-slate-400">Real-time statistics of the Idea Lab event.</p>
                                </div>
                                
                                <AdminStats totalRegistrations={totalRegistrations} confirmedPairs={confirmedPairs} pendingRegistrations={pendingRegistrations} teamsFormed={teamsFormed} />

                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                    <div className="glass-card p-6 xl:col-span-2 shadow-2xl">
                                        <h2 className="font-bold text-lg mb-6 flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-violet-400"/> Branch Distribution</h2>
                                        <div className="space-y-4">
                                            {Object.entries(branchStats).sort(([, a], [, b]) => b - a).map(([branch, count]) => (
                                                <div key={branch} className="flex items-center gap-4">
                                                    <span className="text-sm font-bold w-16 text-slate-300">{branch}</span>
                                                    <div className="flex-1 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/5 relative">
                                                        <div
                                                            className="absolute top-0 left-0 h-full rounded-xl transition-all duration-1000 ease-out flex items-center pl-4"
                                                            style={{
                                                                width: `${(count / maxBranchCount) * 100}%`,
                                                                backgroundColor: branchColors[branch] || "#7c3aed",
                                                                minWidth: "48px",
                                                            }}
                                                        >
                                                            <span className="text-sm font-bold text-white shadow-sm">{count}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="glass-card p-6 flex flex-col shadow-2xl border-t-2 border-t-cyan-500">
                                        <div>
                                            <h2 className="font-bold text-lg mb-2 flex items-center gap-2"><Trophy className="w-5 h-5 text-cyan-400"/> Team Matching</h2>
                                            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                                Run the matching algorithm to aggregate confirmed pairs into cross-branch teams of 6.
                                            </p>
                                            <div className="text-sm space-y-3 mb-8 bg-black/20 p-4 rounded-xl border border-white/5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">Ready Pairs Data</span>
                                                    <span className="font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">{confirmedPairs}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">Expected Teams</span>
                                                    <span className="font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-lg">~{Math.floor(confirmedPairs / 3)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mt-auto">
                                            <button onClick={runMatching} disabled={matchingInProgress || confirmedPairs < 3} className="btn-primary w-full !py-4 shadow-lg shadow-violet-600/20">
                                                {matchingInProgress ? <><div className="spinner" /> Running...</> : <><Play className="w-5 h-5 fill-current" /> Execute Matching Algorithm</>}
                                            </button>
                                            {matchingResult && (
                                                <p className={`text-sm p-4 rounded-xl font-medium ${matchingResult.startsWith("✅") ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : matchingResult.startsWith("❌") ? "bg-red-500/15 text-red-300 border border-red-500/20" : "bg-amber-500/15 text-amber-300 border border-amber-500/20"}`}>
                                                    {matchingResult}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === "registrations" && (
                            <div className="fade-in-up">
                                <div className="mb-6 flex items-center justify-between">
                                     <div>
                                        <h1 className="text-3xl font-bold mb-2 brand-font">Registrations</h1>
                                        <p className="text-slate-400">View and manage all student registrations.</p>
                                     </div>
                                     <button onClick={fetchStudents} className="btn-secondary !py-2 text-sm hidden sm:flex">↻ Refresh</button>
                                </div>
                                <div className="glass-card p-6 shadow-2xl">
                                    <StudentTable students={students} />
                                </div>
                            </div>
                        )}

                        {activeTab === "pairs" && (
                            <div className="fade-in-up">
                                <h1 className="text-3xl font-bold mb-2 brand-font text-emerald-400">Pairs Directory</h1>
                                <p className="text-slate-400 mb-6">Showing all valid registration pairings.</p>
                                <div className="glass-card p-6">
                                     <StudentTable students={students.filter(s => s.pairStatus === "confirmed")} />
                                </div>
                            </div>
                        )}

                        {activeTab === "teams" && (
                            <div className="fade-in-up">
                                <h1 className="text-3xl font-bold mb-2 brand-font text-cyan-400">Teams Generated</h1>
                                <p className="text-slate-400 mb-6">Review the matched cross-branch teams.</p>
                                <div className="glass-card p-6">
                                     <StudentTable students={students.filter(s => s.teamId !== null)} />
                                </div>
                            </div>
                        )}

                        {activeTab === "admins" && (
                            <div className="fade-in-up">
                                <h1 className="text-3xl font-bold mb-2 brand-font">Manage Admins</h1>
                                <p className="text-slate-400 mb-6">Add or remove administrator access.</p>
                                <div className="glass-card p-8 text-center max-w-lg mx-auto">
                                    <UserPlus className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                                    <h3 className="font-bold text-xl mb-2">Admin Management</h3>
                                    <p className="text-slate-400 text-sm mb-6">
                                        You are currently logged in as <strong className="text-white">{user.email}</strong>. 
                                        To add new administrators, you need to set up Firebase admin role arrays or use Firebase Identity Platform.
                                    </p>
                                    <button disabled className="btn-secondary w-full opacity-50 cursor-not-allowed">Add New Admin (Coming soon)</button>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === "settings" && (
                             <div className="fade-in-up">
                                <h1 className="text-3xl font-bold mb-2 brand-font">Lab Settings</h1>
                                <p className="text-slate-400 mb-6">Configure event properties.</p>
                                <div className="glass-card p-8 text-center max-w-lg mx-auto">
                                    <Settings className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                                    <h3 className="font-bold text-xl mb-2">Platform Configurations</h3>
                                    <p className="text-slate-400 text-sm mb-6">
                                        Settings to toggle registration open/close, modify section mappings, 
                                        and change event dates will go here.
                                    </p>
                                    <button disabled className="btn-secondary w-full opacity-50 cursor-not-allowed">Edit Configurations (Coming soon)</button>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </main>
    );
}
