"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, getDocs, limit, where } from "firebase/firestore";
import { generateTeamId } from "@/lib/idGenerator";
import { updateSessionTeam } from "@/lib/session";
import { SessionData } from "@/lib/types";
import Navbar from "@/components/Navbar";
import SessionGuard from "@/components/SessionGuard";
import BranchConstraintIndicator from "@/components/BranchConstraintIndicator";
import { Users, ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";

function CreateTeamContent({ session }: { session: SessionData }) {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [teamFormationOpen, setTeamFormationOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const checkGate = async () => {
      try {
        const q = query(collection(db, "config"), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setTeamFormationOpen(snap.docs[0].data().teamFormationOpen ?? true);
        } else {
          setTeamFormationOpen(true);
        }
      } catch {
        setTeamFormationOpen(true);
      }
    };
    checkGate();
  }, []);

  if (teamFormationOpen === null) {
    return <div className="text-center p-12"><div className="spinner" style={{ margin: "0 auto" }} /></div>;
  }

  if (teamFormationOpen === false) {
    return (
      <div className="text-center p-8 space-y-6 fade-in-up">
        <div style={{ width: 64, height: 64, border: "1.5px solid var(--ink)", display: "grid", placeItems: "center", margin: "0 auto" }}>
          <Lock style={{ width: 28, height: 28, color: "var(--muted)" }} />
        </div>
        <h3 style={{ fontFamily: "var(--bebas)", fontSize: "28px", color: "var(--ink)" }}>Team Formation Closed</h3>
        <p style={{ color: "var(--muted)", fontSize: "14px", maxWidth: "320px", margin: "0 auto", lineHeight: 1.7 }}>
          Team creation is currently disabled by the admin.
        </p>
        <Link href="/dashboard" className="btn-primary" style={{ display: "inline-flex", padding: "12px 24px" }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Check if already on a team
  if (session.teamId) {
    return (
      <div className="glass-card p-8 text-center space-y-4">
        <p style={{ fontFamily: "var(--bebas)", fontSize: "24px", color: "var(--ink)" }}>
          You&apos;re already on a team
        </p>
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>
          You&apos;re a member of {session.teamId}. Leave your current team before creating a new one.
        </p>
        <Link href={`/team/${session.teamId}`} className="btn-primary" style={{ display: "inline-flex", padding: "12px 24px" }}>
          View Your Team
        </Link>
      </div>
    );
  }

  const leadMember = {
    usn: session.usn,
    name: session.name,
    branch: session.branch,
    section: session.section,
    status: "approved" as const,
    joinedAt: new Date(),
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError("");

    const trimmedName = teamName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 10) {
      setError("Team name must be between 2 and 10 characters.");
      setIsCreating(false);
      return;
    }

    try {
      // Check for duplicate team name
      const nameQuery = query(collection(db, "teams"), where("name", "==", trimmedName));
      const nameSnap = await getDocs(nameQuery);
      if (!nameSnap.empty) {
        setError("A team with this name already exists. Choose a different name.");
        setIsCreating(false);
        return;
      }

      const teamId = generateTeamId();
      const branchDistribution = { [session.branch]: 1 };

      await setDoc(doc(db, "teams", teamId), {
        teamId,
        name: trimmedName,
        leadUSN: session.usn,
        members: [leadMember],
        memberCount: 1,
        status: "forming",
        branchDistribution,
        isPublic,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update registration
      await updateDoc(doc(db, "registrations", session.usn), {
        teamId,
        teamRole: "lead",
      });

      // Update session
      updateSessionTeam(teamId, "lead");

      router.push(`/team/${teamId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--muted)", textDecoration: "none", marginBottom: "16px" }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Dashboard
        </Link>
        <h1 style={{ fontFamily: "var(--bebas)", fontSize: "48px", letterSpacing: "0.02em", color: "var(--ink)", lineHeight: 1 }}>
          Create Your Team
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "8px" }}>
          You&apos;ll be the team lead. After creation, invite members via their USN.
        </p>
      </div>

      <form onSubmit={handleCreate} className="glass-card p-6 md:p-8 space-y-6">
        {/* Team Name */}
        <div>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "8px" }}>
            Team Name <span style={{ color: "var(--red)" }}>*</span>
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="2–10 characters"
            className="input-field"
            minLength={2}
            maxLength={10}
            required
          />
          <p style={{ fontSize: "10px", color: teamName.trim().length > 0 && (teamName.trim().length < 2 || teamName.trim().length > 10) ? "var(--red)" : "var(--muted)", marginTop: "6px", fontWeight: 600 }}>
            {teamName.trim().length}/10 characters (min 2, max 10)
          </p>
        </div>

        {/* Visibility */}
        <div>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "8px" }}>
            Team Visibility
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              style={{
                flex: 1, padding: "12px", border: "1.5px solid", cursor: "pointer",
                borderColor: isPublic ? "var(--ink)" : "var(--line)",
                background: isPublic ? "var(--ink)" : "transparent",
                color: isPublic ? "var(--paper)" : "var(--muted)",
                fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              }}
            >
              Public — Anyone can request to join
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              style={{
                flex: 1, padding: "12px", border: "1.5px solid", cursor: "pointer",
                borderColor: !isPublic ? "var(--ink)" : "var(--line)",
                background: !isPublic ? "var(--ink)" : "transparent",
                color: !isPublic ? "var(--paper)" : "var(--muted)",
                fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              }}
            >
              Private — Invite only
            </button>
          </div>
        </div>

        {/* You as lead */}
        <div style={{ padding: "16px", border: "1.5px solid var(--line)", background: "var(--paper2)" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: "8px" }}>
            Team Lead (You)
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: 36, height: 36, background: "var(--ink)", display: "grid", placeItems: "center" }}>
              <Users style={{ width: 18, height: 18, color: "var(--paper)" }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)" }}>{session.name}</p>
              <p style={{ fontSize: "11px", color: "var(--muted)" }}>
                {session.branch} — Section {session.section}
              </p>
            </div>
          </div>
        </div>

        {/* Constraint preview */}
        <BranchConstraintIndicator members={[leadMember]} />

        {/* Error */}
        {error && (
          <div style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, background: "rgba(232, 52, 26, 0.08)", color: "var(--red)", border: "1.5px solid var(--red)" }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={isCreating || teamName.trim().length < 2 || teamName.trim().length > 10} className="btn-primary w-full" style={{ padding: "16px" }}>
          {isCreating ? <><div className="spinner" /> Creating...</> : "Create Team"}
        </button>
      </form>
    </div>
  );
}

export default function CreateTeamPage() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <Navbar />
      <section className="flex-1 flex items-start justify-center px-4 py-8" style={{ marginTop: 60 }}>
        <div className="w-full max-w-lg fade-in-up">
          <SessionGuard>
            {(session) => <CreateTeamContent session={session} />}
          </SessionGuard>
        </div>
      </section>
    </main>
  );
}
