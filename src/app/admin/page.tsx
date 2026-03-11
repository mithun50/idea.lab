"use client";

import { useState, useEffect, useCallback } from "react";
import { db, auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { collection, getDocs, doc, updateDoc, query, orderBy, deleteDoc, writeBatch, setDoc } from "firebase/firestore";
import { generateTeams, StudentPair } from "@/lib/matchingAlgorithm";
import AdminStats from "@/components/AdminStats";
import StudentTable from "@/components/StudentTable";
import { LayoutDashboard, Users, UsersRound, Trophy, Settings, LogOut, Lightbulb, UserPlus, Play, AlertTriangle, ShieldAlert, KeyRound, Eraser } from "lucide-react";

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

    // Reset Database States
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetPassword, setResetPassword] = useState("");
    const [resetPhrase, setResetPhrase] = useState("");
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState("");

    // Admin Management States
    const [admins, setAdmins] = useState<string[]>([]);
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [adminActionLoading, setAdminActionLoading] = useState(false);

    // Settings States
    const [registrationsOpen, setRegistrationsOpen] = useState(true);
    const [configLoading, setConfigLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const fetchAdmins = useCallback(async () => {
        try {
            const snapshot = await getDocs(collection(db, "admins"));
            const list: string[] = [];
            snapshot.forEach(doc => list.push(doc.data().email));
            setAdmins(list);
        } catch (error) {
            console.error("Error fetching admins:", error);
        }
    }, []);

    const fetchConfig = useCallback(async () => {
        try {
            const docSnap = await getDocs(query(collection(db, "config")));
            if (!docSnap.empty) {
                const data = docSnap.docs[0].data();
                setRegistrationsOpen(data.registrationsOpen ?? true);
            }
        } catch (error) {
            console.error("Error fetching config:", error);
        }
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
            await fetchAdmins();
            await fetchConfig();
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setDataLoading(false);
        }
    }, [fetchAdmins, fetchConfig]);

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

    const handleResetDatabase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.email) return;
        if (resetPhrase !== "reset database") {
            setResetError("Please type 'reset database' exactly.");
            return;
        }

        setResetLoading(true);
        setResetError("");

        try {
            // 1. Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, resetPassword);
            await reauthenticateWithCredential(user, credential);

            // 2. Perform deletion in batches
            const q = query(collection(db, "registrations"));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                alert("Database is already empty.");
                setShowResetModal(false);
                return;
            }

            const batch = writeBatch(db);
            snapshot.forEach((docSnap) => {
                batch.delete(docSnap.ref);
            });
            await batch.commit();

            alert("✅ Database has been successfully reset.");
            setShowResetModal(false);
            setResetPassword("");
            setResetPhrase("");
            await fetchStudents();
        } catch (error: any) {
            console.error("Reset error:", error);
            setResetError(error.message || "Failed to reset database. Check your password.");
        } finally {
            setResetLoading(false);
        }
    };

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAdminEmail.trim()) return;
        setAdminActionLoading(true);
        try {
            const id = newAdminEmail.trim().toLowerCase().replace(/[@.]/g, "_");
            const { setDoc } = await import("firebase/firestore");
            await setDoc(doc(db, "admins", id), { email: newAdminEmail.trim().toLowerCase() });
            setNewAdminEmail("");
            await fetchAdmins();
        } catch (error) {
            console.error("Error adding admin:", error);
            alert("Failed to add admin.");
        } finally {
            setAdminActionLoading(false);
        }
    };

    const handleRemoveAdmin = async (email: string) => {
        if (!confirm(`Are you sure you want to remove ${email} as an admin?`)) return;
        setAdminActionLoading(true);
        try {
            const id = email.replace(/[@.]/g, "_");
            await deleteDoc(doc(db, "admins", id));
            await fetchAdmins();
        } catch (error) {
            console.error("Error removing admin:", error);
        } finally {
            setAdminActionLoading(false);
        }
    };

    const toggleRegistrations = async () => {
        setConfigLoading(true);
        try {
            const { setDoc } = await import("firebase/firestore");
            await setDoc(doc(db, "config", "global_config"), { registrationsOpen: !registrationsOpen }, { merge: true });
            setRegistrationsOpen(!registrationsOpen);
        } catch (error) {
            console.error("Error updating config:", error);
        } finally {
            setConfigLoading(false);
        }
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
            <main className="min-h-screen flex items-center justify-center px-4 bg-paper bg-[radial-gradient(rgba(13,13,13,0.03)_1px,transparent_1px)] [background-size:24px_24px]">
                <div className="w-full max-w-md fade-in-up">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-ink rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                            <Lightbulb className="w-10 h-10 text-paper" />
                        </div>
                        <h1 className="text-5xl font-black mb-2 brand-font leading-none tracking-tight">ADMIN PANEL</h1>
                        <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Secure Access Required</p>
                    </div>

                    <form onSubmit={handleLogin} className="glass-card !p-10 space-y-6 shadow-2xl">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Admin Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@dbit.in" className="input-field" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Password</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field" required />
                            </div>
                        </div>
                        {loginError && <p className="text-red-600 text-[11px] font-bold uppercase tracking-wider bg-red-50 border border-red-200 p-4">{loginError}</p>}
                        
                        <button type="submit" disabled={loginLoading} className="btn-primary w-full !py-5 text-sm">
                            {loginLoading ? <div className="spinner" /> : "Authorize & Enter"}
                        </button>
                    </form>
                </div>
            </main>
        );
    }

    const navigationItems = [
        { id: "dashboard", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: "registrations", label: "Registrations", icon: <Users className="w-4 h-4" /> },
        { id: "pairs", label: "Pairs", icon: <UsersRound className="w-4 h-4" /> },
        { id: "teams", label: "Teams", icon: <Trophy className="w-4 h-4" /> },
        { id: "admins", label: "Admins", icon: <UserPlus className="w-4 h-4" /> },
        { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> }
    ];

    return (
        <main className="min-h-screen flex bg-paper text-ink">
            
            {/* Sidebar */}
            <aside className="w-64 border-r-[1.5px] border-ink bg-paper2 flex flex-col hidden md:flex sticky top-0 h-screen">
                <div className="flex-1 flex flex-col">
                    <div className="p-8 border-b-[1.5px] border-ink bg-paper">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center">
                                <Lightbulb className="w-4 h-4 text-paper" />
                            </div>
                            <span className="font-black text-xl tracking-tight brand-font">IDEA LAB</span>
                        </div>
                    </div>

                    <nav className="p-4 space-y-1">
                        {navigationItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as TabType)}
                                className={`w-full flex items-center gap-4 px-5 py-4 transition-all text-[11px] font-bold uppercase tracking-widest
                                    ${activeTab === item.id 
                                        ? 'bg-ink text-paper border-l-4 border-red' 
                                        : 'text-muted hover:text-ink hover:bg-paper'}
                                `}
                            >
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6 border-t-[1.5px] border-ink bg-paper2 mt-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-paper border border-line flex items-center justify-center overflow-hidden">
                            <span className="text-[10px] font-bold">{user.email?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="w-0 flex-1 overflow-hidden">
                            <p className="text-[10px] font-bold truncate text-muted">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 border border-ink text-ink hover:bg-red hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Topbar */}
            <div className="md:hidden fixed top-0 w-full z-50 border-b-[1.5px] border-ink bg-paper px-4 py-4 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center">
                            <Lightbulb className="w-4 h-4 text-paper" />
                        </div>
                        <span className="font-black text-lg brand-font">IDEA LAB</span>
                    </div>
                    <button onClick={handleLogout} className="text-[10px] font-bold uppercase text-red-600">Sign Out</button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                   {navigationItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as TabType)}
                            className={`px-4 py-2 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest border
                                ${activeTab === item.id ? 'bg-ink text-paper border-ink' : 'text-muted border-line'}
                            `}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 md:p-12 pt-40 md:pt-12 w-full max-w-[100vw] overflow-y-auto">
                
                {dataLoading ? (
                    <div className="flex items-center justify-center h-[60vh]">
                        <div className="text-center">
                            <div className="spinner mx-auto mb-4 border-ink" style={{ width: 40, height: 40 }} />
                            <p className="text-muted text-[11px] font-bold uppercase tracking-widest">Crunching Data...</p>
                        </div>
                    </div>
                ) : (
                    <div className="fade-in-up space-y-12 max-w-6xl mx-auto">
                        
                        {activeTab === "dashboard" && (
                            <>
                                <header>
                                    <h1 className="text-6xl font-black mb-2 brand-font leading-none tracking-tight">OVERVIEW</h1>
                                    <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Real-time Event Metrics</p>
                                </header>
                                
                                <AdminStats totalRegistrations={totalRegistrations} confirmedPairs={confirmedPairs} pendingRegistrations={pendingRegistrations} teamsFormed={teamsFormed} />

                                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                                    <div className="glass-card xl:col-span-3 !p-10 border-[1.5px] border-ink">
                                        <h2 className="font-black text-2xl mb-8 brand-font flex items-center gap-3 uppercase tracking-wider"><LayoutDashboard className="w-6 h-6 text-red"/> Branch Distribution</h2>
                                        <div className="space-y-6">
                                            {Object.entries(branchStats).sort(([, a], [, b]) => b - a).map(([branch, count]) => (
                                                <div key={branch} className="space-y-2">
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-[11px] font-black uppercase tracking-widest text-ink">{branch}</span>
                                                        <span className="text-[11px] font-black uppercase tracking-widest text-muted">{count} ENROLLED</span>
                                                    </div>
                                                    <div className="h-6 border-[1.5px] border-ink bg-paper2 relative">
                                                        <div
                                                            className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out"
                                                            style={{
                                                                width: `${(count / maxBranchCount) * 100}%`,
                                                                backgroundColor: branchColors[branch] || "var(--ink)",
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="glass-card xl:col-span-2 !p-10 border-[1.5px] border-ink bg-paper2 flex flex-col">
                                        <div>
                                            <h2 className="font-black text-2xl mb-4 brand-font flex items-center gap-3 uppercase tracking-wider"><Trophy className="w-6 h-6 text-red"/> Matchmaker</h2>
                                            <p className="text-muted text-xs font-bold uppercase leading-relaxed tracking-widest mb-8">
                                                Aggregate confirmed pairs into cross-branch units.
                                            </p>
                                            <div className="space-y-4 mb-10">
                                                <div className="flex justify-between items-center p-4 border border-ink bg-paper">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Ready Pairs</span>
                                                    <span className="font-black text-xl brand-font">{confirmedPairs}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-4 border border-ink bg-paper">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Est. Teams</span>
                                                    <span className="font-black text-xl brand-font">{Math.floor(confirmedPairs / 3)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 mt-auto">
                                            <button onClick={runMatching} disabled={matchingInProgress || confirmedPairs < 3} className="btn-primary w-full !py-5 shadow-xl">
                                                {matchingInProgress ? <div className="spinner" /> : <><Play className="w-4 h-4 fill-current" /> Execute Matching</>}
                                            </button>
                                            {matchingResult && (
                                                <div className={`text-[10px] font-bold uppercase tracking-[0.12em] p-4 border border-ink text-center leading-relaxed ${matchingResult.startsWith("✅") ? "bg-[#10b981] text-white" : "bg-red text-white"}`}>
                                                    {matchingResult}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === "registrations" && (
                            <div className="fade-in-up space-y-8">
                                <header className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                                     <div>
                                        <h1 className="text-6xl font-black mb-2 brand-font leading-none tracking-tight">REGISTRATIONS</h1>
                                        <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Full Participant Directory</p>
                                     </div>
                                     <button onClick={fetchStudents} className="btn-secondary !text-[10px] !font-black !px-6">↻ RELOAD DATA</button>
                                </header>
                                <div className="glass-card shadow-xl !p-1">
                                    <StudentTable students={students} />
                                </div>
                            </div>
                        )}

                        {activeTab === "pairs" && (
                            <div className="fade-in-up space-y-8">
                                <div>
                                    <h1 className="text-6xl font-black mb-2 brand-font leading-none tracking-tight text-ink">PAIRS</h1>
                                    <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Confirmed Duos Ready for Matching</p>
                                </div>
                                <div className="glass-card shadow-xl !p-1">
                                     <StudentTable students={students.filter(s => s.pairStatus === "confirmed")} />
                                </div>
                            </div>
                        )}

                        {activeTab === "teams" && (
                            <div className="fade-in-up space-y-8">
                                <div>
                                    <h1 className="text-6xl font-black mb-2 brand-font leading-none tracking-tight text-ink">TEAMS</h1>
                                    <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Generated Cross-Branch Collaborations</p>
                                </div>
                                <div className="glass-card shadow-xl !p-1">
                                     <StudentTable students={students.filter(s => s.teamId !== null)} />
                                </div>
                            </div>
                        )}

                        {activeTab === "admins" && (
                            <div className="fade-in-up space-y-10">
                                <header>
                                    <h1 className="text-6xl font-black mb-2 brand-font leading-none tracking-tight">ADMINS</h1>
                                    <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Manage Portal Permissions</p>
                                </header>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="glass-card !p-10 border-[1.5px] border-ink flex flex-col">
                                        <h3 className="font-black text-2xl mb-8 brand-font uppercase tracking-wider flex items-center gap-3">
                                            <UserPlus className="w-6 h-6 text-red" /> Authorize Admin
                                        </h3>
                                        <form onSubmit={handleAddAdmin} className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Email Address</label>
                                                <input 
                                                    type="email" 
                                                    value={newAdminEmail}
                                                    onChange={(e) => setNewAdminEmail(e.target.value)}
                                                    placeholder="admin@dbit.in"
                                                    className="input-field"
                                                    required
                                                />
                                            </div>
                                            <button 
                                                type="submit" 
                                                disabled={adminActionLoading || !newAdminEmail}
                                                className="btn-primary w-full !py-4"
                                            >
                                                {adminActionLoading ? <div className="spinner" /> : "GRANT ACCESS"}
                                            </button>
                                        </form>
                                    </div>

                                    <div className="glass-card !p-10 border-[1.5px] border-ink bg-paper2">
                                        <h3 className="font-black text-2xl mb-8 brand-font uppercase tracking-wider flex items-center gap-3">
                                            <Users className="w-6 h-6 text-red" /> Authorized Staff
                                        </h3>
                                        <div className="space-y-3">
                                            {admins.length === 0 ? (
                                                <div className="text-center py-8 border-[1.5px] border-dashed border-ink/20">
                                                    <p className="text-muted text-[10px] font-bold uppercase tracking-widest">Root access only.</p>
                                                </div>
                                            ) : (
                                                admins.map((email) => (
                                                    <div key={email} className="flex items-center justify-between p-4 bg-paper border-[1.5px] border-ink">
                                                        <span className="text-[11px] font-black tracking-tight text-ink">{email}</span>
                                                        {email !== user?.email && (
                                                            <button 
                                                                onClick={() => handleRemoveAdmin(email)}
                                                                className="text-red font-bold text-[10px] uppercase hover:underline"
                                                            >
                                                                REVOKE
                                                            </button>
                                                        )}
                                                        {email === user?.email && (
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-ink text-paper px-2 py-0.5">YOU</span>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === "settings" && (
                             <div className="fade-in-up space-y-10">
                                <header>
                                    <h1 className="text-6xl font-black mb-2 brand-font leading-none tracking-tight">SETTINGS</h1>
                                    <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Global Configurations</p>
                                </header>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="glass-card !p-10 border-[1.5px] border-ink">
                                        <Settings className="w-10 h-10 text-muted mb-6" />
                                        <h3 className="font-black text-2xl mb-2 brand-font uppercase tracking-wider">Gate Control</h3>
                                        <p className="text-muted text-xs font-bold uppercase tracking-widest mb-10 leading-relaxed">
                                            Portal is currently 
                                            <span className={`ml-2 px-2 py-0.5 ${registrationsOpen ? "bg-[#10b981] text-white" : "bg-red text-white"}`}>
                                                {registrationsOpen ? "OPEN" : "LOCKED"}
                                            </span>
                                        </p>
                                        <button 
                                            onClick={toggleRegistrations}
                                            disabled={configLoading}
                                            className="btn-primary w-full !py-4"
                                        >
                                            {configLoading ? <div className="spinner" /> : (registrationsOpen ? "LOCK PORTAL" : "OPEN PORTAL")}
                                        </button>
                                    </div>

                                    <div className="glass-card !p-10 border-[1.5px] border-red bg-red/5">
                                        <ShieldAlert className="w-10 h-10 text-red mb-6" />
                                        <h3 className="font-black text-2xl mb-2 brand-font uppercase tracking-wider text-red">Danger Operations</h3>
                                        <p className="text-red text-xs font-bold uppercase tracking-widest mb-10 leading-relaxed">
                                            Wipe all student and team data. Proceed with extreme caution.
                                        </p>
                                        <button 
                                            onClick={() => setShowResetModal(true)}
                                            className="w-full py-4 border-[1.5px] border-red text-red hover:bg-red hover:text-white transition-all text-[11px] font-black uppercase tracking-[0.2em]"
                                        >
                                            <Eraser className="w-4 h-4" /> RESET DATABASE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Reset Database Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/90 backdrop-blur-sm fade-in">
                    <div className="glass-card max-w-md w-full !p-12 border-red shadow-2xl">
                        <div className="text-center mb-10">
                            <div className="w-20 h-20 rounded-full bg-red flex items-center justify-center mx-auto mb-6 shadow-xl">
                                <AlertTriangle className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-4xl font-black text-ink mb-2 brand-font uppercase">DANGER ZONE</h2>
                            <p className="text-muted text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                                Permanently erase all <span className="text-red">registration units</span>.
                            </p>
                        </div>

                        <form onSubmit={handleResetDatabase} className="space-y-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Admin Password</label>
                                    <input 
                                        type="password" 
                                        value={resetPassword} 
                                        onChange={(e) => setResetPassword(e.target.value)}
                                        placeholder="REQUIRED"
                                        className="input-field"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
                                        Type <span className="text-red font-black italic">reset database</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={resetPhrase} 
                                        onChange={(e) => setResetPhrase(e.target.value)}
                                        placeholder="CONFIRMATION PHRASE"
                                        className="input-field"
                                        required
                                    />
                                </div>
                            </div>

                            {resetError && (
                                <p className="text-white text-[10px] font-bold uppercase tracking-wider bg-red p-4 border border-ink">
                                    {resetError}
                                </p>
                            )}

                            <div className="flex gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => { setShowResetModal(false); setResetError(""); setResetPassword(""); setResetPhrase(""); }}
                                    className="flex-1 btn-secondary text-[10px]"
                                >
                                    ABORT
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={resetLoading || resetPhrase !== "reset database" || !resetPassword}
                                    className="flex-1 py-4 bg-red text-white font-black uppercase tracking-widest text-[11px] hover:bg-ink disabled:opacity-30 transition-all border border-ink"
                                >
                                    {resetLoading ? <div className="spinner border-white" /> : "ERASE DATA"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
