"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Invite, Team, SessionData } from "@/lib/types";
import { getSession } from "@/lib/session";
import Navbar from "@/components/Navbar";
import InviteResponseCard from "@/components/InviteResponseCard";
import StudentRegistrationForm from "@/components/StudentRegistrationForm";
import Link from "next/link";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const inviteId = params.inviteId as string;
  const [invite, setInvite] = useState<Invite | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSessionState] = useState<SessionData | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Check session on mount
  useEffect(() => {
    setSessionState(getSession());
    setSessionChecked(true);
  }, []);

  // Fetch invite + team data only when session exists
  const fetchInvite = useCallback(async () => {
    if (!session) return;
    try {
      const inviteDoc = await getDoc(doc(db, "invites", inviteId));
      if (!inviteDoc.exists()) {
        setError("Invite not found or has expired.");
        setLoading(false);
        return;
      }

      const data = inviteDoc.data();
      const inv: Invite = {
        inviteId: data.inviteId,
        type: data.type,
        teamId: data.teamId,
        teamName: data.teamName,
        fromUSN: data.fromUSN,
        fromName: data.fromName,
        toUSN: data.toUSN,
        toName: data.toName,
        status: data.status,
        createdAt: data.createdAt?.toDate() || null,
        respondedAt: data.respondedAt?.toDate() || null,
      };
      setInvite(inv);

      if (inv.status !== "pending") {
        setError(`This invite has already been ${inv.status}.`);
        setLoading(false);
        return;
      }

      const teamDoc = await getDoc(doc(db, "teams", inv.teamId));
      if (teamDoc.exists()) {
        const td = teamDoc.data();
        setTeam({
          teamId: td.teamId,
          name: td.name || null,
          leadUSN: td.leadUSN,
          members: td.members || [],
          memberCount: td.memberCount || 0,
          status: td.status,
          branchDistribution: td.branchDistribution || {},
          isPublic: td.isPublic ?? true,
          createdAt: td.createdAt?.toDate() || null,
          updatedAt: td.updatedAt?.toDate() || null,
        });
      }
    } catch {
      setError("Failed to load invite.");
    } finally {
      setLoading(false);
    }
  }, [inviteId, session]);

  useEffect(() => {
    if (session) {
      fetchInvite();
    } else if (sessionChecked) {
      // No session — stop loading, show registration form
      setLoading(false);
    }
  }, [session, sessionChecked, fetchInvite]);

  // Called after user registers/logs in inline
  const handleRegistered = () => {
    const s = getSession();
    setSessionState(s);
    setLoading(true);
    setError("");
  };

  const isTargetUser = session && invite && session.usn === invite.toUSN;

  return (
    <main className="min-h-screen" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <Navbar />

      <section style={{ marginTop: 60 }} className="flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md fade-in-up">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
              <div className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : error ? (
            <div className="glass-card" style={{ padding: "32px", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--bebas)", fontSize: "24px", color: "var(--ink)", marginBottom: "8px" }}>
                {error}
              </p>
              <Link href="/" className="btn-secondary" style={{ display: "inline-flex", marginTop: "12px" }}>
                Go Home
              </Link>
            </div>
          ) : !session ? (
            /* Not logged in — show registration form inline, no team details */
            <div className="space-y-6">
              <div className="text-center">
                <h1 style={{ fontFamily: "var(--bebas)", fontSize: "36px", color: "var(--ink)", lineHeight: 1 }}>
                  You&apos;ve Been Invited!
                </h1>
                <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "8px" }}>
                  Register or log in to view and respond to this team invite.
                </p>
              </div>
              <div className="glass-card p-6 md:p-8">
                <StudentRegistrationForm onRegistered={handleRegistered} />
              </div>
            </div>
          ) : !isTargetUser ? (
            <div className="glass-card" style={{ padding: "32px", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--bebas)", fontSize: "24px", color: "var(--ink)", marginBottom: "8px" }}>
                This invite is for {invite?.toUSN}
              </p>
              <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                You&apos;re logged in as {session.usn}. This invite was sent to a different student.
              </p>
              <Link href="/dashboard" className="btn-secondary" style={{ display: "inline-flex", marginTop: "16px" }}>
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h1 style={{ fontFamily: "var(--bebas)", fontSize: "36px", color: "var(--ink)", lineHeight: 1 }}>
                  Team Invite
                </h1>
              </div>
              <InviteResponseCard
                invite={invite!}
                team={team}
                sessionUSN={session.usn}
                onResponse={() => {
                  router.refresh();
                }}
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
