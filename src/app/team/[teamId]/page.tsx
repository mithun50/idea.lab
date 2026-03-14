"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Team, Invite } from "@/lib/types";
import { getSession } from "@/lib/session";
import Navbar from "@/components/Navbar";
import TeamMemberList from "@/components/TeamMemberList";
import BranchConstraintIndicator from "@/components/BranchConstraintIndicator";
import TeamStatusBadge from "@/components/TeamStatusBadge";
import InviteManager from "@/components/InviteManager";
import JoinRequestManager from "@/components/JoinRequestManager";
import Link from "next/link";
import { ArrowLeft, Share2 } from "lucide-react";

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [team, setTeam] = useState<Team | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const session = typeof window !== "undefined" ? getSession() : null;
  const isLead = session?.usn === team?.leadUSN;
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: team?.name || "Idea Lab Team", text: "Join my team on Idea Lab \u2014 Don Bosco Institute of Technology, Kumbalagodu, Bangalore!", url });
        return;
      } catch { /* user cancelled or share failed, fall through to clipboard */ }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const fetchTeam = useCallback(async () => {
    try {
      const teamDoc = await getDoc(doc(db, "teams", teamId));
      if (!teamDoc.exists()) {
        setError("Team not found.");
        setLoading(false);
        return;
      }

      const data = teamDoc.data();
      setTeam({
        teamId: data.teamId,
        name: data.name || null,
        leadUSN: data.leadUSN,
        members: data.members || [],
        memberCount: data.memberCount || 0,
        status: data.status || "forming",
        branchDistribution: data.branchDistribution || {},
        isPublic: data.isPublic ?? true,
        createdAt: data.createdAt?.toDate() || null,
        updatedAt: data.updatedAt?.toDate() || null,
      });

      // Fetch invites for this team
      const inviteQuery = query(collection(db, "invites"), where("teamId", "==", teamId));
      const inviteSnap = await getDocs(inviteQuery);
      const inviteList: Invite[] = [];
      inviteSnap.forEach(d => {
        const inv = d.data();
        inviteList.push({
          inviteId: inv.inviteId,
          type: inv.type,
          teamId: inv.teamId,
          teamName: inv.teamName,
          fromUSN: inv.fromUSN,
          fromName: inv.fromName,
          toUSN: inv.toUSN,
          toName: inv.toName,
          status: inv.status,
          createdAt: inv.createdAt?.toDate() || null,
          respondedAt: inv.respondedAt?.toDate() || null,
        });
      });
      setInvites(inviteList);
    } catch {
      setError("Failed to load team data.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  if (loading) {
    return (
      <main className="min-h-screen" style={{ background: "var(--paper)" }}>
        <Navbar />
        <div style={{ marginTop: 60, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </main>
    );
  }

  if (error || !team) {
    return (
      <main className="min-h-screen" style={{ background: "var(--paper)" }}>
        <Navbar />
        <div style={{ marginTop: 80, textAlign: "center", padding: "40px 20px" }}>
          <p style={{ fontFamily: "var(--bebas)", fontSize: "28px", color: "var(--ink)" }}>
            {error || "Team not found"}
          </p>
          <Link href="/dashboard" className="btn-secondary" style={{ display: "inline-flex", marginTop: "16px" }}>
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const approvedMembers = team.members.filter(m => m.status === "approved");

  return (
    <main className="min-h-screen" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <Navbar />

      <section style={{ marginTop: 60, maxWidth: "720px", margin: "80px auto 40px", padding: "0 20px" }}>
        <div className="fade-in-up space-y-8">
          {/* Back */}
          <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--muted)", textDecoration: "none" }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Dashboard
          </Link>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <p style={{ fontFamily: "var(--bebas)", fontSize: "48px", lineHeight: 1, color: "var(--ink)" }}>
                {team.name || team.teamId}
              </p>
              {team.name && (
                <p style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>{team.teamId}</p>
              )}
            </div>
            <TeamStatusBadge status={team.status} />
          </div>

          {/* Constraint Indicator */}
          <div className="glass-card" style={{ padding: "20px" }}>
            <BranchConstraintIndicator members={team.members} />
          </div>

          {/* Members */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)" }}>
                Team Members ({approvedMembers.length}/6)
              </p>
              {/* Share team link — only for team members */}
              {session && team.members.some(m => m.usn === session.usn) && (
                <button
                  onClick={handleShare}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 700, color: copied ? "#10b981" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", transition: "color 0.2s" }}
                >
                  {copied ? (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> Copied!</>
                  ) : (
                    <><Share2 style={{ width: 12, height: 12 }} /> Share</>
                  )}
                </button>
              )}
            </div>
            <TeamMemberList members={team.members} leadUSN={team.leadUSN} />
          </div>

          {/* Lead Controls */}
          {isLead && team.status === "forming" && (
            <>
              {/* Invite Members */}
              <div>
                <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "12px" }}>
                  Invite Members
                </p>
                <InviteManager team={team} pendingInvites={invites} onRefresh={fetchTeam} />
              </div>

              {/* Join Requests */}
              <div>
                <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "12px" }}>
                  Join Requests
                </p>
                <JoinRequestManager team={team} pendingRequests={invites} onRefresh={fetchTeam} />
              </div>
            </>
          )}

          {/* Non-member view */}
          {!session?.teamId && team.isPublic && team.status === "forming" && (
            <div className="glass-card p-6 text-center">
              <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "12px" }}>
                This team has open slots. Register and request to join!
              </p>
              <Link href="/register" className="btn-primary" style={{ display: "inline-flex", padding: "12px 24px" }}>
                Register to Join
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
