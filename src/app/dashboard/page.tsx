"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Team, Invite, SessionData } from "@/lib/types";
import { getSession, updateSessionTeam } from "@/lib/session";
import Navbar from "@/components/Navbar";
import SessionGuard from "@/components/SessionGuard";
import TeamStatusBadge from "@/components/TeamStatusBadge";
import BranchConstraintIndicator from "@/components/BranchConstraintIndicator";
import Link from "next/link";
import { Users, Plus, Search, Mail, ArrowRight, Lightbulb } from "lucide-react";

function DashboardContent({ session }: { session: SessionData }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Check if session has stale teamId — re-fetch from registration
      const regDoc = await getDoc(doc(db, "registrations", session.usn));
      if (regDoc.exists()) {
        const regData = regDoc.data();
        const currentTeamId = regData.teamId || null;
        const currentRole = regData.teamRole || null;

        // Sync session if out of date
        if (currentTeamId !== session.teamId || currentRole !== session.teamRole) {
          updateSessionTeam(currentTeamId, currentRole);
          session.teamId = currentTeamId;
          session.teamRole = currentRole;
        }
      }

      // Fetch team if exists
      if (session.teamId) {
        const teamDoc = await getDoc(doc(db, "teams", session.teamId));
        if (teamDoc.exists()) {
          const data = teamDoc.data();
          setTeam({
            teamId: data.teamId,
            name: data.name || null,
            leadUSN: data.leadUSN,
            members: data.members || [],
            memberCount: data.memberCount || 0,
            status: data.status,
            branchDistribution: data.branchDistribution || {},
            isPublic: data.isPublic ?? true,
            createdAt: data.createdAt?.toDate() || null,
            updatedAt: data.updatedAt?.toDate() || null,
          });
        }
      }

      // Fetch pending invites for this student
      const inviteQuery = query(
        collection(db, "invites"),
        where("toUSN", "==", session.usn),
        where("status", "==", "pending"),
        where("type", "==", "invite")
      );
      const inviteSnap = await getDocs(inviteQuery);
      const invites: Invite[] = [];
      inviteSnap.forEach(d => {
        const inv = d.data();
        invites.push({
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
      setPendingInvites(invites);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="fade-in-up space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 style={{ fontFamily: "var(--bebas)", fontSize: "48px", lineHeight: 1, color: "var(--ink)" }}>
          Welcome, {session.name.split(" ")[0]}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "8px" }}>
          {session.branch} — Section {session.section} · <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{session.usn}</span>
        </p>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="glass-card" style={{ padding: "20px", borderColor: "var(--red)", borderLeftWidth: "4px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--red)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Mail style={{ width: 14, height: 14 }} />
            Pending Invites ({pendingInvites.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pendingInvites.map(inv => (
              <div
                key={inv.inviteId}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", border: "1px solid var(--line)", background: "var(--paper2)",
                }}
              >
                <div>
                  <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)" }}>
                    {inv.teamName || inv.teamId}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--muted)" }}>
                    From {inv.fromName}
                  </p>
                </div>
                <Link
                  href={`/invite/${inv.inviteId}`}
                  className="btn-primary"
                  style={{ padding: "8px 16px", fontSize: "10px" }}
                >
                  Respond <ArrowRight style={{ width: 12, height: 12 }} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Status */}
      {team ? (
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: "4px" }}>
                Your Team
              </p>
              <p style={{ fontFamily: "var(--bebas)", fontSize: "28px", color: "var(--ink)", lineHeight: 1 }}>
                {team.name || team.teamId}
              </p>
              {team.name && (
                <p style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{team.teamId}</p>
              )}
            </div>
            <TeamStatusBadge status={team.status} />
          </div>

          <BranchConstraintIndicator members={team.members} />

          <div style={{ marginTop: "16px" }}>
            <Link
              href={`/team/${team.teamId}`}
              className="btn-primary"
              style={{ display: "inline-flex", padding: "12px 24px" }}
            >
              View Team <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </div>
      ) : (
        /* No team — show actions */
        <div className="glass-card" style={{ padding: "32px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, background: "var(--paper2)", border: "1.5px solid var(--line)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <Lightbulb style={{ width: 28, height: 28, color: "var(--muted)" }} />
          </div>
          <p style={{ fontFamily: "var(--bebas)", fontSize: "24px", color: "var(--ink)", marginBottom: "8px" }}>
            You&apos;re not on a team yet
          </p>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "20px", maxWidth: "360px", margin: "0 auto 20px" }}>
            Create your own team or browse open teams to join. Teams need 6 members from at least 2 different branches.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/team/create" className="btn-primary" style={{ padding: "14px 28px" }}>
              <Plus style={{ width: 16, height: 16 }} /> Create Team
            </Link>
            <Link href="/team/browse" className="btn-secondary" style={{ padding: "14px 28px" }}>
              <Search style={{ width: 16, height: 16 }} /> Browse Teams
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        {!team && (
          <Link href="/team/create" className="glass-card" style={{ padding: "20px", textDecoration: "none", display: "flex", alignItems: "center", gap: "12px" }}>
            <Plus style={{ width: 20, height: 20, color: "var(--red)" }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink)" }}>Create Team</p>
              <p style={{ fontSize: "11px", color: "var(--muted)" }}>Start your own team</p>
            </div>
          </Link>
        )}
        <Link href="/team/browse" className="glass-card" style={{ padding: "20px", textDecoration: "none", display: "flex", alignItems: "center", gap: "12px" }}>
          <Users style={{ width: 20, height: 20, color: "var(--red)" }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink)" }}>Browse Teams</p>
            <p style={{ fontSize: "11px", color: "var(--muted)" }}>Find open teams</p>
          </div>
        </Link>
        <Link href="/status" className="glass-card" style={{ padding: "20px", textDecoration: "none", display: "flex", alignItems: "center", gap: "12px" }}>
          <Search style={{ width: 20, height: 20, color: "var(--red)" }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink)" }}>Check Status</p>
            <p style={{ fontSize: "11px", color: "var(--muted)" }}>View registration info</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <Navbar />
      <section style={{ marginTop: 60, maxWidth: "720px", margin: "80px auto 40px", padding: "0 20px" }}>
        <SessionGuard>
          {(session) => <DashboardContent session={session} />}
        </SessionGuard>
      </section>
    </main>
  );
}
