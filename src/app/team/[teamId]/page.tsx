"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { Team, Invite, SessionData } from "@/lib/types";
import { getSession } from "@/lib/session";
import { generateInviteId } from "@/lib/idGenerator";
import { createNotification } from "@/lib/notifications";
import { getBranchName, getSection } from "@/lib/usnValidator";
import Navbar from "@/components/Navbar";
import TeamMemberList from "@/components/TeamMemberList";
import BranchConstraintIndicator from "@/components/BranchConstraintIndicator";
import TeamStatusBadge from "@/components/TeamStatusBadge";
import InviteManager from "@/components/InviteManager";
import JoinRequestManager from "@/components/JoinRequestManager";
import StudentRegistrationForm from "@/components/StudentRegistrationForm";
import Link from "next/link";
import { ArrowLeft, Share2, Mail } from "lucide-react";

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const [team, setTeam] = useState<Team | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<SessionData | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);

  // Read session from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    setSession(getSession());
    setSessionChecked(true);
  }, []);

  // Check if logged-in user has a pending invite for this team → redirect to invite page
  useEffect(() => {
    if (!session) return;
    const checkPendingInvite = async () => {
      try {
        const invQ = query(
          collection(db, "invites"),
          where("teamId", "==", teamId),
          where("toUSN", "==", session.usn),
          where("type", "==", "invite"),
          where("status", "==", "pending")
        );
        const snap = await getDocs(invQ);
        if (!snap.empty) {
          const inviteId = snap.docs[0].data().inviteId;
          setPendingInviteId(inviteId);
        }
      } catch { /* ignore */ }
    };
    checkPendingInvite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.usn, teamId]);

  const isLead = session?.usn === team?.leadUSN;
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [joinMessage, setJoinMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasExistingRequest, setHasExistingRequest] = useState(false);
  const [rejectedRequest, setRejectedRequest] = useState(false);

  const handleShare = async () => {
    // If there's a pending invite for someone, share the invite link; otherwise share team link
    const pendingInvite = invites.find(inv => inv.type === "invite" && inv.status === "pending");
    const url = pendingInvite
      ? `${window.location.origin}/invite/${pendingInvite.inviteId}`
      : window.location.href;
    const text = pendingInvite
      ? `You're invited to join ${team?.name || team?.teamId} on Idea Lab \u2014 Don Bosco Institute of Technology, Kumbalagodu, Bangalore!`
      : `Check out ${team?.name || team?.teamId} on Idea Lab \u2014 Don Bosco Institute of Technology, Kumbalagodu, Bangalore!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: team?.name || "Idea Lab Team", text, url });
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

  // Check if user already has a pending/rejected request for this team
  useEffect(() => {
    if (!session) return;
    const checkExisting = async () => {
      try {
        const pendingQ = query(
          collection(db, "invites"),
          where("teamId", "==", teamId),
          where("fromUSN", "==", session.usn),
          where("type", "==", "request"),
          where("status", "==", "pending")
        );
        const rejectedQ = query(
          collection(db, "invites"),
          where("teamId", "==", teamId),
          where("fromUSN", "==", session.usn),
          where("type", "==", "request"),
          where("status", "==", "rejected")
        );
        const [pendingSnap, rejectedSnap] = await Promise.all([getDocs(pendingQ), getDocs(rejectedQ)]);
        if (!pendingSnap.empty) setHasExistingRequest(true);
        if (!rejectedSnap.empty) setRejectedRequest(true);
      } catch { /* ignore */ }
    };
    checkExisting();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.usn, teamId]);

  const handleRequestJoin = async () => {
    if (!session || !team) return;
    setRequestingJoin(true);
    setJoinMessage(null);

    try {
      if (session.teamId) throw new Error("You're already on a team.");

      // Check if already requested
      const existingQ = query(
        collection(db, "invites"),
        where("teamId", "==", teamId),
        where("fromUSN", "==", session.usn),
        where("type", "==", "request"),
        where("status", "==", "pending")
      );
      const existing = await getDocs(existingQ);
      if (!existing.empty) throw new Error("You already have a pending request for this team.");

      const inviteId = generateInviteId();
      await setDoc(doc(db, "invites", inviteId), {
        inviteId,
        type: "request",
        teamId,
        teamName: team.name || null,
        fromUSN: session.usn,
        fromName: session.name,
        toUSN: team.leadUSN,
        toName: team.members.find(m => m.usn === team.leadUSN)?.name || "",
        status: "pending",
        createdAt: serverTimestamp(),
        respondedAt: null,
      });

      const newMember = {
        usn: session.usn,
        name: session.name,
        branch: session.branch || getBranchName(session.usn),
        section: session.section || getSection(session.usn),
        status: "pending_request",
        joinedAt: null,
      };
      await updateDoc(doc(db, "teams", teamId), {
        members: [...team.members, newMember],
        updatedAt: serverTimestamp(),
      });

      // Notify the team leader
      createNotification({
        userId: team.leadUSN,
        type: "request_received",
        title: "Join Request",
        message: `${session.name} wants to join ${team.name || team.teamId}`,
        teamId: team.teamId,
        teamName: team.name || null,
        fromUSN: session.usn,
        fromName: session.name,
        linkUrl: "/dashboard",
      });

      setJoinMessage({ type: "success", text: "Request sent! The team lead will review it." });
      setHasExistingRequest(true);
      fetchTeam();
    } catch (err) {
      setJoinMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to send request." });
    } finally {
      setRequestingJoin(false);
    }
  };

  if (loading || !sessionChecked) {
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

  // Logged-out users see a focused invite/join view instead of the full team board
  if (sessionChecked && !session && team.status === "forming") {
    return (
      <main className="min-h-screen" style={{ background: "var(--paper)", color: "var(--ink)" }}>
        <Navbar />
        <section style={{ marginTop: 60 }} className="flex items-start justify-center px-4 py-8">
          <div className="w-full max-w-md fade-in-up space-y-6">
            {/* Team invite header */}
            <div className="text-center">
              <h1 style={{ fontFamily: "var(--bebas)", fontSize: "36px", color: "var(--ink)", lineHeight: 1 }}>
                Join {team.name || team.teamId}
              </h1>
              <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "8px" }}>
                You&apos;ve been invited to join this team on Idea Lab.
              </p>
            </div>

            {/* Team preview card */}
            <div className="glass-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <p style={{ fontFamily: "var(--bebas)", fontSize: "24px", color: "var(--ink)", lineHeight: 1 }}>
                    {team.name || team.teamId}
                  </p>
                  {team.name && (
                    <p style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{team.teamId}</p>
                  )}
                </div>
                <TeamStatusBadge status={team.status} />
              </div>
              <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: "8px" }}>
                Members ({approvedMembers.length}/6)
              </p>
              {approvedMembers.map(m => (
                <div key={m.usn} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: "13px" }}>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{m.name}</span>
                  <span style={{ marginLeft: "8px", color: "var(--muted)", fontSize: "11px" }}>{m.branch}</span>
                </div>
              ))}
            </div>

            {/* Registration form */}
            {team.isPublic ? (
              <div className="glass-card p-6 md:p-8 space-y-4">
                <div className="text-center">
                  <p style={{ fontFamily: "var(--bebas)", fontSize: "22px", color: "var(--ink)", lineHeight: 1, marginBottom: "6px" }}>
                    Register to Continue
                  </p>
                  <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                    Log in or register to respond to this invite or request to join.
                  </p>
                </div>
                <StudentRegistrationForm onRegistered={async () => {
                  // After registration, check if this user has a pending invite for this team
                  const newSession = getSession();
                  if (newSession) {
                    try {
                      const invQ = query(
                        collection(db, "invites"),
                        where("teamId", "==", teamId),
                        where("toUSN", "==", newSession.usn),
                        where("type", "==", "invite"),
                        where("status", "==", "pending")
                      );
                      const snap = await getDocs(invQ);
                      if (!snap.empty) {
                        const inviteId = snap.docs[0].data().inviteId;
                        router.push(`/invite/${inviteId}`);
                        return;
                      }
                    } catch { /* ignore, fall through to reload */ }
                  }
                  window.location.reload();
                }} />
              </div>
            ) : (
              <div className="glass-card" style={{ padding: "32px", textAlign: "center" }}>
                <p style={{ fontFamily: "var(--bebas)", fontSize: "22px", color: "var(--ink)", marginBottom: "8px" }}>
                  This team is private
                </p>
                <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                  You need an invite link to join this team.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <Navbar />

      <section style={{ marginTop: 60, maxWidth: "720px", margin: "80px auto 40px", padding: "0 20px" }}>
        <div className="fade-in-up space-y-8">
          {/* Back */}
          <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--muted)", textDecoration: "none" }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Dashboard
          </Link>

          {/* Pending invite banner */}
          {pendingInviteId && (
            <div className="glass-card" style={{ padding: "20px", borderColor: "var(--red)", borderLeftWidth: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Mail style={{ width: 20, height: 20, color: "var(--red)", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "14px", color: "var(--ink)" }}>
                      You have a pending invite!
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                      This team has invited you to join.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/invite/${pendingInviteId}`}
                  className="btn-primary"
                  style={{ padding: "10px 20px", fontSize: "12px", whiteSpace: "nowrap" }}
                >
                  Respond to Invite
                </Link>
              </div>
            </div>
          )}

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

          {/* Logged in, no team, can request to join */}
          {team.isPublic && team.status === "forming" && session && !session.teamId && !team.members.some(m => m.usn === session.usn) && (
            <div className="glass-card p-6 text-center space-y-3">
              <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                This team has open slots. Request to join!
              </p>
              {joinMessage && (
                <div style={{
                  padding: "10px 14px", fontSize: "12px", fontWeight: 600,
                  background: joinMessage.type === "success" ? "rgba(16, 185, 129, 0.08)" : "rgba(232, 52, 26, 0.08)",
                  color: joinMessage.type === "success" ? "#059669" : "var(--red)",
                  border: `1.5px solid ${joinMessage.type === "success" ? "#059669" : "var(--red)"}`,
                }}>
                  {joinMessage.text}
                </div>
              )}
              {rejectedRequest && !hasExistingRequest && (
                <span style={{
                  fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                  padding: "6px 14px", borderRadius: "20px",
                  background: "rgba(232,52,26,0.08)", color: "var(--red)",
                  display: "inline-block",
                }}>
                  Your previous request was rejected
                </span>
              )}
              {hasExistingRequest ? (
                <span style={{
                  fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                  padding: "6px 14px", borderRadius: "20px",
                  background: "rgba(16,185,129,0.08)", color: "#059669",
                  display: "inline-block",
                }}>
                  Request Pending
                </span>
              ) : (
                <button
                  onClick={handleRequestJoin}
                  disabled={requestingJoin}
                  className="btn-primary"
                  style={{ padding: "12px 24px", display: "inline-flex" }}
                >
                  {requestingJoin ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Sending...</> : "Request to Join"}
                </button>
              )}
            </div>
          )}

          {/* Logged in but already on a different team */}
          {session && session.teamId && session.teamId !== teamId && (
            <div className="glass-card p-6 text-center">
              <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                You&apos;re already on a team.
              </p>
              <Link href="/dashboard" className="btn-secondary" style={{ display: "inline-flex", marginTop: "8px", padding: "10px 20px" }}>
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
